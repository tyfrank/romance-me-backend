const db = require('../config/database');

// Check if user has access to a chapter
const checkChapterAccess = async (req, res) => {
  const { bookId, chapterNumber } = req.params;
  
  try {
    // Safety check: Ensure user is authenticated
    if (!req.user || !req.user.id) {
      console.log('Monetization API: No authenticated user found');
      return res.status(401).json({
        success: false,
        message: 'Authentication required to check chapter access',
        requiresAuth: true
      });
    }
    
    const userId = req.user.id;
    // Get chapter info
    const chapterResult = await db.query(
      `SELECT id, chapter_number, coin_cost, is_premium, unlock_type 
       FROM chapters 
       WHERE book_id = $1 AND chapter_number = $2`,
      [bookId, chapterNumber]
    );
    
    if (chapterResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Chapter not found'
      });
    }
    
    const chapter = chapterResult.rows[0];
    
    // If chapter is free (chapters 1-5), always grant access
    if (!chapter.is_premium || chapter.chapter_number <= 5) {
      return res.json({
        success: true,
        hasAccess: true,
        accessType: 'free',
        chapter: {
          id: chapter.id,
          number: chapter.chapter_number,
          coinCost: 0,
          isPremium: false,
          unlockType: 'free'
        }
      });
    }
    
    // Check if user has active subscription (bypass all locks)
    const subscriptionResult = await db.query(
      `SELECT id, subscription_type, status, expires_at 
       FROM user_subscriptions 
       WHERE user_id = $1 AND status = 'active' AND expires_at > NOW()`,
      [userId]
    );
    
    const hasActiveSubscription = subscriptionResult.rows.length > 0;
    
    // If user has active subscription, grant access to all chapters
    if (hasActiveSubscription) {
      return res.json({
        success: true,
        hasAccess: true,
        subscriptionAccess: true,
        chapter: {
          id: chapter.id,
          chapterNumber: chapter.chapter_number,
          coinCost: chapter.coin_cost,
          isPremium: chapter.is_premium,
          unlockType: chapter.unlock_type
        }
      });
    }
    
    // If chapter is free, allow access
    if (!chapter.is_premium) {
      return res.json({
        success: true,
        hasAccess: true,
        chapter: {
          id: chapter.id,
          chapterNumber: chapter.chapter_number,
          coinCost: chapter.coin_cost,
          isPremium: chapter.is_premium,
          unlockType: chapter.unlock_type
        }
      });
    }
    
    // Check if user has already unlocked this chapter
    const unlockResult = await db.query(
      `SELECT id, unlock_method, coins_spent, unlocked_at 
       FROM user_chapter_unlocks 
       WHERE user_id = $1 AND chapter_id = $2`,
      [userId, chapter.id]
    );
    
    const hasAccess = unlockResult.rows.length > 0;
    const unlockInfo = hasAccess ? unlockResult.rows[0] : null;
    
    if (hasAccess) {
      // User has already unlocked this chapter
      return res.json({
        success: true,
        hasAccess: true,
        accessType: 'unlocked',
        chapter: {
          id: chapter.id,
          number: chapter.chapter_number,
          coinCost: chapter.coin_cost,
          isPremium: chapter.is_premium,
          unlockType: chapter.unlock_type
        },
        unlockInfo
      });
    }
    
    // Chapter is locked - get user's coin balance and provide unlock options
    const userRewardsResult = await db.query(
      `SELECT total_coins FROM user_rewards WHERE user_id = $1`,
      [userId]
    );
    
    const userCoins = userRewardsResult.rows[0]?.total_coins || 0;
    
    res.json({
      success: true,
      hasAccess: false,
      accessType: 'locked',
      chapter: {
        id: chapter.id,
        number: chapter.chapter_number,
        coinCost: chapter.coin_cost,
        isPremium: chapter.is_premium,
        unlockType: chapter.unlock_type
      },
      userBalance: userCoins,
      insufficientCoins: userCoins < chapter.coin_cost,
      coinsNeeded: Math.max(0, chapter.coin_cost - userCoins),
      unlockOptions: ['coins', 'watch_ads', 'purchase_coins', 'subscribe']
    });
    
  } catch (error) {
    console.error('Check chapter access error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check chapter access'
    });
  }
};

