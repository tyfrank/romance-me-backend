#!/usr/bin/env node
/**
 * RESTORE FROM BACKUP SCRIPT
 * 
 * Completely restores your database from a backup
 * Use this if anything goes wrong with the monetization changes
 */

require('dotenv').config();
const db = require('./src/config/database');
const fs = require('fs').promises;
const path = require('path');

async function restoreFromBackup(backupPath) {
  console.log('🔄 RESTORING DATABASE FROM BACKUP');
  console.log('=' + '='.repeat(50));
  console.log(`📂 Backup location: ${backupPath}`);
  
  try {
    // Verify backup directory exists
    const backupStats = await fs.stat(backupPath);
    if (!backupStats.isDirectory()) {
      throw new Error('Backup path is not a directory');
    }
    
    // Read backup summary
    const summaryPath = path.join(backupPath, 'backup_summary.json');
    const summaryData = await fs.readFile(summaryPath, 'utf8');
    const summary = JSON.parse(summaryData);
    
    console.log(`📋 Backup created: ${summary.timestamp}`);
    console.log(`📊 Tables to restore: ${summary.tablesBackedUp.join(', ')}`);
    
    const client = await db.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      for (const tableName of summary.tablesBackedUp) {
        console.log(`\n🔄 Restoring ${tableName}...`);
        
        // Read schema and data
        const schemaPath = path.join(backupPath, `${tableName}_schema.json`);
        const dataPath = path.join(backupPath, `${tableName}_data.json`);
        
        try {
          const schemaData = JSON.parse(await fs.readFile(schemaPath, 'utf8'));
          const tableData = JSON.parse(await fs.readFile(dataPath, 'utf8'));
          
          // Clear existing data
          await client.query(`TRUNCATE TABLE ${tableName} RESTART IDENTITY CASCADE`);
          console.log(`   🗑️  Cleared existing ${tableName} data`);
          
          // Restore data if any exists
          if (tableData.length > 0) {
            // Build column list from schema
            const columns = schemaData.map(col => col.column_name);
            const columnList = columns.join(', ');
            
            // Build parameterized query
            const valuePlaceholders = tableData.map((_, index) => {
              const rowPlaceholders = columns.map((_, colIndex) => `$${index * columns.length + colIndex + 1}`);
              return `(${rowPlaceholders.join(', ')})`;
            }).join(', ');
            
            // Flatten all values for the query
            const values = tableData.flatMap(row => columns.map(col => row[col]));
            
            const insertQuery = `INSERT INTO ${tableName} (${columnList}) VALUES ${valuePlaceholders}`;
            
            await client.query(insertQuery, values);
            console.log(`   ✅ Restored ${tableData.length} rows to ${tableName}`);
          } else {
            console.log(`   ⚠️  No data to restore for ${tableName}`);
          }
        } catch (error) {
          console.log(`   ❌ Failed to restore ${tableName}: ${error.message}`);
          throw error;
        }
      }
      
      // Restore sequences for auto-increment columns
      console.log('\n🔢 Restoring sequence values...');
      
      // Get all sequences and reset them
      const sequenceResult = await client.query(`
        SELECT schemaname, sequencename, last_value
        FROM pg_sequences
        WHERE schemaname = 'public'
      `);
      
      for (const seq of sequenceResult.rows) {
        try {
          await client.query(`SELECT setval('${seq.sequencename}', COALESCE((SELECT MAX(id) FROM ${seq.sequencename.replace('_id_seq', '')}), 1), true)`);
        } catch (error) {
          // Sequence might not match a table, skip it
          console.log(`   ⚠️  Could not reset sequence ${seq.sequencename}`);
        }
      }
      
      await client.query('COMMIT');
      
      console.log('\n🎉 DATABASE RESTORE COMPLETED SUCCESSFULLY!');
      console.log('✅ All your original data has been restored');
      console.log('✅ Your app should work exactly as it did before');
      
      // Verify restoration
      console.log('\n📊 VERIFICATION:');
      for (const tableName of summary.tablesBackedUp) {
        const countResult = await db.query(`SELECT COUNT(*) as count FROM ${tableName}`);
        console.log(`   ${tableName}: ${countResult.rows[0].count} rows`);
      }
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ RESTORE FAILED:', error.message);
    console.error('💡 Make sure the backup path is correct and contains all required files');
    throw error;
  }
}

// CLI usage
if (require.main === module) {
  const backupPath = process.argv[2];
  
  if (!backupPath) {
    console.error('❌ Please provide backup path');
    console.log('Usage: node restore-from-backup.js ./backups/backup-YYYY-MM-DD...');
    process.exit(1);
  }
  
  restoreFromBackup(backupPath)
    .then(() => {
      console.log('\n✅ Restore completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Restore failed:', error.message);
      process.exit(1);
    });
}

module.exports = restoreFromBackup;