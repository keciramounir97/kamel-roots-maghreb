const express = require("express");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const pinoHttp = require("pino-http");
const os = require("os");

// Configuration and Logger
const config = require("./config/env");
const logger = require("./utils/logger");

const app = express();
const { isProduction } = config;

// Use absolute paths for everything to be Passenger-safe
const ROOT_DIR = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT_DIR, "public");
const FRONTEND_INDEX = path.join(PUBLIC_DIR, "index.html");

// ===================
// Middleware Setup
// ===================

// Structured Logging
app.use(pinoHttp({ 
  logger,
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      ip: req.remoteAddress,
    }),
  },
}));

// Security Headers
app.use(helmet({
  contentSecurityPolicy: isProduction ? undefined : false,
  crossOriginEmbedderPolicy: false,
}));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "TooManyRequests", message: "Too many requests, please try again later." },
  skip: (req) => !isProduction || req.path.startsWith("/assets"),
});
app.use("/api", limiter);

// CORS
const corsOptions = {
  origin(origin, callback) {
    if (!origin || config.isAllowedOrigin(origin)) {
      return callback(null, true);
    }
    logger.warn({ origin }, "Blocked CORS request");
    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
};
app.use(cors(corsOptions));

// Body parsing
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Trust proxy for cPanel/Passenger
if (isProduction) {
  app.set("trust proxy", 1);
}

// ===================
// Import Routes
// ===================
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const statsRoutes = require("./routes/statsRoutes");
const activityRoutes = require("./routes/activityRoutes");
const bookRoutes = require("./routes/bookRoutes");
const treeRoutes = require("./routes/treeRoutes");
const searchRoutes = require("./routes/searchRoutes");
const contactRoutes = require("./routes/contactRoutes");
const personRoutes = require("./routes/personRoutes");
const healthRoutes = require("./routes/healthRoutes");
const roleRoutes = require("./routes/roleRoutes");
const galleryRoutes = require("./routes/galleryRoutes");
const gedcomRoutes = require("./routes/gedcomRoutes");
const newsletterRoutes = require("./routes/newsletterRoutes");
const diagnosticsRoutes = require("./routes/diagnosticsRoutes");
const { uploadErrorHandler } = require("./middlewares/uploadErrorHandler");

// ===================
// API Routes
// ===================
app.get("/api", (req, res) => res.json({ status: "ok", version: "1.0.0", env: config.NODE_ENV }));

app.use("/api/auth", authRoutes);
app.use("/api", userRoutes);
app.use("/api", settingsRoutes);
app.use("/api", statsRoutes);
app.use("/api", activityRoutes);
app.use("/api", bookRoutes);
app.use("/api", treeRoutes);
app.use("/api", searchRoutes);
app.use("/api", contactRoutes);
app.use("/api", personRoutes);
app.use("/api", healthRoutes);
app.use("/api", roleRoutes);
app.use("/api", galleryRoutes);
app.use("/api", gedcomRoutes);
app.use("/api", newsletterRoutes);
app.use("/api", diagnosticsRoutes);

// Static uploads
app.use("/uploads", express.static(config.UPLOADS_DIR));

// Health check
app.get("/health", async (req, res) => {
  const { prisma } = require("./lib/prisma");
  const { isDbUnavailable } = require("./utils/dbState");
  
  const health = {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    db: !isDbUnavailable() ? "connected" : "disconnected",
  };
  
  try {
    if (!isDbUnavailable()) await prisma.$queryRaw`SELECT 1`;
  } catch (e) {
    health.status = "degraded";
    health.db = "error";
  }
  res.status(health.status === "ok" ? 200 : 503).json(health);
});

// ===================
// Frontend Static Serving
// ===================
if (fs.existsSync(PUBLIC_DIR)) {
  // Serve static assets with correct MIME types and long cache
  app.use("/assets", express.static(path.join(PUBLIC_DIR, "assets"), {
    maxAge: "1y",
    immutable: true,
    fallthrough: false,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".js")) res.setHeader("Content-Type", "application/javascript");
      if (filePath.endsWith(".css")) res.setHeader("Content-Type", "text/css");
    }
  }));

  // Serve other static files
  app.use(express.static(PUBLIC_DIR));

  // SPA fallback - MUST BE LAST
  app.get(/^\/(?!api(?:\/|$)|uploads(?:\/|$)).*/, (req, res) => {
    if (fs.existsSync(FRONTEND_INDEX)) {
      res.sendFile(FRONTEND_INDEX);
    } else {
      res.status(404).send("Frontend not built");
    }
  });
}

// ===================
// Error Handling
// ===================
app.use(uploadErrorHandler);

app.use((req, res) => {
  res.status(404).json({ error: "NotFound", message: `Cannot ${req.method} ${req.path}` });
});

app.use((err, req, res, next) => {
  const { getDatabaseErrorResponse } = require("./utils/prismaErrors");
  req.log.error(err);

  const dbError = getDatabaseErrorResponse(err);
  if (dbError) {
    return res.status(dbError.status).json({ error: "ServiceUnavailable", message: dbError.message });
  }

  const status = err.status || 500;
  const message = isProduction && status === 500 ? "Internal Server Error" : err.message;

  res.status(status).json({
    error: err.name || "ServerError",
    message,
    ...( !isProduction && { stack: err.stack }),
  });
});

module.exports = app;
