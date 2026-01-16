const express = require("express");
const {
  treeUpload,
  listAdminTrees,
  listPublicTrees,
  getPublicTree,
  downloadPublicGedcom,
  listMyTrees,
  getMyTree,
  createMyTree,
  updateMyTree,
  saveMyTree,
  deleteMyTree,
  downloadMyGedcom,
} = require("../controllers/treeController");
const { authMiddleware, requirePermission, requireAnyPermission } = require("../middlewares/auth");

const router = express.Router();

router.get(
  "/admin/trees",
  authMiddleware,
  requirePermission("manage_all_trees"),
  listAdminTrees
);

router.get("/trees", listPublicTrees);
router.get("/trees/:id", getPublicTree);
router.get("/trees/:id/gedcom", downloadPublicGedcom);

router.get(
  "/my/trees",
  authMiddleware,
  requireAnyPermission(["manage_own_trees", "manage_all_trees"]),
  listMyTrees
);
router.get(
  "/my/trees/:id",
  authMiddleware,
  requireAnyPermission(["manage_own_trees", "manage_all_trees"]),
  getMyTree
);
router.post(
  "/my/trees",
  authMiddleware,
  requireAnyPermission(["manage_own_trees", "manage_all_trees"]),
  treeUpload.single("file"),
  createMyTree
);
router.put(
  "/my/trees/:id",
  authMiddleware,
  requireAnyPermission(["manage_own_trees", "manage_all_trees"]),
  treeUpload.single("file"),
  updateMyTree
);
router.post(
  "/my/trees/:id/save",
  authMiddleware,
  requireAnyPermission(["manage_own_trees", "manage_all_trees"]),
  treeUpload.single("file"),
  saveMyTree
);
router.delete(
  "/my/trees/:id",
  authMiddleware,
  requireAnyPermission(["manage_own_trees", "manage_all_trees"]),
  deleteMyTree
);
router.get("/my/trees/:id/gedcom", authMiddleware, downloadMyGedcom);

module.exports = router;
