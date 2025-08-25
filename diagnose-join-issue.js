#!/usr/bin/env node
const db = require('./src/config/database');

async function diagnoseJoinIssue() {
  console.log('🔍 DIAGNOSING JOIN ISSUE');
  console.log('========================');
  
  try {
    // Test book ID from logs
    const bookId = '24f8226a-bd66-43a1-a3a0-c9120e780e51';
    const chapterNumber = 1;
    
    console.log(`Testing with Book ID: ${bookId}, Chapter: ${chapterNumber}`);
    
    // Step 1: Check book exists
    console.log('\n📚 Step 1: Book check');
    const bookResult = await db.query('SELECT id, title FROM books WHERE id = $1', [bookId]);
    console.log(`Books found: ${bookResult.rows.length}`);
    if (bookResult.rows.length > 0) {
      console.log(`  - Title: ${bookResult.rows[0].title}`);
      console.log(`  - ID: ${bookResult.rows[0].id}`);
      console.log(`  - ID Type: ${typeof bookResult.rows[0].id}`);
    }
    
    // Step 2: Check chapters exist
    console.log('\n📖 Step 2: Chapter check');
    const chapterResult = await db.query(
      'SELECT id, book_id, chapter_number, title FROM chapters WHERE book_id = $1 AND chapter_number = $2', 
      [bookId, chapterNumber]
    );
    console.log(`Chapters found: ${chapterResult.rows.length}`);
    if (chapterResult.rows.length > 0) {
      const ch = chapterResult.rows[0];
      console.log(`  - Chapter ID: ${ch.id}`);
      console.log(`  - Book ID: ${ch.book_id}`);
      console.log(`  - Book ID Type: ${typeof ch.book_id}`);
      console.log(`  - Chapter Number: ${ch.chapter_number}`);
      console.log(`  - Title: ${ch.title}`);
    }
    
    // Step 3: Test the exact JOIN query that's failing
    console.log('\n🔗 Step 3: JOIN query test');
    const joinResult = await db.query(`
      SELECT 
        c.id, 
        c.chapter_number, 
        c.title,
        c.coin_cost, 
        c.is_premium, 
        c.unlock_type,
        b.title as book_title,
        b.author,
        c.book_id as chapter_book_id,
        b.id as book_table_id
       FROM chapters c
       JOIN books b ON c.book_id = b.id
       WHERE c.book_id = $1 AND c.chapter_number = $2
    `, [bookId, chapterNumber]);
    
    console.log(`JOIN query results: ${joinResult.rows.length}`);
    if (joinResult.rows.length > 0) {
      const result = joinResult.rows[0];
      console.log('✅ JOIN SUCCESS:');
      console.log(`  - Chapter: ${result.title}`);
      console.log(`  - Book: ${result.book_title}`);
      console.log(`  - Cost: ${result.coin_cost} coins`);
      console.log(`  - Premium: ${result.is_premium}`);
    } else {
      console.log('❌ JOIN FAILED - investigating...');
      
      // Check if there's a data type mismatch
      console.log('\n🔍 Investigating JOIN failure:');
      
      // Get sample data from both tables
      const sampleBook = await db.query('SELECT id FROM books LIMIT 1');
      const sampleChapter = await db.query('SELECT book_id FROM chapters LIMIT 1');
      
      if (sampleBook.rows.length > 0 && sampleChapter.rows.length > 0) {
        console.log(`Sample book.id: "${sampleBook.rows[0].id}" (${typeof sampleBook.rows[0].id})`);
        console.log(`Sample chapter.book_id: "${sampleChapter.rows[0].book_id}" (${typeof sampleChapter.rows[0].book_id})`);
        
        // Check if IDs match format
        console.log(`IDs equal: ${sampleBook.rows[0].id === sampleChapter.rows[0].book_id}`);
      }
    }
    
    console.log('\n✅ Diagnosis complete');
    
  } catch (error) {
    console.error('❌ Diagnosis failed:', error.message);
    console.error('Stack:', error.stack);
  }
  
  process.exit(0);
}

diagnoseJoinIssue();