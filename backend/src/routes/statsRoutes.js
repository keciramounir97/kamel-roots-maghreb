const express = require("express");
const { getStats } = require("../controllers/statsController");
const { authMiddleware, requirePermission } = require("../middlewares/auth");

const router = express.Router();

router.get(
  "/admin/stats",
  authMiddleware,
  requirePermission("view_dashboard"),
  getStats
);

module.exports = router;
