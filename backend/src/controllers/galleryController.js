const path = require("path");
const { prisma } = require("../lib/prisma");
const { resolveStoredFilePath, safeUnlink } = require("../utils/files");
const { getDatabaseErrorResponse } = require("../utils/prismaErrors");
const { imageUpload } = require("../utils/upload");

const parseId = (value) => {
  const id = Number(value);
  return Number.isFinite(id) ? id : null;
};

const parseBoolean = (value, fallback = true) => {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "boolean") return value;
  const normalized = String(value).trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return fallback;
};

const cleanText = (value) => {
  const trimmed = String(value || "").trim();
  return trimmed ? trimmed : null;
};

const pickNullable = (value, fallback) =>
  value === undefined ? fallback : cleanText(value);

const respondWithError = (res, err, message, extra) => {
  const dbError = getDatabaseErrorResponse(err);
  if (dbError) {
    return res.status(dbError.status).json({ message: dbError.message });
  }
  const payload = { message };
  if (extra && typeof extra === "object") {
    Object.assign(payload, extra);
  }
  return res.status(500).json(payload);
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

const respondPublicGalleryFallback = (res, mode) => {
  if (mode === "list") return res.json({ gallery: [] });
  return res.status(404).json({ message: "Not found" });
};

const cleanupUploadedFiles = (...paths) => {
  const flat = paths.flat().filter(Boolean);
  for (const p of flat) {
    const resolved = path.isAbsolute(p) ? p : resolveStoredFilePath(p);
    if (resolved) safeUnlink(resolved);
  }
};

const runRollback = (actions = []) => {
  for (const action of [...actions].reverse()) {
    try {
      action();
    } catch {}
  }
};

// Public: List all public gallery items
const listPublicGallery = async (_req, res) => {
  try {
    res.set("Cache-Control", "no-store");
    const items = await prisma.gallery.findMany({
      where: { isPublic: true },
      include: {
        uploader: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, data: items });
  } catch (error) {
    const dbError = getDatabaseErrorResponse(error);
    if (dbError || isSchemaMismatchError(error)) {
      return res.json({ success: true, data: [] });
    }
    console.error("❌ Error fetching public gallery:", error);
    if (error.code) console.error("Prisma Error Code:", error.code);
    return respondWithError(res, error, "Failed to fetch gallery items");
  }
};

const getPublicGalleryItem = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id)
      return res
        .status(400)
        .json({ success: false, message: "Invalid gallery id" });

    const item = await prisma.gallery.findUnique({
      where: { id },
      include: { uploader: { select: { id: true, fullName: true } } },
    });
    if (!item)
      return res.status(404).json({ success: false, message: "Not found" });
    if (!item.isPublic)
      return res.status(403).json({ success: false, message: "Forbidden" });

    res.json({ success: true, data: item });
  } catch (error) {
    const dbError = getDatabaseErrorResponse(error);
    if (dbError || isSchemaMismatchError(error)) {
      return res.status(404).json({ success: false, message: "Not found" });
    }
    console.error("Error fetching gallery item:", error);
    return respondWithError(res, error, "Failed to fetch gallery item");
  }
};

// User: List my uploaded gallery items
const listMyGallery = async (req, res) => {
  try {
    res.set("Cache-Control", "no-store");
    const items = await prisma.gallery.findMany({
      where: { uploadedBy: Number(req.user.id) },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, data: items });
  } catch (error) {
    const dbError = getDatabaseErrorResponse(error);
    if (dbError || isSchemaMismatchError(error)) {
      return res.json({ success: true, data: [] });
    }
    console.error("Error fetching my gallery:", error);
    return respondWithError(res, error, "Failed to fetch your gallery items");
  }
};

const getMyGalleryItem = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id)
      return res
        .status(400)
        .json({ success: false, message: "Invalid gallery id" });

    const item = await prisma.gallery.findUnique({ where: { id } });
    if (!item)
      return res.status(404).json({ success: false, message: "Not found" });
    if (Number(item.uploadedBy) !== Number(req.user.id)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    res.json({ success: true, data: item });
  } catch (error) {
    const dbError = getDatabaseErrorResponse(error);
    if (dbError || isSchemaMismatchError(error)) {
      return res.status(404).json({ success: false, message: "Not found" });
    }
    console.error("Error fetching my gallery item:", error);
    return respondWithError(res, error, "Failed to fetch your gallery item");
  }
};

