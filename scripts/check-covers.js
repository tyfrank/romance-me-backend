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

async function checkCovers() {
  const client = await pool.connect();
  
  try {
    console.log('📚 Checking book covers...\n');
    
    const result = await client.query(`
      SELECT id, title, cover_image_url, updated_at 
      FROM books 
      ORDER BY title
    `);
    
    console.log(`Found ${result.rows.length} books:\n`);
    
    result.rows.forEach(book => {
      const status = book.cover_image_url ? '✅ HAS COVER' : '❌ NO COVER';
      console.log(`📖 ${book.title}`);
      console.log(`   ID: ${book.id}`);
      console.log(`   Cover: ${book.cover_image_url || 'None'}`);
      console.log(`   Updated: ${book.updated_at}`);
      console.log(`   Status: ${status}\n`);
    });
    
  } catch (error) {
    console.error('❌ Error checking covers:', error.message);
  } finally {
    client.release();
    pool.end();
  }
}

checkCovers();