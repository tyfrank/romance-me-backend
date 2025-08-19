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

async function createReadingProgressTable() {
  const client = await pool.connect();
  
  try {
    console.log('Creating user_reading_progress table...');
    
    // Ensure extension exists
    await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
    
    // Create user_reading_progress table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_reading_progress (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
        current_chapter_number INTEGER DEFAULT 1,
        total_chapters_read INTEGER DEFAULT 0,
        progress_percentage DECIMAL(5,2) DEFAULT 0.00,
        last_read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, book_id)
      );
    `);
    
    console.log('✅ user_reading_progress table created successfully!');
    
    // Check existing tables
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log('\nExisting tables:');
    tables.rows.forEach(row => {
      console.log(`- ${row.table_name}`);
    });
    
  } catch (error) {
    console.error('Error creating table:', error);
  } finally {
    client.release();
    pool.end();
  }
}

createReadingProgressTable();