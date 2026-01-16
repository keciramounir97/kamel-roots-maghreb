const path = require("path");
const dotenv = require("dotenv");

// Load .env file
dotenv.config({ path: path.join(__dirname, "..", "..", ".env") });

const stripQuotes = (value) =>
  String(value || "")
    .replace(/^["']|["']$/g, "")
    .trim();

/**
 * Validates that required environment variables are present and correctly formatted.
 * Fail-fast approach for production reliability.
 */
const validateEnv = () => {
  const required = ["DATABASE_URL", "JWT_SECRET"];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error("❌ CRITICAL: Missing required environment variables:");
    missing.forEach((key) => console.error(`   - ${key}`));
    if (process.env.NODE_ENV === "production") {
      process.exit(1);
    }
  }

  // Warning for missing optional but important vars
  const important = ["SMTP_HOST", "SMTP_USER", "SMTP_PASS", "CORS_ORIGIN"];
  const missingImportant = important.filter((key) => !process.env[key]);
  if (missingImportant.length > 0) {
    console.warn(
      "⚠️  WARNING: Missing some important environment variables (features may be degraded):"
    );
    missingImportant.forEach((key) => console.warn(`   - ${key}`));
  }
};

// Execute validation
validateEnv();

const buildDatabaseUrl = () => {
  const host = stripQuotes(process.env.DB_HOST);
  const port = stripQuotes(process.env.DB_PORT) || 3306;
  const name = stripQuotes(process.env.DB_NAME);
  const user = stripQuotes(process.env.DB_USER);
  const pass = stripQuotes(process.env.DB_PASSWORD);

  if (!host || !name || !user || pass === undefined) return null;

  const encodedUser = encodeURIComponent(user);
  const encodedPass = encodeURIComponent(pass);
  return `mysql://${encodedUser}:${encodedPass}@${host}:${port}/${name}`;
};

// Align DATABASE_URL with individual DB_* vars if they exist
(() => {
  const url = buildDatabaseUrl();
  if (url) {
    process.env.DATABASE_URL = url;
  }
})();

const DEFAULT_CORS_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:4173",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:4173",
  "http://localhost:5000",
  "https://rootsmaghreb.com",
  "https://www.rootsmaghreb.com",
];

const normalizeOrigin = (origin) =>
  stripQuotes(String(origin || "").trim()).replace(/\/$/, "");

const RAW_ALLOWED = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",")
  : DEFAULT_CORS_ORIGINS;

const allowedOrigins = RAW_ALLOWED.map(normalizeOrigin).filter(Boolean);

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  const normalized = normalizeOrigin(origin);
  if (!normalized) return false;
  return allowedOrigins.includes(normalized);
};

const parseDbName = () => {
  if (process.env.DB_NAME) return stripQuotes(process.env.DB_NAME);
  try {
    const rawUrl = stripQuotes(process.env.DATABASE_URL || "");
    const parsed = new URL(rawUrl);
    return parsed.pathname.replace(/^\//, "") || null;
  } catch {
    return null;
  }
};

const DB_NAME = parseDbName();
const JWT_SECRET =
  stripQuotes(process.env.JWT_SECRET) ||
  process.env.JWT_FALLBACK ||
  "change-me-in-prod";

if (
  JWT_SECRET === "change-me-in-prod" &&
  process.env.NODE_ENV === "production"
) {
  console.error(
    "❌ CRITICAL: JWT_SECRET is using insecure fallback in production!"
  );
  process.exit(1);
}

module.exports = {
  NODE_ENV: process.env.NODE_ENV || "development",
  isProduction: process.env.NODE_ENV === "production",
  isTest: process.env.NODE_ENV === "test",
  allowedOrigins,
  isAllowedOrigin,
  DB_NAME,
  JWT_SECRET,
  PORT: Number(process.env.PORT) || 5000,
  SESSION_TTL_SECONDS:
    Number(process.env.SESSION_TTL_SECONDS) ||
    Number(process.env.JWT_EXPIRES_IN) ||
    60 * 60 * 24 * 30,
  RESET_TTL_SECONDS: Number(process.env.RESET_CODE_TTL) || 900,
  UPLOADS_DIR: path.resolve(__dirname, "..", "..", "uploads"),
};
