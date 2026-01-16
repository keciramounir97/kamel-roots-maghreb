const path = require("path");
const fs = require("fs");
const { prisma } = require("../lib/prisma");
const { logActivity } = require("../services/activityService");
const {
  BOOK_UPLOADS_DIR,
  PRIVATE_BOOK_UPLOADS_DIR,
  resolveStoredFilePath,
  safeMoveFile,
  safeUnlink,
} = require("../utils/files");
const { toNumber } = require("../utils/text");
const { getDatabaseErrorResponse } = require("../utils/prismaErrors");
const { bookUpload } = require("../utils/upload");

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

const cleanupUploadedFiles = (...paths) => {
  const flat = paths.flat().filter(Boolean);
  for (const p of flat) {
    // If it's an absolute path (temp upload), delete it
    // If it's a relative path (DB stored), resolve and delete
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

const moveExistingBookFile = (currentPath, makePublic) => {
  if (!currentPath) return currentPath;
  if (makePublic && String(currentPath).startsWith("/uploads/"))
    return currentPath;
  if (!makePublic && String(currentPath).startsWith("private/"))
    return currentPath;

  const resolved = resolveStoredFilePath(currentPath);
  if (!resolved || !fs.existsSync(resolved)) return currentPath;

  const filename = path.basename(resolved);
  if (makePublic) {
    const dest = path.join(BOOK_UPLOADS_DIR, filename);
    safeMoveFile(resolved, dest);
    return `/uploads/books/${filename}`;
  }

  const dest = path.join(PRIVATE_BOOK_UPLOADS_DIR, filename);
  safeMoveFile(resolved, dest);
  return `private/books/${filename}`;
};

const mapPublicBook = (b) => ({
  id: b.id,
  title: b.title,
  author: b.author,
  description: b.description,
  category: b.category,
  fileUrl: b.filePath,
  coverUrl: b.coverPath || null,
  fileSize: toNumber(b.fileSize),
  downloads: b.downloadCount,
  createdAt: b.createdAt,
});

const mapMyBook = (b) => ({
  id: b.id,
  title: b.title,
  author: b.author,
  description: b.description,
  category: b.category,
  fileUrl: String(b.filePath || "").startsWith("/uploads/") ? b.filePath : null,
  coverUrl: b.coverPath || null,
  fileSize: toNumber(b.fileSize),
  downloads: b.downloadCount,
  isPublic: !!b.isPublic,
  createdAt: b.createdAt,
});

const mapAdminBook = (b) => ({
  id: b.id,
  title: b.title,
  author: b.author,
  description: b.description,
  category: b.category,
  fileUrl: String(b.filePath || "").startsWith("/uploads/") ? b.filePath : null,
  coverUrl: b.coverPath || null,
  fileSize: toNumber(b.fileSize),
  isPublic: !!b.isPublic,
  downloads: b.downloadCount,
  uploadedBy: b.uploader?.fullName || "Unknown",
  createdAt: b.createdAt,
});

const listPublicBooks = async (_req, res) => {
  try {
    res.set("Cache-Control", "no-store");
    const rows = await prisma.book.findMany({
      where: { isPublic: true },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        author: true,
        description: true,
        category: true,
        filePath: true,
        coverPath: true,
        fileSize: true,
        downloadCount: true,
        createdAt: true,
      },
    });
    res.json({ success: true, data: rows.map(mapPublicBook) });
  } catch (err) {
    const dbError = getDatabaseErrorResponse(err);
    if (dbError || isSchemaMismatchError(err)) {
      return res.json({ success: true, data: [] });
    }
    console.error("Failed to load books:", err.code || "", err.message);
    return respondWithError(res, err, "Failed to load books");
  }
};

const getPublicBook = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id)
      return res
        .status(400)
        .json({ success: false, message: "Invalid book id" });

    const book = await prisma.book.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        author: true,
        description: true,
        category: true,
        filePath: true,
        coverPath: true,
        fileSize: true,
        downloadCount: true,
        createdAt: true,
        isPublic: true,
      },
    });
    if (!book)
      return res.status(404).json({ success: false, message: "Not found" });
    if (!book.isPublic)
      return res.status(403).json({ success: false, message: "Forbidden" });

    res.json({ success: true, data: mapPublicBook(book) });
  } catch (err) {
    const dbError = getDatabaseErrorResponse(err);
    if (dbError || isSchemaMismatchError(err)) {
      return res.status(404).json({ success: false, message: "Not found" });
    }
    console.error("Failed to load book:", err.code || "", err.message);
    return respondWithError(res, err, "Failed to load book");
  }
};

