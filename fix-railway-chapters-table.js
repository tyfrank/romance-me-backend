#!/usr/bin/env node
/**
 * RAILWAY PRODUCTION DATABASE MIGRATION
 * 
 * Adds missing monetization columns to chapters table in Railway production database
 * This script connects directly to Railway PostgreSQL and adds the required columns
 */

const { Pool } = require('pg');

// Get Railway database URL from environment or command line
const DATABASE_URL = process.env.DATABASE_URL || 
                     process.env.DATABASE_PRIVATE_URL || 
                     process.env.POSTGRES_URL ||
                     process.argv[2];

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not provided');
  console.log('\n💡 Usage:');
  console.log('  node fix-railway-chapters-table.js "postgresql://user:pass@host:port/db"');
  console.log('\n🔍 Or set environment variable:');
  console.log('  export DATABASE_URL="postgresql://user:pass@host:port/db"');
  console.log('\n📋 Get your Railway database URL from:');
  console.log('  1. railway.app dashboard');
  console.log('  2. Your project > PostgreSQL service');
  console.log('  3. Variables tab > DATABASE_PUBLIC_URL');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for Railway
  }
});

async function testConnection() {
  console.log('🔗 Testing connection to Railway PostgreSQL...');
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
    console.log(`✅ Connected successfully at ${result.rows[0].current_time}`);
    console.log(`📦 PostgreSQL version: ${result.rows[0].pg_version.split(' ')[1]}`);
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.log('\n💡 Common issues:');
    console.log('  - Wrong DATABASE_URL (check Railway dashboard)');
    console.log('  - SSL connection issues (script handles this)');
    console.log('  - Network connectivity');
    return false;
  }
}

async function checkChaptersTable() {
  console.log('\n📋 Checking chapters table structure...');
  try {
    const client = await pool.connect();
    
    // Check if chapters table exists
    const tableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'chapters'
    `);
    
    if (tableCheck.rows.length === 0) {
      console.error('❌ chapters table does not exist!');
      client.release();
      return { exists: false, columns: [] };
    }
    
    console.log('✅ chapters table found');
    
    // Get current columns
    const columnCheck = await client.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'chapters'
      ORDER BY ordinal_position
    `);
    
    console.log(`📊 Current columns (${columnCheck.rows.length} total):`);
    const existingColumns = [];
    columnCheck.rows.forEach(col => {
      existingColumns.push(col.column_name);
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default ? 'DEFAULT ' + col.column_default : ''}`);
    });
    
    // Count chapters
    const countResult = await client.query('SELECT COUNT(*) as total FROM chapters');
    console.log(`📚 Total chapters in table: ${countResult.rows[0].total}`);
    
    client.release();
    return { exists: true, columns: existingColumns, count: countResult.rows[0].total };
  } catch (error) {
    console.error('❌ Error checking table:', error.message);
    return { exists: false, columns: [] };
  }
}

async function addMonetizationColumns() {
  console.log('\n🔧 Adding monetization columns to chapters table...');
  
  const columns = [
    {
      name: 'coin_cost',
      definition: 'INTEGER DEFAULT 0',
      description: 'Cost in coins to unlock chapter'
    },
    {
      name: 'is_premium',
      definition: 'BOOLEAN DEFAULT false',
      description: 'Whether chapter requires payment'
    },
    {
      name: 'unlock_type',
      definition: 'VARCHAR(20) DEFAULT \'free\'',
      description: 'Type of unlock required (free/premium)'
    }
  ];
  
  try {
    const client = await pool.connect();
    
    for (const column of columns) {
      console.log(`\n➕ Adding column: ${column.name}`);
      console.log(`   Definition: ${column.definition}`);
      console.log(`   Purpose: ${column.description}`);
      
      try {
        // Check if column already exists
        const existsCheck = await client.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'chapters' AND column_name = $1
        `, [column.name]);
        
        if (existsCheck.rows.length > 0) {
          console.log(`   ⚠️  Column ${column.name} already exists, skipping`);
          continue;
        }
        
        // Add the column
        const alterQuery = `ALTER TABLE chapters ADD COLUMN ${column.name} ${column.definition}`;
        console.log(`   🔧 Running: ${alterQuery}`);
        
        await client.query(alterQuery);
        
        // Verify column was added
        const verifyCheck = await client.query(`
          SELECT column_name, data_type, column_default
          FROM information_schema.columns 
          WHERE table_name = 'chapters' AND column_name = $1
        `, [column.name]);
        
        if (verifyCheck.rows.length > 0) {
          const col = verifyCheck.rows[0];
          console.log(`   ✅ Column added: ${col.column_name} (${col.data_type}) DEFAULT ${col.column_default || 'NULL'}`);
        } else {
          console.log(`   ❌ Column verification failed`);
          client.release();
          return false;
        }
        
      } catch (error) {
        console.error(`   ❌ Error adding ${column.name}:`, error.message);
        client.release();
        return false;
      }
    }
    
    client.release();
    console.log('\n🎉 All monetization columns added successfully!');
    return true;
    
  } catch (error) {
    console.error('❌ Error in column addition:', error.message);
    return false;
  }
}

