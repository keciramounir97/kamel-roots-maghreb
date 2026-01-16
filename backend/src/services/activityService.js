const { prisma } = require("../lib/prisma");
const { isDbUnavailable } = require("../utils/dbState");

const logActivity = async (actorUserId, type, description) => {
  const skip =
    String(process.env.SKIP_ACTIVITY_LOGS || "").toLowerCase() === "true";
  if (skip || !type || !description || isDbUnavailable()) return;

  const payload = {
    actorUserId: actorUserId || null,
    type,
    description,
  };

  setImmediate(() => {
    prisma.activityLog
      .create({ data: payload })
      .catch((err) =>
        console.error("Failed to log activity:", err.message)
      );
  });
};

module.exports = { logActivity };
