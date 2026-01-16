const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/env");
const { loadAuthUserById } = require("../services/authService");
const { getDatabaseErrorResponse } = require("../utils/prismaErrors");

const isAdminUser = (user) => {
  if (!user) return false;
  if (user.roleId === 1) return true;
  return String(user.roleName || "").toLowerCase() === "admin";
};

const hasPermission = (user, permission) => {
  if (isAdminUser(user)) return true;
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  return permissions.includes(permission);
};

const hasAnyPermission = (user, permissions) => {
  if (isAdminUser(user)) return true;
  const list = Array.isArray(user?.permissions) ? user.permissions : [];
  return permissions.some((p) => list.includes(p));
};

const authMiddleware = (req, res, next) => {
  const header = req.headers.authorization;

  // 1. Check if header exists
  if (!header) {
    return res.status(401).json({ message: "No token provided" });
  }

  // 2. Check header format (Bearer <token>)
  const parts = header.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return res.status(401).json({ message: "Invalid token format" });
  }

  const token = parts[1];

  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }

  const userId = payload?.id;
  const sid = payload?.sid;
  if (!userId || !sid) {
    return res.status(401).json({ message: "Invalid token" });
  }

  loadAuthUserById(userId)
    .then(async (user) => {
      if (!user) return res.status(401).json({ message: "Invalid token" });
      if (String(user.status).toLowerCase() !== "active") {
        return res.status(403).json({ message: "Account disabled" });
      }

      const dbValid = user.sessionToken && user.sessionToken === sid;
      if (!dbValid) return res.status(401).json({ message: "Session expired" });

      // Ensure numeric ID for downstream controllers
      user.id = Number(user.id);
      req.user = user;
      next();
    })
    .catch((err) => {
      console.error("Auth middleware failed:", err.message);
      const dbError = getDatabaseErrorResponse(err);
      if (dbError) {
        return res.status(dbError.status).json({ message: dbError.message });
      }
      res.status(500).json({ message: "Auth failed" });
    });
};

const requirePermission = (permission) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Unauthorized" });
  if (hasPermission(req.user, permission)) return next();
  return res.status(403).json({ message: "Forbidden" });
};

const requireAnyPermission = (permissions) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Unauthorized" });
  if (hasAnyPermission(req.user, permissions)) return next();
  return res.status(403).json({ message: "Forbidden" });
};

module.exports = { authMiddleware, requirePermission, requireAnyPermission };
