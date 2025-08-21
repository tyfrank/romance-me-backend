const db = require('./src/config/database');

// Simple fix: Update the total_chapters to match actual chapters
async function fixChapterCounts() {
  try {
    const books = await db.query(`
      SELECT 
        b.id,
        b.title,
        b.total_chapters as claimed,
        COUNT(c.id) as actual
      FROM books b
      LEFT JOIN chapters c ON b.id = c.book_id
      GROUP BY b.id, b.title, b.total_chapters
      HAVING b.total_chapters != COUNT(c.id)
    `);
    
    console.log('Books with mismatched chapter counts:');
    console.log('=====================================');
    
    for (const book of books.rows) {
      console.log(`\n📚 ${book.title}`);
      console.log(`   Currently shows: ${book.claimed} chapters`);
      console.log(`   Actually has: ${book.actual} chapters`);
      
      // Update to match reality
      await db.query(
        'UPDATE books SET total_chapters = $1 WHERE id = $2',
        [book.actual, book.id]
      );
      
      console.log(`   ✅ Fixed: Now shows ${book.actual} chapters`);
    }
    
    console.log('\n✅ All chapter counts fixed!');
    console.log('   The admin panel will now show correct counts.');
    console.log('   To add missing chapters, re-upload the full book content.');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

fixChapterCounts().then(() => process.exit(0));