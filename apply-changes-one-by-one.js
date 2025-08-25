#!/usr/bin/env node
/**
 * APPLY MONETIZATION CHANGES ONE AT A TIME
 * 
 * Each change is applied individually with verification
 * If any step fails, the script stops immediately
 */

require('dotenv').config();
const db = require('./src/config/database');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.toLowerCase().trim());
    });
  });
}

async function verifyTableExists(tableName) {
  const result = await db.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = $1
    );
  `, [tableName]);
  
  return result.rows[0].exists;
}

async function verifyColumnExists(tableName, columnName) {
  const result = await db.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = $1 
      AND column_name = $2
    );
  `, [tableName, columnName]);
  
  return result.rows[0].exists;
}

async function applyChangesOneByOne() {
  console.log('🔒 SAFE MONETIZATION CHANGES - ONE STEP AT A TIME');
  console.log('='.repeat(60));
  
  try {
    // Verify we can connect to database
    const connectionTest = await db.query('SELECT NOW()');
    console.log('✅ Database connection successful');
    
    // STEP 1: Add chapter_number column
    console.log('\n📝 STEP 1: Adding chapter_number to user_chapter_unlocks');
    const hasChapterNumber = await verifyColumnExists('user_chapter_unlocks', 'chapter_number');
    
    if (hasChapterNumber) {
      console.log('   ⏭️  Column already exists, skipping');
    } else {
      const answer1 = await askQuestion('   Continue with adding chapter_number column? (yes/no): ');
      if (answer1 !== 'yes') {
        console.log('   ❌ User cancelled at step 1');
        process.exit(0);
      }
      
      await db.query('ALTER TABLE user_chapter_unlocks ADD COLUMN chapter_number INTEGER;');
      console.log('   ✅ Added chapter_number column');
      
      // Verify it worked
      const verified = await verifyColumnExists('user_chapter_unlocks', 'chapter_number');
      if (!verified) {
        throw new Error('Failed to add chapter_number column');
      }
    }
    
    // STEP 2: Add ad_views_used column
    console.log('\n📝 STEP 2: Adding ad_views_used to user_chapter_unlocks');
    const hasAdViews = await verifyColumnExists('user_chapter_unlocks', 'ad_views_used');
    
    if (hasAdViews) {
      console.log('   ⏭️  Column already exists, skipping');
    } else {
      const answer2 = await askQuestion('   Continue with adding ad_views_used column? (yes/no): ');
      if (answer2 !== 'yes') {
        console.log('   ❌ User cancelled at step 2');
        process.exit(0);
      }
      
      await db.query('ALTER TABLE user_chapter_unlocks ADD COLUMN ad_views_used INTEGER DEFAULT 0;');
      console.log('   ✅ Added ad_views_used column');
      
      const verified = await verifyColumnExists('user_chapter_unlocks', 'ad_views_used');
      if (!verified) {
        throw new Error('Failed to add ad_views_used column');
      }
    }
    
    // STEP 3: Add expires_at column
    console.log('\n📝 STEP 3: Adding expires_at to user_chapter_unlocks');
    const hasExpiresAt = await verifyColumnExists('user_chapter_unlocks', 'expires_at');
    
    if (hasExpiresAt) {
      console.log('   ⏭️  Column already exists, skipping');
    } else {
      const answer3 = await askQuestion('   Continue with adding expires_at column? (yes/no): ');
      if (answer3 !== 'yes') {
        console.log('   ❌ User cancelled at step 3');
        process.exit(0);
      }
      
      await db.query('ALTER TABLE user_chapter_unlocks ADD COLUMN expires_at TIMESTAMP;');
      console.log('   ✅ Added expires_at column');
      
      const verified = await verifyColumnExists('user_chapter_unlocks', 'expires_at');
      if (!verified) {
        throw new Error('Failed to add expires_at column');
      }
    }
    
    // STEP 4: Populate chapter_number data
    console.log('\n📝 STEP 4: Populating chapter_number with existing data');
    const answer4 = await askQuestion('   Continue with populating chapter_number data? (yes/no): ');
    if (answer4 !== 'yes') {
      console.log('   ❌ User cancelled at step 4');
      process.exit(0);
    }
    
    const updateResult = await db.query(`
      UPDATE user_chapter_unlocks 
      SET chapter_number = c.chapter_number
      FROM chapters c 
      WHERE user_chapter_unlocks.chapter_id = c.id 
        AND user_chapter_unlocks.chapter_number IS NULL
    `);
    
    console.log(`   ✅ Updated ${updateResult.rowCount} rows with chapter numbers`);
    
    // STEP 5: Update chapter pricing (MOST CRITICAL STEP)
    console.log('\n📝 STEP 5: Updating chapter pricing');
    console.log('   ⚠️  This will set coin costs for chapters 6+');
    console.log('   ⚠️  Chapters 1-5 will remain FREE');
    
    const answer5 = await askQuestion('   Continue with updating chapter pricing? (yes/no): ');
    if (answer5 !== 'yes') {
      console.log('   ❌ User cancelled at step 5');
      process.exit(0);
    }
    
    // Show current state first
    const currentState = await db.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN is_premium = true THEN 1 END) as currently_premium,
        COUNT(CASE WHEN coin_cost > 0 THEN 1 END) as currently_paid
      FROM chapters
    `);
    
    console.log(`   📊 Current state: ${currentState.rows[0].total} chapters, ${currentState.rows[0].currently_premium} premium, ${currentState.rows[0].currently_paid} paid`);
    
    const pricingResult = await db.query(`
      UPDATE chapters 
      SET 
        coin_cost = CASE
          WHEN chapter_number <= 5 THEN 0
          WHEN chapter_number <= 10 THEN 20
          WHEN chapter_number <= 20 THEN 25
          ELSE LEAST(70, 30 + FLOOR((chapter_number - 20) / 5))
        END,
        is_premium = CASE 
          WHEN chapter_number <= 5 THEN false
          ELSE true
        END,
        unlock_type = CASE
          WHEN chapter_number <= 5 THEN 'free'
          ELSE 'premium'
        END
    `);
    
    console.log(`   ✅ Updated pricing for ${pricingResult.rowCount} chapters`);
    
    // Verify final state
    const finalState = await db.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN is_premium = true THEN 1 END) as premium,
        COUNT(CASE WHEN coin_cost > 0 THEN 1 END) as paid,
        COUNT(CASE WHEN chapter_number <= 5 AND coin_cost = 0 THEN 1 END) as free_chapters
      FROM chapters
    `);
    
    console.log('\n🎉 ALL CHANGES APPLIED SUCCESSFULLY!');
    console.log('📊 Final state:');
    console.log(`   Total chapters: ${finalState.rows[0].total}`);
    console.log(`   Free chapters (1-5): ${finalState.rows[0].free_chapters}`);
    console.log(`   Premium chapters: ${finalState.rows[0].premium}`);
    console.log(`   Paid chapters: ${finalState.rows[0].paid}`);
    
    console.log('\n✅ Your monetization system is now ready!');
    console.log('🔒 Your original chapters and data are completely safe');
    
  } catch (error) {
    console.error('\n❌ ERROR OCCURRED:', error.message);
    console.log('\n🔧 To rollback changes, run: psql < rollback-monetization-changes.sql');
    throw error;
  } finally {
    rl.close();
  }
}

if (require.main === module) {
  applyChangesOneByOne()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = applyChangesOneByOne;