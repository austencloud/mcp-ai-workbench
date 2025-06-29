/**
 * Test script for Web Browsing functionality
 * Tests the JSON-RPC endpoints for web search and content fetching
 */

const axios = require("axios");

const API_URL = "http://localhost:8080/rpc";

async function testWebBrowsing() {
  console.log("🧪 Testing Web Browsing Functionality...\n");

  try {
    // Test 1: Web Search with kinetic alphabet query
    console.log("1️⃣ Testing Web Search with kinetic alphabet query...");
    const searchResponse = await axios.post(API_URL, {
      jsonrpc: "2.0",
      method: "webSearch",
      params: {
        query: "who invented the kinetic alphabet",
        maxResults: 5,
      },
      id: 1,
    });

    if (searchResponse.data.result?.success) {
      console.log("✅ Web Search successful!");
      console.log(
        `   Found ${searchResponse.data.result.results?.length || 0} results`
      );
      if (searchResponse.data.result.results?.length > 0) {
        console.log(
          `   First result: ${searchResponse.data.result.results[0].title}`
        );
        console.log(
          `   First snippet: ${searchResponse.data.result.results[0].snippet}`
        );
      }
      if (searchResponse.data.result.analysis) {
        console.log(
          `   Analysis: ${searchResponse.data.result.analysis.substring(
            0,
            200
          )}...`
        );
      }
    } else {
      console.log("❌ Web Search failed:", searchResponse.data.result?.error);
    }

    // Test 2: Direct chat with kinetic alphabet query
    console.log("\n2️⃣ Testing Chat with kinetic alphabet query...");
    const chatResponse = await axios.post(API_URL, {
      jsonrpc: "2.0",
      method: "chat",
      params: {
        messages: [
          { role: "user", content: "Who invented the kinetic alphabet?" },
        ],
        enableWebSearch: true,
      },
      id: 2,
    });

    if (chatResponse.data.result?.success) {
      console.log("✅ Chat successful!");
      console.log(
        `   Web search used: ${chatResponse.data.result.webSearchUsed}`
      );
      console.log(
        `   Response: ${chatResponse.data.result.message.content.substring(
          0,
          300
        )}...`
      );
    } else {
      console.log("❌ Chat failed:", chatResponse.data.result?.error);
    }

    // Test 3: Web Fetch (fetch a simple webpage)
    console.log("\n3️⃣ Testing Web Fetch...");
    const fetchResponse = await axios.post(API_URL, {
      jsonrpc: "2.0",
      method: "webFetch",
      params: {
        url: "https://httpbin.org/html",
        generateSummary: true,
      },
      id: 3,
    });

    if (fetchResponse.data.result?.success) {
      console.log("✅ Web Fetch successful!");
      console.log(`   Page title: ${fetchResponse.data.result.content?.title}`);
      console.log(
        `   Word count: ${fetchResponse.data.result.content?.wordCount}`
      );
    } else {
      console.log("❌ Web Fetch failed:", fetchResponse.data.result?.error);
    }

    console.log("\n🎉 Web Browsing functionality test completed!");
  } catch (error) {
    console.error("❌ Test failed with error:", error.message);
    if (error.response?.data) {
      console.error(
        "   Response data:",
        JSON.stringify(error.response.data, null, 2)
      );
    }
    if (error.response?.status) {
      console.error("   HTTP Status:", error.response.status);
    }
    console.error("   Full error:", error);
  }
}

// Run the test
testWebBrowsing();
