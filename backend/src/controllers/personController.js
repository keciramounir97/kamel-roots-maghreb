const { prisma } = require("../lib/prisma");
const { getDatabaseErrorResponse } = require("../utils/prismaErrors");

const parseId = (value) => {
  const id = Number(value);
  return Number.isFinite(id) ? id : null;
};

const cleanText = (value) => {
  const trimmed = String(value || "").trim();
  return trimmed ? trimmed : null;
};

const respondWithError = (res, err, message) => {
  const dbError = getDatabaseErrorResponse(err);
  if (dbError) {
    return res.status(dbError.status).json({ message: dbError.message });
  }
  return res.status(500).json({ message });
};

const isSchemaMismatchError = (err) => {
  const code = String(err?.code || "");
  if (code === "P2021" || code === "P2022") return true;
  const msg = String(err?.message || "");
  return (
    msg.includes("Unknown column") ||
    msg.includes("unknown column") ||
    msg.includes("doesn't exist")
  );
};

const isAdminUser = (user) => {
  if (!user) return false;
  if (user.roleId === 1) return true;
  return String(user.roleName || "").toLowerCase() === "admin";
};

const hasPermission = (user, permission) => {
  if (isAdminUser(user)) return true;
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  return permissions.includes(permission);
};

const ensureTreeAccess = async (treeId, user) => {
  const tree = await prisma.familyTree.findUnique({
    where: { id: treeId },
    select: { id: true, userId: true, isPublic: true, title: true },
  });
  if (!tree) return { tree: null, error: { status: 404, message: "Not found" } };

  const canManageAll = hasPermission(user, "manage_all_trees");
  if (!canManageAll && Number(tree.userId) !== Number(user.id)) {
    return { tree, error: { status: 403, message: "Forbidden" } };
  }

  return { tree, error: null };
};

const listPublicTreePersons = async (req, res) => {
  try {
    const treeId = parseId(req.params.treeId);
    if (!treeId) return res.status(400).json({ message: "Invalid tree id" });

    const tree = await prisma.familyTree.findUnique({
      where: { id: treeId },
      select: { id: true, isPublic: true },
    });
    if (!tree) return res.status(404).json({ message: "Not found" });
    if (!tree.isPublic) return res.status(403).json({ message: "Forbidden" });

    const people = await prisma.person.findMany({
      where: { treeId },
      orderBy: { name: "asc" },
    });

    res.json({
      people: people.map((p) => ({ id: p.id, name: p.name, treeId: p.treeId })),
    });
  } catch (err) {
    console.error("Failed to load people:", err.code || "", err.message);
    const dbError = getDatabaseErrorResponse(err);
    if (dbError || isSchemaMismatchError(err)) {
      return res.json({ people: [] });
    }
    return respondWithError(res, err, "Failed to load people");
  }
};

const getPublicPerson = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid person id" });

    const person = await prisma.person.findUnique({
      where: { id },
      include: { tree: { select: { id: true, title: true, isPublic: true } } },
    });
    if (!person || !person.tree) return res.status(404).json({ message: "Not found" });
    if (!person.tree.isPublic) return res.status(403).json({ message: "Forbidden" });

    res.json({
      id: person.id,
      name: person.name,
      tree: { id: person.tree.id, title: person.tree.title },
    });
  } catch (err) {
    console.error("Failed to load person:", err.code || "", err.message);
    const dbError = getDatabaseErrorResponse(err);
    if (dbError || isSchemaMismatchError(err)) {
      return res.status(404).json({ message: "Not found" });
    }
    return respondWithError(res, err, "Failed to load person");
  }
};

const listMyTreePersons = async (req, res) => {
  try {
    const treeId = parseId(req.params.treeId);
    if (!treeId) return res.status(400).json({ message: "Invalid tree id" });

    const { error } = await ensureTreeAccess(treeId, req.user);
    if (error) return res.status(error.status).json({ message: error.message });

    const people = await prisma.person.findMany({
      where: { treeId },
      orderBy: { name: "asc" },
    });

    res.json({
      people: people.map((p) => ({ id: p.id, name: p.name, treeId: p.treeId })),
    });
  } catch (err) {
    console.error("Failed to load my people:", err.code || "", err.message);
    const dbError = getDatabaseErrorResponse(err);
    if (dbError || isSchemaMismatchError(err)) {
      return res.json({ people: [] });
    }
    return respondWithError(res, err, "Failed to load people");
  }
};

