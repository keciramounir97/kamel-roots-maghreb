const express = require("express");
const {
  listActivityAdmin,
  listActivityUser,
} = require("../controllers/activityController");
const { authMiddleware, requirePermission } = require("../middlewares/auth");

const router = express.Router();

router.get(
  "/admin/activity",
  authMiddleware,
  requirePermission("view_dashboard"),
  listActivityAdmin
);
router.get("/activity", authMiddleware, listActivityUser);

module.exports = router;
