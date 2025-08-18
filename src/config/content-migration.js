const { Client } = require('pg');
require('dotenv').config();

const migrateToContentManagement = async () => {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'story_reader_db'
  });

  try {
    await client.connect();
    console.log('Running content management migration...');
    
    // Create books table for professional content management
    await client.query(`
      CREATE TABLE IF NOT EXISTS books (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        synopsis TEXT,
        author VARCHAR(255) DEFAULT 'Author',
        genre VARCHAR(100)[] DEFAULT '{}',
        content_rating VARCHAR(20) DEFAULT '18+',
        total_chapters INTEGER NOT NULL DEFAULT 0,
        word_count INTEGER DEFAULT 0,
        reading_time_minutes INTEGER DEFAULT 0,
        cover_image_url TEXT,
        is_published BOOLEAN DEFAULT false,
        is_featured BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create chapters table linked to books
    await client.query(`
      CREATE TABLE IF NOT EXISTS chapters (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
        chapter_number INTEGER NOT NULL,
        title VARCHAR(255) NOT NULL,
        content JSONB NOT NULL,
        word_count INTEGER DEFAULT 0,
        reading_time_minutes INTEGER DEFAULT 0,
        is_published BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(book_id, chapter_number)
      )
    `);
    
    // Create reading progress table for tracking user progress
    await client.query(`
      CREATE TABLE IF NOT EXISTS reading_progress (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
        current_chapter_number INTEGER NOT NULL DEFAULT 1,
        total_chapters_read INTEGER DEFAULT 0,
        progress_percentage DECIMAL(5,2) DEFAULT 0.00,
        last_read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP NULL,
        UNIQUE(user_id, book_id)
      )
    `);
    
    // Create indexes for performance
    await client.query(`CREATE INDEX IF NOT EXISTS idx_books_published ON books(is_published)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_books_featured ON books(is_featured)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_books_genre ON books USING GIN(genre)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_chapters_book_number ON chapters(book_id, chapter_number)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_chapters_published ON chapters(is_published)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_reading_progress_user ON reading_progress(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_reading_progress_book ON reading_progress(book_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_reading_progress_last_read ON reading_progress(last_read_at)`);
    
    console.log('Content management tables created successfully');
    
    // Remove old stories table data (but keep the table structure for now)
    await client.query('DELETE FROM stories');
    console.log('Cleared old test stories');
    
  } catch (error) {
    console.error('Error running content migration:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
};

migrateToContentManagement();