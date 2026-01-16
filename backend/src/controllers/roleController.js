const { prisma } = require("../lib/prisma");

const listRoles = async (_req, res) => {
  try {
    const roles = await prisma.role.findMany({ orderBy: { id: "asc" } });
    res.json(
      roles.map((r) => ({
        id: r.id,
        name: r.name,
        permissions: r.permissions,
      }))
    );
  } catch (err) {
    console.error("Load roles failed:", err.message);
    res.status(500).json({ message: "Failed to load roles" });
  }
};

module.exports = { listRoles };
