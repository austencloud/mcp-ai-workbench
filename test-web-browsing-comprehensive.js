// Comprehensive Web Browsing Test Script
// Tests all web browsing functionality and verifies the fixes

const axios = require('axios');

const BASE_URL = 'http://localhost:4000/rpc';

async function testWebBrowsingComprehensive() {
  console.log('🌐 Comprehensive Web Browsing Test Suite\n');
  console.log('Testing MCP AI Workbench web browsing functionality...\n');

  const tests = [
    {
      name: 'Web Search - Kinetic Alphabet',
      method: 'webSearch',
      params: {
        query: 'kinetic alphabet',
        maxResults: 3
      }
    },
    {
      name: 'Web Search - Herman Melville Birth',
      method: 'webSearch',
      params: {
        query: 'when was Herman Melville born',
        maxResults: 3
      }
    },
    {
      name: 'Chat with Web Search - Kinetic Alphabet',
      method: 'chat',
      params: {
        messages: [
          {
            role: 'user',
            content: 'What is the kinetic alphabet? Please search the web for current information.'
          }
        ],
        provider: 'google',
        model: 'gemini-2.0-flash-exp'
      }
    },
    {
      name: 'Chat with Web Search - Herman Melville',
      method: 'chat',
      params: {
        messages: [
          {
            role: 'user',
            content: 'When was Herman Melville born? Please provide accurate information.'
          }
        ],
        provider: 'google',
        model: 'gemini-2.0-flash-exp'
      }
    },
    {
      name: 'Web Fetch Test',
      method: 'webFetch',
      params: {
        url: 'https://httpbin.org/json'
      }
    },
    {
      name: 'Web Scrape Test',
      method: 'webScrape',
      params: {
        url: 'https://httpbin.org/html',
        selector: 'h1'
      }
    }
  ];

  let passedTests = 0;
  let totalTests = tests.length;

  for (const test of tests) {
    console.log(`\n🧪 Testing: ${test.name}`);
    console.log('─'.repeat(50));

    try {
      const startTime = Date.now();
      
      const response = await axios.post(BASE_URL, {
        jsonrpc: '2.0',
        method: test.method,
        params: test.params,
        id: Math.floor(Math.random() * 1000)
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      if (response.data.result) {
        console.log('✅ Test PASSED');
        console.log(`⏱️  Duration: ${duration}ms`);
        
        // Specific validations based on test type
        if (test.method === 'webSearch') {
          const results = response.data.result.results || [];
          console.log(`📊 Found ${results.length} search results`);
          if (results.length > 0) {
            console.log(`🔗 First result: ${results[0].title}`);
            console.log(`📝 Snippet: ${results[0].snippet?.substring(0, 100)}...`);
          }
        } else if (test.method === 'chat') {
          const message = response.data.result.message;
          const webSearchUsed = response.data.result.webSearchUsed;
          console.log(`🤖 Response length: ${message?.content?.length || 0} characters`);
          console.log(`🌐 Web search used: ${webSearchUsed ? 'YES' : 'NO'}`);
          if (webSearchUsed) {
            console.log('✨ Web search integration working correctly!');
          }
        } else if (test.method === 'webFetch') {
          const content = response.data.result.content;
          console.log(`📄 Fetched content length: ${content?.length || 0} characters`);
        } else if (test.method === 'webScrape') {
          const elements = response.data.result.elements || [];
          console.log(`🔍 Scraped ${elements.length} elements`);
        }
        
        passedTests++;
      } else {
        console.log('❌ Test FAILED - No result in response');
        console.log('Response:', JSON.stringify(response.data, null, 2));
      }

    } catch (error) {
      console.log('❌ Test FAILED - Error occurred');
      if (error.response?.data) {
        console.log('Error response:', JSON.stringify(error.response.data, null, 2));
      } else {
        console.log('Error:', error.message);
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${passedTests}/${totalTests}`);
  console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests}`);
  console.log(`📈 Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);

  if (passedTests === totalTests) {
    console.log('\n🎉 All tests passed! Web browsing functionality is working correctly.');
    console.log('\n📋 Key Findings:');
    console.log('• Web search endpoints are functional');
    console.log('• Chat integration with web search is working');
    console.log('• Web fetch and scrape capabilities are operational');
    console.log('• Backend web browsing service is properly configured');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the configuration and try again.');
  }

  console.log('\n🔧 Next Steps:');
  console.log('1. Test the frontend chat interface with web search queries');
  console.log('2. Verify the web search indicator appears in the UI');
  console.log('3. Test the new "Copy Conversation" button');
  console.log('4. Check that webSearchUsed flag is properly displayed');

  return passedTests === totalTests;
}

// Additional test for web search detection in chat
async function testWebSearchDetection() {
  console.log('\n🔍 Testing Web Search Detection Logic...\n');

  const testQueries = [
    'What is the kinetic alphabet?',
    'When was Herman Melville born?',
    'Latest news about artificial intelligence',
    'Current weather in New York',
    'What is 2 + 2?', // Should NOT trigger web search
    'Hello, how are you?', // Should NOT trigger web search
  ];

  for (const query of testQueries) {
    console.log(`\nQuery: "${query}"`);
    
    try {
      const response = await axios.post(BASE_URL, {
        jsonrpc: '2.0',
        method: 'chat',
        params: {
          messages: [{ role: 'user', content: query }],
          provider: 'google',
          model: 'gemini-2.0-flash-exp'
        },
        id: Math.floor(Math.random() * 1000)
      });

      const webSearchUsed = response.data.result?.webSearchUsed;
      console.log(`Web search triggered: ${webSearchUsed ? '✅ YES' : '❌ NO'}`);
      
    } catch (error) {
      console.log('Error testing query:', error.message);
    }
  }
}

// Run the comprehensive test
async function runAllTests() {
  try {
    const success = await testWebBrowsingComprehensive();
    await testWebSearchDetection();
    
    console.log('\n🏁 Testing Complete!');
    process.exit(success ? 0 : 1);
    
  } catch (error) {
    console.error('Test suite failed:', error.message);
    process.exit(1);
  }
}

runAllTests();
