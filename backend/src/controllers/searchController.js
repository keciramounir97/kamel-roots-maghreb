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

const search = async (req, res) => {
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
      where: {
        isPublic: true,
        OR: [
          { title: { startsWith: q } },
          { author: { startsWith: q } },
          { category: { startsWith: q } },
          { description: { contains: q } },
        ],
      },
      orderBy: { title: "asc" },
      take: 20,
      select: {
        id: true,
        title: true,
        author: true,
        description: true,
        category: true,
        filePath: true,
        isPublic: true,
      },
    });

    const treeSearch = {
      OR: [
        { title: { startsWith: q } },
        { title: { contains: q } },
        { description: { startsWith: q } },
        { description: { contains: q } },
      ],
    };
    const treeWhere = treeVisibility
      ? { AND: [treeSearch, treeVisibility] }
      : treeSearch;

    const trees = await prisma.familyTree.findMany({
      where: treeWhere,
      orderBy: { title: "asc" },
      take: 20,
      select: {
        id: true,
        title: true,
        description: true,
        userId: true,
        isPublic: true,
      },
    });
    const ownerIds = trees
      .map((t) => t.userId)
      .filter((v) => v !== null && v !== undefined);
    const owners = ownerIds.length
      ? await prisma.user.findMany({
          where: { id: { in: ownerIds } },
          select: { id: true, fullName: true },
        })
      : [];
    const ownerMap = Object.fromEntries(owners.map((o) => [o.id, o]));

    const people = await prisma.person.findMany({
      where: {
        name: { contains: q },
        ...(treeVisibility ? { tree: treeVisibility } : {}),
      },
      orderBy: { name: "asc" },
      take: 30,
      include: {
        tree: {
          select: {
            id: true,
            title: true,
            description: true,
            userId: true,
            isPublic: true,
            owner: { select: { fullName: true } },
          },
        },
      },
    });

    res.json({
      books: books.map((b) => ({
        id: b.id,
        title: b.title,
        author: b.author,
        description: b.description,
        category: b.category,
        file_path: b.filePath,
        is_public: b.isPublic,
      })),
      trees: trees.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        owner_name: ownerMap[t.userId]?.fullName || null,
        isPublic: !!t.isPublic,
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
    console.error("Search failed:", err.message);
    res.status(500).json({ message: "Search failed" });
  }
};

module.exports = { search };
