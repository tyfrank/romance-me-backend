const db = require('../config/database');

const runMigration = async () => {
  const client = await db.pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🔄 Starting chapter pricing migration...');
    
    // Add columns to chapters table if they don't exist
    await client.query(`
      ALTER TABLE chapters 
      ADD COLUMN IF NOT EXISTS coin_cost INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS unlock_type VARCHAR(20) DEFAULT 'free'
    `);
    console.log('✅ Added pricing columns to chapters table');
    
    // Add index for performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_chapters_premium 
      ON chapters(book_id, is_premium, chapter_number)
    `);
    console.log('✅ Created chapter indexes');
    
    // Update existing chapters with pricing based on chapter number
    await client.query(`
      UPDATE chapters 
      SET 
        is_premium = CASE 
          WHEN chapter_number <= 5 THEN false
          ELSE true
        END,
        coin_cost = CASE
          WHEN chapter_number <= 5 THEN 0
          WHEN chapter_number <= 10 THEN 20
          WHEN chapter_number <= 20 THEN 25
          WHEN chapter_number <= 40 THEN 30
          WHEN chapter_number <= 60 THEN 35
          WHEN chapter_number <= 80 THEN 40
          WHEN chapter_number <= 100 THEN 45
          WHEN chapter_number <= 130 THEN 50
          WHEN chapter_number <= 160 THEN 55
          WHEN chapter_number <= 180 THEN 60
          WHEN chapter_number <= 200 THEN 65
          ELSE 70
        END,
        unlock_type = CASE
          WHEN chapter_number <= 5 THEN 'free'
          ELSE 'premium'
        END
    `);
    console.log('✅ Updated existing chapters with pricing');
    
    // Enhance user_chapter_unlocks table
    await client.query(`
      ALTER TABLE user_chapter_unlocks 
      ADD COLUMN IF NOT EXISTS chapter_id UUID REFERENCES chapters(id),
      ADD COLUMN IF NOT EXISTS ad_views_used INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP
    `);
    console.log('✅ Enhanced user_chapter_unlocks table');
    
    // Add index for faster lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_user_unlocks_lookup 
      ON user_chapter_unlocks(user_id, book_id, chapter_number)
    `);
    console.log('✅ Created unlock indexes');
    
    // Create user_subscriptions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_subscriptions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        subscription_type VARCHAR(50) NOT NULL,
        status VARCHAR(20) NOT NULL,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        stripe_subscription_id VARCHAR(255),
        amount_paid INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created user_subscriptions table');
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_user_subs_active 
      ON user_subscriptions(user_id, status, expires_at)
    `);
    console.log('✅ Created subscription indexes');
    
    await client.query('COMMIT');
    console.log('🎉 Migration completed successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Run if called directly
if (require.main === module) {
  runMigration()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = runMigration;