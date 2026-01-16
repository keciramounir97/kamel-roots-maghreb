const { prisma } = require("../lib/prisma");

const getStats = async (_req, res) => {
  try {
    const users = await prisma.user.count();
    const books = await prisma.book.count();
    const trees = await prisma.familyTree.count();
    const people = await prisma.person.count();
    res.json({ users, books, trees, people });
  } catch (err) {
    console.error("Failed to load admin stats:", err.code || "", err.message);
    res.status(500).json({ message: "Failed to load admin stats" });
  }
};

module.exports = { getStats };
