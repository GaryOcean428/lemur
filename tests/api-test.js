// Simple API test utility to test our backend endpoints
import fetch from 'node-fetch';

// Base URL for the API
const BASE_URL = 'http://localhost:5000';

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
    
    // Check if we can get search history (should be empty without user ID)
    console.log('\nTesting search history API...');
    const historyResponse = await fetch(`${BASE_URL}/api/search-history`);
    if (!historyResponse.ok) {
      throw new Error(`Search history API error: ${historyResponse.status} ${historyResponse.statusText}`);
    }
    const historyData = await historyResponse.json();
    console.log('Search history response:', JSON.stringify(historyData));
    
    return true;
  } catch (error) {
    console.error('Test failed:', error.message);
    return false;
  }
}

// Run tests
testSearch().then(success => {
  if (success) {
    console.log('\nAll tests passed!');
  } else {
    console.log('\nTests failed!');
    process.exit(1);
  }
});
