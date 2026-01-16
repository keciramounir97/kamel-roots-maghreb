const express = require("express");
const {
  getSettings,
  saveSettings,
  getFooter,
  saveFooter,
} = require("../controllers/settingsController");
const { authMiddleware, requireAnyPermission } = require("../middlewares/auth");

const router = express.Router();

router.get(
  "/admin/settings",
  authMiddleware,
  requireAnyPermission(["manage_users"]),
  getSettings
);
router.put(
  "/admin/settings",
  authMiddleware,
  requireAnyPermission(["manage_users"]),
  saveSettings
);

router.get("/footer", getFooter);
router.get(
  "/admin/footer",
  authMiddleware,
  requireAnyPermission(["manage_users"]),
  getFooter
);
router.put(
  "/admin/footer",
  authMiddleware,
  requireAnyPermission(["manage_users"]),
  saveFooter
);

module.exports = router;
