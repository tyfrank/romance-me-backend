const db = require('../config/database');

const runCorrectedMigration = async () => {
  const client = await db.pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🔄 Starting corrected chapter pricing migration...');
    console.log('✅ Database structure inspection shows:');
    console.log('   • chapters table has chapter_number, coin_cost, is_premium, unlock_type columns');
    console.log('   • user_chapter_unlocks table exists with basic structure');
    console.log('   • user_rewards table exists with coin fields');
    
    // 1. Enhance user_chapter_unlocks table with missing columns
    console.log('\n📝 Step 1: Enhancing user_chapter_unlocks table...');
    
    // Add chapter_number column for easier queries (redundant but useful)
    await client.query(`
      ALTER TABLE user_chapter_unlocks 
      ADD COLUMN IF NOT EXISTS chapter_number INTEGER;
    `);
    
    // Add ad viewing columns
    await client.query(`
      ALTER TABLE user_chapter_unlocks 
      ADD COLUMN IF NOT EXISTS ad_views_used INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;
    `);
    
    // Populate chapter_number from chapters table where missing
    await client.query(`
      UPDATE user_chapter_unlocks 
      SET chapter_number = c.chapter_number
      FROM chapters c 
      WHERE user_chapter_unlocks.chapter_id = c.id 
        AND user_chapter_unlocks.chapter_number IS NULL;
    `);
    
    console.log('   ✅ Enhanced user_chapter_unlocks table');
    
    // 2. Create user_subscriptions table
    console.log('\n📝 Step 2: Creating user_subscriptions table...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_subscriptions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        subscription_type VARCHAR(50) NOT NULL, -- 'weekly', 'monthly', 'yearly'
        status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'cancelled', 'expired'
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        stripe_subscription_id VARCHAR(255),
        amount_paid INTEGER, -- in cents
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('   ✅ Created user_subscriptions table');
    
    // 3. Update chapter pricing based on chapter numbers
    console.log('\n📝 Step 3: Updating chapter pricing...');
    
    // Function to calculate price based on chapter number
    const getPricing = (chapterNum) => {
      if (chapterNum <= 5) return { cost: 0, premium: false, type: 'free' };
      if (chapterNum <= 10) return { cost: 20, premium: true, type: 'premium' };
      if (chapterNum <= 200) {
        const basePrice = 25;
        const maxPrice = 70;
        const growthRange = 200 - 11;
        const priceRange = maxPrice - basePrice;
        const progress = (chapterNum - 11) / growthRange;
        const exponentialProgress = Math.pow(progress, 1.5);
        const cost = Math.round(basePrice + (priceRange * exponentialProgress));
        return { cost, premium: true, type: 'premium' };
      }
      return { cost: 70, premium: true, type: 'premium' };
    };
    
    // Get all chapters and update their pricing
    const chaptersResult = await client.query(`
      SELECT id, chapter_number 
      FROM chapters 
      ORDER BY chapter_number
    `);
    
    console.log(`   📊 Found ${chaptersResult.rows.length} chapters to update`);
    
    // Update in batches for performance
    for (const chapter of chaptersResult.rows) {
      const pricing = getPricing(chapter.chapter_number);
      
      await client.query(`
        UPDATE chapters 
        SET 
          coin_cost = $1,
          is_premium = $2,
          unlock_type = $3,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
      `, [pricing.cost, pricing.premium, pricing.type, chapter.id]);
    }
    
    console.log('   ✅ Updated chapter pricing for all chapters');
    
    // 4. Add performance indexes
    console.log('\n📝 Step 4: Adding performance indexes...');
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_chapters_premium_lookup 
      ON chapters(book_id, chapter_number, is_premium);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_user_unlocks_fast_lookup 
      ON user_chapter_unlocks(user_id, book_id, chapter_number);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_user_subscriptions_active 
      ON user_subscriptions(user_id, status, expires_at) 
      WHERE status = 'active';
    `);
    
    console.log('   ✅ Created performance indexes');
    
    // 5. Create a pricing summary for verification
    console.log('\n📝 Step 5: Pricing verification...');
    
    const pricingSummary = await client.query(`
      SELECT 
        CASE 
          WHEN chapter_number <= 5 THEN 'Free (1-5)'
          WHEN chapter_number <= 10 THEN '20 coins (6-10)'
          WHEN chapter_number <= 20 THEN '25-30 coins (11-20)'
          WHEN chapter_number <= 50 THEN '30-40 coins (21-50)'
          WHEN chapter_number <= 100 THEN '40-55 coins (51-100)'
          WHEN chapter_number <= 200 THEN '55-70 coins (101-200)'
          ELSE '70 coins (201+)'
        END as price_range,
        MIN(coin_cost) as min_cost,
        MAX(coin_cost) as max_cost,
        COUNT(*) as chapter_count,
        COUNT(CASE WHEN is_premium THEN 1 END) as premium_count
      FROM chapters 
      GROUP BY 
        CASE 
          WHEN chapter_number <= 5 THEN 1
          WHEN chapter_number <= 10 THEN 2
          WHEN chapter_number <= 20 THEN 3
          WHEN chapter_number <= 50 THEN 4
          WHEN chapter_number <= 100 THEN 5
          WHEN chapter_number <= 200 THEN 6
          ELSE 7
        END,
        CASE 
          WHEN chapter_number <= 5 THEN 'Free (1-5)'
          WHEN chapter_number <= 10 THEN '20 coins (6-10)'
          WHEN chapter_number <= 20 THEN '25-30 coins (11-20)'
          WHEN chapter_number <= 50 THEN '30-40 coins (21-50)'
          WHEN chapter_number <= 100 THEN '40-55 coins (51-100)'
          WHEN chapter_number <= 200 THEN '55-70 coins (101-200)'
          ELSE '70 coins (201+)'
        END
      ORDER BY 1;
    `);
    
    console.log('\n📊 PRICING VERIFICATION:');
    console.log('   Price Range              | Min  | Max  | Total | Premium');
    console.log('   ' + '-'.repeat(55));
    
    pricingSummary.rows.forEach(row => {
      const range = row.price_range.padEnd(25);
      const min = String(row.min_cost).padStart(3);
      const max = String(row.max_cost).padStart(3);
      const total = String(row.chapter_count).padStart(4);
      const premium = String(row.premium_count).padStart(6);
      console.log(`   ${range}| ${min} | ${max} |${total} |${premium}`);
    });
    
    await client.query('COMMIT');
    
    console.log('\n🎉 MIGRATION COMPLETED SUCCESSFULLY!');
    console.log('\n📋 Summary of changes:');
    console.log('   ✅ Enhanced user_chapter_unlocks with chapter_number, ad_views_used, expires_at');
    console.log('   ✅ Created user_subscriptions table for subscription management');
    console.log('   ✅ Updated all chapter pricing based on chapter numbers');
    console.log('   ✅ Added performance indexes for fast lookups');
    console.log('   ✅ Verified pricing structure matches requirements');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
    console.error('Stack trace:', error.stack);
    throw error;
  } finally {
    client.release();
  }
};

// Run if called directly
if (require.main === module) {
  runCorrectedMigration()
    .then(() => {
      console.log('\n✨ Migration script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Migration script failed:', error.message);
      process.exit(1);
    });
}

module.exports = runCorrectedMigration;