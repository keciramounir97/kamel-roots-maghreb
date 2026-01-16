/**
 * Passenger Entry Point
 * This file is required by Phusion Passenger on cPanel.
 */
const app = require("./src/app");
const logger = require("./src/utils/logger");
const { prisma } = require("./src/lib/prisma");
const { ensureSchema } = require("./src/services/schemaService");
const {
  ensureDefaultRoles,
  ensureSeedAdminUser,
} = require("./src/services/seedService");
const { markDbDown } = require("./src/utils/dbState");

// Initialize background tasks
(async () => {
  try {
    // Test DB connection
    await prisma.$queryRaw`SELECT 1`;
    logger.info("Database connected");

    // Ensure Schema & Seed
    await ensureSchema();
    if (process.env.SKIP_MAINTENANCE !== "true") {
      await ensureDefaultRoles();
      await ensureSeedAdminUser();
    }
    logger.info("Background initialization complete");
  } catch (err) {
    logger.error(err, "Background initialization failed");
    markDbDown(err);
  }
})();

module.exports = app;
