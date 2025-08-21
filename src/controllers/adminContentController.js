const db = require('../config/database');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { parseChapters, detectFormat } = require('../utils/chapterParser');

// Auto-split text into chapters based on patterns
const autoSplitChapters = (fullText) => {
  // Use the new improved parser first
  const chapters = parseChapters(fullText, { 
    minChapterLength: 100,
    debug: true 
  });
  
  if (chapters.length > 0) {
    console.log(`✅ Detected ${chapters.length} chapters using improved parser`);
    const formats = detectFormat(fullText);
    console.log(`   Format(s) detected: ${formats.join(', ')}`);
    return chapters;
  }
  
  // Fallback to old logic
  console.log('⚠️ Using legacy chapter detection');
  // Common chapter markers
  const chapterPatterns = [
    /Chapter\s+\d+/gi,
    /CHAPTER\s+\d+/gi,
    /Ch\.\s*\d+/gi,
    /\d+\./gi,
    /^\d+$/gm
  ];
  
  let legacyChapters = [];
  let currentChapter = '';
  let chapterNumber = 1;
  
  // Try to split by chapter markers
  for (const pattern of chapterPatterns) {
    const matches = fullText.match(pattern);
    if (matches && matches.length > 1) {
      const splits = fullText.split(pattern);
      
      for (let i = 1; i < splits.length; i++) {
        const content = splits[i].trim();
        if (content.length > 100) { // Minimum chapter length
          legacyChapters.push({
            number: i,
            title: `Chapter ${i}`,
            content: content,
            wordCount: content.split(/\s+/).length
          });
        }
      }
      break;
    }
  }
  
  // Fallback: split by word count if no patterns found
  if (legacyChapters.length === 0) {
    const words = fullText.split(/\s+/);
    const wordsPerChapter = Math.ceil(words.length / 12); // Aim for 12 chapters
    
    for (let i = 0; i < 12; i++) {
      const start = i * wordsPerChapter;
      const end = Math.min((i + 1) * wordsPerChapter, words.length);
      const chapterWords = words.slice(start, end);
      
      if (chapterWords.length > 0) {
        legacyChapters.push({
          number: i + 1,
          title: `Chapter ${i + 1}`,
          content: chapterWords.join(' '),
          wordCount: chapterWords.length
        });
      }
    }
  }
  
  return legacyChapters;
};

// Convert text to structured content format
const textToStructuredContent = (text) => {
  const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0);
  
  return {
    sections: paragraphs.map(paragraph => ({
      type: 'paragraph',
      text: paragraph.trim()
    })),
    metadata: {
      wordCount: text.split(/\s+/).length,
      readingTime: Math.ceil(text.split(/\s+/).length / 200), // ~200 words per minute
      personalizationTokens: [
        "firstName", "name", "lastName", "fullName",
        "hairDescription", "skinDescription", "buildDescription", 
        "eyeColor", "height", "style", "setting"
      ]
    }
  };
};

