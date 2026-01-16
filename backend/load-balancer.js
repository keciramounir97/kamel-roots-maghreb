const cluster = require("cluster");
const os = require("os");
const path = require("path");

// Load env once in master so workers inherit the same values
require("dotenv").config({ path: path.join(__dirname, ".env") });
const { runMaintenance } = require("./src/startup/maintenance");
const { prisma } = require("./src/lib/prisma");

const WORKERS = Math.max(1, Number(process.env.WEB_CONCURRENCY) || os.cpus().length);

if (cluster.isPrimary) {
  (async () => {
    console.log(`Master ${process.pid} starting ${WORKERS} workers`);
    try {
      await runMaintenance();
      await prisma.$disconnect();
      console.log("Maintenance complete; forking workers");
    } catch (err) {
      console.error("Maintenance failed, exiting master:", err.message);
      process.exit(1);
    }

    const workerEnv = { ...process.env, SKIP_MAINTENANCE: "true" };
    for (let i = 0; i < WORKERS; i += 1) {
      cluster.fork(workerEnv);
    }

    cluster.on("exit", (worker, code, signal) => {
      console.warn(`Worker ${worker.process.pid} exited (${signal || code}), restarting`);
      cluster.fork(workerEnv);
    });
  })();
} else {
  process.env.SKIP_MAINTENANCE = "true";
  // Each worker runs the Express app
  require("./server");
}
