const db = require('./database');

const updateStoryContent = async () => {
  try {
    // Enhanced story content with natural, literary personalization tokens
    const enhancedStoryContent = {
      chapters: [
        {
          id: "chapter-1",
          title: "The Mysterious Encounter",
          content: [
            {
              type: "paragraph",
              text: "{{firstName}} had always been drawn to the old mansion at the edge of town. Tonight, under the full moon, {{name}} finally decided to explore its mysteries. Her {{hairDescription}} caught the moonlight as she approached the weathered front door."
            },
            {
              type: "paragraph",
              text: "The heavy wooden door creaked open as {{firstName}} stepped inside, her {{style}} outfit making barely a whisper against the aged wood. The air was thick with anticipation and the scent of aged wood and forgotten memories."
            },
            {
              type: "paragraph", 
              text: "As {{name}}'s {{eyeColor}} eyes adjusted to the dim light filtering through dusty windows, a figure emerged from the shadows. Tall and enigmatic, they moved with a grace that made {{firstName}}'s heart race."
            },
            {
              type: "paragraph",
              text: "'I've been waiting for you, Miss {{lastName}},' the stranger said, their voice like velvet in the darkness. 'There's something about this place you need to know, something that will change everything for someone with your {{skinDescription}} and {{eyeColor}} eyes.'"
            },
            {
              type: "paragraph",
              text: "{{firstName}} felt a mixture of fear and excitement course through her {{buildDescription}}. She ran her fingers through her {{hairDescription}}, a nervous habit she'd had since childhood. Her {{height}} stature allowed her to move gracefully through the shadows."
            },
            {
              type: "paragraph",
              text: "The mansion seemed to respond to her presence, as if it had been waiting specifically for someone with her {{eyeColor}} eyes and {{style}} sensibility. {{fullName}} was about to discover that some places choose their visitors very carefully indeed."
            }
          ]
        }
      ],
      metadata: {
        wordCount: 210,
        readingTime: "3 min",
        personalizationTokens: [
          "firstName", "name", "lastName", "fullName", 
          "hairDescription", "skinDescription", "buildDescription",
          "hairColor", "hairLength", "hairType", "eyeColor", 
          "height", "build", "skinTone", "style"
        ]
      }
    };

    // Update the existing story
    const result = await db.query(
      `UPDATE stories 
       SET content = $1, updated_at = CURRENT_TIMESTAMP
       WHERE title = 'The Mysterious Encounter'
       RETURNING id`,
      [JSON.stringify(enhancedStoryContent)]
    );

    if (result.rows.length > 0) {
      console.log('Story updated successfully with enhanced personalization');
      console.log('Story ID:', result.rows[0].id);
    } else {
      console.log('No story found to update');
    }
    
  } catch (error) {
    console.error('Error updating story:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
};

updateStoryContent();