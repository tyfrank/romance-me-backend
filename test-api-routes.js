#!/usr/bin/env node

const BASE_URL = 'https://web-production-a3a99.up.railway.app';

async function testEndpoint(method, path, headers = {}) {
  try {
    const url = `${BASE_URL}${path}`;
    console.log(`\n🧪 Testing ${method} ${path}`);
    
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    });
    
    const text = await response.text();
    let data;
    
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
    
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Response: ${JSON.stringify(data, null, 2).substring(0, 200)}${JSON.stringify(data).length > 200 ? '...' : ''}`);
    
    return { status: response.status, data };
    
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return { error: error.message };
  }
}

async function runTests() {
  console.log('🚀 Testing Railway Backend API Endpoints');
  console.log('========================================');
  
  // Test basic endpoints
  await testEndpoint('GET', '/api/health');
  await testEndpoint('GET', '/api/books'); // Should require auth
  await testEndpoint('GET', '/api/books/test-id'); // Should require auth
  
  // Test chapter access endpoints (no auth required)
  await testEndpoint('GET', '/api/books/2f82226a-bd66-43a1-a3a0-c9120e780e51/chapters/1/access');
  await testEndpoint('GET', '/api/books/test-book-id/chapters/1/access');
  
  // Test actual chapter endpoint (should require auth)
  await testEndpoint('GET', '/api/books/test-book-id/chapters/1');
  
  // Test 404 endpoint
  await testEndpoint('GET', '/api/nonexistent');
  
  console.log('\n✅ API endpoint testing completed');
}

// Polyfill fetch if needed
if (typeof fetch === 'undefined') {
  console.log('Installing node-fetch...');
  try {
    const fetch = require('node-fetch');
    global.fetch = fetch;
  } catch (error) {
    console.log('node-fetch not available, trying with curl fallback');
    process.exit(1);
  }
}

runTests().catch(console.error);