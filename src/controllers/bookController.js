const db = require('../config/database');

const personalizeContent = (content, userData) => {
  // Work directly with the content object instead of stringifying
  const personalizedContent = JSON.parse(JSON.stringify(content)); // Deep clone
  
  // Helper function to replace tokens in text
  const personalizeText = (text) => {
    if (!text || typeof text !== 'string') return text;
    
    // Helper functions for natural descriptions
    const getNaturalHairLength = (length) => {
      const descriptions = {
        'pixie short': 'short',
        'shoulder length': 'shoulder-length',
        'long and flowing': 'long',
        'waist-length': 'cascading',
        // Fallback for simple values
        'short': 'short',
        'medium': 'shoulder-length', 
        'long': 'long',
        'very long': 'cascading'
      };
      return descriptions[length?.toLowerCase()] || 'shoulder-length';
    };

    const getNaturalSkinTone = (tone) => {
      const descriptions = {
        'porcelain fair': 'porcelain',
        'creamy light': 'fair',
        'sun-kissed': 'caramel',
        'warm olive': 'golden',
        'rich dark': 'rich',
        'deep ebony': 'deep ebony',
        // Fallback for simple values
        'fair': 'porcelain',
        'light': 'fair',
        'medium': 'caramel',
        'olive': 'golden',
        'dark': 'rich',
        'deep': 'deep ebony'
      };
      return descriptions[tone?.toLowerCase()] || 'caramel';
    };

    const getNaturalBuild = (build) => {
      const descriptions = {
        'gracefully slender': 'slender',
        'athletically toned': 'athletic',
        'curvaceous': 'curvaceous',
        'voluptuous': 'voluptuous',
        'strong and muscular': 'muscular',
        // Fallback for simple values
        'slim': 'slender',
        'athletic': 'athletic',
        'curvy': 'curvaceous',
        'fuller figure': 'voluptuous',
        'muscular': 'muscular'
      };
      return descriptions[build?.toLowerCase()] || 'slender';
    };

    const getNaturalHeight = (height) => {
      const descriptions = {
        'petite and delicate': 'petite',
        'average height': 'average',
        'tall and statuesque': 'tall',
        // Fallback for simple values
        'petite (under 5\'4")': 'petite',
        'average (5\'4"-5\'7")': 'average',
        'tall (over 5\'7")': 'tall'
      };
      return descriptions[height?.toLowerCase()] || 'average';
    };

    const getNaturalHairColor = (color) => {
      const descriptions = {
        'golden blonde': 'golden blonde',
        'platinum blonde': 'platinum blonde',
        'rich brunette': 'chestnut brown',
        'auburn brown': 'auburn',
        'raven black': 'raven',
        'fiery red': 'fiery red',
        'silver-streaked': 'silver-streaked',
        'uniquely colored': 'uniquely colored',
        // Fallback for simple values
        'blonde': 'blonde',
        'brown': 'brown',
        'black': 'black',
        'red': 'red'
      };
      return descriptions[color?.toLowerCase()] || 'brown';
    };

    const getNaturalHairType = (type) => {
      const descriptions = {
        'pin-straight': 'straight',
        'softly wavy': 'wavy',
        'lusciously curly': 'curly',
        'naturally coily': 'coily',
        'intricately braided': 'braided',
        // Fallback for simple values
        'straight': 'straight',
        'wavy': 'wavy',
        'curly': 'curly'
      };
      return descriptions[type?.toLowerCase()] || 'wavy';
    };

    const getNaturalEyeColor = (color) => {
      const descriptions = {
        'deep blue': 'sapphire blue',
        'warm brown': 'warm brown',
        'emerald green': 'emerald',
        'golden hazel': 'hazel',
        'striking gray': 'steel gray',
        'violet-tinted': 'violet',
        // Fallback for simple values
        'blue': 'blue',
        'brown': 'brown',
        'green': 'green',
        'hazel': 'hazel',
        'gray': 'gray'
      };
      return descriptions[color?.toLowerCase()] || 'brown';
    };
    
    const firstName = userData.firstName || 'Alex';
    const lastName = userData.lastName || 'Morgan';
    const fullName = `${firstName} ${lastName}`.trim();
    
    let personalizedText = text;
    
    // Basic name tokens - case insensitive replacement
    personalizedText = personalizedText.replace(/\{\{userName\}\}/gi, firstName);
    personalizedText = personalizedText.replace(/\{\{firstName\}\}/gi, firstName);
    personalizedText = personalizedText.replace(/\{\{name\}\}/gi, firstName);
    personalizedText = personalizedText.replace(/\{\{lastName\}\}/gi, lastName);
    personalizedText = personalizedText.replace(/\{\{fullName\}\}/gi, fullName);
    
    // Pronoun tokens (assuming female protagonist for this romance novel)
    personalizedText = personalizedText.replace(/\{\{Her\}\}/g, 'Her');
    personalizedText = personalizedText.replace(/\{\{her\}\}/g, 'her');
    personalizedText = personalizedText.replace(/\{\{She\}\}/g, 'She');
    personalizedText = personalizedText.replace(/\{\{she\}\}/g, 'she');
    personalizedText = personalizedText.replace(/\{\{herself\}\}/g, 'herself');
    personalizedText = personalizedText.replace(/\{\{hers\}\}/g, 'hers');
    
    // Physical appearance tokens
    const hairColor = getNaturalHairColor(userData.hairColor);
    const hairLength = getNaturalHairLength(userData.hairLength);
    const hairType = getNaturalHairType(userData.hairType);
    const eyeColor = getNaturalEyeColor(userData.eyeColor);
    const skinTone = getNaturalSkinTone(userData.skinTone);
    const build = getNaturalBuild(userData.build);
    const heightDesc = getNaturalHeight(userData.height);
    
    personalizedText = personalizedText.replace(/\{\{hairColor\}\}/gi, hairColor);
    personalizedText = personalizedText.replace(/\{\{hairLength\}\}/gi, hairLength);
    personalizedText = personalizedText.replace(/\{\{hairStyle\}\}/gi, hairType);
    personalizedText = personalizedText.replace(/\{\{hairType\}\}/gi, hairType);
    personalizedText = personalizedText.replace(/\{\{eyeColor\}\}/gi, eyeColor);
    personalizedText = personalizedText.replace(/\{\{height\}\}/gi, heightDesc);
    personalizedText = personalizedText.replace(/\{\{build\}\}/gi, build);
    personalizedText = personalizedText.replace(/\{\{skinTone\}\}/gi, skinTone);
    
    // Style and preference tokens
    personalizedText = personalizedText.replace(/\{\{style\}\}/gi, userData.stylePreference?.toLowerCase() || 'professional');
    personalizedText = personalizedText.replace(/\{\{setting\}\}/gi, userData.favoriteSetting?.toLowerCase() || 'city');
    personalizedText = personalizedText.replace(/\{\{personalityTrait\}\}/gi, 'determined');
    
    // Create natural combined descriptions
    let hairDescription;
    if (hairLength === 'short') {
      hairDescription = `${hairLength} ${hairColor} hair`;
    } else {
      hairDescription = `${hairLength} ${hairType} ${hairColor} hair`;
    }
    
    personalizedText = personalizedText.replace(/\{\{hairDescription\}\}/gi, hairDescription);
    
    const skinDescription = `${skinTone} skin`;
    personalizedText = personalizedText.replace(/\{\{skinDescription\}\}/gi, skinDescription);
    
    const buildDescription = `${build} frame`;
    personalizedText = personalizedText.replace(/\{\{buildDescription\}\}/gi, buildDescription);
    
    // Clean up any remaining tokens that weren't replaced
    personalizedText = personalizedText.replace(/\{\{[^}]+\}\}/g, '');
    
    // Clean up dialogue tags completely - remove ALL character name brackets
    personalizedText = personalizedText.replace(/\[([^\]]+)\]:\s*/g, '');
    
    // Clean up any double brackets that might remain
    personalizedText = personalizedText.replace(/\[\[([^\]]+)\]\]:\s*/g, '');
    
    // Clean up any remaining character tags that may have variations
    personalizedText = personalizedText.replace(/\[([A-Z_][^\]]*)\]:\s*/g, '');
    
    // Clean up any character name followed by colon that might be missed
    personalizedText = personalizedText.replace(/^\s*[A-Z][A-Z_\s]*:\s*/gm, '');
    
    return personalizedText;
  };
  
  // Apply personalization to all text sections
  if (personalizedContent.sections && Array.isArray(personalizedContent.sections)) {
    personalizedContent.sections = personalizedContent.sections.map(section => {
      if (section.type === 'paragraph' && section.text) {
        return {
          ...section,
          text: personalizeText(section.text)
        };
      }
      return section;
    });
  }
  
  return personalizedContent;
};

