const { Pool } = require('pg');
require('dotenv').config();

// Use Railway production database URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgres@postgresql.railway.internal:5432/railway",
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

(async () => {
  console.log('🔧 Fixing check_in_history table structure...');
  
  try {
    // Check current table structure
    console.log('\n📋 Current table structure:');
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'check_in_history' 
      ORDER BY ordinal_position;
    `);
    
    if (columns.rows.length === 0) {
      console.log('❌ Table check_in_history does not exist');
    } else {
      columns.rows.forEach(col => {
        console.log(`  ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
      });
    }
    
    // Recreate table with correct structure
    console.log('\n🔨 Recreating table with correct structure...');
    
    await pool.query('DROP TABLE IF EXISTS check_in_history CASCADE');
    
    await pool.query(`
      CREATE TABLE check_in_history (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        check_in_date DATE NOT NULL,
        coins_earned INTEGER DEFAULT 0,
        streak_day INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, check_in_date)
      );
    `);
    
    console.log('✅ Table recreated successfully');
    
    // Verify new structure
    console.log('\n📋 New table structure:');
    const newColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'check_in_history' 
      ORDER BY ordinal_position;
    `);
    
    newColumns.rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    
    console.log('\n🎉 Check-in table fix complete!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error fixing table:', error);
    process.exit(1);
  }
})();