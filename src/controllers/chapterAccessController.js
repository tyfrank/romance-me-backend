const db = require('../config/database');

// Dynamic pricing calculator
const getChapterPrice = (chapterNumber) => {
  // Chapters 1-5: Free
  if (chapterNumber <= 5) return 0;
  
  // Chapters 6-10: 20 coins each
  if (chapterNumber <= 10) return 20;
  
  // Chapters 11-200: Gradual increase from 25 to 70 coins
  if (chapterNumber <= 200) {
    const basePrice = 25;
    const maxPrice = 70;
    const growthRange = 200 - 11; // 189 chapters
    const priceRange = maxPrice - basePrice; // 45 coin increase
    
    // Exponential growth curve for more gradual early increase
    const progress = (chapterNumber - 11) / growthRange;
    const exponentialProgress = Math.pow(progress, 1.5);
    
    return Math.round(basePrice + (priceRange * exponentialProgress));
  }
  
  // Chapters 201+: Fixed at 70 coins
  return 70;
};

// GET /api/books/:bookId/chapters/:chapterNumber/access
const checkChapterAccess = async (req, res) => {
  const { bookId, chapterNumber } = req.params;
  const userId = req.user?.id;
  
  try {
    console.log(`📖 Checking access for Book: ${bookId}, Chapter: ${chapterNumber}, User: ${userId || 'anonymous'}`);
    console.log(`🔍 Query parameters: bookId=${bookId} (${typeof bookId}), chapterNumber=${chapterNumber} (${typeof chapterNumber})`);
    
    // Convert chapterNumber to integer to ensure proper type matching
    const chapterNum = parseInt(chapterNumber);
    if (isNaN(chapterNum)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid chapter number',
        debug: { chapterNumber, parsedAs: chapterNum }
      });
    }
    
    // Validate UUID format for bookId
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(bookId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid book ID format',
        debug: { bookId, validFormat: 'UUID required' }
      });
    }
    
    // First, check if the book exists at all
    const bookCheckResult = await db.query('SELECT id, title FROM books WHERE id = $1', [bookId]);
    console.log(`📚 Book check: found ${bookCheckResult.rows.length} books with ID ${bookId}`);
    if (bookCheckResult.rows.length > 0) {
      console.log(`📚 Book found: ${bookCheckResult.rows[0].title}`);
    }
    
    // Check if any chapters exist for this book
    const chapterCheckResult = await db.query('SELECT chapter_number FROM chapters WHERE book_id = $1 ORDER BY chapter_number', [bookId]);
    console.log(`📖 Chapter check: found ${chapterCheckResult.rows.length} chapters for book ${bookId}`);
    if (chapterCheckResult.rows.length > 0) {
      const chapters = chapterCheckResult.rows.map(r => r.chapter_number).join(', ');
      console.log(`📖 Available chapters: ${chapters}`);
    }
    
    // Check if monetization columns exist
    const columnCheckResult = await db.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'chapters' AND column_name IN ('coin_cost', 'is_premium', 'unlock_type')
    `);
    console.log(`💰 Monetization columns found: ${columnCheckResult.rows.length}/3`);
    
    // Get chapter info from database - use parsed integer for chapter number
    const chapterResult = await db.query(
      `SELECT 
        c.id, 
        c.chapter_number, 
        c.title,
        c.coin_cost, 
        c.is_premium, 
        c.unlock_type,
        b.title as book_title,
        b.author
       FROM chapters c
       JOIN books b ON c.book_id = b.id
       WHERE c.book_id = $1 AND c.chapter_number = $2`,
      [bookId, chapterNum]
    );
    
    console.log(`🔍 Main query returned ${chapterResult.rows.length} rows`);
    
    if (chapterResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Chapter not found',
        debug: {
          bookId,
          chapterNumber,
          bookExists: bookCheckResult.rows.length > 0,
          totalChaptersForBook: chapterCheckResult.rows.length,
          availableChapters: chapterCheckResult.rows.map(r => r.chapter_number),
          monetizationColumns: columnCheckResult.rows.length
        }
      });
    }
    
    const chapter = chapterResult.rows[0];
    
    // If chapter is free (1-5), always grant access
    if (!chapter.is_premium || chapter.chapter_number <= 5) {
      console.log(`✅ Chapter ${chapterNumber} is free`);
      return res.json({
        success: true,
        hasAccess: true,
        accessType: 'free',
        chapter: {
          id: chapter.id,
          number: chapter.chapter_number,
          title: chapter.title,
          bookTitle: chapter.book_title,
          author: chapter.author,
          coinCost: 0,
          isPremium: false,
          unlockType: 'free'
        }
      });
    }
    
    // For premium chapters, check if user is authenticated
    if (!userId) {
      console.log(`🔒 Chapter ${chapterNumber} requires authentication`);
      return res.json({
        success: true,
        hasAccess: false,
        accessType: 'locked',
        requiresAuth: true,
        chapter: {
          id: chapter.id,
          number: chapter.chapter_number,
          title: chapter.title,
          bookTitle: chapter.book_title,
          author: chapter.author,
          coinCost: chapter.coin_cost || getChapterPrice(chapter.chapter_number),
          isPremium: true,
          unlockType: 'premium'
        },
        unlockOptions: ['login_required']
      });
    }
    
    // Check if user has active subscription
    const subscriptionResult = await db.query(
      `SELECT id, subscription_type, expires_at 
       FROM user_subscriptions 
       WHERE user_id = $1 
         AND status = 'active' 
         AND expires_at > NOW()
       ORDER BY expires_at DESC
       LIMIT 1`,
      [userId]
    );
    
    if (subscriptionResult.rows.length > 0) {
      console.log(`✅ User has active subscription`);
      return res.json({
        success: true,
        hasAccess: true,
        accessType: 'subscription',
        subscription: {
          type: subscriptionResult.rows[0].subscription_type,
          expiresAt: subscriptionResult.rows[0].expires_at
        },
        chapter: {
          id: chapter.id,
          number: chapter.chapter_number,
          title: chapter.title,
          bookTitle: chapter.book_title,
          author: chapter.author,
          coinCost: 0,
          isPremium: true,
          unlockType: 'subscription'
        }
      });
    }
    
    // Check if user has already unlocked this chapter
    const unlockResult = await db.query(
      `SELECT 
        id, 
        unlock_method, 
        coins_spent, 
        unlocked_at,
        ad_views_used
       FROM user_chapter_unlocks 
       WHERE user_id = $1 
         AND book_id = $2 
         AND chapter_number = $3`,
      [userId, bookId, chapterNumber]
    );
    
    if (unlockResult.rows.length > 0) {
      console.log(`✅ Chapter previously unlocked by user`);
      const unlock = unlockResult.rows[0];
      return res.json({
        success: true,
        hasAccess: true,
        accessType: 'unlocked',
        unlockedInfo: {
          method: unlock.unlock_method,
          coinsSpent: unlock.coins_spent,
          adViewsUsed: unlock.ad_views_used,
          unlockedAt: unlock.unlocked_at
        },
        chapter: {
          id: chapter.id,
          number: chapter.chapter_number,
          title: chapter.title,
          bookTitle: chapter.book_title,
          author: chapter.author,
          coinCost: 0,
          isPremium: true,
          unlockType: unlock.unlock_method
        }
      });
    }
    
    // Chapter is locked - get user's coin balance
    const userRewardsResult = await db.query(
      `SELECT total_coins FROM user_rewards WHERE user_id = $1`,
      [userId]
    );
    
    const userCoins = userRewardsResult.rows[0]?.total_coins || 0;
    const chapterCost = chapter.coin_cost || getChapterPrice(chapter.chapter_number);
    
    console.log(`🔒 Chapter locked. Cost: ${chapterCost} coins, User has: ${userCoins} coins`);
    
    // Determine available unlock options
    const unlockOptions = [];
    if (userCoins >= chapterCost) {
      unlockOptions.push('coins');
    }
    unlockOptions.push('watch_ads'); // Always available
    unlockOptions.push('purchase_coins');
    unlockOptions.push('subscribe');
    
    return res.json({
      success: true,
      hasAccess: false,
      accessType: 'locked',
      chapter: {
        id: chapter.id,
        number: chapter.chapter_number,
        title: chapter.title,
        bookTitle: chapter.book_title,
        author: chapter.author,
        coinCost: chapterCost,
        isPremium: true,
        unlockType: 'premium'
      },
      userBalance: userCoins,
      insufficientCoins: userCoins < chapterCost,
      coinsNeeded: Math.max(0, chapterCost - userCoins),
      unlockOptions,
      adRequirement: 2, // Number of ads to watch for free unlock
      subscriptionOptions: [
        { type: 'weekly', price: 499, coins: 'unlimited' },
        { type: 'monthly', price: 1499, coins: 'unlimited' },
        { type: 'yearly', price: 9999, coins: 'unlimited' }
      ]
    });
    
  } catch (error) {
    console.error('❌ Check chapter access error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check chapter access',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// POST /api/books/:bookId/chapters/:chapterNumber/unlock
const unlockChapterWithCoins = async (req, res) => {
  const { bookId, chapterNumber } = req.params;
  const userId = req.user?.id;
  
  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required to unlock chapters'
    });
  }
  
  const client = await db.pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log(`🔓 Attempting to unlock Book: ${bookId}, Chapter: ${chapterNumber} for User: ${userId}`);
    
    // Get chapter info with lock
    const chapterResult = await client.query(
      `SELECT 
        c.id, 
        c.chapter_number, 
        c.title,
        c.coin_cost, 
        c.is_premium,
        b.title as book_title
       FROM chapters c
       JOIN books b ON c.book_id = b.id
       WHERE c.book_id = $1 AND c.chapter_number = $2
       FOR UPDATE`,
      [bookId, chapterNumber]
    );
    
    if (chapterResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Chapter not found'
      });
    }
    
    const chapter = chapterResult.rows[0];
    const chapterCost = chapter.coin_cost || getChapterPrice(chapter.chapter_number);
    
    // Check if chapter is free
    if (!chapter.is_premium || chapter.chapter_number <= 5) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'This chapter is already free'
      });
    }
    
    // Check if already unlocked
    const existingUnlock = await client.query(
      `SELECT id FROM user_chapter_unlocks 
       WHERE user_id = $1 AND book_id = $2 AND chapter_number = $3`,
      [userId, bookId, chapterNumber]
    );
    
    if (existingUnlock.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Chapter already unlocked'
      });
    }
    
    // Get user's current coin balance with lock
    const userRewardsResult = await client.query(
      `SELECT total_coins, total_coins_spent 
       FROM user_rewards 
       WHERE user_id = $1
       FOR UPDATE`,
      [userId]
    );
    
    if (userRewardsResult.rows.length === 0) {
      // Create user_rewards entry if it doesn't exist
      await client.query(
        `INSERT INTO user_rewards (user_id, total_coins, total_coins_earned, total_coins_spent)
         VALUES ($1, 0, 0, 0)`,
        [userId]
      );
      
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Insufficient coins',
        required: chapterCost,
        available: 0,
        shortfall: chapterCost
      });
    }
    
    const currentCoins = userRewardsResult.rows[0].total_coins;
    const totalSpent = userRewardsResult.rows[0].total_coins_spent || 0;
    
    // Check if user has enough coins
    if (currentCoins < chapterCost) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Insufficient coins',
        required: chapterCost,
        available: currentCoins,
        shortfall: chapterCost - currentCoins
      });
    }
    
    // Calculate new balance
    const newBalance = currentCoins - chapterCost;
    const newTotalSpent = totalSpent + chapterCost;
    
    // Deduct coins from user
    await client.query(
      `UPDATE user_rewards 
       SET total_coins = $1,
           total_coins_spent = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $3`,
      [newBalance, newTotalSpent, userId]
    );
    
    // Record the chapter unlock
    await client.query(
      `INSERT INTO user_chapter_unlocks 
       (user_id, book_id, chapter_number, chapter_id, unlock_method, coins_spent)
       VALUES ($1, $2, $3, $4, 'coins', $5)`,
      [userId, bookId, chapterNumber, chapter.id, chapterCost]
    );
    
    // Add transaction record
    await client.query(
      `INSERT INTO reward_transactions 
       (user_id, transaction_type, amount, reason, reference_type, balance_after)
       VALUES ($1, 'spent', $2, $3, 'chapter_unlock', $4)`,
      [
        userId, 
        chapterCost, 
        `Unlocked "${chapter.book_title}" - Chapter ${chapter.chapter_number}`,
        newBalance
      ]
    );
    
    // Update user's reading progress if needed
    await client.query(
      `INSERT INTO user_reading_progress 
       (user_id, book_id, current_chapter_number, last_read_at, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, book_id) 
       DO UPDATE SET 
         last_read_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
       WHERE user_reading_progress.current_chapter_number < $3`,
      [userId, bookId, chapterNumber]
    );
    
    await client.query('COMMIT');
    
    console.log(`✅ Chapter ${chapterNumber} unlocked successfully! Cost: ${chapterCost} coins`);
    
    res.json({
      success: true,
      message: `Chapter ${chapter.chapter_number} unlocked successfully!`,
      chapter: {
        id: chapter.id,
        number: chapter.chapter_number,
        title: chapter.title,
        bookTitle: chapter.book_title
      },
      transaction: {
        coinsSpent: chapterCost,
        previousBalance: currentCoins,
        newBalance: newBalance,
        totalSpent: newTotalSpent
      },
      nextChapterCost: getChapterPrice(parseInt(chapterNumber) + 1)
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Unlock chapter error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unlock chapter',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    client.release();
  }
};

module.exports = {
  checkChapterAccess,
  unlockChapterWithCoins,
  getChapterPrice
};