const downloadPublicBook = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid book id" });

    const book = await prisma.book.findUnique({
      where: { id },
      select: { id: true, title: true, filePath: true, isPublic: true },
    });
    if (!book) return res.status(404).json({ message: "Not found" });
    if (!book.isPublic) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const filePath = resolveStoredFilePath(book.filePath);
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ message: "File not found" });
    }

    await prisma.book.update({
      where: { id },
      data: { downloadCount: { increment: 1 } },
    });
    res.download(filePath, path.basename(filePath));
  } catch (err) {
    const dbError = getDatabaseErrorResponse(err);
    if (dbError || isSchemaMismatchError(err)) {
      return res.status(404).json({ message: "Not found" });
    }
    console.error("Download failed:", err.code || "", err.message);
    return respondWithError(res, err, "Download failed");
  }
};

const listMyBooks = async (req, res) => {
  try {
    res.set("Cache-Control", "no-store");
    const rows = await prisma.book.findMany({
      where: { uploadedBy: Number(req.user.id) },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        author: true,
        description: true,
        category: true,
        filePath: true,
        coverPath: true,
        fileSize: true,
        downloadCount: true,
        isPublic: true,
        createdAt: true,
      },
    });
    res.json({ success: true, data: rows.map(mapMyBook) });
  } catch (err) {
    const dbError = getDatabaseErrorResponse(err);
    if (dbError || isSchemaMismatchError(err)) {
      return res.json({ success: true, data: [] });
    }
    console.error("Failed to load my books:", err.code || "", err.message);
    return respondWithError(res, err, "Failed to load books");
  }
};

const getMyBook = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id)
      return res
        .status(400)
        .json({ success: false, message: "Invalid book id" });

    const book = await prisma.book.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        author: true,
        description: true,
        category: true,
        filePath: true,
        coverPath: true,
        fileSize: true,
        downloadCount: true,
        isPublic: true,
        uploadedBy: true,
        createdAt: true,
      },
    });
    if (!book)
      return res.status(404).json({ success: false, message: "Not found" });

    const canManage = req.user.permissions.includes("manage_books");
    if (!canManage && Number(book.uploadedBy) !== Number(req.user.id)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    res.json({ success: true, data: mapMyBook(book) });
  } catch (err) {
    const dbError = getDatabaseErrorResponse(err);
    if (dbError || isSchemaMismatchError(err)) {
      return res.status(404).json({ success: false, message: "Not found" });
    }
    console.error("Failed to load my book:", err.code || "", err.message);
    return respondWithError(res, err, "Failed to load book");
  }
};

