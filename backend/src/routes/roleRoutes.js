const express = require("express");
const { listRoles } = require("../controllers/roleController");
const { authMiddleware, requirePermission } = require("../middlewares/auth");

const router = express.Router();

router.get(
  "/admin/roles",
  authMiddleware,
  requirePermission("manage_users"),
  listRoles
);

module.exports = router;
