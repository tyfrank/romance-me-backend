#!/usr/bin/env node

require('dotenv').config();
const runCorrectedMigration = require('./src/migrations/fix-chapter-pricing-migration');

console.log('🚀 Starting corrected chapter pricing migration...');
console.log('📡 Database:', process.env.DATABASE_URL ? 'Railway Production' : 'Local Database');
console.log('🔍 This migration will:');
console.log('   • Work with your existing chapters table structure');
console.log('   • Add missing columns to user_chapter_unlocks');
console.log('   • Create user_subscriptions table');
console.log('   • Update chapter pricing based on chapter_number');
console.log('   • Add performance indexes');
console.log('   • Provide verification of pricing structure');
console.log('\n' + '='.repeat(60));

runCorrectedMigration()
  .then(() => {
    console.log('\n🎉 SUCCESS! Your database is now ready for chapter monetization.');
    console.log('\n🔄 Next steps:');
    console.log('   1. Test the frontend with: npm start');
    console.log('   2. Navigate to a chapter 6+ to see unlock modal');
    console.log('   3. Check chapter dropdown for pricing display');
    console.log('   4. Verify API endpoints work correctly');
    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed with error:', error.message);
    console.error('\n🔧 Common issues and solutions:');
    console.error('   • Database connection: Check your DATABASE_URL');
    console.error('   • Permission issues: Ensure database user has ALTER privileges');
    console.error('   • Constraint violations: Check existing data integrity');
    console.error('\n📋 Error details:', error.stack);
    process.exit(1);
  });