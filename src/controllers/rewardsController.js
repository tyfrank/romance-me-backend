const db = require('../config/database');

const getRewardsStatus = async (req, res) => {
  try {
    // Get user rewards
    const rewardsResult = await db.query(
      `SELECT * FROM user_rewards WHERE user_id = $1`,
      [req.user.id]
    );

    let rewards = rewardsResult.rows[0];
    
    // Create rewards record if doesn't exist
    if (!rewards) {
      const createResult = await db.query(
        `INSERT INTO user_rewards (user_id) VALUES ($1) RETURNING *`,
        [req.user.id]
      );
      rewards = createResult.rows[0];
    }

    // Check if user has checked in today
    const today = new Date().toISOString().split('T')[0];
    const todayCheckIn = await db.query(
      `SELECT * FROM check_in_history 
       WHERE user_id = $1 AND check_in_date = $2`,
      [req.user.id, today]
    );

    // Get recent check-ins for calendar
    const recentCheckIns = await db.query(
      `SELECT check_in_date FROM check_in_history 
       WHERE user_id = $1 
       ORDER BY check_in_date DESC 
       LIMIT 30`,
      [req.user.id]
    );

    res.json({
      success: true,
      rewards: {
        total_coins: rewards.total_coins,
        current_streak: rewards.current_streak,
        longest_streak: rewards.longest_streak,
        last_check_in: rewards.last_check_in
      },
      hasCheckedInToday: todayCheckIn.rows.length > 0,
      recentCheckIns: recentCheckIns.rows.map(r => r.check_in_date)
    });
  } catch (error) {
    console.error('Get rewards status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch rewards status'
    });
  }
};

const dailyCheckIn = async (req, res) => {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');
    
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    // Check if already checked in today
    const existingCheckIn = await client.query(
      `SELECT * FROM check_in_history 
       WHERE user_id = $1 AND check_in_date = $2`,
      [req.user.id, today]
    );
    
    if (existingCheckIn.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Already checked in today'
      });
    }
    
    // Get current rewards
    const rewardsResult = await client.query(
      `SELECT * FROM user_rewards WHERE user_id = $1 FOR UPDATE`,
      [req.user.id]
    );
    
    let rewards = rewardsResult.rows[0];
    if (!rewards) {
      // Create rewards record if doesn't exist
      const createResult = await client.query(
        `INSERT INTO user_rewards (user_id) VALUES ($1) RETURNING *`,
        [req.user.id]
      );
      rewards = createResult.rows[0];
    }
    
    // Calculate streak with reset logic
    let newStreak = 1;
    const lastCheckInDate = rewards.last_check_in ? 
      (rewards.last_check_in instanceof Date ? rewards.last_check_in.toISOString().split('T')[0] : rewards.last_check_in) : 
      null;
    
    if (lastCheckInDate === yesterday) {
      // Consecutive day - continue streak
      newStreak = rewards.current_streak + 1;
    } else if (lastCheckInDate && lastCheckInDate !== today) {
      // Missed a day - reset streak to 1
      newStreak = 1;
    }
    
    // Calculate coins based on streak day (Day 1=10, Day 2=15, etc.)
    let coinsEarned;
    if (newStreak <= 6) {
      coinsEarned = 10 + ((newStreak - 1) * 5); // Day 1=10, Day 2=15, Day 3=20, etc.
    } else {
      coinsEarned = 50; // Day 7+ = 50 coins
    }
    
    const totalCoinsEarned = coinsEarned;
    const newTotalCoins = rewards.total_coins + totalCoinsEarned;
    const newLongestStreak = Math.max(rewards.longest_streak, newStreak);
    
    // Update user rewards
    await client.query(
      `UPDATE user_rewards 
       SET total_coins = $1,
           total_coins_earned = total_coins_earned + $2,
           current_streak = $3,
           longest_streak = $4,
           last_check_in = $5,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $6`,
      [newTotalCoins, totalCoinsEarned, newStreak, newLongestStreak, today, req.user.id]
    );
    
    // Record check-in
    await client.query(
      `INSERT INTO check_in_history 
       (user_id, check_in_date, coins_earned, streak_day, bonus_coins, bonus_reason)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.user.id, today, coinsEarned, newStreak, 0, `Day ${newStreak} check-in`]
    );
    
    // Record transaction
    await client.query(
      `INSERT INTO reward_transactions 
       (user_id, transaction_type, amount, reason, reference_type, balance_after)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.user.id, 'earned', totalCoinsEarned, 
       `Daily check-in (Day ${newStreak})`, 'check_in', newTotalCoins]
    );
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      coinsEarned: totalCoinsEarned,
      totalCoins: newTotalCoins,
      newStreak: newStreak,
      bonusMessage: `Day ${newStreak} check-in`
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Daily check-in error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process check-in'
    });
  } finally {
    client.release();
  }
};

const addCoins = async (userId, amount, reason, referenceType, referenceId) => {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');
    
    // Get current rewards
    const rewardsResult = await client.query(
      `SELECT * FROM user_rewards WHERE user_id = $1 FOR UPDATE`,
      [userId]
    );
    
    let rewards = rewardsResult.rows[0];
    if (!rewards) {
      const createResult = await client.query(
        `INSERT INTO user_rewards (user_id) VALUES ($1) RETURNING *`,
        [userId]
      );
      rewards = createResult.rows[0];
    }
    
    const newTotalCoins = rewards.total_coins + amount;
    
    // Update coins
    await client.query(
      `UPDATE user_rewards 
       SET total_coins = $1,
           total_coins_earned = total_coins_earned + $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $3`,
      [newTotalCoins, amount, userId]
    );
    
    // Record transaction
    await client.query(
      `INSERT INTO reward_transactions 
       (user_id, transaction_type, amount, reason, reference_type, reference_id, balance_after)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, 'earned', amount, reason, referenceType, referenceId, newTotalCoins]
    );
    
    await client.query('COMMIT');
    
    return { success: true, newBalance: newTotalCoins };
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Add coins error:', error);
    return { success: false, error: error.message };
  } finally {
    client.release();
  }
};

module.exports = {
  getRewardsStatus,
  dailyCheckIn,
  addCoins
};