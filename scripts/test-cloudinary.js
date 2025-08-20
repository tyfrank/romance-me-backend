require('dotenv').config();

console.log('🔍 Testing Cloudinary Configuration...\n');

// Check environment variables
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

console.log('Environment Variables:');
console.log('----------------------');
console.log(`CLOUDINARY_CLOUD_NAME: ${cloudName || '❌ NOT SET'}`);
console.log(`CLOUDINARY_API_KEY: ${apiKey ? '✅ Set (hidden)' : '❌ NOT SET'}`);
console.log(`CLOUDINARY_API_SECRET: ${apiSecret ? '✅ Set (hidden)' : '❌ NOT SET'}\n`);

// Test Cloudinary connection
if (cloudName && apiKey && apiSecret) {
  const cloudinary = require('cloudinary').v2;
  
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret
  });
  
  console.log('Testing Cloudinary Connection...');
  
  // Try to get account details
  cloudinary.api.ping()
    .then(result => {
      console.log('✅ Cloudinary connection successful!');
      console.log('Status:', result.status);
    })
    .catch(error => {
      console.log('❌ Cloudinary connection failed!');
      console.log('Error:', error.message);
      
      if (error.message.includes('401')) {
        console.log('\n⚠️  Invalid credentials. Please check:');
        console.log('1. API Key and Secret are correct');
        console.log('2. No extra spaces in the values');
        console.log('3. Credentials match your Cloudinary account');
      }
    });
} else {
  console.log('❌ Missing Cloudinary configuration!');
  console.log('\nPlease set these environment variables:');
  console.log('- CLOUDINARY_CLOUD_NAME');
  console.log('- CLOUDINARY_API_KEY');
  console.log('- CLOUDINARY_API_SECRET');
}