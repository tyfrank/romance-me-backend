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
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
};

const pool = new Pool(poolConfig);

async function checkChapters() {
  const client = await pool.connect();
  
  try {
    console.log('📚 Checking books and their chapters...\n');
    
    // Get all books with chapter count
    const booksResult = await client.query(`
      SELECT 
        b.id,
        b.title,
        b.author,
        b.is_published,
        b.status,
        b.total_chapters,
        COUNT(c.id) as actual_chapter_count
      FROM books b
      LEFT JOIN chapters c ON b.id = c.book_id
      GROUP BY b.id
      ORDER BY b.created_at
    `);
    
    console.log(`Found ${booksResult.rows.length} books:\n`);
    
    let booksWithNoChapters = [];
    
    booksResult.rows.forEach(book => {
      const chapterStatus = book.actual_chapter_count > 0 
        ? `✅ ${book.actual_chapter_count} chapters` 
        : '❌ NO CHAPTERS';
      
      console.log(`${book.title}`);
      console.log(`  Author: ${book.author}`);
      console.log(`  Published: ${book.is_published}`);
      console.log(`  Status: ${book.status}`);
      console.log(`  Expected chapters: ${book.total_chapters || 'not set'}`);
      console.log(`  Actual chapters: ${chapterStatus}`);
      console.log(`  Book ID: ${book.id}`);
      console.log('');
      
      if (book.actual_chapter_count === 0) {
        booksWithNoChapters.push(book);
      }
    });
    
    if (booksWithNoChapters.length > 0) {
      console.log('⚠️  WARNING: The following books have NO chapters:');
      booksWithNoChapters.forEach(book => {
        console.log(`  - ${book.title} (ID: ${book.id})`);
      });
      console.log('\nThese books will show "Book Not Found" when clicked!');
      console.log('You need to add chapters through the admin panel.');
    } else {
      console.log('✅ All books have chapters!');
    }
    
  } catch (error) {
    console.error('❌ Error checking chapters:', error.message);
  } finally {
    client.release();
    pool.end();
  }
}

checkChapters();