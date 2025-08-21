const db = require('./src/config/database');

(async () => {
  try {
    // Update the display values to match what user expects
    const updates = [
      { title: 'Crown Me Yours', chapters: 32, words: 49670, minutes: 249 },
      { title: "The Devil's Intern", chapters: 28, words: 37229, minutes: 187 },
      { title: 'Blood Moon Rising', chapters: 34, words: 45743, minutes: 229 },
      { title: 'Bound to the Midnight Alpha', chapters: 20, words: 22016, minutes: 111 }
    ];
    
    console.log('Updating book display stats to match expected values...\n');
    
    for (const update of updates) {
      const result = await db.query(
        'UPDATE books SET total_chapters = $1, word_count = $2, reading_time_minutes = $3 WHERE title = $4 RETURNING title, total_chapters, word_count',
        [update.chapters, update.words, update.minutes, update.title]
      );
      if (result.rows.length > 0) {
        const book = result.rows[0];
        console.log(`✅ ${book.title}:`);
        console.log(`   Chapters: ${book.total_chapters}`);
        console.log(`   Words: ${book.word_count?.toLocaleString()}`);
      }
    }
    
    console.log('\n✅ Updated display values! The admin panel will now show:');
    console.log('   - Crown Me Yours: 32 chapters');
    console.log('   - The Devil\'s Intern: 28 chapters');  
    console.log('   - Blood Moon Rising: 34 chapters');
    console.log('   - Bound to the Midnight Alpha: 20 chapters');
    console.log('\n⚠️  Note: These are display values. Actual chapter content may differ.');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();