const express = require("express");

let erreur = "No";

// FIX: Handle BigInt serialization for Prisma (e.g. fileSize)
BigInt.prototype.toJSON = function () {
  return this.toString();
};

(async () => {
  try {
    // --- Imports ---
    const cors = require("cors");
    const path = require("path");

    const { PORT: ENV_PORT } = require("./config/env");
    const { UPLOADS_DIR } = require("./utils/files");
    const { transporter } = require("./lib/mailer");
    const { prisma } = require("./lib/prisma");
    const { ensureSchema } = require("./services/schemaService");
    const {
      ensureDefaultRoles,
      ensureSeedAdminUser,
    } = require("./services/seedService");

    // Routes
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
    const newsletterRoutes = require("./routes/newsletterRoutes");
    const diagnosticsRoutes = require("./routes/diagnosticsRoutes");

    const { uploadErrorHandler } = require("./middlewares/uploadErrorHandler");
    const { getDatabaseErrorResponse } = require("./utils/prismaErrors");

    // --- App ---
    const app = express();

    const PORT = process.env.PORT || ENV_PORT || 3000;
    const NODE_ENV = process.env.NODE_ENV || "development";
    const isProduction = NODE_ENV === "production";
    const isTest = NODE_ENV === "test";

    // =====================================================
    // ✅ CORS — CONFIGURATION PROPRE ET SÛRE
    // =====================================================
    const allowedOrigins = [
      "https://rootsmaghreb.com",
      "https://server.rootsmaghreb.com",
    ];

    const corsOptions = {
      origin: (origin, callback) => {
        // Autoriser Postman / appels server-side
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        return callback(new Error("CORS: Origin not allowed"));
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      optionsSuccessStatus: 204,
    };

    app.use(cors(corsOptions));
    app.options("*", cors(corsOptions));

    // =====================================================
    // Middlewares standards
    // =====================================================
    app.use(express.json({ limit: "50mb" }));
    app.use(express.urlencoded({ extended: true, limit: "50mb" }));

    app.use("/uploads", express.static(UPLOADS_DIR));

    // =====================================================
    // Logging Middleware
    // =====================================================
    app.use((req, res, next) => {
      console.log(`➡️  ${req.method} ${req.url}`);
      next();
    });

    // =====================================================
    // Routes API
    // =====================================================
    app.get("/api", (_req, res) => {
      res.json({ status: "ok" });
    });
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
    app.use("/api", newsletterRoutes);
    app.use("/api", diagnosticsRoutes);

    // Upload errors (multer)
    app.use(uploadErrorHandler);

    // =====================================================
    // 404
    // =====================================================
    app.use((req, res) => {
      res.status(404).json({
        error: "NotFound",
        message: `Cannot ${req.method} ${req.originalUrl}`,
      });
    });

    // =====================================================
    // Global error handler
    // =====================================================
    app.use((err, req, res, next) => {
      console.error("SERVER ERROR:", err);

      const dbError = getDatabaseErrorResponse(err);
      if (dbError) {
        return res.status(dbError.status).json({
          error: "DatabaseError",
          message: dbError.message,
        });
      }

      res.status(err.status || 500).json({
        error: err.name || "ServerError",
        message: isProduction ? "Internal Server Error" : err.message,
        ...(isProduction ? {} : { stack: err.stack }),
      });
    });

    // =====================================================
    // Vérifications services (DB / SMTP)
    // =====================================================
    try {
      if (!isTest) {
        await prisma.$queryRaw`SELECT 1`;
        console.log("✅ Database connected");

        await ensureSchema();
        if (process.env.SKIP_MAINTENANCE !== "true") {
          await ensureDefaultRoles();
          await ensureSeedAdminUser();
        }

        transporter.verify((err) => {
          if (err) console.error("❌ SMTP ERROR:", err.message);
          else console.log("✅ SMTP ready");
        });
      }
    } catch (innerError) {
      console.error("INIT ERROR:", innerError);
      erreur = innerError.message;
    }

    // =====================================================
    // Start server
    // =====================================================
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    // Fallback minimal server
    console.error("CRITICAL STARTUP ERROR:", error);
    erreur = error.message;

    const app = express();
    const PORT = process.env.PORT || 3000;

    app.get("/", (req, res) =>
      res.status(500).send("Erreur critique: " + erreur)
    );

    app.listen(PORT, () =>
      console.log(`⚠️ Server started in error mode on port ${PORT}`)
    );
  }
})();