const getBooks = async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const offset = parseInt(req.query.offset) || 0;
  
  console.log('🔍 GET /books called');
  console.log('👤 User:', req.user);
  console.log('📋 Query params:', req.query);
  console.log('🔐 Auth header:', req.headers.authorization ? 'Present' : 'Missing');
  
  try {
    // Ensure books tables exist
    await db.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
    
    await db.query(`
      CREATE TABLE IF NOT EXISTS books (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        synopsis TEXT,
        author VARCHAR(255),
        genre TEXT[],
        content_rating VARCHAR(20) DEFAULT 'General',
        total_chapters INTEGER DEFAULT 0,
        word_count INTEGER DEFAULT 0,
        reading_time_minutes INTEGER DEFAULT 0,
        cover_image_url TEXT,
        status VARCHAR(20) DEFAULT 'draft',
        is_published BOOLEAN DEFAULT false,
        is_featured BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS user_reading_progress (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
        current_chapter_number INTEGER DEFAULT 1,
        total_chapters_read INTEGER DEFAULT 0,
        progress_percentage DECIMAL(5,2) DEFAULT 0.00,
        last_read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, book_id)
      );
    `);
    
    // Get published books
    const booksResult = await db.query(
      `SELECT id, title, description, synopsis, author, genre, content_rating, 
              total_chapters, word_count, reading_time_minutes, cover_image_url, status
       FROM books 
       WHERE is_published = true 
       ORDER BY created_at DESC 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    
    console.log('📚 Books query returned:', booksResult.rows.length, 'books');
    
    // Get total count
    const countResult = await db.query(
      'SELECT COUNT(*) FROM books WHERE is_published = true'
    );
    
    console.log('📊 Total published books:', countResult.rows[0].count);
    
    // Get user's reading progress for each book
    let booksWithProgress = booksResult.rows;
    if (req.user?.id) {
      const progressResult = await db.query(
        `SELECT book_id, current_chapter_number, total_chapters_read, progress_percentage, 
                last_read_at, completed_at
         FROM user_reading_progress 
         WHERE user_id = $1 AND book_id = ANY($2)`,
        [req.user.id, booksResult.rows.map(book => book.id)]
      );
      
      const progressMap = {};
      progressResult.rows.forEach(progress => {
        progressMap[progress.book_id] = progress;
      });
      
      booksWithProgress = booksResult.rows.map(book => ({
        ...book,
        userProgress: progressMap[book.id] || null
      }));
    }
    
    console.log('✅ Sending response with', booksWithProgress.length, 'books');
    
    res.json({
      success: true,
      books: booksWithProgress,
      total: parseInt(countResult.rows[0].count),
      limit,
      offset
    });
    
  } catch (error) {
    console.error('Get books error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch books'
    });
  }
};

const getBookById = async (req, res) => {
  const { id } = req.params;
  
  try {
    // Get book details
    const bookResult = await db.query(
      `SELECT id, title, description, synopsis, author, genre, content_rating,
              total_chapters, word_count, reading_time_minutes, cover_image_url, status
       FROM books 
       WHERE id = $1 AND is_published = true`,
      [id]
    );
    
    if (bookResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }
    
    const book = bookResult.rows[0];
    
    // Get user's reading progress
    let userProgress = null;
    if (req.user?.id) {
      const progressResult = await db.query(
        `SELECT current_chapter_number, total_chapters_read, progress_percentage,
                last_read_at, completed_at
         FROM user_reading_progress 
         WHERE user_id = $1 AND book_id = $2`,
        [req.user.id, id]
      );
      
      userProgress = progressResult.rows[0] || null;
    }
    
    res.json({
      success: true,
      book: {
        ...book,
        userProgress
      }
    });
    
  } catch (error) {
    console.error('Get book error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch book'
    });
  }
};

const getChapter = async (req, res) => {
  const { bookId, chapterNumber } = req.params;
  const chapterNum = parseInt(chapterNumber);
  const userId = req.user?.id;
  
  try {
    // First, get basic chapter info including monetization data
    const chapterResult = await db.query(
      `SELECT c.id, c.chapter_number, c.title, c.content, c.word_count, 
              c.reading_time_minutes, c.coin_cost, c.is_premium, c.unlock_type,
              b.total_chapters, b.title as book_title, b.author
       FROM chapters c
       JOIN books b ON c.book_id = b.id
       WHERE c.book_id = $1 AND c.chapter_number = $2 AND c.is_published = true AND b.is_published = true`,
      [bookId, chapterNum]
    );
    
    if (chapterResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Chapter not found'
      });
    }
    
    const chapter = chapterResult.rows[0];
    
    // Check if chapter is premium and user doesn't have access
    if (chapter.is_premium && chapterNum > 5) {
      // For unauthenticated users, return monetization info instead of content
      if (!userId) {
        return res.json({
          success: true,
          requiresUnlock: true,
          chapter: {
            id: chapter.id,
            chapterNumber: chapter.chapter_number,
            title: chapter.title || `Chapter ${chapter.chapter_number}`,
            bookTitle: chapter.book_title,
            author: chapter.author,
            coinCost: chapter.coin_cost || 20,
            isPremium: true,
            unlockType: 'premium',
            totalChapters: chapter.total_chapters,
            requiresAuth: true
          },
          unlockOptions: {
            loginRequired: true,
            coinCost: chapter.coin_cost || 20,
            message: 'Please log in to unlock this chapter'
          }
        });
      }
      
      // For authenticated users, check if they have unlocked this chapter
      const unlockCheck = await db.query(
        `SELECT id FROM user_chapter_unlocks 
         WHERE user_id = $1 AND book_id = $2 AND chapter_number = $3`,
        [userId, bookId, chapterNum]
      );
      
      // Check for active subscription
      const subscriptionCheck = await db.query(
        `SELECT id FROM user_subscriptions 
         WHERE user_id = $1 AND status = 'active' AND expires_at > NOW()`,
        [userId]
      );
      
      const hasUnlocked = unlockCheck.rows.length > 0;
      const hasSubscription = subscriptionCheck.rows.length > 0;
      
      // If user hasn't unlocked and doesn't have subscription, return monetization info
      if (!hasUnlocked && !hasSubscription) {
        // Get user's coin balance
        const userCoins = await db.query(
          `SELECT total_coins FROM user_rewards WHERE user_id = $1`,
          [userId]
        );
        
        const coinBalance = userCoins.rows[0]?.total_coins || 0;
        const coinCost = chapter.coin_cost || 20;
        
        return res.json({
          success: true,
          requiresUnlock: true,
          chapter: {
            id: chapter.id,
            chapterNumber: chapter.chapter_number,
            title: chapter.title || `Chapter ${chapter.chapter_number}`,
            bookTitle: chapter.book_title,
            author: chapter.author,
            coinCost: coinCost,
            isPremium: true,
            unlockType: 'premium',
            totalChapters: chapter.total_chapters
          },
          unlockOptions: {
            coinBalance: coinBalance,
            coinCost: coinCost,
            canAfford: coinBalance >= coinCost,
            insufficientCoins: coinBalance < coinCost,
            coinsNeeded: Math.max(0, coinCost - coinBalance),
            message: coinBalance >= coinCost 
              ? `Unlock for ${coinCost} coins` 
              : `You need ${coinCost - coinBalance} more coins`
          }
        });
      }
    }
    
    // If we reach here, user has access to the chapter content
    // Either it's free, or user is authenticated and has unlocked/subscribed
    
    // Get full user profile data for personalization (if authenticated)
    let userProfile = {};
    if (userId) {
      const userProfileResult = await db.query(
        `SELECT p.first_name, p.last_name, p.hair_color, p.hair_length, p.hair_type,
                p.eye_color, p.height, p.build, p.skin_tone, p.style_preference, p.favorite_setting
         FROM user_profiles p
         WHERE p.user_id = $1`,
        [userId]
      );
      userProfile = userProfileResult.rows[0] || {};
    }
    
    // Personalize content with full user profile data
    const personalizedContent = personalizeContent(chapter.content, {
      firstName: userProfile.first_name,
      lastName: userProfile.last_name,
      hairColor: userProfile.hair_color,
      hairLength: userProfile.hair_length,
      hairType: userProfile.hair_type,
      eyeColor: userProfile.eye_color,
      height: userProfile.height,
      build: userProfile.build,
      skinTone: userProfile.skin_tone,
      stylePreference: userProfile.style_preference,
      favoriteSetting: userProfile.favorite_setting
    });
    
    // Extract chapter title from content if not set
    let chapterTitle = chapter.title;
    if (!chapterTitle && personalizedContent.sections && personalizedContent.sections[0]) {
      const firstSection = personalizedContent.sections[0].text;
      const titleMatch = firstSection.match(/^:\s*(.+?)(?:\n|$)/);
      if (titleMatch) {
        chapterTitle = titleMatch[1];
      }
    }
    
    // Update reading progress (only if authenticated)
    if (userId) {
      await updateReadingProgress(userId, bookId, chapterNum, chapter.total_chapters);
    }
    
    res.json({
      success: true,
      chapter: {
        id: chapter.id,
        chapterNumber: chapter.chapter_number,
        title: chapterTitle || `Chapter ${chapter.chapter_number}`,
        content: personalizedContent,
        wordCount: chapter.word_count,
        readingTime: chapter.reading_time_minutes,
        totalChapters: chapter.total_chapters
      }
    });
    
  } catch (error) {
    console.error('Get chapter error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chapter'
    });
  }
};

const updateReadingProgress = async (userId, bookId, currentChapter, totalChapters) => {
  try {
    const progressPercentage = (currentChapter / totalChapters) * 100;
    const isCompleted = currentChapter === totalChapters;
    
    await db.query(
      `INSERT INTO user_reading_progress 
       (user_id, book_id, current_chapter_number, total_chapters_read, progress_percentage, 
        last_read_at, completed_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6)
       ON CONFLICT (user_id, book_id) 
       DO UPDATE SET 
         current_chapter_number = GREATEST(user_reading_progress.current_chapter_number, $3),
         total_chapters_read = GREATEST(user_reading_progress.total_chapters_read, $4),
         progress_percentage = GREATEST(user_reading_progress.progress_percentage, $5),
         last_read_at = CURRENT_TIMESTAMP,
         completed_at = CASE WHEN $6 IS NOT NULL THEN $6 ELSE user_reading_progress.completed_at END`,
      [userId, bookId, currentChapter, currentChapter, progressPercentage, 
       isCompleted ? new Date() : null]
    );
  } catch (error) {
    console.error('Error updating reading progress:', error);
  }
};

const saveChapterComment = async (req, res) => {
  const { bookId, chapterNumber } = req.params;
  const { chapterComment, nextSuggestion } = req.body;
  const userId = req.user.id;
  
  try {
    // Ensure chapter_comments table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS chapter_comments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
        chapter_number INTEGER NOT NULL,
        chapter_comment TEXT,
        next_suggestion TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, book_id, chapter_number)
      )
    `);

    // Create or update comments table entry (allow users to update their comments)
    await db.query(
      `INSERT INTO chapter_comments (user_id, book_id, chapter_number, chapter_comment, next_suggestion, created_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, book_id, chapter_number) 
       DO UPDATE SET 
         chapter_comment = $4,
         next_suggestion = $5,
         created_at = CURRENT_TIMESTAMP`,
      [userId, bookId, parseInt(chapterNumber), chapterComment?.trim() || null, nextSuggestion?.trim() || null]
    );
    
    res.json({
      success: true,
      message: 'Thank you for your feedback! 💕'
    });
    
  } catch (error) {
    console.error('Error saving chapter comment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save comment. Please try again.'
    });
  }
};

module.exports = {
  getBooks,
  getBookById,
  getChapter,
  saveChapterComment
};