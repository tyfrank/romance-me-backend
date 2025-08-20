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

async function deleteTestBooks() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Finding test books to delete...\n');
    
    // Find all test books
    const testBooksResult = await client.query(`
      SELECT id, title, author 
      FROM books 
      WHERE title LIKE '%Test%' 
         OR title LIKE '%Debug%'
         OR title = 'Your Book Title'
         OR title = 'gfdgdfs'
      ORDER BY created_at
    `);
    
    if (testBooksResult.rows.length === 0) {
      console.log('✅ No test books found to delete');
      return;
    }
    
    console.log(`Found ${testBooksResult.rows.length} test books to delete:`);
    testBooksResult.rows.forEach(book => {
      console.log(`  - ${book.title} by ${book.author}`);
    });
    
    console.log('\n🗑️  Deleting test books...');
    
    // Delete test books (will cascade to chapters and reading progress)
    const deleteResult = await client.query(`
      DELETE FROM books 
      WHERE title LIKE '%Test%' 
         OR title LIKE '%Debug%'
         OR title = 'Your Book Title'
         OR title = 'gfdgdfs'
      RETURNING title
    `);
    
    console.log(`\n✅ Deleted ${deleteResult.rows.length} test books`);
    
    // Show remaining books
    const remainingBooks = await client.query(`
      SELECT title, author, is_published 
      FROM books 
      ORDER BY created_at
    `);
    
    console.log(`\n📚 Remaining books in database (${remainingBooks.rows.length}):`);
    remainingBooks.rows.forEach(book => {
      console.log(`  - ${book.title} by ${book.author} (published: ${book.is_published})`);
    });
    
  } catch (error) {
    console.error('❌ Error deleting test books:', error.message);
  } finally {
    client.release();
    pool.end();
  }
}

deleteTestBooks();