#!/usr/bin/env node

require('dotenv').config();
const fetch = require('node-fetch');

// Configuration
const API_BASE_URL = process.env.API_URL || 'http://localhost:3001/api';
const TEST_TOKEN = process.env.TEST_TOKEN; // You'll need to provide this
const TEST_BOOK_ID = '2c0b5739-7c95-4628-a1ed-5ba8b441a93b'; // From your data

console.log('🧪 TESTING MONETIZATION ENDPOINTS');
console.log('='.repeat(50));

async function testEndpoints() {
  if (!TEST_TOKEN) {
    console.log('❌ Please set TEST_TOKEN environment variable');
    console.log('   Get a token by logging into your app and checking browser devtools');
    console.log('   Example: TEST_TOKEN=your-jwt-token node test-monetization-endpoints.js');
    return;
  }
  
  const headers = {
    'Authorization': `Bearer ${TEST_TOKEN}`,
    'Content-Type': 'application/json'
  };
  
  // Test 1: Check rewards/coin balance
  console.log('\n📊 Testing coin balance endpoint...');
  try {
    const response = await fetch(`${API_BASE_URL}/rewards`, { headers });
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Rewards endpoint working');
      console.log(`   Coin balance: ${data.total_coins} coins`);
    } else {
      console.log('❌ Rewards endpoint failed:', data.message);
    }
  } catch (error) {
    console.log('❌ Rewards endpoint error:', error.message);
  }
  
  // Test 2: Check chapter access for free chapter
  console.log('\n📖 Testing chapter access (Chapter 3 - should be free)...');
  try {
    const response = await fetch(`${API_BASE_URL}/books/${TEST_BOOK_ID}/chapters/3/access`, { headers });
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Chapter access endpoint working');
      console.log(`   Has access: ${data.hasAccess}`);
      console.log(`   Access type: ${data.accessType}`);
      console.log(`   Is premium: ${data.chapter?.isPremium}`);
      console.log(`   Coin cost: ${data.chapter?.coinCost}`);
    } else {
      console.log('❌ Chapter access failed:', data.message);
    }
  } catch (error) {
    console.log('❌ Chapter access error:', error.message);
  }
  
  // Test 3: Check chapter access for paid chapter
  console.log('\n💰 Testing chapter access (Chapter 8 - should cost 20 coins)...');
  try {
    const response = await fetch(`${API_BASE_URL}/books/${TEST_BOOK_ID}/chapters/8/access`, { headers });
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Paid chapter access working');
      console.log(`   Has access: ${data.hasAccess}`);
      console.log(`   Access type: ${data.accessType}`);
      console.log(`   Coin cost: ${data.chapter?.coinCost}`);
      console.log(`   User balance: ${data.userBalance}`);
      console.log(`   Unlock options: ${data.unlockOptions?.join(', ')}`);
    } else {
      console.log('❌ Paid chapter access failed:', data.message);
    }
  } catch (error) {
    console.log('❌ Paid chapter access error:', error.message);
  }
  
  // Test 4: Check unlocked chapters
  console.log('\n📋 Testing unlocked chapters list...');
  try {
    const response = await fetch(`${API_BASE_URL}/books/${TEST_BOOK_ID}/unlocked-chapters`, { headers });
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Unlocked chapters endpoint working');
      console.log(`   Total chapters: ${data.chapters?.length}`);
      const freeChapters = data.chapters?.filter(c => !c.isPremium).length;
      const unlockedChapters = data.chapters?.filter(c => c.isUnlocked).length;
      console.log(`   Free chapters: ${freeChapters}`);
      console.log(`   Unlocked chapters: ${unlockedChapters}`);
    } else {
      console.log('❌ Unlocked chapters failed:', data.message);
    }
  } catch (error) {
    console.log('❌ Unlocked chapters error:', error.message);
  }
  
  console.log('\n🎯 TEST SUMMARY:');
  console.log('   If all tests pass, your monetization system is ready!');
  console.log('   You can now test the frontend UI with the unlock modals.');
}

testEndpoints().catch(console.error);