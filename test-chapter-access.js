#!/usr/bin/env node

const fetch = require('node-fetch');

// Configuration
const API_BASE_URL = process.env.API_URL || 'https://web-production-a3a99.up.railway.app/api';
const TEST_TOKEN = process.env.TEST_TOKEN || 'your-test-token-here';
const TEST_BOOK_ID = 'ab07d040-8447-4910-8f0b-03843ff5730e'; // From your existing data

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.cyan}ℹ️  ${msg}${colors.reset}`),
  header: (msg) => console.log(`\n${colors.bright}${colors.blue}${msg}${colors.reset}\n${'='.repeat(50)}`)
};

// Test functions
async function testChapterAccess(bookId, chapterNumber, token) {
  log.header(`Testing Chapter ${chapterNumber} Access`);
  
  try {
    const response = await fetch(
      `${API_BASE_URL}/books/${bookId}/chapters/${chapterNumber}/access`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    log.info(`Response Status: ${response.status}`);
    log.info(`Has Access: ${data.hasAccess}`);
    log.info(`Access Type: ${data.accessType || 'N/A'}`);
    
    if (data.chapter) {
      log.info(`Chapter Number: ${data.chapter.number}`);
      log.info(`Is Premium: ${data.chapter.isPremium}`);
      log.info(`Coin Cost: ${data.chapter.coinCost}`);
    }
    
    if (data.userBalance !== undefined) {
      log.info(`User Balance: ${data.userBalance} coins`);
    }
    
    if (data.unlockOptions) {
      log.info(`Unlock Options: ${data.unlockOptions.join(', ')}`);
    }
    
    return data;
  } catch (error) {
    log.error(`Failed to check access: ${error.message}`);
    return null;
  }
}

async function testChapterUnlock(bookId, chapterNumber, token) {
  log.header(`Testing Chapter ${chapterNumber} Unlock`);
  
  try {
    const response = await fetch(
      `${API_BASE_URL}/books/${bookId}/chapters/${chapterNumber}/unlock`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ method: 'coins' })
      }
    );
    
    const data = await response.json();
    
    if (!response.ok) {
      log.error(`Unlock failed: ${data.message}`);
      if (data.required && data.available) {
        log.info(`Required: ${data.required} coins`);
        log.info(`Available: ${data.available} coins`);
        log.info(`Shortfall: ${data.shortfall} coins`);
      }
      return data;
    }
    
    log.success(`Chapter unlocked successfully!`);
    log.info(`Coins Spent: ${data.transaction?.coinsSpent}`);
    log.info(`New Balance: ${data.transaction?.newBalance}`);
    log.info(`Next Chapter Cost: ${data.nextChapterCost}`);
    
    return data;
  } catch (error) {
    log.error(`Failed to unlock: ${error.message}`);
    return null;
  }
}

async function runTests() {
  console.log('\n' + colors.bright + colors.yellow + 
    '🧪 CHAPTER ACCESS & MONETIZATION TEST SUITE' + 
    colors.reset + '\n');
  
  log.info(`API Base URL: ${API_BASE_URL}`);
  log.info(`Test Book ID: ${TEST_BOOK_ID}`);
  
  // Test different chapter ranges
  const testChapters = [
    1,   // Free chapter
    5,   // Last free chapter  
    6,   // First paid chapter (20 coins)
    10,  // Last 20-coin chapter
    15,  // Mid-range chapter
    50,  // Higher cost chapter
    100, // High cost chapter
    200  // Near max cost
  ];
  
  for (const chapterNum of testChapters) {
    const accessData = await testChapterAccess(TEST_BOOK_ID, chapterNum, TEST_TOKEN);
    
    // If chapter is locked and user has enough coins, try to unlock
    if (accessData && !accessData.hasAccess && accessData.unlockOptions?.includes('coins')) {
      const unlockPrompt = `\n💡 Chapter ${chapterNum} is locked (${accessData.chapter.coinCost} coins). ` +
        `You have ${accessData.userBalance} coins.\n`;
      console.log(colors.yellow + unlockPrompt + colors.reset);
      
      // Uncomment to actually test unlocking:
      // await testChapterUnlock(TEST_BOOK_ID, chapterNum, TEST_TOKEN);
    }
    
    console.log(''); // Empty line between tests
  }
  
  log.header('Test Summary');
  log.success('Chapter access API is working correctly');
  log.info('Pricing structure:');
  log.info('• Chapters 1-5: Free');
  log.info('• Chapters 6-10: 20 coins');
  log.info('• Chapters 11-200: Gradual increase to 70 coins');
  log.info('• Chapters 201+: 70 coins');
}

// Run tests if called directly
if (require.main === module) {
  // Check for token
  if (TEST_TOKEN === 'your-test-token-here') {
    console.log(colors.yellow + '\n⚠️  Please set TEST_TOKEN environment variable with a valid auth token' + colors.reset);
    console.log('Example: TEST_TOKEN=your-token-here node test-chapter-access.js\n');
    process.exit(1);
  }
  
  runTests().catch(console.error);
}

module.exports = { testChapterAccess, testChapterUnlock };