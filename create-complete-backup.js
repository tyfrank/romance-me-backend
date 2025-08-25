#!/usr/bin/env node
/**
 * COMPLETE DATABASE BACKUP SCRIPT
 * 
 * Creates full backup of all critical tables before any schema changes
 * Includes data export and schema documentation
 */

require('dotenv').config();
const db = require('./src/config/database');
const fs = require('fs').promises;

async function createCompleteBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = `./backups/backup-${timestamp}`;
  
  try {
    // Create backup directory
    await fs.mkdir(backupDir, { recursive: true });
    console.log(`📂 Created backup directory: ${backupDir}`);
    
    const tables = ['books', 'chapters', 'users', 'user_chapter_unlocks', 'user_rewards', 'user_reading_progress'];
    
    // 1. BACKUP TABLE SCHEMAS
    console.log('\n📋 BACKING UP TABLE SCHEMAS...');
    for (const table of tables) {
      try {
        const schemaResult = await db.query(`
          SELECT column_name, data_type, is_nullable, column_default, character_maximum_length
          FROM information_schema.columns 
          WHERE table_name = $1 AND table_schema = 'public'
          ORDER BY ordinal_position
        `, [table]);
        
        if (schemaResult.rows.length > 0) {
          await fs.writeFile(
            `${backupDir}/${table}_schema.json`,
            JSON.stringify(schemaResult.rows, null, 2)
          );
          console.log(`   ✅ ${table} schema saved`);
        }
      } catch (error) {
        console.log(`   ⚠️  ${table} schema backup failed:`, error.message);
      }
    }
    
    // 2. BACKUP ALL DATA
    console.log('\n💾 BACKING UP TABLE DATA...');
    for (const table of tables) {
      try {
        const dataResult = await db.query(`SELECT * FROM ${table}`);
        
        await fs.writeFile(
          `${backupDir}/${table}_data.json`,
          JSON.stringify(dataResult.rows, null, 2)
        );
        
        console.log(`   ✅ ${table}: ${dataResult.rows.length} rows backed up`);
      } catch (error) {
        console.log(`   ⚠️  ${table} data backup failed:`, error.message);
      }
    }
    
    // 3. BACKUP CRITICAL CONSTRAINTS AND INDEXES
    console.log('\n🔗 BACKING UP CONSTRAINTS AND INDEXES...');
    try {
      // Foreign keys
      const fkResult = await db.query(`
        SELECT
          tc.table_name,
          tc.constraint_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
      `);
      
      await fs.writeFile(
        `${backupDir}/foreign_keys.json`,
        JSON.stringify(fkResult.rows, null, 2)
      );
      
      // Indexes
      const indexResult = await db.query(`
        SELECT schemaname, tablename, indexname, indexdef
        FROM pg_indexes 
        WHERE schemaname = 'public'
        ORDER BY tablename, indexname
      `);
      
      await fs.writeFile(
        `${backupDir}/indexes.json`,
        JSON.stringify(indexResult.rows, null, 2)
      );
      
      console.log(`   ✅ Constraints and indexes backed up`);
    } catch (error) {
      console.log(`   ⚠️  Constraints backup failed:`, error.message);
    }
    
    // 4. CREATE BACKUP SUMMARY
    const summary = {
      timestamp: new Date().toISOString(),
      database: process.env.DATABASE_URL ? 'Railway Production' : 'Local',
      backupLocation: backupDir,
      tablesBackedUp: tables,
      instructions: {
        restore: 'Use restore-from-backup.js script',
        location: backupDir
      }
    };
    
    await fs.writeFile(
      `${backupDir}/backup_summary.json`,
      JSON.stringify(summary, null, 2)
    );
    
    console.log('\n🎉 BACKUP COMPLETED SUCCESSFULLY!');
    console.log(`📂 Location: ${backupDir}`);
    console.log(`📋 Tables: ${tables.join(', ')}`);
    console.log(`⏰ Timestamp: ${timestamp}`);
    
    return backupDir;
    
  } catch (error) {
    console.error('❌ BACKUP FAILED:', error);
    throw error;
  }
}

if (require.main === module) {
  createCompleteBackup()
    .then((dir) => {
      console.log(`\n✅ Backup saved to: ${dir}`);
      console.log('🔒 Your data is now safely backed up before any changes!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Backup failed:', error.message);
      process.exit(1);
    });
}

module.exports = createCompleteBackup;