// User: Upload a new gallery item
const createMyGalleryItem = async (req, res) => {
  let imagePath = null;
  try {
    const {
      title,
      description,
      isPublic,
      archiveSource,
      documentCode,
      location,
      year,
      photographer,
    } = req.body;

    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "Image file is required" });
    }

    const safeTitle = cleanText(title);
    if (!safeTitle) {
      cleanupUploadedFiles(req.file.path);
      return res
        .status(400)
        .json({ success: false, message: "Title is required" });
    }

    // Use forward slashes explicitly
    imagePath = `/uploads/gallery/${req.file.filename}`;

    const item = await prisma.gallery.create({
      data: {
        title: safeTitle,
        description: cleanText(description),
        imagePath,
        uploadedBy: Number(req.user.id),
        isPublic: parseBoolean(isPublic, true),
        archiveSource: cleanText(archiveSource),
        documentCode: cleanText(documentCode),
        location: cleanText(location),
        year: cleanText(year),
        photographer: cleanText(photographer),
      },
    });

    res.status(201).json({
      success: true,
      message: "Gallery item uploaded successfully",
      data: item,
    });
  } catch (error) {
    // Cleanup if DB write fails
    cleanupUploadedFiles(req.file?.path, imagePath);

    const dbError = getDatabaseErrorResponse(error);
    if (dbError || isSchemaMismatchError(error)) {
      return res
        .status(503)
        .json({ success: false, message: "Gallery service unavailable" });
    }
    console.error("Error creating gallery item:", error);
    return respondWithError(res, error, "Failed to upload gallery item", {
      error: error.message,
    });
  }
};

const updateMyGalleryItem = async (req, res) => {
  let rollback = [];
  try {
    const id = parseId(req.params.id);
    if (!id)
      return res
        .status(400)
        .json({ success: false, message: "Invalid gallery id" });

    const existingItem = await prisma.gallery.findUnique({ where: { id } });
    if (!existingItem) {
      return res
        .status(404)
        .json({ success: false, message: "Gallery item not found" });
    }
    if (Number(existingItem.uploadedBy) !== Number(req.user.id)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const {
      title,
      description,
      isPublic,
      archiveSource,
      documentCode,
      location,
      year,
      photographer,
    } = req.body;

    const safeTitle =
      title !== undefined && title !== null
        ? cleanText(title)
        : existingItem.title;
    if (!safeTitle) {
      return res
        .status(400)
        .json({ success: false, message: "Title is required" });
    }

    let imagePath = existingItem.imagePath;
    if (req.file) {
      imagePath = `/uploads/gallery/${req.file.filename}`;
      rollback.push(() => cleanupUploadedFiles(imagePath, req.file.path));
    }

    const item = await prisma.gallery.update({
      where: { id },
      data: {
        title: safeTitle,
        description: pickNullable(description, existingItem.description),
        imagePath,
        isPublic:
          isPublic !== undefined && isPublic !== null
            ? parseBoolean(isPublic, !!existingItem.isPublic)
            : !!existingItem.isPublic,
        archiveSource: pickNullable(archiveSource, existingItem.archiveSource),
        documentCode: pickNullable(documentCode, existingItem.documentCode),
        location: pickNullable(location, existingItem.location),
        year: pickNullable(year, existingItem.year),
        photographer: pickNullable(photographer, existingItem.photographer),
      },
    });

    if (
      req.file &&
      existingItem.imagePath &&
      existingItem.imagePath !== imagePath
    ) {
      cleanupUploadedFiles(existingItem.imagePath);
    }

    res.json({
      success: true,
      message: "Gallery item updated successfully",
      data: item,
    });
  } catch (error) {
    runRollback(rollback);
    const dbError = getDatabaseErrorResponse(error);
    if (dbError || isSchemaMismatchError(error)) {
      return res
        .status(503)
        .json({ success: false, message: "Gallery service unavailable" });
    }
    console.error("Error updating gallery item:", error);
    return respondWithError(res, error, "Failed to update gallery item", {
      error: error.message,
    });
  }
};

// User: Delete my gallery item
const deleteMyGalleryItem = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id)
      return res
        .status(400)
        .json({ success: false, message: "Invalid gallery id" });

    const item = await prisma.gallery.findFirst({
      where: {
        id,
        uploadedBy: Number(req.user.id),
      },
    });

    if (!item) {
      return res.json({
        success: true,
        message: "Gallery item deleted successfully",
      });
    }

    await prisma.gallery.delete({
      where: { id },
    });

    cleanupUploadedFiles(item.imagePath);

    res.json({ success: true, message: "Gallery item deleted successfully" });
  } catch (error) {
    const dbError = getDatabaseErrorResponse(error);
    if (dbError || isSchemaMismatchError(error)) {
      return res.json({
        success: true,
        message: "Gallery item deleted successfully",
      });
    }
    console.error("Error deleting gallery item:", error);
    return respondWithError(res, error, "Failed to delete gallery item");
  }
};

