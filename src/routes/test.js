const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');

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
    const booksResult = await db.query('SELECT title, author, is_published, created_at FROM books ORDER BY created_at DESC');
    const tablesResult = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    res.json({
      totalBooks: booksCount.rows[0].count,
      publishedBooks: publishedCount.rows[0].count,
      books: booksResult.rows,
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

// Create admin user
router.get('/create-admin', async (req, res) => {
  try {
    const adminEmail = 'admin@romanceme.com';
    const adminPassword = 'NewAdmin2025!';
    
    // Ensure admin_users table exists
    await db.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
    await db.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Check if admin exists
    const existingAdmin = await db.query(
      'SELECT id FROM admin_users WHERE email = $1',
      [adminEmail]
    );
    
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    
    if (existingAdmin.rows.length > 0) {
      // Update existing admin password
      await db.query(
        'UPDATE admin_users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2',
        [passwordHash, adminEmail]
      );
      res.json({
        success: true,
        message: 'Admin password updated',
        email: adminEmail,
        password: adminPassword
      });
    } else {
      // Create new admin
      await db.query(
        'INSERT INTO admin_users (email, password_hash) VALUES ($1, $2)',
        [adminEmail, passwordHash]
      );
      res.json({
        success: true,
        message: 'Admin account created',
        email: adminEmail,
        password: adminPassword
      });
    }
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;