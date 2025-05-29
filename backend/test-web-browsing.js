/**
 * Test script for Web Browsing functionality
 * Tests the JSON-RPC endpoints for web search and content fetching
 */

const axios = require('axios');

const API_URL = 'http://localhost:4000/rpc';

async function testWebBrowsing() {
  console.log('🧪 Testing Web Browsing Functionality...\n');

  try {
    // Test 1: Web Search
    console.log('1️⃣ Testing Web Search...');
    const searchResponse = await axios.post(API_URL, {
      jsonrpc: '2.0',
      method: 'webSearch',
      params: {
        query: 'artificial intelligence latest news',
        maxResults: 3
      },
      id: 1
    });

    if (searchResponse.data.result?.success) {
      console.log('✅ Web Search successful!');
      console.log(`   Found ${searchResponse.data.result.results?.length || 0} results`);
      if (searchResponse.data.result.results?.length > 0) {
        console.log(`   First result: ${searchResponse.data.result.results[0].title}`);
      }
    } else {
      console.log('❌ Web Search failed:', searchResponse.data.result?.error);
    }

    // Test 2: Web Fetch (fetch a simple webpage)
    console.log('\n2️⃣ Testing Web Fetch...');
    const fetchResponse = await axios.post(API_URL, {
      jsonrpc: '2.0',
      method: 'webFetch',
      params: {
        url: 'https://httpbin.org/html',
        generateSummary: true
      },
      id: 2
    });

    if (fetchResponse.data.result?.success) {
      console.log('✅ Web Fetch successful!');
      console.log(`   Page title: ${fetchResponse.data.result.content?.title}`);
      console.log(`   Word count: ${fetchResponse.data.result.content?.wordCount}`);
    } else {
      console.log('❌ Web Fetch failed:', fetchResponse.data.result?.error);
    }

    // Test 3: Web Browse (create a session)
    console.log('\n3️⃣ Testing Web Browse Session...');
    const browseResponse = await axios.post(API_URL, {
      jsonrpc: '2.0',
      method: 'webBrowse',
      params: {
        url: 'https://httpbin.org/html'
      },
      id: 3
    });

    if (browseResponse.data.result?.success) {
      console.log('✅ Web Browse successful!');
      console.log(`   Session ID: ${browseResponse.data.result.sessionId}`);
      console.log(`   Current URL: ${browseResponse.data.result.currentUrl}`);
      
      // Test 4: Take Screenshot
      console.log('\n4️⃣ Testing Screenshot...');
      const screenshotResponse = await axios.post(API_URL, {
        jsonrpc: '2.0',
        method: 'webScreenshot',
        params: {
          sessionId: browseResponse.data.result.sessionId,
          options: {
            fullPage: false,
            format: 'png'
          }
        },
        id: 4
      });

      if (screenshotResponse.data.result?.success) {
        console.log('✅ Screenshot successful!');
        console.log(`   Screenshot size: ${screenshotResponse.data.result.screenshot?.length || 0} characters (base64)`);
      } else {
        console.log('❌ Screenshot failed:', screenshotResponse.data.result?.error);
      }

      // Test 5: Close Session
      console.log('\n5️⃣ Testing Session Cleanup...');
      const closeResponse = await axios.post(API_URL, {
        jsonrpc: '2.0',
        method: 'webCloseSession',
        params: {
          sessionId: browseResponse.data.result.sessionId
        },
        id: 5
      });

      if (closeResponse.data.result?.success) {
        console.log('✅ Session closed successfully!');
      } else {
        console.log('❌ Session close failed:', closeResponse.data.result?.error);
      }
    } else {
      console.log('❌ Web Browse failed:', browseResponse.data.result?.error);
    }

    // Test 6: Web Research
    console.log('\n6️⃣ Testing Web Research...');
    const researchResponse = await axios.post(API_URL, {
      jsonrpc: '2.0',
      method: 'webResearch',
      params: {
        topic: 'machine learning trends 2024',
        depth: 'basic',
        sources: 2
      },
      id: 6
    });

    if (researchResponse.data.result?.success) {
      console.log('✅ Web Research successful!');
      console.log(`   Research length: ${researchResponse.data.result.research?.length || 0} characters`);
    } else {
      console.log('❌ Web Research failed:', researchResponse.data.result?.error);
    }

    console.log('\n🎉 Web Browsing functionality test completed!');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    if (error.response?.data) {
      console.error('   Response:', error.response.data);
    }
  }
}

// Run the test
testWebBrowsing();