// Unlock a chapter with coins
const unlockChapter = async (req, res) => {
  const { bookId, chapterNumber } = req.params;
  const userId = req.user.id;
  
  const client = await db.pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Get chapter info
    const chapterResult = await client.query(
      `SELECT id, chapter_number, coin_cost, is_premium, unlock_type 
       FROM chapters 
       WHERE book_id = $1 AND chapter_number = $2`,
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
    
    // Check if chapter is free
    if (!chapter.is_premium) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Chapter is already free'
      });
    }
    
    // Check if already unlocked
    const existingUnlock = await client.query(
      `SELECT id FROM user_chapter_unlocks 
       WHERE user_id = $1 AND chapter_id = $2`,
      [userId, chapter.id]
    );
    
    if (existingUnlock.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Chapter already unlocked'
      });
    }
    
    // Get user's current coins
    const userRewardsResult = await client.query(
      `SELECT total_coins FROM user_rewards WHERE user_id = $1`,
      [userId]
    );
    
    if (userRewardsResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'User rewards not found'
      });
    }
    
    const currentCoins = userRewardsResult.rows[0].total_coins;
    
    // Check if user has enough coins
    if (currentCoins < chapter.coin_cost) {
      await client.query('ROLLBACK');
      return res.json({
        success: false,
        message: 'Insufficient coins',
        required: chapter.coin_cost,
        available: currentCoins,
        shortfall: chapter.coin_cost - currentCoins
      });
    }
    
    // Calculate new balance
    const newBalance = currentCoins - chapter.coin_cost;
    
    // Deduct coins from user
    await client.query(
      `UPDATE user_rewards 
       SET total_coins = total_coins - $1,
           total_coins_spent = total_coins_spent + $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $2`,
      [chapter.coin_cost, userId]
    );
    
    // Record the chapter unlock
    await client.query(
      `INSERT INTO user_chapter_unlocks (user_id, chapter_id, book_id, unlock_method, coins_spent)
       VALUES ($1, $2, $3, 'coins', $4)`,
      [userId, chapter.id, bookId, chapter.coin_cost]
    );
    
    // Add transaction record
    await client.query(
      `INSERT INTO reward_transactions (user_id, transaction_type, amount, reason, reference_type, balance_after)
       VALUES ($1, 'spent', $2, $3, 'chapter_unlock', $4)`,
      [userId, chapter.coin_cost, `Unlocked Chapter ${chapter.chapter_number}`, newBalance]
    );
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: `Chapter ${chapter.chapter_number} unlocked!`,
      coinsSpent: chapter.coin_cost,
      remainingCoins: newBalance
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Unlock chapter error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unlock chapter'
    });
  } finally {
    client.release();
  }
};

// Get user's unlocked chapters for a book
const getUserUnlockedChapters = async (req, res) => {
  const { bookId } = req.params;
  const userId = req.user.id;
  
  try {
    const result = await db.query(
      `SELECT 
        c.chapter_number,
        c.coin_cost,
        c.is_premium,
        uc.unlock_method,
        uc.coins_spent,
        uc.unlocked_at
       FROM chapters c
       LEFT JOIN user_chapter_unlocks uc ON c.id = uc.chapter_id AND uc.user_id = $1
       WHERE c.book_id = $2
       ORDER BY c.chapter_number`,
      [userId, bookId]
    );
    
    const chapters = result.rows.map(row => ({
      chapterNumber: row.chapter_number,
      coinCost: row.coin_cost,
      isPremium: row.is_premium,
      isUnlocked: !row.is_premium || row.unlock_method !== null,
      unlockMethod: row.unlock_method,
      coinsSpent: row.coins_spent,
      unlockedAt: row.unlocked_at
    }));
    
    res.json({
      success: true,
      chapters
    });
    
  } catch (error) {
    console.error('Get unlocked chapters error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get unlocked chapters'
    });
  }
};

module.exports = {
  checkChapterAccess,
  unlockChapter,
  getUserUnlockedChapters
};