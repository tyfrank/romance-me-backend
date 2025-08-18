const express = require('express');
const router = express.Router();
const { Client } = require('pg');

router.get('/debug', (req, res) => {
  res.json({
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL ? 'exists' : 'missing',
    DATABASE_URL_PREVIEW: process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 30) + '...' : 'none'
  });
});

router.get('/tables', async (req, res) => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: false
  });

  try {
    await client.connect();
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    await client.end();
    
    res.json({
      success: true,
      tables: result.rows.map(row => row.table_name)
    });
  } catch (error) {
    await client.end().catch(() => {});
    res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: error.stack,
      connectionString: process.env.DATABASE_URL ? 'exists' : 'missing'
    });
  }
});

router.post('/database', async (req, res) => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: false
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Enable UUID extension
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
    console.log('UUID extension enabled');

    // Create users table first (if it doesn't exist)
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        birth_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ users table created');

    // Create user_profiles table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        display_name VARCHAR(100),
        hair_color VARCHAR(50),
        hair_length VARCHAR(50),
        hair_type VARCHAR(50),
        eye_color VARCHAR(50),
        height VARCHAR(20),
        build VARCHAR(50),
        skin_tone VARCHAR(50),
        style_preference VARCHAR(100),
        favorite_setting VARCHAR(100),
        profile_completed BOOLEAN DEFAULT false,
        preferences JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id)
      );
    `);
    console.log('✅ user_profiles table created');

    // Create books table
    await client.query(`
      CREATE TABLE IF NOT EXISTS books (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        synopsis TEXT,
        author VARCHAR(255) DEFAULT 'Author',
        genre VARCHAR(100)[] DEFAULT '{}',
        content_rating VARCHAR(20) DEFAULT '18+',
        total_chapters INTEGER NOT NULL DEFAULT 0,
        word_count INTEGER DEFAULT 0,
        reading_time_minutes INTEGER DEFAULT 0,
        cover_image_url TEXT,
        is_published BOOLEAN DEFAULT false,
        is_featured BOOLEAN DEFAULT false,
        status VARCHAR(20) DEFAULT 'ongoing',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ books table created');

    // Create chapters table
    await client.query(`
      CREATE TABLE IF NOT EXISTS chapters (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
        chapter_number INTEGER NOT NULL,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        word_count INTEGER DEFAULT 0,
        reading_time_minutes INTEGER DEFAULT 0,
        is_published BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(book_id, chapter_number)
      );
    `);
    console.log('✅ chapters table created');

    // Create reading_progress table
    await client.query(`
      CREATE TABLE IF NOT EXISTS reading_progress (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
        current_chapter_number INTEGER DEFAULT 1,
        progress_percentage DECIMAL(5,2) DEFAULT 0.00,
        last_read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, book_id)
      );
    `);
    console.log('✅ reading_progress table created');

    // Create user_rewards table
    await client.query(`
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

    // Create reward_transactions table
    await client.query(`
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

    // Create user_subscriptions table
    await client.query(`
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

    // Create user_chapter_unlocks table
    await client.query(`
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

    await client.end();

    res.json({
      success: true,
      message: 'Database setup completed successfully!',
      tables: [
        'users', 'user_profiles', 'books', 'chapters', 'reading_progress',
        'user_rewards', 'reward_transactions', 'user_subscriptions', 'user_chapter_unlocks'
      ]
    });
    
  } catch (error) {
    console.error('Database setup failed:', error);
    await client.end().catch(() => {});
    res.status(500).json({
      success: false,
      message: 'Database setup failed',
      error: error.message,
      stack: error.stack,
      connectionString: process.env.DATABASE_URL ? 'exists' : 'missing'
    });
  }
});

module.exports = router;