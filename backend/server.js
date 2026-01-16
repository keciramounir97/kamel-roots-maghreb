/**
 * Local Development Entry Point
 * Use this file for running the app locally with `npm start` or `node server.js`.
 */
const app = require("./app");
const config = require("./src/config/env");
const logger = require("./src/utils/logger");

const PORT = config.PORT || 5000;

const server = app.listen(PORT, () => {
  logger.info({ port: PORT, env: config.NODE_ENV }, "🚀 Local server started");
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  logger.info({ signal }, "Graceful shutdown initiated");
  server.close(async () => {
    try {
      const { prisma } = require("./src/lib/prisma");
      await prisma.$disconnect();
      logger.info("Database disconnected, exiting");
      process.exit(0);
    } catch (err) {
      logger.error(err, "Error during shutdown");
      process.exit(1);
    }
  });
  setTimeout(() => process.exit(1), 10000);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
