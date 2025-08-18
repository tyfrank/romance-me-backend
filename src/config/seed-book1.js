const db = require('./database');

const seedBook1 = async () => {
  try {
    console.log('Seeding Book 1 structure...');
    
    // Create Book 1 entry
    const bookResult = await db.query(
      `INSERT INTO books (title, description, synopsis, author, genre, content_rating, 
                         total_chapters, word_count, reading_time_minutes, is_published, is_featured) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
       RETURNING id`,
      [
        'Book 1: [Title Ready for Your Content]',
        'A captivating adult story with rich personalization and compelling characters.',
        'An immersive story experience where you become the main character, with choices and consequences that shape your journey. Features deep personalization using your character profile for a truly unique reading experience.',
        'Author Name',
        ['mystery', 'romance', 'adult'],
        '18+',
        12,
        50000,
        250,
        true,
        true
      ]
    );

    const bookId = bookResult.rows[0].id;
    console.log('Book 1 created with ID:', bookId);

    // Create placeholder chapters (ready for your content)
    const chapters = [
      { number: 1, title: 'Chapter 1: The Beginning', wordCount: 4200, readingTime: 21 },
      { number: 2, title: 'Chapter 2: First Encounters', wordCount: 4100, readingTime: 20 },
      { number: 3, title: 'Chapter 3: Revelations', wordCount: 4300, readingTime: 22 },
      { number: 4, title: 'Chapter 4: Deeper Connections', wordCount: 4000, readingTime: 20 },
      { number: 5, title: 'Chapter 5: Turning Point', wordCount: 4500, readingTime: 23 },
      { number: 6, title: 'Chapter 6: Complications', wordCount: 4200, readingTime: 21 },
      { number: 7, title: 'Chapter 7: Choices', wordCount: 4100, readingTime: 20 },
      { number: 8, title: 'Chapter 8: Consequences', wordCount: 4400, readingTime: 22 },
      { number: 9, title: 'Chapter 9: Rising Action', wordCount: 4300, readingTime: 21 },
      { number: 10, title: 'Chapter 10: Climax', wordCount: 4600, readingTime: 23 },
      { number: 11, title: 'Chapter 11: Resolution', wordCount: 4200, readingTime: 21 },
      { number: 12, title: 'Chapter 12: New Beginnings', wordCount: 4100, readingTime: 20 }
    ];

    for (const chapter of chapters) {
      // Placeholder content with full personalization - ready for your real content
      const chapterContent = {
        sections: [
          {
            type: "paragraph",
            text: `[Chapter ${chapter.number} content ready for replacement]`
          },
          {
            type: "paragraph", 
            text: "{{firstName}} stood at the crossroads of destiny, her {{hairDescription}} catching the light. This chapter will be personalized with your character profile when you provide the real content."
          },
          {
            type: "paragraph",
            text: "The story continues to unfold around {{name}}, incorporating her {{eyeColor}} eyes, {{buildDescription}}, and {{style}} preferences seamlessly into the narrative."
          },
          {
            type: "paragraph",
            text: `This is placeholder content for ${chapter.title}. When you provide the real chapter content, it will use all the enhanced personalization tokens: {{firstName}}, {{lastName}}, {{fullName}}, {{hairDescription}}, {{skinDescription}}, {{buildDescription}}, {{eyeColor}}, {{height}}, {{style}}, and {{setting}}.`
          }
        ],
        metadata: {
          wordCount: chapter.wordCount,
          readingTime: chapter.readingTime,
          personalizationTokens: [
            "firstName", "name", "lastName", "fullName",
            "hairDescription", "skinDescription", "buildDescription", 
            "eyeColor", "height", "style", "setting"
          ]
        }
      };

      await db.query(
        `INSERT INTO chapters (book_id, chapter_number, title, content, word_count, reading_time_minutes) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [bookId, chapter.number, chapter.title, JSON.stringify(chapterContent), chapter.wordCount, chapter.readingTime]
      );

      console.log(`Chapter ${chapter.number} created: ${chapter.title}`);
    }
    
    console.log('Book 1 structure seeded successfully!');
    console.log('Ready for your actual book content.');
    
  } catch (error) {
    console.error('Error seeding Book 1:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
};

seedBook1();