const createMyBook = async (req, res) => {
  const bookFile = req.files?.file?.[0];
  const coverFile = req.files?.cover?.[0];
  let filePath = null;
  let coverPath = null;

  try {
    const { title, author, description, category, isPublic } = req.body || {};
    const safeTitle = cleanText(title);
    if (!safeTitle) {
      // Cleanup immediate if validation fails
      cleanupUploadedFiles(bookFile?.path, coverFile?.path);
      return res
        .status(400)
        .json({ success: false, message: "Title is required" });
    }
    if (!bookFile) {
      cleanupUploadedFiles(coverFile?.path);
      return res
        .status(400)
        .json({ success: false, message: "Book file is required" });
    }
    if (!coverFile) {
      cleanupUploadedFiles(bookFile?.path);
      return res
        .status(400)
        .json({ success: false, message: "Cover image is required" });
    }

    const publicFlag = parseBoolean(isPublic, true);

    // Construct URLs manually with forward slashes for DB consistency
    filePath = `/uploads/books/${bookFile.filename}`;

    if (!publicFlag) {
      const src = path.join(BOOK_UPLOADS_DIR, bookFile.filename);
      const dest = path.join(PRIVATE_BOOK_UPLOADS_DIR, bookFile.filename);
      safeMoveFile(src, dest);
      filePath = `private/books/${bookFile.filename}`;
    }

    coverPath = `/uploads/books/${coverFile.filename}`;

    const fileSize =
      typeof bookFile.size === "number" ? BigInt(bookFile.size) : null;

    const created = await prisma.book.create({
      data: {
        title: safeTitle,
        author: cleanText(author),
        description: cleanText(description),
        category: cleanText(category),
        filePath,
        coverPath,
        fileSize,
        uploadedBy: Number(req.user.id),
        isPublic: publicFlag,
      },
    });

    await logActivity(req.user.id, "books", `Uploaded book: ${safeTitle}`);
    res.status(201).json({ success: true, data: { id: created.id } });
  } catch (err) {
    // If creation fails, we must cleanup the files we just accepted
    // Note: bookFile.path and coverFile.path are the temp locations (or final locations if using diskStorage direct)
    // Our logic moved them, so we need to clean up filePath and coverPath
    // We try to clean up BOTH the original multer path (in case move failed) AND the calculated destination
    cleanupUploadedFiles(bookFile?.path, coverFile?.path, filePath, coverPath);

    const dbError = getDatabaseErrorResponse(err);
    if (dbError || isSchemaMismatchError(err)) {
      return res
        .status(503)
        .json({ success: false, message: "Books service unavailable" });
    }
    console.error("Upload book failed:", err.code || "", err.message);
    return respondWithError(res, err, "Upload failed");
  }
};

const updateMyBook = async (req, res) => {
  let rollback = [];
  try {
    const id = parseId(req.params.id);
    if (!id)
      return res
        .status(400)
        .json({ success: false, message: "Invalid book id" });

    const book = await prisma.book.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        author: true,
        description: true,
        category: true,
        filePath: true,
        coverPath: true,
        fileSize: true,
        uploadedBy: true,
        isPublic: true,
      },
    });
    if (!book)
      return res.status(404).json({ success: false, message: "Not found" });

    const canManage = req.user.permissions.includes("manage_books");
    if (!canManage && Number(book.uploadedBy) !== Number(req.user.id)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const { title, author, description, category, isPublic } = req.body || {};
    const safeTitle =
      title !== undefined && title !== null ? cleanText(title) : book.title;
    if (!safeTitle) {
      return res
        .status(400)
        .json({ success: false, message: "Title is required" });
    }

    const publicFlag =
      isPublic !== undefined && isPublic !== null
        ? parseBoolean(isPublic, !!book.isPublic)
        : !!book.isPublic;

    const bookFile = req.files?.file?.[0];
    const coverFile = req.files?.cover?.[0];

    let filePath = book.filePath;
    let fileSize = book.fileSize;

    if (bookFile) {
      let nextPath = `/uploads/books/${bookFile.filename}`;
      if (!publicFlag) {
        const dest = path.join(PRIVATE_BOOK_UPLOADS_DIR, bookFile.filename);
        safeMoveFile(bookFile.path, dest);
        nextPath = `private/books/${bookFile.filename}`;
      }
      filePath = nextPath;
      fileSize =
        typeof bookFile.size === "number" ? BigInt(bookFile.size) : null;

      // If update fails, delete this new file
      rollback.push(() => cleanupUploadedFiles(nextPath, bookFile.path));
    } else {
      // Handle visibility change for existing file
      const movedPath = moveExistingBookFile(book.filePath, publicFlag);
      if (movedPath !== book.filePath) {
        const from = resolveStoredFilePath(movedPath);
        const to = resolveStoredFilePath(book.filePath);
        if (from && to && from !== to) {
          // Rollback move if DB update fails
          rollback.push(() => safeMoveFile(from, to));
        }
      }
      filePath = movedPath;
    }

    let coverPath = book.coverPath;
    if (coverFile) {
      coverPath = `/uploads/books/${coverFile.filename}`;
      rollback.push(() => cleanupUploadedFiles(coverPath, coverFile.path));
    }

    const updated = await prisma.book.update({
      where: { id },
      data: {
        title: safeTitle,
        author: pickNullable(author, book.author),
        description: pickNullable(description, book.description),
        category: pickNullable(category, book.category),
        filePath,
        coverPath,
        fileSize,
        isPublic: publicFlag,
      },
    });

    // Cleanup OLD files if we successfully replaced them
    if (bookFile && book.filePath && book.filePath !== filePath) {
      cleanupUploadedFiles(book.filePath);
    }
    if (coverFile && book.coverPath && book.coverPath !== coverPath) {
      cleanupUploadedFiles(book.coverPath);
    }

    await logActivity(req.user.id, "books", `Updated book: ${safeTitle}`);
    res.json({ success: true, data: { id: updated.id } });
  } catch (err) {
    runRollback(rollback);

    const dbError = getDatabaseErrorResponse(err);
    if (dbError || isSchemaMismatchError(err)) {
      return res
        .status(503)
        .json({ success: false, message: "Books service unavailable" });
    }
    console.error("Update my book failed:", err.code || "", err.message);
    return respondWithError(res, err, "Update failed");
  }
};