async function setPricingValues() {
  console.log('\n💰 Setting chapter pricing values...');
  
  try {
    const client = await pool.connect();
    
    console.log('🔧 Calculating pricing for all chapters...');
    
    // Update all chapters with proper monetization values
    const updateQuery = `
      UPDATE chapters SET
        coin_cost = CASE
          WHEN chapter_number <= 5 THEN 0
          WHEN chapter_number <= 10 THEN 20
          WHEN chapter_number <= 200 THEN 
            GREATEST(25, 25 + FLOOR(POWER((chapter_number - 11)::float / 189, 1.5) * 45))
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
    
    console.log('📊 Applying pricing formula to all chapters...');
    const result = await client.query(updateQuery);
    console.log(`✅ Updated ${result.rowCount} chapters with pricing`);
    
    // Verify the pricing was applied correctly
    const sampleCheck = await client.query(`
      SELECT 
        chapter_number, 
        coin_cost, 
        is_premium, 
        unlock_type,
        COUNT(*) as count
      FROM chapters 
      WHERE chapter_number IN (1, 5, 6, 10, 11, 15, 20, 25)
      GROUP BY chapter_number, coin_cost, is_premium, unlock_type
      ORDER BY chapter_number
    `);
    
    console.log('\n📋 Sample pricing verification:');
    sampleCheck.rows.forEach(row => {
      console.log(`  Chapter ${row.chapter_number}: cost=${row.coin_cost}, premium=${row.is_premium}, type=${row.unlock_type} (${row.count} chapters)`);
    });
    
    // Get summary counts
    const summaryResult = await client.query(`
      SELECT 
        COUNT(*) as total_chapters,
        COUNT(CASE WHEN is_premium = false THEN 1 END) as free_chapters,
        COUNT(CASE WHEN is_premium = true THEN 1 END) as premium_chapters,
        MIN(coin_cost) as min_cost,
        MAX(coin_cost) as max_cost
      FROM chapters
    `);
    
    const summary = summaryResult.rows[0];
    console.log('\n📊 Pricing Summary:');
    console.log(`  📚 Total chapters: ${summary.total_chapters}`);
    console.log(`  🆓 Free chapters: ${summary.free_chapters}`);
    console.log(`  💰 Premium chapters: ${summary.premium_chapters}`);
    console.log(`  🪙 Price range: ${summary.min_cost} - ${summary.max_cost} coins`);
    
    client.release();
    return true;
    
  } catch (error) {
    console.error('❌ Error setting pricing values:', error.message);
    return false;
  }
}

async function finalVerification() {
  console.log('\n🔍 Final verification...');
  
  try {
    const client = await pool.connect();
    
    // Check all required columns exist
    const columnCheck = await client.query(`
      SELECT column_name
      FROM information_schema.columns 
      WHERE table_name = 'chapters' 
        AND column_name IN ('coin_cost', 'is_premium', 'unlock_type')
    `);
    
    const foundColumns = columnCheck.rows.map(row => row.column_name);
    const requiredColumns = ['coin_cost', 'is_premium', 'unlock_type'];
    
    console.log('✅ Required columns status:');
    requiredColumns.forEach(col => {
      if (foundColumns.includes(col)) {
        console.log(`  ✅ ${col}: EXISTS`);
      } else {
        console.log(`  ❌ ${col}: MISSING`);
      }
    });
    
    // Test a sample query that the backend will use
    console.log('\n🧪 Testing backend query compatibility...');
    const testQuery = `
      SELECT 
        c.id, 
        c.chapter_number, 
        c.title,
        c.coin_cost, 
        c.is_premium, 
        c.unlock_type
      FROM chapters c
      WHERE c.chapter_number = 6
      LIMIT 1
    `;
    
    const testResult = await client.query(testQuery);
    if (testResult.rows.length > 0) {
      const testChapter = testResult.rows[0];
      console.log('✅ Backend query test successful:');
      console.log(`  Chapter ${testChapter.chapter_number}: cost=${testChapter.coin_cost}, premium=${testChapter.is_premium}, type=${testChapter.unlock_type}`);
    } else {
      console.log('⚠️  No chapter 6 found for testing');
    }
    
    client.release();
    
    if (foundColumns.length === 3) {
      console.log('\n🎉 MIGRATION COMPLETED SUCCESSFULLY!');
      console.log('✅ All monetization columns exist in Railway production database');
      console.log('✅ Chapter pricing has been applied');
      console.log('✅ Backend should now work without "column does not exist" errors');
      return true;
    } else {
      console.log('\n⚠️  Migration incomplete - some columns missing');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Final verification failed:', error.message);
    return false;
  }
}

async function runMigration() {
  console.log('🚀 RAILWAY PRODUCTION DATABASE MIGRATION');
  console.log('=' + '='.repeat(70));
  console.log('Adding monetization columns to chapters table');
  console.log('Database:', DATABASE_URL.replace(/:([^:@]+)@/, ':****@')); // Mask password
  console.log('');
  
  try {
    // Step 1: Test connection
    const connected = await testConnection();
    if (!connected) {
      console.log('\n💥 Migration failed: Cannot connect to Railway database');
      console.log('📋 Check your DATABASE_URL and try again');
      process.exit(1);
    }
    
    // Step 2: Check current table structure
    const tableInfo = await checkChaptersTable();
    if (!tableInfo.exists) {
      console.log('\n💥 Migration failed: chapters table not found');
      process.exit(1);
    }
    
    // Step 3: Check if columns already exist
    const monetizationColumns = ['coin_cost', 'is_premium', 'unlock_type'];
    const missingColumns = monetizationColumns.filter(col => !tableInfo.columns.includes(col));
    
    if (missingColumns.length === 0) {
      console.log('\n🎉 All monetization columns already exist!');
      console.log('Proceeding to verify/update pricing values...');
      await setPricingValues();
    } else {
      console.log(`\n📝 Need to add ${missingColumns.length} missing columns: ${missingColumns.join(', ')}`);
      
      // Step 4: Add missing columns
      const columnsAdded = await addMonetizationColumns();
      if (!columnsAdded) {
        console.log('\n💥 Migration failed: Error adding columns');
        process.exit(1);
      }
      
      // Step 5: Set pricing values
      const pricingSet = await setPricingValues();
      if (!pricingSet) {
        console.log('\n💥 Migration failed: Error setting pricing values');
        process.exit(1);
      }
    }
    
    // Step 6: Final verification
    const verified = await finalVerification();
    if (verified) {
      console.log('\n🎊 MIGRATION SUCCESSFUL!');
      console.log('Your Railway backend should now work without database errors!');
    } else {
      console.log('\n⚠️  Migration completed with warnings - check the output above');
    }
    
  } catch (error) {
    console.error('\n💥 Migration failed with error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migration if called directly
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('\n✅ Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Migration script failed:', error.message);
      process.exit(1);
    });
}

module.exports = runMigration;