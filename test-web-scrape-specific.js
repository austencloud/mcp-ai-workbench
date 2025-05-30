// Specific Web Scraping Test
// Tests the new webScrape functionality with various scenarios

const axios = require('axios');

const BASE_URL = 'http://localhost:4000/rpc';

async function testWebScrapeSpecific() {
  console.log('🕷️ Testing Web Scrape Functionality\n');

  const tests = [
    {
      name: 'Scrape H1 elements from example.com',
      params: {
        url: 'https://example.com',
        selector: 'h1'
      }
    },
    {
      name: 'Scrape all text content from example.com',
      params: {
        url: 'https://example.com',
        extractType: 'text'
      }
    },
    {
      name: 'Scrape all links from example.com',
      params: {
        url: 'https://example.com',
        extractType: 'links'
      }
    },
    {
      name: 'Scrape paragraph elements from example.com',
      params: {
        url: 'https://example.com',
        selector: 'p'
      }
    },
    {
      name: 'Scrape full page summary (default)',
      params: {
        url: 'https://example.com'
      }
    }
  ];

  let passedTests = 0;

  for (const test of tests) {
    console.log(`\n🧪 ${test.name}`);
    console.log('─'.repeat(50));

    try {
      const response = await axios.post(BASE_URL, {
        jsonrpc: '2.0',
        method: 'webScrape',
        params: test.params,
        id: Math.floor(Math.random() * 1000)
      });

      if (response.data.result && response.data.result.success) {
        console.log('✅ Test PASSED');
        
        const result = response.data.result;
        
        if (result.elements) {
          console.log(`📊 Found ${result.elements.length} elements`);
          if (result.elements.length > 0) {
            console.log(`📝 First element: ${JSON.stringify(result.elements[0], null, 2).substring(0, 200)}...`);
          }
        }
        
        if (result.content) {
          console.log(`📄 Content length: ${result.content.length} characters`);
          console.log(`📝 Content preview: ${result.content.substring(0, 100)}...`);
        }
        
        passedTests++;
      } else {
        console.log('❌ Test FAILED');
        console.log('Error:', response.data.result?.error || 'Unknown error');
      }

    } catch (error) {
      console.log('❌ Test FAILED - Exception occurred');
      console.log('Error:', error.message);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 WEB SCRAPE TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${passedTests}/${tests.length}`);
  console.log(`❌ Failed: ${tests.length - passedTests}/${tests.length}`);
  console.log(`📈 Success Rate: ${Math.round((passedTests / tests.length) * 100)}%`);

  if (passedTests === tests.length) {
    console.log('\n🎉 All web scraping tests passed!');
    console.log('\n✨ Web Scrape Features Working:');
    console.log('• CSS selector-based element extraction');
    console.log('• Full text content extraction');
    console.log('• Link extraction');
    console.log('• HTML content extraction');
    console.log('• Default page summary with metadata');
  } else {
    console.log('\n⚠️  Some web scraping tests failed.');
  }

  return passedTests === tests.length;
}

// Run the test
testWebScrapeSpecific()
  .then(success => {
    console.log('\n🏁 Web scrape testing complete!');
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test suite failed:', error.message);
    process.exit(1);
  });
