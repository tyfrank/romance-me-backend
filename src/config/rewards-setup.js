const db = require('./database');

const setupRewardsTables = async () => {
  try {
    // Create user_rewards table
    await db.query(`
      CREATE TABLE IF NOT EXISTS user_rewards (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        total_coins INTEGER DEFAULT 0,
        total_coins_earned INTEGER DEFAULT 0,
        total_coins_spent INTEGER DEFAULT 0,
        current_streak INTEGER DEFAULT 0,
        longest_streak INTEGER DEFAULT 0,
        last_check_in DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id)
      )
    `);

    // Create check_in_history table (simplified structure)
    await db.query(`
      CREATE TABLE IF NOT EXISTS check_in_history (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        check_in_date DATE NOT NULL,
        coins_earned INTEGER DEFAULT 0,
        streak_day INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, check_in_date)
      )
    `);

    // Create reward_transactions table
    await db.query(`
      CREATE TABLE IF NOT EXISTS reward_transactions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        transaction_type VARCHAR(50) NOT NULL, -- 'earned', 'spent', 'bonus'
        amount INTEGER NOT NULL,
        reason VARCHAR(255) NOT NULL,
        reference_type VARCHAR(50), -- 'check_in', 'chapter_complete', 'book_complete', 'purchase'
        reference_id UUID,
        balance_after INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_check_in_history_user_date 
      ON check_in_history(user_id, check_in_date DESC)
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_reward_transactions_user 
      ON reward_transactions(user_id, created_at DESC)
    `);

    // Initialize rewards for existing users
    await db.query(`
      INSERT INTO user_rewards (user_id)
      SELECT id FROM users
      WHERE id NOT IN (SELECT user_id FROM user_rewards)
    `);

    console.log('Rewards tables created successfully');
  } catch (error) {
    console.error('Error setting up rewards tables:', error);
    throw error;
  }
};

// Run setup if called directly
if (require.main === module) {
  setupRewardsTables()
    .then(() => {
      console.log('Rewards setup completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Rewards setup failed:', error);
      process.exit(1);
    });
}

module.exports = setupRewardsTables;