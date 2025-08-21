const db = require('./src/config/database');

// Enhanced chapter detection with multiple format support
const detectChapters = (fullText) => {
  console.log('Testing chapter detection...\n');
  console.log('Total text length:', fullText.length, 'characters');
  console.log('Total words:', fullText.split(/\s+/).length);
  
  // Test different patterns
  const patterns = [
    { name: 'Chapter N', pattern: /Chapter\s+\d+/gi },
    { name: 'CHAPTER N', pattern: /CHAPTER\s+\d+/gi },
    { name: 'Chapter Roman', pattern: /Chapter\s+[IVXLCDM]+/gi },
    { name: 'Part N', pattern: /Part\s+\d+/gi },
    { name: 'Numeric alone', pattern: /^\d+$/gm },
    { name: 'Numeric with dot', pattern: /^\d+\./gm },
    { name: 'Scene breaks (***)', pattern: /^\*\*\*+$/gm },
    { name: 'Line breaks (---)', pattern: /^---+$/gm },
    { name: 'Chapter word in line', pattern: /^.*chapter.*$/gmi }
  ];
  
  patterns.forEach(({ name, pattern }) => {
    const matches = fullText.match(pattern);
    if (matches) {
      console.log(`✓ Found ${matches.length} matches for pattern "${name}":`, matches.slice(0, 5).join(', '));
    } else {
      console.log(`✗ No matches for pattern "${name}"`);
    }
  });
  
  // Check for double line breaks as chapter separators
  const doubleBreaks = fullText.split(/\n\n+/);
  console.log(`\n✓ Found ${doubleBreaks.length} sections separated by double line breaks`);
  
  // Check first 500 chars to understand format
  console.log('\nFirst 500 characters of text:');
  console.log('---');
  console.log(fullText.substring(0, 500));
  console.log('---');
  
  return {
    detectedChapters: 0,
    format: 'unknown'
  };
};

(async () => {
  try {
    // Get a book that should have 32 chapters
    const book = await db.query("SELECT id, title FROM books WHERE title LIKE '%Crown%'");
    if (book.rows.length === 0) {
      console.log('Book not found');
      process.exit(1);
    }
    
    // Try to get the original uploaded content (if stored)
    // First check if there's a full_text column or similar
    const columns = await db.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'books'"
    );
    console.log('Book table columns:', columns.rows.map(r => r.column_name).join(', '));
    
    // Get all chapter content to reconstruct
    const chapters = await db.query(
      'SELECT chapter_number, content FROM chapters WHERE book_id = $1 ORDER BY chapter_number',
      [book.rows[0].id]
    );
    
    console.log(`\nFound ${chapters.rows.length} chapters for "${book.rows[0].title}"`);
    
    // Try to see the structure of stored content
    if (chapters.rows.length > 0) {
      const firstChapter = chapters.rows[0].content;
      console.log('\nChapter 1 content type:', typeof firstChapter);
      console.log('Chapter 1 preview:', JSON.stringify(firstChapter).substring(0, 200));
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();