const downloadMyBook = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id)
      return res
        .status(400)
        .json({ success: false, message: "Invalid book id" });

    const book = await prisma.book.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        filePath: true,
        isPublic: true,
        uploadedBy: true,
      },
    });
    if (!book)
      return res.status(404).json({ success: false, message: "Not found" });

    const canManage = req.user.permissions.includes("manage_books");
    if (!canManage && Number(book.uploadedBy) !== Number(req.user.id)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const filePath = resolveStoredFilePath(book.filePath);
    if (!filePath || !fs.existsSync(filePath)) {
      return res
        .status(404)
        .json({ success: false, message: "File not found" });
    }

    await prisma.book.update({
      where: { id },
      data: { downloadCount: { increment: 1 } },
    });
    res.download(filePath, path.basename(filePath));
  } catch (err) {
    const dbError = getDatabaseErrorResponse(err);
    if (dbError || isSchemaMismatchError(err)) {
      return res.status(404).json({ success: false, message: "Not found" });
    }
    console.error("Download my book failed:", err.code || "", err.message);
    return respondWithError(res, err, "Download failed");
  }
};

const deleteMyBook = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id)
      return res
        .status(400)
        .json({ success: false, message: "Invalid book id" });

    const book = await prisma.book.findUnique({
      where: { id },
      select: {
        filePath: true,
        coverPath: true,
        title: true,
        uploadedBy: true,
      },
    });
    if (!book) {
      console.warn(`⚠️ DeleteMyBook: Book ${id} not found.`);
      return res.json({ success: true, message: "Deleted" });
    }

    const canManage = req.user.permissions.includes("manage_books");
    if (!canManage && Number(book.uploadedBy) !== Number(req.user.id)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    await prisma.book.delete({ where: { id } });

    // Cleanup files
    cleanupUploadedFiles(book.filePath, book.coverPath);

    await logActivity(
      req.user.id,
      "books",
      `Deleted book: ${book.title || id}`
    );
    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    const dbError = getDatabaseErrorResponse(err);
    if (dbError || isSchemaMismatchError(err)) {
      return res.json({ success: true, message: "Deleted" });
    }
    console.error("❌ Delete my book failed:", err.code || "", err.message);
    return respondWithError(res, err, "Delete failed");
  }
};

