const { prisma } = require("../lib/prisma");

const listActivityAdmin = async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    const type = String(req.query.type || "all");
    const limit = Math.min(Number(req.query.limit || 50) || 50, 200);

    const where = {
      ...(type !== "all" ? { type } : {}),
      ...(q ? { description: { contains: q } } : {}),
    };
    const rows = await prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    const userIds = rows
      .map((r) => r.actorUserId)
      .filter((v) => v !== null && v !== undefined);
    const users = userIds.length
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, fullName: true, email: true },
        })
      : [];
    const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

    res.json(
      rows.map((r) => ({
        id: r.id,
        type: r.type,
        description: r.description,
        user: userMap[r.actorUserId]?.fullName || userMap[r.actorUserId]?.email || "System",
        date: r.createdAt,
      }))
    );
  } catch (err) {
    console.error("Failed to load activity:", err.code || "", err.message);
    res.status(500).json({ message: "Failed to load activity" });
  }
};

const listActivityUser = async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    const type = String(req.query.type || "all");
    const limit = Math.min(Number(req.query.limit || 50) || 50, 200);

    const rows = await prisma.activityLog.findMany({
      where: {
        actorUserId: req.user.id,
        ...(type !== "all" ? { type } : {}),
        ...(q ? { description: { contains: q } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    res.json(
      rows.map((r) => ({
        id: r.id,
        type: r.type,
        description: r.description,
        user: req.user.fullName || req.user.email,
        date: r.createdAt,
      }))
    );
  } catch (err) {
    console.error("Failed to load user activity:", err.code || "", err.message);
    res.status(500).json({ message: "Failed to load activity" });
  }
};

module.exports = { listActivityAdmin, listActivityUser };
