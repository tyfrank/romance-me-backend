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

async function debugChapterQuery() {
  try {
    console.log('🔍 Debugging Chapter Query on Railway Database');
    console.log('=' + '='.repeat(50));
    
    const client = await pool.connect();
    
    // Test 1: Check if books exist
    console.log('\n📚 Step 1: Checking books...');
    const booksResult = await client.query('SELECT id, title FROM books LIMIT 5');
    console.log(`Found ${booksResult.rows.length} books:`);
    booksResult.rows.forEach(book => {
      console.log(`  - ${book.title} (${book.id})`);
    });
    
    if (booksResult.rows.length === 0) {
      console.log('❌ No books found! This is the problem.');
      client.release();
      return;
    }
    
    // Test 2: Check if chapters exist
    console.log('\n📖 Step 2: Checking chapters...');
    const chaptersResult = await client.query('SELECT book_id, chapter_number, title FROM chapters LIMIT 5');
    console.log(`Found ${chaptersResult.rows.length} chapters:`);
    chaptersResult.rows.forEach(chapter => {
      console.log(`  - Book ${chapter.book_id}, Chapter ${chapter.chapter_number}: ${chapter.title}`);
    });
    
    if (chaptersResult.rows.length === 0) {
      console.log('❌ No chapters found! This is the problem.');
      client.release();
      return;
    }
    
    // Test 3: Check if monetization columns exist
    console.log('\n💰 Step 3: Checking monetization columns...');
    const columnsResult = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'chapters' AND column_name IN ('coin_cost', 'is_premium', 'unlock_type')
      ORDER BY column_name
    `);
    
    console.log(`Monetization columns found: ${columnsResult.rows.length}/3`);
    columnsResult.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'}, default: ${col.column_default || 'none'})`);
    });
    
    if (columnsResult.rows.length < 3) {
      console.log('❌ Missing monetization columns! Need to run migration.');
      client.release();
      return;
    }
    
    // Test 4: Try the exact query from chapterAccessController
    console.log('\n🧪 Step 4: Testing exact controller query...');
    const testBookId = booksResult.rows[0].id;
    const testChapterNum = 1;
    
    console.log(`Testing with book ID: ${testBookId}, chapter: ${testChapterNum}`);
    
    const controllerQuery = `SELECT 
      c.id, 
      c.chapter_number, 
      c.title,
      c.coin_cost, 
      c.is_premium, 
      c.unlock_type,
      b.title as book_title,
      b.author
     FROM chapters c
     JOIN books b ON c.book_id = b.id
     WHERE c.book_id = $1 AND c.chapter_number = $2`;
    
    const queryResult = await client.query(controllerQuery, [testBookId, testChapterNum]);
    
    console.log(`Query returned ${queryResult.rows.length} rows`);
    if (queryResult.rows.length > 0) {
      const chapter = queryResult.rows[0];
      console.log('✅ Success! Chapter found:');
      console.log(`  - ID: ${chapter.id}`);
      console.log(`  - Number: ${chapter.chapter_number}`);
      console.log(`  - Title: ${chapter.title}`);
      console.log(`  - Book: ${chapter.book_title} by ${chapter.author}`);
      console.log(`  - Cost: ${chapter.coin_cost} coins`);
      console.log(`  - Premium: ${chapter.is_premium}`);
      console.log(`  - Unlock Type: ${chapter.unlock_type}`);
    } else {
      console.log('❌ Query returned no results. Checking why...');
      
      // Check if the specific chapter exists without the join
      const simpleChapterQuery = await client.query(
        'SELECT id, chapter_number, title FROM chapters WHERE book_id = $1',
        [testBookId]
      );
      console.log(`Chapters for this book: ${simpleChapterQuery.rows.length}`);
      simpleChapterQuery.rows.forEach(ch => {
        console.log(`  - Chapter ${ch.chapter_number}: ${ch.title}`);
      });
    }
    
    client.release();
    console.log('\n✅ Debug completed');
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

debugChapterQuery();