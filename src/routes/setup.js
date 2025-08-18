const express = require('express');
const router = express.Router();
const db = require('../config/database');

router.get('/debug', (req, res) => {
  res.json({
    NODE_ENV: process.env.NODE_ENV,
    DB_HOST: process.env.DB_HOST ? 'exists' : 'missing',
    DB_NAME: process.env.DB_NAME ? 'exists' : 'missing',
    DB_USER: process.env.DB_USER ? 'exists' : 'missing',
    DB_PASSWORD: process.env.DB_PASSWORD ? 'exists' : 'missing'
  });
});

router.get('/tables', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    res.json({
      success: true,
      tables: result.rows.map(row => row.table_name)
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: error.stack
    });
  }
});

// Simplified payment tables setup - only missing tables
router.post('/payment-tables', async (req, res) => {
  try {
    console.log('Creating payment tables...');

    // Create user_rewards table
    await db.query(`
      CREATE TABLE IF NOT EXISTS user_rewards (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        total_coins INTEGER DEFAULT 0,
        total_coins_earned INTEGER DEFAULT 0,
        current_streak INTEGER DEFAULT 0,
        longest_streak INTEGER DEFAULT 0,
        last_check_in TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id)
      );
    `);
    console.log('✅ user_rewards table created');

    // Create reward_transactions table
    await db.query(`
      CREATE TABLE IF NOT EXISTS reward_transactions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        transaction_type VARCHAR(20) NOT NULL,
        amount INTEGER NOT NULL,
        reason VARCHAR(255),
        reference_type VARCHAR(50),
        reference_id VARCHAR(255),
        balance_after INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ reward_transactions table created');

    // Create user_subscriptions table
    await db.query(`
      CREATE TABLE IF NOT EXISTS user_subscriptions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        subscription_type VARCHAR(20) NOT NULL,
        status VARCHAR(20) DEFAULT 'active',
        price_paid DECIMAL(10,2),
        payment_method VARCHAR(50),
        payment_id VARCHAR(255),
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ user_subscriptions table created');

    // Create user_chapter_unlocks table
    await db.query(`
      CREATE TABLE IF NOT EXISTS user_chapter_unlocks (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
        chapter_number INTEGER NOT NULL,
        unlock_method VARCHAR(20) NOT NULL,
        coins_spent INTEGER DEFAULT 0,
        unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, book_id, chapter_number)
      );
    `);
    console.log('✅ user_chapter_unlocks table created');

    res.json({
      success: true,
      message: 'Payment tables created successfully!',
      tables: ['user_rewards', 'reward_transactions', 'user_subscriptions', 'user_chapter_unlocks']
    });
    
  } catch (error) {
    console.error('Payment tables setup failed:', error);
    res.status(500).json({
      success: false,
      message: 'Payment tables setup failed',
      error: error.message
    });
  }
});

module.exports = router;