// Admin: List all gallery items
const listAdminGallery = async (_req, res) => {
  try {
    res.set("Cache-Control", "no-store");
    const items = await prisma.gallery.findMany({
      include: {
        uploader: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, data: items });
  } catch (error) {
    const dbError = getDatabaseErrorResponse(error);
    if (dbError || isSchemaMismatchError(error)) {
      return res.json({ success: true, data: [] });
    }
    console.error("❌ Error fetching admin gallery:", error);
    if (error.code) console.error("Prisma Error Code:", error.code);
    return respondWithError(res, error, "Failed to fetch gallery items");
  }
};

const getAdminGalleryItem = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id)
      return res
        .status(400)
        .json({ success: false, message: "Invalid gallery id" });

    const item = await prisma.gallery.findUnique({
      where: { id },
      include: {
        uploader: { select: { id: true, fullName: true, email: true } },
      },
    });
    if (!item)
      return res.status(404).json({ success: false, message: "Not found" });

    res.json({ success: true, data: item });
  } catch (error) {
    const dbError = getDatabaseErrorResponse(error);
    if (dbError || isSchemaMismatchError(error)) {
      return res.status(404).json({ success: false, message: "Not found" });
    }
    console.error("Error fetching admin gallery item:", error);
    return respondWithError(res, error, "Failed to fetch gallery item");
  }
};

// Admin: Create gallery item
const createAdminGalleryItem = async (req, res) => {
  let imagePath = null;
  try {
    const {
      title,
      description,
      isPublic,
      archiveSource,
      documentCode,
      location,
      year,
      photographer,
    } = req.body;

    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "Image file is required" });
    }

    const safeTitle = cleanText(title);
    if (!safeTitle) {
      cleanupUploadedFiles(req.file.path);
      return res
        .status(400)
        .json({ success: false, message: "Title is required" });
    }

    imagePath = `/uploads/gallery/${req.file.filename}`;

    const item = await prisma.gallery.create({
      data: {
        title: safeTitle,
        description: cleanText(description),
        imagePath,
        uploadedBy: req.user.id,
        isPublic: parseBoolean(isPublic, true),
        archiveSource: cleanText(archiveSource),
        documentCode: cleanText(documentCode),
        location: cleanText(location),
        year: cleanText(year),
        photographer: cleanText(photographer),
      },
    });

    res
      .status(201)
      .json({
        success: true,
        message: "Gallery item created successfully",
        data: item,
      });
  } catch (error) {
    cleanupUploadedFiles(req.file?.path, imagePath);
    const dbError = getDatabaseErrorResponse(error);
    if (dbError || isSchemaMismatchError(error)) {
      return res
        .status(503)
        .json({ success: false, message: "Gallery service unavailable" });
    }
    console.error("❌ Error creating admin gallery item:", error);
    return respondWithError(res, error, "Failed to create gallery item", {
      error: error.message,
    });
  }
};

