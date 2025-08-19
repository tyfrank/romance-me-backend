const db = require('./src/config/database');

async function debugConnection() {
  try {
    console.log('Testing main API database connection...');
    
    const result = await db.query('SELECT COUNT(*) as count FROM books WHERE is_published = true');
    console.log('Published books found:', result.rows[0].count);
    
    const allBooks = await db.query('SELECT title, is_published FROM books LIMIT 5');
    console.log('\nFirst 5 books:');
    allBooks.rows.forEach(book => {
      console.log(`- ${book.title}: published=${book.is_published}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
}

debugConnection();