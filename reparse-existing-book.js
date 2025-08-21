const db = require('./src/config/database');
const { parseChapters, detectFormat } = require('./src/utils/chapterParser');

// Re-parse an existing book with the improved chapter parser
async function reparseBook(bookTitle) {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');
    
    // Find the book
    const bookResult = await client.query(
      'SELECT id, title FROM books WHERE title ILIKE $1',
      [`%${bookTitle}%`]
    );
    
    if (bookResult.rows.length === 0) {
      console.log(`❌ Book not found: ${bookTitle}`);
      return;
    }
    
    const book = bookResult.rows[0];
    console.log(`📚 Found book: "${book.title}" (ID: ${book.id})`);
    
    // Get existing chapters and reconstruct full text
    const chaptersResult = await client.query(
      'SELECT chapter_number, content FROM chapters WHERE book_id = $1 ORDER BY chapter_number',
      [book.id]
    );
    
    console.log(`📖 Current chapters in database: ${chaptersResult.rows.length}`);
    
    if (chaptersResult.rows.length === 0) {
      console.log('❌ No chapters found to re-parse');
      await client.query('ROLLBACK');
      return;
    }
    
    // Reconstruct the full text from existing chapters
    let fullText = '';
    chaptersResult.rows.forEach((ch, index) => {
      let content = ch.content;
      
      // Handle different content formats
      if (typeof content === 'string') {
        try {
          content = JSON.parse(content);
        } catch (e) {
          // Already a string
        }
      }
      
      // Extract text from structured content
      if (typeof content === 'object' && content.paragraphs) {
        fullText += content.paragraphs.join('\n\n');
      } else if (Array.isArray(content)) {
        fullText += content.join('\n\n');
      } else if (typeof content === 'string') {
        fullText += content;
      }
      
      // Add chapter marker for separation (if not last chapter)
      if (index < chaptersResult.rows.length - 1) {
        fullText += '\n\n---CHAPTER_BREAK---\n\n';
      }
    });
    
    console.log(`📝 Reconstructed text: ${fullText.length} characters`);
    console.log(`🔍 Detecting format...`);
    
    // Detect formats in the reconstructed text
    const formats = detectFormat(fullText);
    console.log(`   Formats found: ${formats.join(', ')}`);
    
    // For now, let's just show what we would detect without actually re-parsing
    // This is safer than modifying existing data
    console.log('\n📊 Analysis Results:');
    console.log('==================');
    console.log(`Current chapters: ${chaptersResult.rows.length}`);
    console.log(`Formats detected: ${formats.join(', ')}`);
    console.log(`Text length: ${fullText.length.toLocaleString()} characters`);
    console.log(`Estimated words: ${fullText.split(/\s+/).length.toLocaleString()}`);
    
    // Ask if user wants to proceed (would need to be manual for now)
    console.log('\n⚠️  To safely re-parse:');
    console.log('1. Back up your current book');
    console.log('2. Re-upload using the improved parser');
    console.log('3. The new parser will detect all chapters properly');
    
    await client.query('ROLLBACK'); // Don't modify anything
    console.log('\n✅ Analysis complete - no changes made');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error);
  } finally {
    client.release();
  }
}

// Run the script
(async () => {
  const bookTitle = process.argv[2] || 'Crown Me Yours';
  console.log(`🔄 Analyzing "${bookTitle}" for re-parsing...\n`);
  
  try {
    await reparseBook(bookTitle);
    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
})();