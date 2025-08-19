const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// Test endpoint to add a book directly
router.get('/add-test-book', async (req, res) => {
  try {
    const bookId = uuidv4();
    
    // First check current count
    const countBefore = await db.query('SELECT COUNT(*) as count FROM books WHERE is_published = true');
    
    // Add test book
    await db.query(`
      INSERT INTO books (
        id, title, description, synopsis, author, genre, 
        content_rating, total_chapters, word_count, 
        reading_time_minutes, cover_image_url, status, 
        is_published
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
      )
    `, [
      bookId,
      'Test Book from Railway',
      'Added directly via API endpoint',
      'Test synopsis',
      'Test Author',
      '{Romance}',
      'General',
      5,
      10000,
      60,
      'https://via.placeholder.com/300x450',
      'ongoing',
      true
    ]);
    
    // Check count after
    const countAfter = await db.query('SELECT COUNT(*) as count FROM books WHERE is_published = true');
    
    res.json({
      success: true,
      message: 'Test book added',
      bookId: bookId,
      booksBefore: countBefore.rows[0].count,
      booksAfter: countAfter.rows[0].count
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get database info
router.get('/db-info', async (req, res) => {
  try {
    const booksCount = await db.query('SELECT COUNT(*) as count FROM books');
    const publishedCount = await db.query('SELECT COUNT(*) as count FROM books WHERE is_published = true');
    const tablesResult = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    res.json({
      totalBooks: booksCount.rows[0].count,
      publishedBooks: publishedCount.rows[0].count,
      tables: tablesResult.rows.map(r => r.table_name),
      databaseUrl: process.env.DATABASE_URL ? 'Set' : 'Not set'
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;