const getDashboardStats = async (req, res) => {
  try {
    // Get book counts
    const bookStats = await db.query(`
      SELECT 
        COUNT(*) as total_books,
        COUNT(*) FILTER (WHERE is_published = true) as published_books,
        COUNT(*) FILTER (WHERE is_featured = true) as featured_books
      FROM books
    `);
    
    // Get user stats
    const userStats = await db.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as new_users_week,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as new_users_month
      FROM users
    `);
    
    // Get reading stats
    const readingStats = await db.query(`
      SELECT 
        COUNT(*) as total_reading_sessions,
        COUNT(*) FILTER (WHERE completed_at IS NOT NULL) as completed_books,
        AVG(progress_percentage) as avg_progress
      FROM reading_progress
    `);
    
    // Get recent activity
    const recentActivity = await db.query(`
      SELECT 
        rp.last_read_at,
        b.title as book_title,
        u.email as user_email,
        rp.current_chapter_number,
        rp.progress_percentage
      FROM user_reading_progress rp
      JOIN books b ON rp.book_id = b.id
      JOIN users u ON rp.user_id = u.id
      ORDER BY rp.last_read_at DESC
      LIMIT 10
    `);
    
    res.json({
      success: true,
      stats: {
        books: bookStats.rows[0],
        users: userStats.rows[0],
        reading: {
          ...readingStats.rows[0],
          avg_progress: Math.round(readingStats.rows[0].avg_progress || 0)
        }
      },
      recentActivity: recentActivity.rows
    });
    
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard stats'
    });
  }
};

const getAllBooks = async (req, res) => {
  try {
    // Ensure chapters table exists
    await db.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
    await db.query(`
      CREATE TABLE IF NOT EXISTS chapters (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
        chapter_number INTEGER NOT NULL,
        title VARCHAR(255),
        content JSONB,
        word_count INTEGER DEFAULT 0,
        reading_time_minutes INTEGER DEFAULT 0,
        is_published BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(book_id, chapter_number)
      )
    `);
    
    const booksResult = await db.query(`
      SELECT b.*, 
             COUNT(c.id) as chapter_count,
             COUNT(rp.id) as readers_count
      FROM books b
      LEFT JOIN chapters c ON b.id = c.book_id
      LEFT JOIN user_reading_progress rp ON b.id = rp.book_id
      GROUP BY b.id
      ORDER BY b.created_at DESC
    `);
    
    res.json({
      success: true,
      books: booksResult.rows
    });
    
  } catch (error) {
    console.error('Get all books error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch books'
    });
  }
};

const getBook = async (req, res) => {
  const { id } = req.params;
  
  try {
    const bookResult = await db.query(`
      SELECT b.*, 
             COUNT(c.id) as chapter_count,
             COUNT(rp.id) as readers_count
      FROM books b
      LEFT JOIN chapters c ON b.id = c.book_id
      LEFT JOIN user_reading_progress rp ON b.id = rp.book_id
      WHERE b.id = $1
      GROUP BY b.id
    `, [id]);
    
    if (bookResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }
    
    res.json({
      success: true,
      book: bookResult.rows[0]
    });
    
  } catch (error) {
    console.error('Get book error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch book'
    });
  }
};

const createBook = async (req, res) => {
  // Handle both JSON and FormData (for file uploads)
  let bookData;
  if (req.body.genre && typeof req.body.genre === 'string') {
    // Parse JSON fields that may come as strings from FormData
    try {
      bookData = {
        ...req.body,
        genre: JSON.parse(req.body.genre)
      };
    } catch (e) {
      bookData = req.body;
    }
  } else {
    bookData = req.body;
  }
  
  const {
    title,
    description,
    synopsis,
    author,
    genre,
    contentRating,
    status,
    fullText,
    isPublished
  } = bookData;
  
  const client = await db.pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Ensure chapters table exists
    await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS chapters (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
        chapter_number INTEGER NOT NULL,
        title VARCHAR(255),
        content JSONB,
        word_count INTEGER DEFAULT 0,
        reading_time_minutes INTEGER DEFAULT 0,
        is_published BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(book_id, chapter_number)
      )
    `);
    
    // Auto-split the full text into chapters
    const chapters = autoSplitChapters(fullText);
    
    // Calculate totals
    const totalWordCount = chapters.reduce((sum, ch) => sum + ch.wordCount, 0);
    const totalReadingTime = Math.ceil(totalWordCount / 200);
    
    // Handle cover image upload if present
    let coverImageUrl = null;
    if (req.file && req.file.path) {
      // Cloudinary upload successful
      coverImageUrl = req.file.path;
      console.log('☁️ Cover uploaded to Cloudinary:', coverImageUrl);
    }
    
    // Create book
    const bookResult = await client.query(
      `INSERT INTO books (title, description, synopsis, author, genre, content_rating, 
                         status, cover_image_url, total_chapters, word_count, reading_time_minutes, is_published) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
       RETURNING id`,
      [title, description, synopsis, author, genre, contentRating, 
       status || 'ongoing', coverImageUrl, chapters.length, totalWordCount, totalReadingTime, Boolean(isPublished)]
    );
    
    const bookId = bookResult.rows[0].id;
    
    // Create chapters
    for (const chapter of chapters) {
      const structuredContent = textToStructuredContent(chapter.content);
      
      await client.query(
        `INSERT INTO chapters (book_id, chapter_number, title, content, word_count, reading_time_minutes) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [bookId, chapter.number, chapter.title, JSON.stringify(structuredContent), 
         chapter.wordCount, Math.ceil(chapter.wordCount / 200)]
      );
    }
    
    await client.query('COMMIT');
    
    // Log activity
    await db.query(
      `INSERT INTO admin_analytics (event_type, event_data, admin_id) 
       VALUES ($1, $2, $3)`,
      ['book_created', JSON.stringify({ bookId, title, chapters: chapters.length }), req.admin.id]
    );
    
    res.status(201).json({
      success: true,
      message: 'Book created successfully',
      book: {
        id: bookId,
        title,
        chapters: chapters.length
      }
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create book error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create book'
    });
  } finally {
    client.release();
  }
};

const updateBook = async (req, res) => {
  const { id } = req.params;
  
  // Handle both JSON and FormData (for file uploads)
  let updateData;
  if (req.body.genre && typeof req.body.genre === 'string') {
    // Parse JSON fields that may come as strings from FormData
    try {
      updateData = {
        ...req.body,
        genre: JSON.parse(req.body.genre)
      };
    } catch (e) {
      updateData = req.body;
    }
  } else {
    updateData = req.body;
  }
  
  const {
    title,
    description,
    synopsis,
    author,
    genre,
    contentRating,
    status,
    isPublished,
    isFeatured,
    coverImageUrl
  } = updateData;
  
  try {
    // Handle cover image - prioritize Cloudinary upload, then external URL
    let finalCoverImageUrl = null;
    
    console.log('📸 Upload attempt - File received:', !!req.file);
    console.log('📸 File details:', req.file ? {
      fieldname: req.file.fieldname,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path || 'NO PATH',
      filename: req.file.filename || 'NO FILENAME'
    } : 'No file');
    
    if (req.file && req.file.path) {
      // Cloudinary upload successful - use the secure URL
      console.log('☁️ Cover uploaded to Cloudinary:', req.file.path);
      finalCoverImageUrl = req.file.path; // Cloudinary returns the URL in the path field
    } else if (req.file && req.file.filename) {
      // Fallback for local storage (shouldn't happen with Cloudinary)
      console.log('📁 File uploaded locally (not Cloudinary):', req.file.filename);
      finalCoverImageUrl = `/uploads/covers/${req.file.filename}`;
    } else if (coverImageUrl && coverImageUrl.trim()) {
      console.log('📷 Using external cover URL:', coverImageUrl);
      finalCoverImageUrl = coverImageUrl;
    } else {
      console.log('📷 No cover image file or URL received');
    }
    
    // Build update query dynamically based on what fields are provided
    let updateQuery = `UPDATE books SET updated_at = CURRENT_TIMESTAMP`;
    let updateValues = [];
    let paramCount = 1;
    
    if (title !== undefined) {
      updateQuery += `, title = $${paramCount}`;
      updateValues.push(title);
      paramCount++;
    }
    
    if (description !== undefined) {
      updateQuery += `, description = $${paramCount}`;
      updateValues.push(description);
      paramCount++;
    }
    
    if (synopsis !== undefined) {
      updateQuery += `, synopsis = $${paramCount}`;
      updateValues.push(synopsis);
      paramCount++;
    }
    
    if (author !== undefined) {
      updateQuery += `, author = $${paramCount}`;
      updateValues.push(author);
      paramCount++;
    }
    
    if (genre !== undefined) {
      updateQuery += `, genre = $${paramCount}`;
      updateValues.push(Array.isArray(genre) ? genre : [genre]);
      paramCount++;
    }
    
    if (contentRating !== undefined) {
      updateQuery += `, content_rating = $${paramCount}`;
      updateValues.push(contentRating);
      paramCount++;
    }
    
    if (status !== undefined) {
      updateQuery += `, status = $${paramCount}`;
      updateValues.push(status);
      paramCount++;
    }
    
    if (isPublished !== undefined) {
      updateQuery += `, is_published = $${paramCount}`;
      updateValues.push(isPublished);
      paramCount++;
    }
    
    if (isFeatured !== undefined) {
      updateQuery += `, is_featured = $${paramCount}`;
      updateValues.push(isFeatured);
      paramCount++;
    }
    
    if (finalCoverImageUrl) {
      console.log('📷 Adding cover URL to database update:', finalCoverImageUrl);
      updateQuery += `, cover_image_url = $${paramCount}`;
      updateValues.push(finalCoverImageUrl);
      paramCount++;
    }
    
    updateQuery += ` WHERE id = $${paramCount} RETURNING *`;
    updateValues.push(id);
    
    const result = await db.query(updateQuery, updateValues);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }
    
    // Log activity
    await db.query(
      `INSERT INTO admin_analytics (event_type, event_data, admin_id) 
       VALUES ($1, $2, $3)`,
      ['book_updated', JSON.stringify({ bookId: id, title: title || 'Updated' }), req.admin.id]
    );
    
    res.json({
      success: true,
      message: 'Book updated successfully',
      book: result.rows[0]
    });
    
  } catch (error) {
    console.error('Update book error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update book'
    });
  }
};

const getChapters = async (req, res) => {
  const { bookId } = req.params;
  
  try {
    const chaptersResult = await db.query(
      `SELECT id, chapter_number, title, content, word_count, reading_time_minutes, is_published
       FROM chapters 
       WHERE book_id = $1 
       ORDER BY chapter_number`,
      [bookId]
    );
    
    res.json({
      success: true,
      chapters: chaptersResult.rows
    });
    
  } catch (error) {
    console.error('Get chapters error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chapters'
    });
  }
};

const getChapterContent = async (req, res) => {
  const { chapterId } = req.params;
  
  try {
    const chapterResult = await db.query(
      `SELECT c.*, b.title as book_title
       FROM chapters c
       JOIN books b ON c.book_id = b.id
       WHERE c.id = $1`,
      [chapterId]
    );
    
    if (chapterResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Chapter not found'
      });
    }
    
    res.json({
      success: true,
      chapter: chapterResult.rows[0]
    });
    
  } catch (error) {
    console.error('Get chapter content error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chapter'
    });
  }
};

const updateChapter = async (req, res) => {
  const { chapterId } = req.params;
  const { title, content, isPublished } = req.body;
  
  try {
    // Convert content to structured format if it's plain text
    let structuredContent = content;
    if (typeof content === 'string') {
      structuredContent = textToStructuredContent(content);
    }
    
    const wordCount = structuredContent.metadata?.wordCount || 
                     (typeof content === 'string' ? content.split(/\s+/).length : 0);
    const readingTime = Math.ceil(wordCount / 200);
    
    const result = await db.query(
      `UPDATE chapters 
       SET title = $1, content = $2, word_count = $3, reading_time_minutes = $4, 
           is_published = $5, updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [title, JSON.stringify(structuredContent), wordCount, readingTime, isPublished, chapterId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Chapter not found'
      });
    }
    
    // Log activity
    await db.query(
      `INSERT INTO admin_analytics (event_type, event_data, admin_id) 
       VALUES ($1, $2, $3)`,
      ['chapter_updated', JSON.stringify({ chapterId, title }), req.admin.id]
    );
    
    res.json({
      success: true,
      message: 'Chapter updated successfully',
      chapter: result.rows[0]
    });
    
  } catch (error) {
    console.error('Update chapter error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update chapter'
    });
  }
};

