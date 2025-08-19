require('dotenv').config();
const { Pool } = require('pg');

// Use DATABASE_URL if available (for Railway), otherwise individual env vars
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

async function debugBooksQuery() {
  const client = await pool.connect();
  
  try {
    console.log('Testing books query...\n');
    
    // Test the exact query from the controller
    const booksResult = await client.query(
      `SELECT id, title, description, synopsis, author, genre, content_rating, 
              total_chapters, word_count, reading_time_minutes, cover_image_url, status
       FROM books 
       WHERE is_published = true 
       ORDER BY is_featured DESC, created_at DESC 
       LIMIT 10 OFFSET 0`
    );
    
    console.log(`Query returned ${booksResult.rows.length} books`);
    
    if (booksResult.rows.length > 0) {
      console.log('\nBooks found:');
      booksResult.rows.forEach(book => {
        console.log(`- ${book.title} (${book.status})`);
      });
    }
    
    // Check if is_featured column exists
    const columnCheck = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'books' AND column_name = 'is_featured'
    `);
    
    console.log(`\nis_featured column exists: ${columnCheck.rows.length > 0}`);
    
    // Check all books regardless of is_featured
    const allBooksResult = await client.query(
      `SELECT id, title, is_published, is_featured, status
       FROM books 
       WHERE is_published = true`
    );
    
    console.log(`\nAll published books (ignoring is_featured): ${allBooksResult.rows.length}`);
    allBooksResult.rows.forEach(book => {
      console.log(`- ${book.title}: published=${book.is_published}, featured=${book.is_featured || 'NULL'}`);
    });
    
  } catch (error) {
    console.error('Error running query:', error);
  } finally {
    client.release();
    pool.end();
  }
}

debugBooksQuery();