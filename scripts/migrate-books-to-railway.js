require('dotenv').config();
const { Pool } = require('pg');

// Local database connection
const localPool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'story_reader_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
});

// Railway database connection
const railwayPool = new Pool({
  connectionString: 'postgresql://postgres:GWICTpbrzIXOSdLyOhTKkwMTpbCSftdM@postgres.railway.internal:5432/railway',
  ssl: { rejectUnauthorized: false }
});

async function migrateBooksToRailway() {
  const localClient = await localPool.connect();
  const railwayClient = await railwayPool.connect();
  
  try {
    console.log('🔍 Fetching books from local database...');
    
    // Get real books from local database (excluding test books)
    const localBooks = await localClient.query(`
      SELECT id, title, description, synopsis, author, genre, content_rating,
             total_chapters, word_count, reading_time_minutes, cover_image_url,
             status, is_published, is_featured, created_at, updated_at
      FROM books 
      WHERE title NOT LIKE '%Test%' 
        AND title NOT LIKE '%Debug%'
        AND title NOT LIKE '%Your Book Title%'
      ORDER BY created_at
    `);
    
    console.log(`📚 Found ${localBooks.rows.length} real books to migrate:`);
    localBooks.rows.forEach(book => {
      console.log(`  - ${book.title} by ${book.author}`);
    });
    
    if (localBooks.rows.length === 0) {
      console.log('❌ No real books found to migrate');
      return;
    }
    
    console.log('\n🚀 Migrating books to Railway database...');
    
    for (const book of localBooks.rows) {
      // Check if book already exists in Railway
      const existingBook = await railwayClient.query(
        'SELECT id FROM books WHERE title = $1 AND author = $2',
        [book.title, book.author]
      );
      
      if (existingBook.rows.length > 0) {
        console.log(`  ⏭️  Skipping ${book.title} (already exists)`);
        continue;
      }
      
      // Insert book into Railway database
      await railwayClient.query(`
        INSERT INTO books (
          id, title, description, synopsis, author, genre, content_rating,
          total_chapters, word_count, reading_time_minutes, cover_image_url,
          status, is_published, is_featured, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
        )
      `, [
        book.id, book.title, book.description, book.synopsis, book.author,
        book.genre, book.content_rating, book.total_chapters, book.word_count,
        book.reading_time_minutes, book.cover_image_url, book.status,
        book.is_published, book.is_featured, book.created_at, book.updated_at
      ]);
      
      console.log(`  ✅ Migrated: ${book.title}`);
    }
    
    // Verify migration
    console.log('\n🔍 Verifying migration...');
    const railwayBooks = await railwayClient.query(
      'SELECT title, author FROM books ORDER BY created_at'
    );
    
    console.log(`📚 Railway database now has ${railwayBooks.rows.length} books:`);
    railwayBooks.rows.forEach(book => {
      console.log(`  - ${book.title} by ${book.author}`);
    });
    
    console.log('\n✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    localClient.release();
    railwayClient.release();
    localPool.end();
    railwayPool.end();
  }
}

migrateBooksToRailway();