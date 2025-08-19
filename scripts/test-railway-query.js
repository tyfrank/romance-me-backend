require('dotenv').config();
const { Pool } = require('pg');

// Force Railway connection
const poolConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
};

const pool = new Pool(poolConfig);

async function testRailwayQuery() {
  const client = await pool.connect();
  
  try {
    console.log('Testing Railway database query...');
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
    
    // Test the exact query from the API
    const booksResult = await client.query(
      `SELECT id, title, description, synopsis, author, genre, content_rating, 
              total_chapters, word_count, reading_time_minutes, cover_image_url, status
       FROM books 
       WHERE is_published = true 
       ORDER BY is_featured DESC, created_at DESC 
       LIMIT 10 OFFSET 0`
    );
    
    console.log(`\nQuery returned ${booksResult.rows.length} books`);
    
    if (booksResult.rows.length > 0) {
      console.log('\nBooks found:');
      booksResult.rows.forEach(book => {
        console.log(`- ${book.title}`);
      });
    } else {
      // Check if any books exist at all
      const allBooks = await client.query('SELECT COUNT(*) as count FROM books');
      console.log(`Total books in database: ${allBooks.rows[0].count}`);
      
      // Check published status
      const publishedBooks = await client.query('SELECT COUNT(*) as count FROM books WHERE is_published = true');
      console.log(`Published books: ${publishedBooks.rows[0].count}`);
      
      // Check is_featured column
      const featuredBooks = await client.query('SELECT COUNT(*) as count FROM books WHERE is_featured IS NOT NULL');
      console.log(`Books with is_featured set: ${featuredBooks.rows[0].count}`);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    client.release();
    pool.end();
  }
}

testRailwayQuery();