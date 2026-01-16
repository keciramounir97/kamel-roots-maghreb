const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const {
  BOOK_UPLOADS_DIR,
  GALLERY_UPLOADS_DIR,
  ensureUploadDirs,
} = require("./files");

// Generate a safe unique filename
const generateFilename = (originalname) => {
  const ext = path.extname(originalname || "").toLowerCase();
  const uniqueSuffix = crypto.randomBytes(16).toString("hex");
  return `${uniqueSuffix}${ext}`;
};

// Book storage config
const bookStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensureUploadDirs(BOOK_UPLOADS_DIR);
    cb(null, BOOK_UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    cb(null, generateFilename(file.originalname));
  },
});

// Gallery storage config
const galleryStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensureUploadDirs(GALLERY_UPLOADS_DIR);
    cb(null, GALLERY_UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    cb(null, generateFilename(file.originalname));
  },
});

// File filters
const bookFileFilter = (_req, file, cb) => {
  // Allow PDFs and Images for books/covers
  const allowedTypes = /pdf|jpeg|jpg|png|webp/;
  const ext = path.extname(file.originalname).toLowerCase().replace(".", "");
  const mime = file.mimetype.toLowerCase();

  if (allowedTypes.test(ext) || allowedTypes.test(mime)) {
    return cb(null, true);
  }
  cb(new Error("Invalid file type. Only PDF and images are allowed."));
};

const imageFileFilter = (_req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const ext = path.extname(file.originalname).toLowerCase().replace(".", "");
  const mime = file.mimetype.toLowerCase();

  if (allowedTypes.test(ext) || allowedTypes.test(mime)) {
    return cb(null, true);
  }
  cb(new Error("Invalid file type. Only images are allowed."));
};

const bookUpload = multer({
  storage: bookStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: bookFileFilter,
});

const imageUpload = multer({
  storage: galleryStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: imageFileFilter,
});

module.exports = {
  bookUpload,
  imageUpload,
};
