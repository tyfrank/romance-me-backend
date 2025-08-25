#!/usr/bin/env node

require('dotenv').config();
const runMigration = require('./src/migrations/add-chapter-pricing');

console.log('🚀 Starting chapter pricing migration...');
console.log('Database:', process.env.DATABASE_URL ? 'Connected to Railway' : 'Using local database');

runMigration()
  .then(() => {
    console.log('✅ Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  });