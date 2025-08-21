const db = require('./src/config/database');

(async () => {
  try {
    // Check all books with their chapter counts
    const books = await db.query(`
      SELECT 
        b.id,
        b.title,
        b.total_chapters as claimed_chapters,
        b.updated_at,
        COUNT(c.id) as actual_chapters
      FROM books b
      LEFT JOIN chapters c ON b.id = c.book_id
      WHERE b.title LIKE '%Blood%' OR b.title LIKE '%Devil%' OR b.title LIKE '%Crown%'
      GROUP BY b.id, b.title, b.total_chapters, b.updated_at
      ORDER BY b.updated_at DESC
    `);
    
    console.log('Book Status Report:');
    console.log('==================');
    books.rows.forEach(book => {
      console.log(`📚 ${book.title}`);
      console.log(`   Claimed: ${book.claimed_chapters} chapters`);
      console.log(`   Database: ${book.actual_chapters} chapters`);
      console.log(`   Updated: ${book.updated_at}`);
      
      if (parseInt(book.claimed_chapters) !== parseInt(book.actual_chapters)) {
        const diff = book.claimed_chapters - book.actual_chapters;
        console.log(`   ⚠️ MISSING: ${diff} chapters not in database!`);
      } else {
        console.log(`   ✅ Counts match`);
      }
      console.log('');
    });
    
    // Check for any recent uploads (last 15 minutes)
    const recent = await db.query("SELECT title, updated_at FROM books WHERE updated_at > NOW() - INTERVAL '15 minutes' ORDER BY updated_at DESC");
    console.log(`Recent uploads (last 15 minutes): ${recent.rows.length}`);
    if (recent.rows.length > 0) {
      recent.rows.forEach(b => console.log(`  ${b.title} - ${b.updated_at}`));
    } else {
      console.log('  No recent uploads detected in database');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();