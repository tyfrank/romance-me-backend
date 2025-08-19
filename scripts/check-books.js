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

async function checkBooks() {
  const client = await pool.connect();
  
  try {
    console.log('Checking books in database...\n');
    
    // Check if books table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'books'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('❌ Books table does not exist!');
      return;
    }
    
    // Get all books
    const allBooks = await client.query('SELECT id, title, is_published, status FROM books');
    console.log(`Total books in database: ${allBooks.rows.length}`);
    
    if (allBooks.rows.length > 0) {
      console.log('\nAll books:');
      allBooks.rows.forEach(book => {
        console.log(`- ${book.title}: published=${book.is_published}, status=${book.status}`);
      });
    }
    
    // Get published books (same query as the API)
    const publishedBooks = await client.query(`
      SELECT id, title, description, synopsis, author, genre, content_rating, 
              total_chapters, word_count, reading_time_minutes, cover_image_url, status
       FROM books 
       WHERE is_published = true 
       ORDER BY is_featured DESC, created_at DESC 
       LIMIT 10 OFFSET 0
    `);
    
    console.log(`\nPublished books: ${publishedBooks.rows.length}`);
    
    if (publishedBooks.rows.length > 0) {
      console.log('\nPublished books details:');
      publishedBooks.rows.forEach(book => {
        console.log(`- ${book.title} (${book.status})`);
      });
    } else {
      console.log('\n⚠️  No published books found!');
      console.log('Make sure books have is_published = true');
    }
    
    // Check for any data issues
    const dataCheck = await client.query(`
      SELECT COUNT(*) as unpublished FROM books WHERE is_published = false OR is_published IS NULL
    `);
    
    if (dataCheck.rows[0].unpublished > 0) {
      console.log(`\n⚠️  ${dataCheck.rows[0].unpublished} books are not published`);
    }
    
  } catch (error) {
    console.error('Error checking books:', error);
  } finally {
    client.release();
    pool.end();
  }
}

checkBooks();