#!/usr/bin/env node
const { Pool } = require('pg');

// Railway database connection
const DATABASE_URL = process.env.DATABASE_URL || 
                     process.env.DATABASE_PRIVATE_URL || 
                     'postgresql://postgres:hAVRjGCLdGdeFhRcDFNZLcZQrKXXYLrQ@junction.proxy.rlwy.net:22634/railway';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkData() {
  try {
    console.log('🔗 Connecting to Railway database...');
    const client = await pool.connect();
    
    // Check books
    const booksResult = await client.query('SELECT id, title, author FROM books LIMIT 5');
    console.log('\n📚 Books in database:');
    booksResult.rows.forEach(book => {
      console.log(`  - ${book.title} by ${book.author} (ID: ${book.id})`);
    });
    
    // Check chapters for the specific book
    const chaptersResult = await client.query(
      'SELECT id, chapter_number, title FROM chapters WHERE book_id = $1 ORDER BY chapter_number LIMIT 10',
      ['2f82226a-bd66-43a1-a3a0-c9120e780e51']
    );
    console.log('\n📖 Chapters for book 2f82226a-bd66-43a1-a3a0-c9120e780e51:');
    if (chaptersResult.rows.length === 0) {
      console.log('  ❌ No chapters found for this book ID!');
      
      // Check if there are any chapters at all
      const allChaptersResult = await client.query(
        'SELECT book_id, COUNT(*) as chapter_count FROM chapters GROUP BY book_id LIMIT 5'
      );
      console.log('\n📊 Chapter counts by book:');
      allChaptersResult.rows.forEach(row => {
        console.log(`  - Book ${row.book_id}: ${row.chapter_count} chapters`);
      });
    } else {
      chaptersResult.rows.forEach(chapter => {
        console.log(`  - Chapter ${chapter.chapter_number}: ${chapter.title} (ID: ${chapter.id})`);
      });
    }
    
    client.release();
    console.log('\n✅ Database check completed');
    
  } catch (error) {
    console.error('❌ Database check failed:', error.message);
  } finally {
    await pool.end();
  }
}

checkData();