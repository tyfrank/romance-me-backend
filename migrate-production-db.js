#!/usr/bin/env node
/**
 * PRODUCTION RAILWAY DATABASE MIGRATION
 * 
 * Adds missing monetization columns to the chapters table in Railway production database
 */

const { Pool } = require('pg');

// Railway production database URL
const DATABASE_URL = process.env.DATABASE_URL || process.argv[2];

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not provided');
  console.log('💡 Usage options:');
  console.log('   1. Set environment variable: export DATABASE_URL="postgresql://user:pass@host:port/db"');
  console.log('   2. Pass as argument: node migrate-production-db.js "postgresql://user:pass@host:port/db"');
  console.log('');
  console.log('🔍 To find your Railway database URL:');
  console.log('   1. Go to railway.app dashboard');
  console.log('   2. Select your project');
  console.log('   3. Click on "PostgreSQL" service');
  console.log('   4. Go to "Variables" tab');
  console.log('   5. Copy the DATABASE_URL value');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Railway requires SSL
  }
});

async function testConnection() {
  console.log('🔗 Testing connection to Railway database...');
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
    console.log(`✅ Connected to PostgreSQL at ${result.rows[0].current_time}`);
    console.log(`📦 Database version: ${result.rows[0].pg_version.split(' ')[0]} ${result.rows[0].pg_version.split(' ')[1]}`);
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    return false;
  }
}

