const { prisma, DB_NAME } = require("../lib/prisma");

const ensureSchema = async () => {
  if (process.env.NODE_ENV === "test") return;
  if (!DB_NAME) {
    console.warn("DB_NAME not configured, skipping schema validation");
    return;
  }

  const tableExists = async (tableName) => {
    try {
      const rows =
        (await prisma.$queryRaw`
          SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
          WHERE TABLE_SCHEMA=${DB_NAME} AND TABLE_NAME=${tableName}
        `) || [];
      return rows.length > 0;
    } catch (err) {
      console.error(`Schema check failed (${tableName} exists):`, err.message);
      return false;
    }
  };

  const addColumnIfMissing = async (tableName, columnName, columnDef) => {
    try {
      const rows =
        (await prisma.$queryRaw`
          SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA=${DB_NAME} AND TABLE_NAME=${tableName} AND COLUMN_NAME=${columnName}
        `) || [];
      if (!rows.length) {
        await prisma.$executeRawUnsafe(
          `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDef}`
        );
        console.log(`Added ${columnName} to ${tableName}`);
      }
    } catch (err) {
      console.error(`Failed to add ${columnName} to ${tableName}:`, err.message);
    }
  };

  try {
    await prisma.$executeRawUnsafe(
      `CREATE TABLE IF NOT EXISTS roles (
        id INT PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        permissions TEXT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    );
  } catch (err) {
    console.error("Schema check failed (roles):", err.message);
  }

  try {
    const usersExists = await tableExists("users");
    if (!usersExists) {
      await prisma.$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          full_name VARCHAR(255) NULL,
          phone_number VARCHAR(50) NULL,
          email VARCHAR(100) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL,
          role_id INT NOT NULL DEFAULT 2,
          status VARCHAR(20) DEFAULT 'active',
          session_token VARCHAR(255) NULL,
          last_login DATETIME NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX (role_id),
          INDEX (status)
        )`
      );
    } else {
      const rows =
        (await prisma.$queryRaw`
          SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA=${DB_NAME} AND TABLE_NAME='users' AND COLUMN_NAME='phone_number'
        `) || [];
      if (!rows.length) {
        await prisma.$executeRawUnsafe(
          "ALTER TABLE users ADD COLUMN phone_number VARCHAR(50)"
        );
      }
    }
  } catch (err) {
    console.error("Schema check failed (users.phone_number):", err.message);
  }

  try {
    await prisma.$executeRawUnsafe(
      `CREATE TABLE IF NOT EXISTS books (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        author VARCHAR(255),
        description TEXT,
        category VARCHAR(100),
        file_path VARCHAR(255) NOT NULL,
        cover_path VARCHAR(255),
        file_size BIGINT,
        uploaded_by INT,
        is_public BOOLEAN DEFAULT 0,
        download_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX (uploaded_by),
        INDEX (is_public)
      )`
    );
    const rows =
      (await prisma.$queryRaw`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA=${DB_NAME} AND TABLE_NAME='books' AND COLUMN_NAME='download_count'
      `) || [];
    if (!rows.length) {
      await prisma.$executeRawUnsafe(
        "ALTER TABLE books ADD COLUMN download_count INT DEFAULT 0"
      );
    }
    const coverRows =
      (await prisma.$queryRaw`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA=${DB_NAME} AND TABLE_NAME='books' AND COLUMN_NAME='cover_path'
      `) || [];
    if (!coverRows.length) {
      await prisma.$executeRawUnsafe(
        "ALTER TABLE books ADD COLUMN cover_path VARCHAR(255)"
      );
    }
  } catch (err) {
    console.error("Schema check failed (books):", err.message);
  }

  try {
    await prisma.$executeRawUnsafe(
      `CREATE TABLE IF NOT EXISTS family_trees (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        gedcom_path VARCHAR(255),
        archive_source VARCHAR(255),
        document_code VARCHAR(255),
        is_public BOOLEAN DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX (user_id),
        INDEX (is_public)
      )`
    );
    await addColumnIfMissing("family_trees", "archive_source", "VARCHAR(255) NULL");
    await addColumnIfMissing("family_trees", "document_code", "VARCHAR(255) NULL");
  } catch (err) {
    console.error("Schema check failed (family_trees):", err.message);
  }

  try {
    await prisma.$executeRawUnsafe(
      `CREATE TABLE IF NOT EXISTS password_resets (
        email VARCHAR(100) PRIMARY KEY,
        code_hash VARCHAR(255) NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    );
  } catch (err) {
    console.error("Schema check failed (password_resets):", err.message);
  }

  try {
    await prisma.$executeRawUnsafe(
      `CREATE TABLE IF NOT EXISTS activity_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        actor_user_id INT NULL,
        type VARCHAR(30) NOT NULL,
        description VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX (actor_user_id),
        INDEX (type),
        INDEX (created_at)
      )`
    );
  } catch (err) {
    console.error("Schema check failed (activity_logs):", err.message);
  }

  try {
    await prisma.$executeRawUnsafe(
      `CREATE TABLE IF NOT EXISTS app_settings (
        \`key\` VARCHAR(50) PRIMARY KEY,
        \`value\` TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`
    );
  } catch (err) {
    console.error("Schema check failed (app_settings):", err.message);
  }

  try {
    await prisma.$executeRawUnsafe(
      `CREATE TABLE IF NOT EXISTS persons (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tree_id INT NULL,
        name VARCHAR(255),
        INDEX (tree_id),
        INDEX (name)
      )`
    );
    const nameRows =
      (await prisma.$queryRaw`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA=${DB_NAME} AND TABLE_NAME='persons' AND COLUMN_NAME='name'
      `) || [];
    if (!nameRows.length) {
      await prisma.$executeRawUnsafe(
        "ALTER TABLE persons ADD COLUMN name VARCHAR(255)"
      );
    }
  } catch (err) {
    console.error("Schema check failed (persons):", err.message);
  }

  // Gallery table
  try {
    await prisma.$executeRawUnsafe(
      `CREATE TABLE IF NOT EXISTS gallery (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT NULL,
        image_path VARCHAR(500) NOT NULL,
        uploaded_by INT NULL,
        is_public BOOLEAN DEFAULT 1,
        archive_source VARCHAR(255) NULL,
        document_code VARCHAR(255) NULL,
        location VARCHAR(255) NULL,
        year VARCHAR(50) NULL,
        photographer VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX (uploaded_by),
        INDEX (is_public)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    );

    // Ensure gallery metadata columns exist
    await addColumnIfMissing("gallery", "archive_source", "VARCHAR(255) NULL");
    await addColumnIfMissing("gallery", "document_code", "VARCHAR(255) NULL");
    await addColumnIfMissing("gallery", "location", "VARCHAR(255) NULL");
    await addColumnIfMissing("gallery", "year", "VARCHAR(50) NULL");
    await addColumnIfMissing("gallery", "photographer", "VARCHAR(255) NULL");

    try {
      const fkRows =
        (await prisma.$queryRaw`
          SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
          WHERE TABLE_SCHEMA=${DB_NAME}
            AND TABLE_NAME='gallery'
            AND COLUMN_NAME='uploaded_by'
            AND REFERENCED_TABLE_NAME='users'
        `) || [];

      if (!fkRows.length) {
        await prisma.$executeRawUnsafe(
          `ALTER TABLE gallery
           ADD CONSTRAINT fk_gallery_uploaded_by
           FOREIGN KEY (uploaded_by) REFERENCES users(id)
           ON DELETE SET NULL`
        );
      }
    } catch (err) {
      console.warn("Gallery FK ensure skipped:", err.message);
    }
    console.log("✅ Gallery table ensured");
  } catch (err) {
    console.error("Schema check failed (gallery):", err.message);
  }
};

module.exports = { ensureSchema };
