// Test script for memory functionality
const fetch = require("node-fetch");

const API_URL = "http://localhost:4000/rpc";

async function callAPI(method, params = {}) {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method,
        params,
        id: Math.random().toString(36).substr(2, 9),
      }),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error(`Error calling ${method}:`, error);
    return { error: error.message };
  }
}

async function testMemoryFunctionality() {
  console.log("🧠 Testing Memory Functionality");
  console.log("================================\n");

  // Test 1: Remember a fact
  console.log("1. Testing remember functionality...");
  const rememberResult = await callAPI("remember", {
    input: "The user prefers TypeScript over JavaScript for better type safety",
    context: {
      userId: "test-user",
      timestamp: new Date(),
      relevantEntities: [],
    },
    type: "fact",
    importance: 0.8,
  });

  if (rememberResult.result?.success) {
    console.log(
      "✅ Memory stored successfully:",
      rememberResult.result.memoryId
    );
  } else {
    console.log(
      "❌ Failed to store memory:",
      rememberResult.error || rememberResult.result?.error
    );
  }

  // Test 2: Search memories
  console.log("\n2. Testing search functionality...");
  const searchResult = await callAPI("searchMemories", {
    query: "TypeScript",
    userId: "test-user",
    maxResults: 5,
  });

  if (searchResult.result?.success) {
    const results = searchResult.result.data?.results || [];
    console.log(`✅ Found ${results.length} memories matching "TypeScript"`);
    results.forEach((result, index) => {
      console.log(
        `   ${index + 1}. [${
          result.memory.type
        }] ${result.memory.content.substring(0, 80)}...`
      );
    });
  } else {
    console.log(
      "❌ Failed to search memories:",
      searchResult.error || searchResult.result?.error
    );
  }

  // Test 3: Record an episode
  console.log("\n3. Testing episodic memory...");
  const episodeResult = await callAPI("recordEpisode", {
    event: "User asked about memory implementation",
    outcome: "Successfully implemented comprehensive memory system",
    success: true,
    participants: ["test-user", "ai-assistant"],
    emotions: ["satisfaction", "accomplishment"],
    context: {
      userId: "test-user",
      timestamp: new Date(),
      relevantEntities: [],
    },
  });

  if (episodeResult.result?.success) {
    console.log(
      "✅ Episode recorded successfully:",
      episodeResult.result.memoryId
    );
  } else {
    console.log(
      "❌ Failed to record episode:",
      episodeResult.error || episodeResult.result?.error
    );
  }

  // Test 4: Add a concept
  console.log("\n4. Testing semantic memory...");
  const conceptResult = await callAPI("addConcept", {
    concept: "Memory System",
    description:
      "A comprehensive AI memory system with episodic, semantic, and user memory components",
  });

  if (conceptResult.result?.success) {
    console.log(
      "✅ Concept added successfully:",
      conceptResult.result.memoryId
    );
  } else {
    console.log(
      "❌ Failed to add concept:",
      conceptResult.error || conceptResult.result?.error
    );
  }

  // Test 5: Get user insights
  console.log("\n5. Testing user memory...");
  const insightsResult = await callAPI("getUserInsights", {
    userId: "test-user",
  });

  if (insightsResult.result?.success) {
    const insights = insightsResult.result.data?.insights || [];
    console.log(`✅ Generated ${insights.length} user insights`);
    insights.forEach((insight, index) => {
      console.log(`   ${index + 1}. ${insight}`);
    });
  } else {
    console.log(
      "❌ Failed to get user insights:",
      insightsResult.error || insightsResult.result?.error
    );
  }

  // Test 6: Get memory stats
  console.log("\n6. Testing memory statistics...");
  const statsResult = await callAPI("getMemoryStats", {
    userId: "test-user",
  });

  if (statsResult.result?.success) {
    const stats = statsResult.result.data?.stats;
    console.log("✅ Memory statistics retrieved:");
    console.log(`   Total memories: ${stats?.totalMemories || 0}`);
    console.log(
      `   System health: ${stats?.systemHealth?.status || "unknown"}`
    );
  } else {
    console.log(
      "❌ Failed to get memory stats:",
      statsResult.error || statsResult.result?.error
    );
  }

  console.log("\n🎉 Memory functionality test completed!");
}

// Run the test
testMemoryFunctionality().catch(console.error);
