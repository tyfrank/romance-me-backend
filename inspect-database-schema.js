#!/usr/bin/env node

require('dotenv').config();
const db = require('./src/config/database');

async function inspectDatabaseSchema() {
  console.log('🔍 INSPECTING DATABASE SCHEMA\n');
  console.log('Database:', process.env.DATABASE_URL ? 'Railway Production' : 'Local');
  console.log('=' + '='.repeat(60));

  try {
    // Check if tables exist and get their schemas
    const tables = ['books', 'chapters', 'user_chapter_unlocks', 'user_rewards', 'users'];
    
    for (const tableName of tables) {
      console.log(`\n📋 TABLE: ${tableName.toUpperCase()}`);
      console.log('-'.repeat(40));
      
      try {
        // Check if table exists
        const tableExists = await db.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          );
        `, [tableName]);
        
        if (!tableExists.rows[0].exists) {
          console.log(`❌ Table '${tableName}' does not exist`);
          continue;
        }
        
        // Get table schema
        const schema = await db.query(`
          SELECT 
            column_name,
            data_type,
            is_nullable,
            column_default,
            character_maximum_length
          FROM information_schema.columns 
          WHERE table_name = $1 
          AND table_schema = 'public'
          ORDER BY ordinal_position;
        `, [tableName]);
        
        console.log(`✅ Table exists with ${schema.rows.length} columns:`);
        schema.rows.forEach(col => {
          const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
          const length = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
          const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
          console.log(`   • ${col.column_name}: ${col.data_type}${length} ${nullable}${defaultVal}`);
        });
        
        // Get sample data for specific tables
        if (tableName === 'chapters') {
          console.log('\n📊 Sample chapters data:');
          const sampleChapters = await db.query(`
            SELECT * FROM chapters 
            ORDER BY created_at DESC 
            LIMIT 3
          `);
          
          if (sampleChapters.rows.length > 0) {
            sampleChapters.rows.forEach((row, index) => {
              console.log(`   Sample ${index + 1}:`, JSON.stringify(row, null, 2));
            });
          } else {
            console.log('   No data found');
          }
        }
        
        if (tableName === 'user_chapter_unlocks') {
          console.log('\n📊 Sample unlock data:');
          const sampleUnlocks = await db.query(`
            SELECT * FROM user_chapter_unlocks 
            LIMIT 2
          `);
          
          if (sampleUnlocks.rows.length > 0) {
            sampleUnlocks.rows.forEach((row, index) => {
              console.log(`   Sample ${index + 1}:`, JSON.stringify(row, null, 2));
            });
          } else {
            console.log('   No data found');
          }
        }
        
      } catch (error) {
        console.log(`❌ Error inspecting ${tableName}:`, error.message);
      }
    }
    
    // Check for indexes
    console.log('\n\n🔍 INDEXES');
    console.log('-'.repeat(40));
    try {
      const indexes = await db.query(`
        SELECT 
          schemaname,
          tablename,
          indexname,
          indexdef
        FROM pg_indexes 
        WHERE schemaname = 'public'
        AND tablename IN ('books', 'chapters', 'user_chapter_unlocks', 'user_rewards')
        ORDER BY tablename, indexname;
      `);
      
      indexes.rows.forEach(idx => {
        console.log(`📌 ${idx.tablename}.${idx.indexname}:`);
        console.log(`   ${idx.indexdef}`);
      });
    } catch (error) {
      console.log('❌ Error fetching indexes:', error.message);
    }
    
    // Check for foreign key constraints
    console.log('\n\n🔗 FOREIGN KEY CONSTRAINTS');
    console.log('-'.repeat(40));
    try {
      const constraints = await db.query(`
        SELECT
          tc.table_name,
          tc.constraint_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
          AND tc.table_name IN ('books', 'chapters', 'user_chapter_unlocks', 'user_rewards')
        ORDER BY tc.table_name;
      `);
      
      constraints.rows.forEach(fk => {
        console.log(`🔗 ${fk.table_name}.${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
      });
    } catch (error) {
      console.log('❌ Error fetching constraints:', error.message);
    }
    
    console.log('\n✅ Schema inspection completed!');
    
  } catch (error) {
    console.error('❌ Database inspection failed:', error);
  } finally {
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  inspectDatabaseSchema().catch(console.error);
}

module.exports = inspectDatabaseSchema;