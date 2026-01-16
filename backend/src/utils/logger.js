const pino = require("pino");
const { isProduction } = require("../config/env");

/**
 * Production-ready structured logger using Pino.
 * Provides fast, low-overhead logging with JSON output for log aggregators (ELK, Datadog, etc.)
 */
const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  base: isProduction
    ? { pid: process.pid, hostname: process.env.HOSTNAME }
    : undefined,
  transport: !isProduction
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss Z",
          ignore: "pid,hostname",
        },
      }
    : undefined,
});

module.exports = logger;