async function checkTableExists() {
  console.log('\n📋 Checking if chapters table exists...');
  try {
    const client = await pool.connect();
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'chapters'
    `);
    
    if (result.rows.length === 0) {
      console.error('❌ chapters table does not exist!');
      client.release();
      return false;
    }
    
    console.log('✅ chapters table found');
    
    // Count chapters
    const countResult = await client.query('SELECT COUNT(*) as total FROM chapters');
    console.log(`📊 Total chapters: ${countResult.rows[0].total}`);
    
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Error checking table:', error.message);
    return false;
  }
}

async function checkCurrentColumns() {
  console.log('\n🔍 Checking current columns in chapters table...');
  try {
    const client = await pool.connect();
    const result = await client.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'chapters'
      ORDER BY ordinal_position
    `);
    
    console.log('Current columns:');
    const existingColumns = [];
    result.rows.forEach(col => {
      existingColumns.push(col.column_name);
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default ? 'DEFAULT ' + col.column_default : ''}`);
    });
    
    // Check monetization columns
    const monetizationCols = ['coin_cost', 'is_premium', 'unlock_type'];
    const missing = [];
    
    console.log('\n🎯 Monetization columns status:');
    monetizationCols.forEach(col => {
      if (existingColumns.includes(col)) {
        console.log(`  ✅ ${col} EXISTS`);
      } else {
        console.log(`  ❌ ${col} MISSING`);
        missing.push(col);
      }
    });
    
    client.release();
    return { existing: existingColumns, missing };
  } catch (error) {
    console.error('❌ Error checking columns:', error.message);
    return { existing: [], missing: ['coin_cost', 'is_premium', 'unlock_type'] };
  }
}

async function addColumn(columnName, columnDefinition) {
  console.log(`\n➕ Adding column: ${columnName}`);
  try {
    const client = await pool.connect();
    
    // Check if column already exists first
    const checkResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'chapters' AND column_name = $1
    `, [columnName]);
    
    if (checkResult.rows.length > 0) {
      console.log(`  ⚠️  Column ${columnName} already exists, skipping`);
      client.release();
      return true;
    }
    
    // Add the column
    const alterQuery = `ALTER TABLE chapters ADD COLUMN ${columnName} ${columnDefinition}`;
    console.log(`  🔧 Running: ${alterQuery}`);
    
    await client.query(alterQuery);
    
    // Verify it was added
    const verifyResult = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name = 'chapters' AND column_name = $1
    `, [columnName]);
    
    if (verifyResult.rows.length > 0) {
      const col = verifyResult.rows[0];
      console.log(`  ✅ Column added successfully: ${col.column_name} (${col.data_type}) DEFAULT ${col.column_default || 'NULL'}`);
      client.release();
      return true;
    } else {
      console.log(`  ❌ Column verification failed`);
      client.release();
      return false;
    }
    
  } catch (error) {
    console.error(`  ❌ Error adding column ${columnName}:`, error.message);
    return false;
  }
}

async function setColumnValues() {
  console.log('\n📊 Setting initial values for monetization columns...');
  try {
    const client = await pool.connect();
    
    // Update chapters based on chapter number
    const updateQuery = `
      UPDATE chapters SET
        coin_cost = CASE
          WHEN chapter_number <= 5 THEN 0
          WHEN chapter_number <= 10 THEN 20
          ELSE 25 + FLOOR(POWER((chapter_number - 11)::float / 189, 1.5) * 45)
        END,
        is_premium = CASE
          WHEN chapter_number <= 5 THEN false
          ELSE true
        END,
        unlock_type = CASE
          WHEN chapter_number <= 5 THEN 'free'
          ELSE 'premium'
        END
      WHERE coin_cost IS NULL OR is_premium IS NULL OR unlock_type IS NULL
    `;
    
    console.log('  🔧 Setting monetization values based on chapter numbers...');
    const result = await client.query(updateQuery);
    console.log(`  ✅ Updated ${result.rowCount} chapters`);
    
    // Show sample results
    const sampleResult = await client.query(`
      SELECT chapter_number, coin_cost, is_premium, unlock_type
      FROM chapters
      WHERE chapter_number IN (1, 5, 6, 10, 11, 15)
      ORDER BY chapter_number
      LIMIT 10
    `);
    
    console.log('  📋 Sample chapter values:');
    sampleResult.rows.forEach(row => {
      console.log(`    Chapter ${row.chapter_number}: cost=${row.coin_cost}, premium=${row.is_premium}, type=${row.unlock_type}`);
    });
    
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Error setting column values:', error.message);
    return false;
  }
}

async function runMigration() {
  console.log('🚀 STARTING RAILWAY PRODUCTION DATABASE MIGRATION');
  console.log('=' + '='.repeat(60));
  
  // Step 1: Test connection
  const connected = await testConnection();
  if (!connected) {
    console.log('\n💥 Migration failed: Cannot connect to database');
    process.exit(1);
  }
  
  // Step 2: Check table exists
  const tableExists = await checkTableExists();
  if (!tableExists) {
    console.log('\n💥 Migration failed: chapters table not found');
    process.exit(1);
  }
  
  // Step 3: Check current columns
  const { existing, missing } = await checkCurrentColumns();
  
  if (missing.length === 0) {
    console.log('\n🎉 All monetization columns already exist!');
    console.log('   Checking if values need to be set...');
    await setColumnValues();
  } else {
    console.log(`\n📝 Need to add ${missing.length} missing columns: ${missing.join(', ')}`);
    
    // Step 4: Add missing columns one by one
    const columnDefinitions = {
      'coin_cost': 'INTEGER DEFAULT 0',
      'is_premium': 'BOOLEAN DEFAULT false',
      'unlock_type': 'VARCHAR(20) DEFAULT \'free\''
    };
    
    let allSuccessful = true;
    for (const columnName of missing) {
      const success = await addColumn(columnName, columnDefinitions[columnName]);
      if (!success) {
        allSuccessful = false;
        break;
      }
    }
    
    if (!allSuccessful) {
      console.log('\n💥 Migration failed: Error adding columns');
      process.exit(1);
    }
    
    // Step 5: Set initial values
    await setColumnValues();
  }
  
  // Step 6: Final verification
  console.log('\n🔍 Final verification...');
  const finalCheck = await checkCurrentColumns();
  
  if (finalCheck.missing.length === 0) {
    console.log('\n🎉 MIGRATION COMPLETED SUCCESSFULLY!');
    console.log('✅ All monetization columns are now present in production database');
    console.log('✅ Chapter pricing has been applied');
    console.log('\n📊 Your backend should now work without "column does not exist" errors');
  } else {
    console.log('\n⚠️  Migration incomplete. Missing columns:', finalCheck.missing.join(', '));
  }
  
  console.log('\n🏁 Migration finished');
}

// Run the migration
if (require.main === module) {
  runMigration()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('\n💥 Migration failed with error:', error.message);
      process.exit(1);
    })
    .finally(() => {
      pool.end();
    });
}

module.exports = runMigration;