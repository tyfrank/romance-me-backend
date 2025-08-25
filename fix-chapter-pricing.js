#!/usr/bin/env node
/**
 * Fix chapter pricing in Railway production database
 * Set correct pricing for chapters 6+ based on chapter numbers
 */

const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || process.argv[2];

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not provided');
  console.log('Usage: node fix-chapter-pricing.js "your-railway-database-url"');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function fixPricing() {
  console.log('🔧 FIXING CHAPTER PRICING IN PRODUCTION');
  console.log('=' + '='.repeat(50));
  
  try {
    const client = await pool.connect();
    
    // Update pricing for all chapters
    console.log('📊 Setting correct pricing based on chapter numbers...');
    
    const updateQuery = `
      UPDATE chapters SET
        coin_cost = CASE
          WHEN chapter_number <= 5 THEN 0
          WHEN chapter_number <= 10 THEN 20
          WHEN chapter_number <= 200 THEN 
            25 + FLOOR(POWER((chapter_number - 11)::float / 189, 1.5) * 45)
          ELSE 70
        END,
        is_premium = CASE
          WHEN chapter_number <= 5 THEN false
          ELSE true
        END,
        unlock_type = CASE
          WHEN chapter_number <= 5 THEN 'free'
          ELSE 'premium'
        END
    `;
    
    const result = await client.query(updateQuery);
    console.log(`✅ Updated ${result.rowCount} chapters with correct pricing`);
    
    // Show updated pricing samples
    const sampleResult = await client.query(`
      SELECT chapter_number, coin_cost, is_premium, unlock_type, COUNT(*) as count
      FROM chapters
      WHERE chapter_number IN (1, 5, 6, 10, 11, 15, 20)
      GROUP BY chapter_number, coin_cost, is_premium, unlock_type
      ORDER BY chapter_number
    `);
    
    console.log('\n📋 Updated chapter pricing:');
    sampleResult.rows.forEach(row => {
      console.log(`  Chapter ${row.chapter_number}: cost=${row.coin_cost}, premium=${row.is_premium}, type=${row.unlock_type} (${row.count} chapters)`);
    });
    
    // Verify chapters 6+ are now premium
    const premiumCount = await client.query(`
      SELECT COUNT(*) as count FROM chapters WHERE is_premium = true
    `);
    console.log(`\n✅ Premium chapters: ${premiumCount.rows[0].count}`);
    
    // Verify free chapters
    const freeCount = await client.query(`
      SELECT COUNT(*) as count FROM chapters WHERE is_premium = false
    `);
    console.log(`✅ Free chapters: ${freeCount.rows[0].count}`);
    
    client.release();
    console.log('\n🎉 Chapter pricing fixed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing pricing:', error.message);
    process.exit(1);
  } finally {
    pool.end();
  }
}

if (require.main === module) {
  fixPricing();
}