const deleteBook = async (req, res) => {
  const { id } = req.params;
  
  const client = await db.pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Get book info for logging
    const bookResult = await client.query('SELECT title FROM books WHERE id = $1', [id]);
    if (bookResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }
    
    const bookTitle = bookResult.rows[0].title;
    
    // Delete will cascade to chapters and reading progress
    await client.query('DELETE FROM books WHERE id = $1', [id]);
    
    await client.query('COMMIT');
    
    // Log activity
    await db.query(
      `INSERT INTO admin_analytics (event_type, event_data, admin_id) 
       VALUES ($1, $2, $3)`,
      ['book_deleted', JSON.stringify({ bookId: id, title: bookTitle }), req.admin.id]
    );
    
    res.json({
      success: true,
      message: 'Book deleted successfully'
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Delete book error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete book'
    });
  } finally {
    client.release();
  }
};

const getComments = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const bookId = req.query.bookId;
    
    let query = `
      SELECT 
        cc.*,
        u.email as user_email,
        up.first_name as user_first_name,
        up.last_name as user_last_name,
        b.title as book_title
      FROM chapter_comments cc
      JOIN users u ON cc.user_id = u.id
      LEFT JOIN user_profiles up ON cc.user_id = up.user_id
      JOIN books b ON cc.book_id = b.id
    `;
    
    let queryParams = [limit, offset];
    let countQuery = 'SELECT COUNT(*) FROM chapter_comments cc';
    let countParams = [];
    
    if (bookId) {
      query += ' WHERE cc.book_id = $3';
      countQuery += ' WHERE cc.book_id = $1';
      queryParams.push(bookId);
      countParams.push(bookId);
    }
    
    query += ' ORDER BY cc.created_at DESC LIMIT $1 OFFSET $2';
    
    const commentsResult = await db.query(query, queryParams);
    const countResult = await db.query(countQuery, countParams);
    
    res.json({
      success: true,
      comments: commentsResult.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      limit
    });
    
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch comments'
    });
  }
};

const updateChapterByNumber = async (req, res) => {
  try {
    const { bookId, chapterNumber } = req.params;
    const { content } = req.body;
    
    // First get the chapter ID
    const chapterResult = await db.query(
      'SELECT id FROM chapters WHERE book_id = $1 AND chapter_number = $2',
      [bookId, chapterNumber]
    );
    
    if (chapterResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Chapter not found'
      });
    }
    
    const chapterId = chapterResult.rows[0].id;
    
    // Update the chapter content
    const result = await db.query(
      `UPDATE chapters 
       SET content = $1, 
           word_count = $2,
           reading_time_minutes = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [
        content,
        content.split(/\s+/).filter(word => word.length > 0).length,
        Math.ceil(content.split(/\s+/).filter(word => word.length > 0).length / 200),
        chapterId
      ]
    );
    
    res.json({
      success: true,
      message: 'Chapter updated successfully',
      chapter: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating chapter by number:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update chapter'
    });
  }
};

module.exports = {
  getDashboardStats,
  getAllBooks,
  getBook,
  createBook,
  updateBook,
  getChapters,
  getChapterContent,
  updateChapter,
  updateChapterByNumber,
  deleteBook,
  getComments
};