const listAdminBooks = async (_req, res) => {
  try {
    const rows = await prisma.book.findMany({
      orderBy: { createdAt: "desc" },
      include: { uploader: { select: { fullName: true } } },
    });
    res.json({ success: true, data: rows.map(mapAdminBook) });
  } catch (err) {
    const dbError = getDatabaseErrorResponse(err);
    if (dbError || isSchemaMismatchError(err)) {
      return res.json({ success: true, data: [] });
    }
    console.error("Failed to load admin books:", err.code || "", err.message);
    return respondWithError(res, err, "Failed to load books");
  }
};

const getAdminBook = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id)
      return res
        .status(400)
        .json({ success: false, message: "Invalid book id" });

    const book = await prisma.book.findUnique({
      where: { id },
      include: { uploader: { select: { fullName: true } } },
    });
    if (!book)
      return res.status(404).json({ success: false, message: "Not found" });

    res.json({ success: true, data: mapAdminBook(book) });
  } catch (err) {
    const dbError = getDatabaseErrorResponse(err);
    if (dbError || isSchemaMismatchError(err)) {
      return res.status(404).json({ success: false, message: "Not found" });
    }
    console.error("Failed to load admin book:", err.code || "", err.message);
    return respondWithError(res, err, "Failed to load book");
  }
};

const createAdminBook = async (req, res) => {
  const bookFile = req.files?.file?.[0];
  const coverFile = req.files?.cover?.[0];
  let filePath = null;
  let coverPath = null;

  try {
    const { title, author, description, category, isPublic } = req.body;
    const safeTitle = cleanText(title);
    if (!safeTitle || !bookFile) {
      cleanupUploadedFiles(bookFile?.path, coverFile?.path);
      return res
        .status(400)
        .json({ success: false, message: "Title and file are required" });
    }
    if (!coverFile) {
      cleanupUploadedFiles(bookFile?.path);
      return res
        .status(400)
        .json({ success: false, message: "Cover image is required" });
    }

    const publicFlag = parseBoolean(isPublic, true);
    filePath = `/uploads/books/${bookFile.filename}`;
    if (!publicFlag) {
      const src = path.join(BOOK_UPLOADS_DIR, bookFile.filename);
      const dest = path.join(PRIVATE_BOOK_UPLOADS_DIR, bookFile.filename);
      safeMoveFile(src, dest);
      filePath = `private/books/${bookFile.filename}`;
    }
    coverPath = `/uploads/books/${coverFile.filename}`;

    const fileSize =
      typeof bookFile.size === "number" ? BigInt(bookFile.size) : null;

    const created = await prisma.book.create({
      data: {
        title: safeTitle,
        author: cleanText(author),
        description: cleanText(description),
        category: cleanText(category),
        filePath,
        coverPath,
        fileSize,
        uploadedBy: req.user.id,
        isPublic: publicFlag,
      },
    });

    await logActivity(req.user.id, "books", `Uploaded book: ${safeTitle}`);
    res.status(201).json({ success: true, data: { id: created.id } });
  } catch (err) {
    cleanupUploadedFiles(bookFile?.path, coverFile?.path, filePath, coverPath);
    const dbError = getDatabaseErrorResponse(err);
    if (dbError || isSchemaMismatchError(err)) {
      return res
        .status(503)
        .json({ success: false, message: "Books service unavailable" });
    }
    console.error("Upload book failed:", err.code || "", err.message);
    return respondWithError(res, err, "Upload failed");
  }
};

