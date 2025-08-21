const db = require('./src/config/database');

(async () => {
  try {
    // Check columns
    const cols = await db.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'books' ORDER BY ordinal_position");
    console.log('Books table columns:', cols.rows.map(r => r.column_name).join(', '));
    console.log('');
    
    // Now check actual vs claimed chapters
    const books = await db.query('SELECT id, title, total_chapters FROM books ORDER BY title');
    
    console.log('Chapter Count Analysis:');
    console.log('=======================');
    
    for (const book of books.rows) {
      const chapters = await db.query('SELECT COUNT(*) as count FROM chapters WHERE book_id = $1', [book.id]);
      const actual = parseInt(chapters.rows[0].count);
      const claimed = parseInt(book.total_chapters);
      
      console.log(`${book.title}:`);
      console.log(`  Admin panel shows: ${claimed} chapters`);
      console.log(`  Database contains: ${actual} chapters`);
      
      if (claimed !== actual) {
        const diff = claimed - actual;
        if (diff > 0) {
          console.log(`  ⚠️ MISSING ${diff} chapters in database!`);
        } else {
          console.log(`  ⚠️ EXTRA ${-diff} chapters in database!`);
        }
      } else {
        console.log(`  ✅ Counts match`);
      }
      console.log('');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();