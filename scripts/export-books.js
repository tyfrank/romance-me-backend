require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');

// Local database connection
const localPool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'story_reader_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
});

async function exportBooks() {
  const client = await localPool.connect();
  
  try {
    console.log('🔍 Exporting books from local database...');
    
    // Get real books from local database (excluding test books)
    const localBooks = await client.query(`
      SELECT id, title, description, synopsis, author, genre, content_rating,
             total_chapters, word_count, reading_time_minutes, cover_image_url,
             status, is_published, is_featured, created_at, updated_at
      FROM books 
      WHERE title NOT LIKE '%Test%' 
        AND title NOT LIKE '%Debug%'
        AND title NOT LIKE '%Your Book Title%'
        AND title != 'gfdgdfs'
      ORDER BY created_at
    `);
    
    console.log(`📚 Found ${localBooks.rows.length} real books to export:`);
    localBooks.rows.forEach(book => {
      console.log(`  - ${book.title} by ${book.author}`);
    });
    
    // Create SQL insert statements
    let sql = '-- Real books export\n\n';
    
    for (const book of localBooks.rows) {
      sql += `INSERT INTO books (
  id, title, description, synopsis, author, genre, content_rating,
  total_chapters, word_count, reading_time_minutes, cover_image_url,
  status, is_published, is_featured, created_at, updated_at
) VALUES (
  '${book.id}',
  ${book.title ? `'${book.title.replace(/'/g, "''")}'` : 'NULL'},
  ${book.description ? `'${book.description.replace(/'/g, "''")}'` : 'NULL'},
  ${book.synopsis ? `'${book.synopsis.replace(/'/g, "''")}'` : 'NULL'},
  ${book.author ? `'${book.author.replace(/'/g, "''")}'` : 'NULL'},
  ${book.genre ? `'${JSON.stringify(book.genre)}'` : 'NULL'},
  ${book.content_rating ? `'${book.content_rating}'` : 'NULL'},
  ${book.total_chapters || 0},
  ${book.word_count || 0},
  ${book.reading_time_minutes || 0},
  ${book.cover_image_url ? `'${book.cover_image_url}'` : 'NULL'},
  ${book.status ? `'${book.status}'` : 'NULL'},
  ${book.is_published || false},
  ${book.is_featured || false},
  '${book.created_at ? book.created_at.toISOString() : new Date().toISOString()}',
  '${book.updated_at ? book.updated_at.toISOString() : new Date().toISOString()}'
) ON CONFLICT (id) DO NOTHING;

`;
    }
    
    // Save to file
    fs.writeFileSync('exported-books.sql', sql);
    console.log('\n✅ Books exported to exported-books.sql');
    console.log('📋 You can now copy this SQL and run it in Railway\'s database console');
    
  } catch (error) {
    console.error('❌ Export failed:', error.message);
  } finally {
    client.release();
    localPool.end();
  }
}

exportBooks();