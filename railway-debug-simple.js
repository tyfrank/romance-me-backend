#!/usr/bin/env node
// Simple debug script to run on Railway servers
const db = require('./src/config/database');

async function simpleDebug() {
  try {
    console.log('🔍 Railway Database Debug');
    console.log('========================');
    
    // Check books
    const booksResult = await db.query('SELECT id, title FROM books LIMIT 3');
    console.log(`\n📚 Found ${booksResult.rows.length} books:`);
    booksResult.rows.forEach(book => {
      console.log(`  ${book.title} (${book.id})`);
    });
    
    if (booksResult.rows.length > 0) {
      const testBookId = booksResult.rows[0].id;
      console.log(`\n🧪 Testing chapters for: ${testBookId}`);
      
      // Check chapters for first book
      const chaptersResult = await db.query(
        'SELECT chapter_number, title FROM chapters WHERE book_id = $1 ORDER BY chapter_number LIMIT 5',
        [testBookId]
      );
      
      console.log(`📖 Found ${chaptersResult.rows.length} chapters:`);
      chaptersResult.rows.forEach(ch => {
        console.log(`  Chapter ${ch.chapter_number}: ${ch.title || 'Untitled'}`);
      });
      
      if (chaptersResult.rows.length > 0) {
        // Test the full query
        const fullQuery = await db.query(`
          SELECT c.id, c.chapter_number, c.title, c.coin_cost, c.is_premium, c.unlock_type,
                 b.title as book_title, b.author
          FROM chapters c
          JOIN books b ON c.book_id = b.id
          WHERE c.book_id = $1 AND c.chapter_number = 1
        `, [testBookId]);
        
        console.log(`\n🎯 Full query test: ${fullQuery.rows.length} results`);
        if (fullQuery.rows.length > 0) {
          const result = fullQuery.rows[0];
          console.log(`✅ SUCCESS! Chapter 1 data:`);
          console.log(`  - Title: ${result.title}`);
          console.log(`  - Book: ${result.book_title}`);
          console.log(`  - Cost: ${result.coin_cost} coins`);
          console.log(`  - Premium: ${result.is_premium}`);
          console.log(`  - Type: ${result.unlock_type}`);
          
          console.log(`\n🔗 API should work with:`);
          console.log(`  GET /api/books/${testBookId}/chapters/1/access`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  process.exit(0);
}

simpleDebug();