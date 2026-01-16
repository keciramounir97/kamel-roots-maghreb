const multer = require("multer");

const isMulterError = (err) =>
  err instanceof multer.MulterError || err?.name === "MulterError";

const uploadErrorHandler = (err, _req, res, next) => {
  if (!err) return next();

  if (isMulterError(err)) {
    let status = 400;
    let message = err.message || "Upload failed";

    if (err.code === "LIMIT_FILE_SIZE") {
      status = 413;
      message = "File is too large.";
    } else if (err.code === "LIMIT_FILE_COUNT") {
      message = "Too many files uploaded.";
    } else if (err.code === "LIMIT_UNEXPECTED_FILE") {
      message = "Unexpected file field.";
    }

    return res.status(status).json({ message });
  }

  if (typeof err?.message === "string") {
    if (err.message.includes("Only image files are allowed")) {
      return res.status(415).json({ message: "Only image files are allowed." });
    }
    if (
      err.message.includes("Unexpected end of form") ||
      err.message.includes("Multipart: Boundary not found")
    ) {
      return res.status(400).json({ message: "Malformed upload data." });
    }
  }

  return next(err);
};

module.exports = { uploadErrorHandler };
