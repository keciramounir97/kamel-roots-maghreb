const express = require("express");
const {
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
} = require("../controllers/bookController");
const { authMiddleware, requirePermission, requireAnyPermission } = require("../middlewares/auth");

const router = express.Router();

router.get("/books", listPublicBooks);
router.get("/books/:id", getPublicBook);
router.get("/books/:id/download", downloadPublicBook);

router.get("/my/books", authMiddleware, listMyBooks);
router.get("/my/books/:id", authMiddleware, getMyBook);
router.post(
  "/my/books",
  authMiddleware,
  bookUpload.fields([
    { name: "file", maxCount: 1 },
    { name: "cover", maxCount: 1 },
  ]),
  createMyBook
);
router.put(
  "/my/books/:id",
  authMiddleware,
  bookUpload.fields([
    { name: "file", maxCount: 1 },
    { name: "cover", maxCount: 1 },
  ]),
  updateMyBook
);
router.post(
  "/my/books/:id/save",
  authMiddleware,
  bookUpload.fields([
    { name: "file", maxCount: 1 },
    { name: "cover", maxCount: 1 },
  ]),
  saveMyBook
);
router.get("/my/books/:id/download", authMiddleware, downloadMyBook);
router.delete("/my/books/:id", authMiddleware, deleteMyBook);

router.get(
  "/admin/books",
  authMiddleware,
  requirePermission("manage_books"),
  listAdminBooks
);
router.get(
  "/admin/books/:id",
  authMiddleware,
  requirePermission("manage_books"),
  getAdminBook
);
router.post(
  "/admin/books",
  authMiddleware,
  requireAnyPermission(["manage_books", "upload_books"]),
  bookUpload.fields([
    { name: "file", maxCount: 1 },
    { name: "cover", maxCount: 1 },
  ]),
  createAdminBook
);
router.put(
  "/admin/books/:id",
  authMiddleware,
  requirePermission("manage_books"),
  bookUpload.fields([
    { name: "file", maxCount: 1 },
    { name: "cover", maxCount: 1 },
  ]),
  updateAdminBook
);
router.post(
  "/admin/books/:id/save",
  authMiddleware,
  requirePermission("manage_books"),
  bookUpload.fields([
    { name: "file", maxCount: 1 },
    { name: "cover", maxCount: 1 },
  ]),
  saveAdminBook
);
router.delete(
  "/admin/books/:id",
  authMiddleware,
  requirePermission("manage_books"),
  deleteAdminBook
);

module.exports = router;
