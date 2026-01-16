const path = require("path");
const fs = require("fs");

const UPLOADS_DIR = path.join(__dirname, "..", "..", "uploads");
const BOOK_UPLOADS_DIR = path.join(UPLOADS_DIR, "books");
const TREE_UPLOADS_DIR = path.join(UPLOADS_DIR, "trees");
const GALLERY_UPLOADS_DIR = path.join(UPLOADS_DIR, "gallery");
const PRIVATE_UPLOADS_DIR = path.join(__dirname, "..", "..", "private_uploads");
const PRIVATE_BOOK_UPLOADS_DIR = path.join(PRIVATE_UPLOADS_DIR, "books");
const PRIVATE_TREE_UPLOADS_DIR = path.join(PRIVATE_UPLOADS_DIR, "trees");

const ensureWritableDir = (dir) => {
  if (!dir) return;
  fs.mkdirSync(dir, { recursive: true });
  fs.accessSync(dir, fs.constants.W_OK);
};

const ensureUploadDirs = (...dirs) => {
  const all = dirs.length
    ? dirs
    : [
        BOOK_UPLOADS_DIR,
        TREE_UPLOADS_DIR,
        GALLERY_UPLOADS_DIR,
        PRIVATE_BOOK_UPLOADS_DIR,
        PRIVATE_TREE_UPLOADS_DIR,
      ];
  for (const dir of all) {
    ensureWritableDir(dir);
  }
};

// Make sure directories exist at startup
// Make sure directories exist at startup
try {
  ensureUploadDirs(
    UPLOADS_DIR,
    BOOK_UPLOADS_DIR,
    TREE_UPLOADS_DIR,
    GALLERY_UPLOADS_DIR,
    PRIVATE_UPLOADS_DIR,
    PRIVATE_BOOK_UPLOADS_DIR,
    PRIVATE_TREE_UPLOADS_DIR
  );
} catch (err) {
  console.warn(
    "⚠️ Warning: Failed to ensure upload directories at startup. Uploads may fail.",
    err.message
  );
}

const resolveStoredFilePath = (storedPath) => {
  const rel = String(storedPath || "");
  if (!rel) return null;

  if (rel.startsWith("/uploads/")) {
    return path.join(
      __dirname,
      "..",
      "..",
      rel.replace("/uploads/", "uploads/")
    );
  }
  if (rel.startsWith("private/")) {
    return path.join(PRIVATE_UPLOADS_DIR, rel.replace("private/", ""));
  }
  if (path.isAbsolute(rel)) return rel;
  return path.join(__dirname, "..", "..", rel);
};

const safeUnlink = (filePath) => {
  if (!filePath) return;
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {}
};

const safeMoveFile = (src, dest) => {
  try {
    fs.renameSync(src, dest);
  } catch {
    fs.copyFileSync(src, dest);
    safeUnlink(src);
  }
};

module.exports = {
  UPLOADS_DIR,
  BOOK_UPLOADS_DIR,
  TREE_UPLOADS_DIR,
  GALLERY_UPLOADS_DIR,
  PRIVATE_BOOK_UPLOADS_DIR,
  PRIVATE_TREE_UPLOADS_DIR,
  resolveStoredFilePath,
  safeUnlink,
  safeMoveFile,
  ensureUploadDirs,
};