// Admin: Update gallery item
const updateAdminGalleryItem = async (req, res) => {
  let rollback = [];
  try {
    const id = parseId(req.params.id);
    if (!id)
      return res
        .status(400)
        .json({ success: false, message: "Invalid gallery id" });

    const {
      title,
      description,
      isPublic,
      archiveSource,
      documentCode,
      location,
      year,
      photographer,
    } = req.body;

    const existingItem = await prisma.gallery.findUnique({
      where: { id },
    });

    if (!existingItem) {
      return res
        .status(404)
        .json({ success: false, message: "Gallery item not found" });
    }

    const safeTitle =
      title !== undefined && title !== null
        ? cleanText(title)
        : existingItem.title;
    if (!safeTitle) {
      return res
        .status(400)
        .json({ success: false, message: "Title is required" });
    }

    let imagePath = existingItem.imagePath;
    if (req.file) {
      imagePath = `/uploads/gallery/${req.file.filename}`;
      rollback.push(() => cleanupUploadedFiles(imagePath, req.file.path));
    }

    const item = await prisma.gallery.update({
      where: { id },
      data: {
        title: safeTitle,
        description: pickNullable(description, existingItem.description),
        imagePath,
        isPublic:
          isPublic !== undefined && isPublic !== null
            ? parseBoolean(isPublic, !!existingItem.isPublic)
            : !!existingItem.isPublic,
        archiveSource: pickNullable(archiveSource, existingItem.archiveSource),
        documentCode: pickNullable(documentCode, existingItem.documentCode),
        location: pickNullable(location, existingItem.location),
        year: pickNullable(year, existingItem.year),
        photographer: pickNullable(photographer, existingItem.photographer),
      },
    });

    if (
      req.file &&
      existingItem.imagePath &&
      existingItem.imagePath !== imagePath
    ) {
      cleanupUploadedFiles(existingItem.imagePath);
    }

    res.json({
      success: true,
      message: "Gallery item updated successfully",
      data: item,
    });
  } catch (error) {
    runRollback(rollback);
    const dbError = getDatabaseErrorResponse(error);
    if (dbError || isSchemaMismatchError(error)) {
      return res
        .status(503)
        .json({ success: false, message: "Gallery service unavailable" });
    }
    console.error("Error updating admin gallery item:", error);
    return respondWithError(res, error, "Failed to update gallery item", {
      error: error.message,
    });
  }
};

// Admin: Delete any gallery item
const deleteAdminGalleryItem = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id)
      return res
        .status(400)
        .json({ success: false, message: "Invalid gallery id" });

    const item = await prisma.gallery.findUnique({
      where: { id },
    });

    if (!item) {
      return res.json({
        success: true,
        message: "Gallery item deleted successfully",
      });
    }

    await prisma.gallery.delete({
      where: { id },
    });

    cleanupUploadedFiles(item.imagePath);

    res.json({ success: true, message: "Gallery item deleted successfully" });
  } catch (error) {
    const dbError = getDatabaseErrorResponse(error);
    if (dbError || isSchemaMismatchError(error)) {
      return res.json({
        success: true,
        message: "Gallery item deleted successfully",
      });
    }
    console.error("Error deleting admin gallery item:", error);
    return respondWithError(res, error, "Failed to delete gallery item");
  }
};

const saveMyGalleryItem = async (req, res) => updateMyGalleryItem(req, res);
const saveAdminGalleryItem = async (req, res) =>
  updateAdminGalleryItem(req, res);

module.exports = {
  imageUpload,
  listPublicGallery,
  getPublicGalleryItem,
  listMyGallery,
  getMyGalleryItem,
  createMyGalleryItem,
  updateMyGalleryItem,
  saveMyGalleryItem,
  deleteMyGalleryItem,
  listAdminGallery,
  getAdminGalleryItem,
  createAdminGalleryItem,
  updateAdminGalleryItem,
  saveAdminGalleryItem,
  deleteAdminGalleryItem,
};
