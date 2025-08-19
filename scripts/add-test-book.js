require('dotenv').config();
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

// Use DATABASE_URL if available (for Railway)
const poolConfig = process.env.DATABASE_URL ? {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
} : {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'story_reader_db',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
};

const pool = new Pool(poolConfig);

async function addTestBook() {
  const client = await pool.connect();
  
  try {
    console.log('Adding test book to database...');
    
    // Add a simple test book
    const bookId = uuidv4();
    await client.query(`
      INSERT INTO books (
        id, title, description, synopsis, author, genre, 
        content_rating, total_chapters, word_count, 
        reading_time_minutes, cover_image_url, status, 
        is_published, is_featured
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
      )
    `, [
      bookId,
      'Test Romance Book',
      'A test book to verify database connectivity',
      'This is a test synopsis',
      'Test Author',
      '{Romance}', // genre as array
      'General',
      10, // total_chapters
      25000, // word_count
      120, // reading_time_minutes
      'https://via.placeholder.com/300x450',
      'ongoing',
      true, // is_published
      false // is_featured
    ]);
    
    console.log('✅ Test book added successfully!');
    console.log('Book ID:', bookId);
    
    // Verify it was added
    const result = await client.query('SELECT COUNT(*) as count FROM books WHERE is_published = true');
    console.log('Total published books now:', result.rows[0].count);
    
  } catch (error) {
    console.error('Error adding book:', error);
  } finally {
    client.release();
    pool.end();
  }
}

addTestBook();