const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.MYSQL_SSL === "true" ? { rejectUnauthorized: true } : false,
});

(async () => {
  try {
    const conn = await pool.getConnection();
    console.log("Connected to MySQL");

    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        avatar VARCHAR(255) DEFAULT 'default.png',
        role_id INT DEFAULT 2,
        status VARCHAR(20) DEFAULT 'active',
        session_token VARCHAR(255),
        last_login TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        phone_number VARCHAR(50)
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS password_resets (
        email VARCHAR(100) PRIMARY KEY,
        code_hash VARCHAR(255) NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log("Tables ensured");
    conn.release();
    process.exit(0);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
})();
