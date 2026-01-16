const express = require("express");
const { prisma, DB_NAME } = require("../lib/prisma");
const { authMiddleware, requireAnyPermission } = require("../middlewares/auth");

const router = express.Router();

const tableExists = async (tableName) => {
  if (!DB_NAME) return null;
  const rows =
    (await prisma.$queryRaw`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA=${DB_NAME} AND TABLE_NAME=${tableName}
    `) || [];
  return rows.length > 0;
};

const columnExists = async (tableName, columnName) => {
  if (!DB_NAME) return null;
  const rows =
    (await prisma.$queryRaw`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA=${DB_NAME} AND TABLE_NAME=${tableName} AND COLUMN_NAME=${columnName}
    `) || [];
  return rows.length > 0;
};

const countRows = async (tableName) => {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*) as count FROM \`${tableName}\``
  );
  return Number(rows?.[0]?.count || 0);
};

router.get(
  "/admin/diagnostics/schema",
  authMiddleware,
  requireAnyPermission(["view_dashboard", "manage_users", "manage_books"]),
  async (_req, res) => {
    const payload = {
      status: "ok",
      dbName: DB_NAME || null,
      now: new Date().toISOString(),
      tables: {},
      columns: {},
      counts: {},
    };

    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (err) {
      return res.status(503).json({
        status: "error",
        message: "Database unavailable",
        dbName: DB_NAME || null,
      });
    }

    const requiredTables = [
      "users",
      "roles",
      "books",
      "family_trees",
      "persons",
      "gallery",
    ];
    for (const tableName of requiredTables) {
      try {
        payload.tables[tableName] = await tableExists(tableName);
      } catch {
        payload.tables[tableName] = null;
      }
    }

    const requiredColumns = {
      books: [
        "file_path",
        "cover_path",
        "uploaded_by",
        "is_public",
        "download_count",
      ],
      family_trees: [
        "user_id",
        "gedcom_path",
        "archive_source",
        "document_code",
        "is_public",
      ],
      persons: ["tree_id", "name"],
      gallery: [
        "image_path",
        "uploaded_by",
        "is_public",
        "archive_source",
        "document_code",
        "location",
        "year",
        "photographer",
      ],
      users: ["role_id", "session_token", "status"],
    };

    for (const [tableName, columns] of Object.entries(requiredColumns)) {
      payload.columns[tableName] = {};
      for (const col of columns) {
        try {
          payload.columns[tableName][col] = await columnExists(tableName, col);
        } catch {
          payload.columns[tableName][col] = null;
        }
      }
    }

    for (const tableName of requiredTables) {
      if (!payload.tables[tableName]) continue;
      try {
        payload.counts[tableName] = await countRows(tableName);
      } catch {
        payload.counts[tableName] = null;
      }
    }

    return res.json(payload);
  }
);

module.exports = router;
