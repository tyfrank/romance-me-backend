const db = require('./database');

const seedDatabase = async () => {
  try {
    // Insert a test story
    const storyContent = {
      chapters: [
        {
          id: "chapter-1",
          title: "The Mysterious Encounter",
          content: [
            {
              type: "paragraph",
              text: "{{name}} had always been drawn to the old mansion at the edge of town. Tonight, under the full moon, {{name}} finally decided to explore its mysteries."
            },
            {
              type: "paragraph",
              text: "The heavy wooden door creaked open as {{name}} stepped inside. The air was thick with anticipation and the scent of aged wood and forgotten memories."
            },
            {
              type: "paragraph", 
              text: "As {{name}}'s eyes adjusted to the dim light filtering through dusty windows, a figure emerged from the shadows. Tall and enigmatic, they moved with a grace that made {{name}}'s heart race."
            },
            {
              type: "paragraph",
              text: "'I've been waiting for you, {{name}},' the stranger said, their voice like velvet in the darkness. 'There's something about this place you need to know.'"
            },
            {
              type: "paragraph",
              text: "{{name}} felt a mixture of fear and excitement. This was the beginning of an adventure that would change everything."
            }
          ]
        }
      ],
      metadata: {
        wordCount: 150,
        readingTime: "2 min",
        personalizationTokens: ["name"]
      }
    };

    const result = await db.query(
      `INSERT INTO stories (title, description, content, tags, is_active) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id`,
      [
        'The Mysterious Encounter',
        'A thrilling adult story of mystery and passion in an abandoned mansion.',
        JSON.stringify(storyContent),
        ['mystery', 'romance', 'adult'],
        true
      ]
    );

    console.log('Test story inserted with ID:', result.rows[0].id);
    console.log('Database seeded successfully');
    
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
};

seedDatabase();