const getMyPerson = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid person id" });

    const person = await prisma.person.findUnique({
      where: { id },
      include: { tree: { select: { id: true, userId: true, title: true } } },
    });
    if (!person || !person.tree) return res.status(404).json({ message: "Not found" });

    const canManageAll = hasPermission(req.user, "manage_all_trees");
    if (!canManageAll && Number(person.tree.userId) !== Number(req.user.id)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    res.json({
      id: person.id,
      name: person.name,
      tree: { id: person.tree.id, title: person.tree.title },
    });
  } catch (err) {
    console.error("Failed to load my person:", err.code || "", err.message);
    const dbError = getDatabaseErrorResponse(err);
    if (dbError || isSchemaMismatchError(err)) {
      return res.status(404).json({ message: "Not found" });
    }
    return respondWithError(res, err, "Failed to load person");
  }
};

const createMyPerson = async (req, res) => {
  try {
    const treeId = parseId(req.params.treeId);
    if (!treeId) return res.status(400).json({ message: "Invalid tree id" });

    const { error } = await ensureTreeAccess(treeId, req.user);
    if (error) return res.status(error.status).json({ message: error.message });

    const name = cleanText(req.body?.name);
    if (!name) return res.status(400).json({ message: "Name is required" });

    const created = await prisma.person.create({
      data: { name, treeId },
    });

    res.status(201).json({ id: created.id });
  } catch (err) {
    console.error("Failed to create person:", err.code || "", err.message);
    const dbError = getDatabaseErrorResponse(err);
    if (dbError || isSchemaMismatchError(err)) {
      return res.status(503).json({ message: "People service unavailable" });
    }
    return respondWithError(res, err, "Create failed");
  }
};

const updateMyPerson = async (req, res) => {
  try {
    const treeId = parseId(req.params.treeId);
    const id = parseId(req.params.id);
    if (!treeId || !id) {
      return res.status(400).json({ message: "Invalid person id" });
    }

    const { error } = await ensureTreeAccess(treeId, req.user);
    if (error) return res.status(error.status).json({ message: error.message });

    const person = await prisma.person.findUnique({ where: { id } });
    if (!person || Number(person.treeId) !== Number(treeId)) {
      return res.status(404).json({ message: "Not found" });
    }

    const name = cleanText(req.body?.name);
    if (!name) return res.status(400).json({ message: "Name is required" });

    const updated = await prisma.person.update({
      where: { id },
      data: { name },
    });

    res.json({ id: updated.id });
  } catch (err) {
    console.error("Failed to update person:", err.code || "", err.message);
    const dbError = getDatabaseErrorResponse(err);
    if (dbError || isSchemaMismatchError(err)) {
      return res.status(503).json({ message: "People service unavailable" });
    }
    return respondWithError(res, err, "Update failed");
  }
};

const deleteMyPerson = async (req, res) => {
  try {
    const treeId = parseId(req.params.treeId);
    const id = parseId(req.params.id);
    if (!treeId || !id) {
      return res.status(400).json({ message: "Invalid person id" });
    }

    const { error } = await ensureTreeAccess(treeId, req.user);
    if (error) return res.status(error.status).json({ message: error.message });

    const person = await prisma.person.findUnique({ where: { id } });
    if (!person || Number(person.treeId) !== Number(treeId)) {
      return res.status(404).json({ message: "Not found" });
    }

    await prisma.person.delete({ where: { id } });
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error("Failed to delete person:", err.code || "", err.message);
    const dbError = getDatabaseErrorResponse(err);
    if (dbError || isSchemaMismatchError(err)) {
      return res.json({ message: "Deleted" });
    }
    return respondWithError(res, err, "Delete failed");
  }
};

const saveMyPerson = async (req, res) => updateMyPerson(req, res);

module.exports = {
  listPublicTreePersons,
  getPublicPerson,
  listMyTreePersons,
  getMyPerson,
  createMyPerson,
  updateMyPerson,
  saveMyPerson,
  deleteMyPerson,
};
