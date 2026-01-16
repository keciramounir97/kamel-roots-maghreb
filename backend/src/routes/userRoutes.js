const express = require("express");
const {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
} = require("../controllers/userController");
const { authMiddleware, requirePermission } = require("../middlewares/auth");

const router = express.Router();

router.get(
  "/admin/users",
  authMiddleware,
  requirePermission("manage_users"),
  listUsers
);
router.post(
  "/admin/users",
  authMiddleware,
  requirePermission("manage_users"),
  createUser
);
router.patch(
  "/admin/users/:id",
  authMiddleware,
  requirePermission("manage_users"),
  updateUser
);
router.delete(
  "/admin/users/:id",
  authMiddleware,
  requirePermission("manage_users"),
  deleteUser
);

module.exports = router;
