
const mysql = require('mysql2/promise');
require('dotenv').config();

async function testSearch() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'roots_maghreb_db',
  });

  try {
    console.log('--- Setting up Test Data ---');
    
    // 1. Insert Test User
    const [userRes] = await pool.query(`INSERT INTO users (email, password, full_name) VALUES ('test_search_user@example.com', 'hashedpass', 'Search Tester')`);
    const userId = userRes.insertId;
    console.log(`Inserted Test User ID: ${userId}`);

    // 2. Insert Test Book (Public)
    await pool.query(`INSERT INTO books (title, author, description, category, file_path, is_public, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?)`, 
      ['Test Search Book History', 'Test Author', 'A book about Maghreb history', 'History', 'test.pdf', 1, userId]
    );
    console.log('Inserted Public Book');

    // 3. Insert Test Tree (Public)
    await pool.query(`INSERT INTO family_trees (user_id, title, description, is_public) VALUES (?, ?, ?, ?)`, 
      [userId, 'Test Search Family Tree', 'A tree of the Test clan', 1]
    );
    console.log('Inserted Public Tree');

    // 4. Perform Search
    console.log('\n--- Testing /api/search Logic ---');
    const q = 'Search';
    const searchQuery = `%${q}%`;

    const [books] = await pool.query(
      `SELECT id, title, author, description, category, is_public
       FROM books
       WHERE is_public=1 AND (title LIKE ? OR author LIKE ? OR description LIKE ? OR category LIKE ?)
       LIMIT 20`,
      [searchQuery, searchQuery, searchQuery, searchQuery]
    );

    const [trees] = await pool.query(
      `SELECT t.id, t.title, t.description, u.full_name AS owner_name
       FROM family_trees t
       LEFT JOIN users u ON u.id = t.user_id
       WHERE t.is_public=1 AND (t.title LIKE ? OR t.description LIKE ?)
       LIMIT 20`,
      [searchQuery, searchQuery]
    );

    console.log(`Found ${books.length} books matching "${q}"`);
    console.log(`Found ${trees.length} trees matching "${q}"`);

    if (books.length > 0 && trees.length > 0) {
        console.log('SUCCESS: Found both books and trees.');
    } else {
        console.error('FAILURE: Did not find expected data.');
    }

    // 5. Cleanup
    console.log('\n--- Cleaning Up ---');
    await pool.query(`DELETE FROM books WHERE title = 'Test Search Book History'`);
    await pool.query(`DELETE FROM family_trees WHERE title = 'Test Search Family Tree'`);
    await pool.query(`DELETE FROM users WHERE id = ?`, [userId]);
    console.log('Cleanup Complete');

  } catch (err) {
    console.error('Test Failed:', err);
  } finally {
    await pool.end();
  }
}

testSearch();
