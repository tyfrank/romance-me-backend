const fetch = require('node-fetch');

const testChapterEndpoint = async () => {
  console.log('🔍 Testing chapter endpoint directly...');
  
  // First login to get a token
  console.log('1. Logging in...');
  const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'test@example.com',
      password: 'testpass123'
    })
  });
  
  const loginData = await loginResponse.json();
  console.log('Login status:', loginResponse.status);
  
  if (!loginResponse.ok) {
    console.log('Login failed:', loginData);
    return;
  }
  
  console.log('✅ Login successful');
  const token = loginData.token;
  
  // Now test chapter endpoint
  console.log('2. Testing chapter endpoint...');
  const bookId = 'ab07d040-8447-4910-8f0b-03843ff5730e';
  const chapterNumber = 1;
  
  const chapterResponse = await fetch(`http://localhost:3001/api/books/${bookId}/chapters/${chapterNumber}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  console.log('Chapter endpoint status:', chapterResponse.status);
  
  if (chapterResponse.ok) {
    const chapterData = await chapterResponse.json();
    console.log('✅ SUCCESS! Chapter data received:');
    console.log('   Title:', chapterData.chapter?.title);
    console.log('   Has content:', chapterData.chapter?.content ? 'Yes' : 'No');
    console.log('   Content type:', typeof chapterData.chapter?.content);
  } else {
    const errorData = await chapterResponse.json();
    console.log('❌ Chapter endpoint failed:', errorData);
  }
};

testChapterEndpoint().catch(console.error);