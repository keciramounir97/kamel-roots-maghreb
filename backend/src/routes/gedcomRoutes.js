const express = require("express");
const {
  importGedcom,
  exportGedcom,
  treeUpload,
} = require("../controllers/gedcomController");
const {
  authMiddleware,
  requirePermission,
  requireAnyPermission,
} = require("../middlewares/auth");

const router = express.Router();

// Import Route (Protected, Owner or Admin)
router.post(
  "/trees/:treeId/gedcom/import",
  authMiddleware,
  requireAnyPermission(["manage_own_trees", "manage_all_trees"]),
  treeUpload.single("file"), // Reusing the treeUpload configuration
  importGedcom
);

// Export Route (Public or Protected depending on tree status, logic handled in controller)
// We still use authMiddleware to populate req.user for permission checks
router.get("/trees/:treeId/gedcom/export", authMiddleware, exportGedcom);

module.exports = router;
