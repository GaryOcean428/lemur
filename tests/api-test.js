// Simple API test utility to test our backend endpoints
import fetch from 'node-fetch';

// Base URL for the API
const BASE_URL = 'http://localhost:5000';

// Test search history API (database functionality)
async function testSearchHistory() {
  try {
    console.log('Testing search history API...');
    
    // First, let's create a test search history record
    console.log('Creating test search history record...');
    const testRecord = {
      query: "test database query " + Date.now(),
      userId: null // anonymous search
    };
    
    const createResponse = await fetch(`${BASE_URL}/api/search-history`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testRecord)
    });
    
    if (!createResponse.ok) {
      throw new Error(`Failed to create test record: ${createResponse.status} ${createResponse.statusText}`);
    }
    
    const createResult = await createResponse.json();
    console.log('Created test record:', createResult);
    
    // Now retrieve search history
    const getResponse = await fetch(`${BASE_URL}/api/search-history`);
    
    if (!getResponse.ok) {
      throw new Error(`Search history API error: ${getResponse.status} ${getResponse.statusText}`);
    }
    
    const data = await getResponse.json();
    console.log('Search history API success!');
    console.log('Search history response:', JSON.stringify(data));
    
    return true;
  } catch (error) {
    console.error('Test failed:', error.message);
    return false;
  }
}

// Test search functionality
async function testSearch() {
  try {
    console.log('Testing search API...');
    const response = await fetch(`${BASE_URL}/api/search?q=quantum+computing`);
    
    if (!response.ok) {
      throw new Error(`Search API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Search API success!');
    console.log('AI Answer model:', data.ai.model);
    console.log('Traditional results count:', data.traditional.length);
    
    return true;
  } catch (error) {
    console.error('Test failed:', error.message);
    return false;
  }
}

// Run tests
async function runTests() {
  // Test search history endpoint (database functionality)
  const historyTestSuccess = await testSearchHistory();
  
  // Only test search if you want to (requires working API keys)
  // const searchTestSuccess = await testSearch();
  
  if (historyTestSuccess) {
    console.log('\nAll database tests passed!');
    return true;
  } else {
    console.log('\nTests failed!');
    return false;
  }
}

runTests().then(success => {
  if (!success) {
    process.exit(1);
  }
});
