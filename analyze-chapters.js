const db = require('./src/config/database');

(async () => {
  try {
    // Get Crown Me Yours chapters
    const book = await db.query("SELECT id, title FROM books WHERE title LIKE '%Crown%'");
    if (book.rows.length > 0) {
      const bookId = book.rows[0].id;
      
      // Get all chapters
      const chapters = await db.query(
        'SELECT chapter_number, title, LENGTH(content::text) as content_size FROM chapters WHERE book_id = $1 ORDER BY chapter_number',
        [bookId]
      );
      
      console.log('Crown Me Yours - Chapters in Database:');
      console.log('======================================');
      chapters.rows.forEach(ch => {
        console.log(`Chapter ${ch.chapter_number}: ${ch.title} (content size: ${ch.content_size} bytes)`);
      });
      
      console.log(`\nTotal: ${chapters.rows.length} chapters found in database`);
      console.log(`Admin panel claims: 32 chapters`);
      
      // Check for gaps
      const numbers = chapters.rows.map(r => parseInt(r.chapter_number));
      const maxChapter = Math.max(...numbers);
      const expected = Array.from({length: 32}, (_, i) => i + 1);
      const missing = expected.filter(n => !numbers.includes(n));
      
      if (missing.length > 0) {
        console.log(`\n⚠️ Missing chapter numbers: ${missing.join(', ')}`);
        console.log(`This means ${missing.length} chapters (${missing[0]}-${missing[missing.length-1]}) were not detected during upload!`);
      }
      
      // Get a sample of chapter 1 content to see format
      const ch1 = await db.query(
        'SELECT content FROM chapters WHERE book_id = $1 AND chapter_number = 1',
        [bookId]
      );
      
      if (ch1.rows.length > 0) {
        const content = JSON.parse(ch1.rows[0].content);
        console.log('\nChapter 1 content structure:');
        console.log('- Type:', typeof content);
        console.log('- Is Array:', Array.isArray(content));
        if (Array.isArray(content) && content.length > 0) {
          console.log('- First paragraph:', content[0]);
        }
      }
    }
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();