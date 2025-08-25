#!/usr/bin/env node
/**
 * Quick check to see if we can connect to production database
 */

// Try common Railway database URL patterns
const possibleUrls = [
  process.env.DATABASE_URL,
  process.env.DATABASE_PRIVATE_URL,
  process.env.POSTGRES_URL,
  process.env.DB_URL,
];

console.log('🔍 Checking for Railway database URLs...');
console.log('Available environment variables:');

possibleUrls.forEach((url, i) => {
  if (url) {
    // Mask password for security
    const maskedUrl = url.replace(/:([^:@]+)@/, ':****@');
    console.log(`  ${i + 1}. Found URL: ${maskedUrl}`);
  } else {
    console.log(`  ${i + 1}. Not found`);
  }
});

console.log('\n📋 All environment variables starting with DB or POSTGRES:');
Object.keys(process.env)
  .filter(key => key.toUpperCase().includes('DB') || key.toUpperCase().includes('POSTGRES'))
  .forEach(key => {
    const value = process.env[key];
    if (value && value.includes('postgresql://')) {
      const masked = value.replace(/:([^:@]+)@/, ':****@');
      console.log(`  ${key}: ${masked}`);
    } else {
      console.log(`  ${key}: ${value}`);
    }
  });

console.log('\n💡 If no database URL found, you need to:');
console.log('1. Go to https://railway.app/dashboard');
console.log('2. Find your project');
console.log('3. Click PostgreSQL service');
console.log('4. Copy DATABASE_URL from Variables tab');
console.log('5. Run: node migrate-production-db.js "your-database-url-here"');