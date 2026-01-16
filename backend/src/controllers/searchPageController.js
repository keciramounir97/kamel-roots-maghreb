const jwt = require("jsonwebtoken");
const { prisma } = require("../lib/prisma");
const { JWT_SECRET } = require("../config/env");
const { loadAuthUserById } = require("../services/authService");

const getOptionalUser = async (req) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return null;

  let payload;
  try {
    payload = jwt.verify(header.split(" ")[1], JWT_SECRET);
  } catch {
    return null;
  }

  const userId = payload?.id;
  const sid = payload?.sid;
  if (!userId || !sid) return null;

  const user = await loadAuthUserById(userId);
  if (!user) return null;
  if (String(user.status).toLowerCase() !== "active") return null;
  if (!user.sessionToken || user.sessionToken !== sid) return null;

  return user;
};

// Library/Research combined suggestions endpoint
const suggest = async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    if (!q) return res.json({ books: [], trees: [], people: [] });

    const user = await getOptionalUser(req);
    const canSeeAllTrees =
      user && Array.isArray(user.permissions)
        ? user.permissions.includes("manage_all_trees")
        : false;
    const treeVisibility = canSeeAllTrees
      ? null
      : user
      ? { OR: [{ isPublic: true }, { userId: user.id }] }
      : { isPublic: true };

    const books = await prisma.book.findMany({
      where: { isPublic: true, title: { startsWith: q } },
      orderBy: { title: "asc" },
      take: 10,
      select: { id: true, title: true, author: true },
    });

    const treeWhere = treeVisibility
      ? { AND: [{ title: { startsWith: q } }, treeVisibility] }
      : { title: { startsWith: q } };

    const trees = await prisma.familyTree.findMany({
      where: treeWhere,
      orderBy: { title: "asc" },
      take: 10,
      select: {
        id: true,
        title: true,
        description: true,
        isPublic: true,
        owner: { select: { fullName: true } },
      },
    });

    const peopleWhere = { name: { startsWith: q } };
    if (treeVisibility) {
      peopleWhere.tree = treeVisibility;
    }

    const people = await prisma.person.findMany({
      where: peopleWhere,
      orderBy: { name: "asc" },
      take: 10,
      include: {
        tree: {
          select: {
            id: true,
            title: true,
            description: true,
            isPublic: true,
            owner: { select: { fullName: true } },
          },
        },
      },
    });

    res.json({
      books,
      trees: trees.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        isPublic: !!t.isPublic,
        owner_name: t.owner?.fullName || null,
      })),
      people: people
        .filter((p) => p.tree)
        .map((p) => ({
          id: p.id,
          name: p.name,
          tree_id: p.tree.id,
          tree_title: p.tree.title,
          tree_description: p.tree.description,
          tree_is_public: !!p.tree.isPublic,
          owner_name: p.tree.owner?.fullName || null,
        })),
    });
  } catch (err) {
    console.error("Suggest failed:", err.message);
    res.status(500).json({ message: "Suggest failed" });
  }
};

module.exports = { suggest };
