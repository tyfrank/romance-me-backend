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

// Sample romance book covers - you can replace with your own URLs
const bookCovers = {
  'Crown Me Yours': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop',
  'Blood Moon Rising': 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=600&fit=crop',
  'The Devil\'s Intern': 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=400&h=600&fit=crop',
  'Bound to the Midnight Alpha': 'https://images.unsplash.com/photo-1494790108755-2616c57ac024?w=400&h=600&fit=crop'
};

async function addCoverUrls() {
  const client = await pool.connect();
  
  try {
    console.log('📚 Adding cover URLs to books...\n');
    
    for (const [title, coverUrl] of Object.entries(bookCovers)) {
      const result = await client.query(
        'UPDATE books SET cover_image_url = $1 WHERE title = $2 RETURNING title, cover_image_url',
        [coverUrl, title]
      );
      
      if (result.rows.length > 0) {
        console.log(`✅ Updated "${title}"`);
        console.log(`   Cover: ${coverUrl}\n`);
      } else {
        console.log(`❌ Book "${title}" not found\n`);
      }
    }
    
    // Verify updates
    const allBooks = await client.query(
      'SELECT title, cover_image_url FROM books ORDER BY title'
    );
    
    console.log('📋 Final book cover status:');
    allBooks.rows.forEach(book => {
      const status = book.cover_image_url ? '✅ HAS COVER' : '❌ NO COVER';
      console.log(`   ${book.title}: ${status}`);
    });
    
  } catch (error) {
    console.error('❌ Error adding cover URLs:', error.message);
  } finally {
    client.release();
    pool.end();
  }
}

addCoverUrls();