const updateAdminBook = async (req, res) => {
  let rollback = [];
  try {
    const id = parseId(req.params.id);
    if (!id)
      return res
        .status(400)
        .json({ success: false, message: "Invalid book id" });

    const book = await prisma.book.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        author: true,
        description: true,
        category: true,
        filePath: true,
        coverPath: true,
        fileSize: true,
        isPublic: true,
      },
    });
    if (!book)
      return res.status(404).json({ success: false, message: "Not found" });

    const { title, author, description, category, isPublic } = req.body || {};
    const safeTitle =
      title !== undefined && title !== null ? cleanText(title) : book.title;
    if (!safeTitle) {
      return res
        .status(400)
        .json({ success: false, message: "Title is required" });
    }

    const publicFlag =
      isPublic !== undefined && isPublic !== null
        ? parseBoolean(isPublic, !!book.isPublic)
        : !!book.isPublic;

    const bookFile = req.files?.file?.[0];
    const coverFile = req.files?.cover?.[0];

    let filePath = book.filePath;
    let fileSize = book.fileSize;
    if (bookFile) {
      let nextPath = `/uploads/books/${bookFile.filename}`;
      if (!publicFlag) {
        const dest = path.join(PRIVATE_BOOK_UPLOADS_DIR, bookFile.filename);
        safeMoveFile(bookFile.path, dest);
        nextPath = `private/books/${bookFile.filename}`;
      }
      filePath = nextPath;
      fileSize =
        typeof bookFile.size === "number" ? BigInt(bookFile.size) : null;
      rollback.push(() => cleanupUploadedFiles(nextPath, bookFile.path));
    } else {
      const movedPath = moveExistingBookFile(book.filePath, publicFlag);
      if (movedPath !== book.filePath) {
        const from = resolveStoredFilePath(movedPath);
        const to = resolveStoredFilePath(book.filePath);
        if (from && to && from !== to) {
          rollback.push(() => safeMoveFile(from, to));
        }
      }
      filePath = movedPath;
    }

    let coverPath = book.coverPath;
    if (coverFile) {
      coverPath = `/uploads/books/${coverFile.filename}`;
      rollback.push(() => cleanupUploadedFiles(coverPath, coverFile.path));
    }

    const updated = await prisma.book.update({
      where: { id },
      data: {
        title: safeTitle,
        author: pickNullable(author, book.author),
        description: pickNullable(description, book.description),
        category: pickNullable(category, book.category),
        filePath,
        coverPath,
        fileSize,
        isPublic: publicFlag,
      },
    });

    if (bookFile && book.filePath && book.filePath !== filePath) {
      cleanupUploadedFiles(book.filePath);
    }
    if (coverFile && book.coverPath && book.coverPath !== coverPath) {
      cleanupUploadedFiles(book.coverPath);
    }

    await logActivity(req.user.id, "books", `Updated book: ${safeTitle}`);
    res.json({ success: true, data: { id: updated.id } });
  } catch (err) {
    runRollback(rollback);
    const dbError = getDatabaseErrorResponse(err);
    if (dbError || isSchemaMismatchError(err)) {
      return res
        .status(503)
        .json({ success: false, message: "Books service unavailable" });
    }
    console.error("Update book failed:", err.code || "", err.message);
    return respondWithError(res, err, "Update failed");
  }
};

const deleteAdminBook = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id)
      return res
        .status(400)
        .json({ success: false, message: "Invalid book id" });

    const book = await prisma.book.findUnique({
      where: { id },
      select: { filePath: true, coverPath: true, title: true },
    });
    if (!book) {
      console.warn(`⚠️ DeleteAdminBook: Book ${id} not found.`);
      return res.json({ success: true, message: "Deleted" });
    }

    await prisma.book.delete({ where: { id } });
    cleanupUploadedFiles(book.filePath, book.coverPath);

    await logActivity(
      req.user.id,
      "books",
      `Deleted book: ${book.title || id}`
    );
    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    const dbError = getDatabaseErrorResponse(err);
    if (dbError || isSchemaMismatchError(err)) {
      return res.json({ success: true, message: "Deleted" });
    }
    console.error("❌ Delete book failed:", err.code || "", err.message);
    return respondWithError(res, err, "Delete failed");
  }
};

const saveMyBook = async (req, res) => updateMyBook(req, res);
const saveAdminBook = async (req, res) => updateAdminBook(req, res);

module.exports = {
  bookUpload,
  listPublicBooks,
  getPublicBook,
  downloadPublicBook,
  listMyBooks,
  getMyBook,
  createMyBook,
  updateMyBook,
  saveMyBook,
  downloadMyBook,
  deleteMyBook,
  listAdminBooks,
  getAdminBook,
  createAdminBook,
  updateAdminBook,
  saveAdminBook,
  deleteAdminBook,
};
