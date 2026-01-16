const { PrismaClient } = require("@prisma/client");
const { DB_NAME } = require("../config/env");
const {
  isDbUnavailable,
  markDbDown,
  clearDbDown,
} = require("../utils/dbState");

const prisma = new PrismaClient({
  log: process.env.DEBUG_PRISMA ? ["query", "warn", "error"] : ["error"],
});

const shouldBackoff = (err) => {
  const code = err?.code;
  if (["P1000", "P1001", "P1002", "P1003", "P2024"].includes(code)) {
    return true;
  }
  const msg = String(err?.message || "");
  return (
    msg.includes("Can't reach database server") ||
    msg.includes("Timed out fetching a new connection") ||
    msg.includes("connect ECONNREFUSED") ||
    msg.includes("connection pool")
  );
};

const backoffForError = (err) => {
  if (err?.code === "P2024") {
    return Number(process.env.DB_POOL_BACKOFF_MS || 3000) || 3000;
  }
  return null;
};

prisma.$use(async (params, next) => {
  if (isDbUnavailable()) {
    const err = new Error("Database unavailable.");
    err.code = "P1001";
    throw err;
  }

  try {
    const result = await next(params);
    clearDbDown();
    return result;
  } catch (err) {
    if (shouldBackoff(err)) {
      markDbDown(err, backoffForError(err));
    }
    throw err;
  }
});

module.exports = { prisma, DB_NAME };
