const prismaErrorMap = {
  P1000: "Database authentication failed.",
  P1001: "Database unavailable. Please try again later.",
  P1002: "Database connection timed out.",
  P1003: "Database does not exist or is unreachable.",
  P2024: "Database connection pool exhausted. Please retry shortly.",
  P2021: "Database schema is missing required tables.",
  P2022: "Database schema is missing required columns.",
};

const getDatabaseErrorResponse = (err) => {
  if (!err) return null;
  const code = err.code;
  if (code && prismaErrorMap[code]) {
    const isSchemaMismatch = code === "P2021" || code === "P2022";
    return {
      status: isSchemaMismatch ? 500 : 503,
      message: prismaErrorMap[code],
    };
  }
  if (err.name === "PrismaClientInitializationError") {
    return { status: 503, message: prismaErrorMap.P1001 };
  }
  const msg = String(err.message || "");
  if (
    msg.includes("Can't reach database server") ||
    msg.includes("Timed out fetching a new connection") ||
    msg.includes("connection pool")
  ) {
    return { status: 503, message: prismaErrorMap.P1001 };
  }
  if (
    msg.includes("doesn't exist") ||
    msg.includes("Unknown column") ||
    msg.includes("unknown column")
  ) {
    return {
      status: 500,
      message:
        "Database schema mismatch. Apply migrations or run ensureSchema.",
    };
  }
  return null;
};

module.exports = { getDatabaseErrorResponse };
