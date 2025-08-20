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

async function testCoverUpdate() {
  const client = await pool.connect();
  
  try {
    // Get the first book
    const bookResult = await client.query('SELECT id, title, cover_image_url FROM books LIMIT 1');
    const book = bookResult.rows[0];
    
    console.log(`📚 Testing cover update for: ${book.title}`);
    console.log(`Current cover: ${book.cover_image_url || 'None'}\n`);
    
    // Test URL
    const testUrl = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&h=600&fit=crop';
    
    // Update with new cover URL
    const updateResult = await client.query(
      'UPDATE books SET cover_image_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [testUrl, book.id]
    );
    
    if (updateResult.rows.length > 0) {
      console.log('✅ Cover update successful!');
      console.log(`New cover: ${updateResult.rows[0].cover_image_url}`);
      console.log(`Updated at: ${updateResult.rows[0].updated_at}`);
    } else {
      console.log('❌ Cover update failed');
    }
    
  } catch (error) {
    console.error('❌ Error testing cover update:', error.message);
  } finally {
    client.release();
    pool.end();
  }
}

testCoverUpdate();