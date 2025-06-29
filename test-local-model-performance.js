#!/usr/bin/env node

/**
 * Performance Test Script for Local Model Optimization
 * Tests response times for Ollama models vs external APIs
 */

import axios from "axios";

const API_BASE = "http://localhost:4000/rpc";

// Test configurations
const TEST_CONFIGS = [
  {
    name: "Ollama Local Model",
    provider: "ollama",
    model: "llama3.2:latest",
    expectedTime: 1000, // Target: <1 second
  },
  {
    name: "Gemini External API",
    provider: "google",
    model: "gemini-2.0-flash-exp",
    expectedTime: 2000, // Baseline comparison
  },
];

const TEST_QUERIES = [
  "What is 2 + 2?",
  "Explain what TypeScript is in one sentence.",
  "List 3 benefits of using Git.",
  "What is the capital of France?",
  "How do you declare a variable in JavaScript?",
];

async function makeRPCCall(method, params = {}) {
  const startTime = performance.now();

  try {
    const response = await axios.post(
      API_BASE,
      {
        jsonrpc: "2.0",
        method,
        params,
        id: Date.now(),
      },
      {
        timeout: 30000, // 30 second timeout
      }
    );

    const duration = performance.now() - startTime;

    if (response.data.error) {
      throw new Error(response.data.error.message || "RPC Error");
    }

    return {
      result: response.data.result,
      duration,
      success: true,
    };
  } catch (error) {
    const duration = performance.now() - startTime;
    return {
      result: null,
      duration,
      success: false,
      error: error.message,
    };
  }
}

async function testChatPerformance(config, query) {
  console.log(`\n🧪 Testing: ${config.name} with query: "${query}"`);

  const testResult = await makeRPCCall("chat", {
    messages: [{ role: "user", content: query }],
    provider: config.provider,
    model: config.model,
  });

  const status = testResult.success ? "✅ SUCCESS" : "❌ FAILED";
  const timeStatus =
    testResult.duration <= config.expectedTime ? "🚀 FAST" : "⚠️ SLOW";

  console.log(
    `   ${status} ${timeStatus} - ${testResult.duration.toFixed(2)}ms`
  );

  if (testResult.success) {
    const responseLength = testResult.result.message?.content?.length || 0;
    console.log(`   📊 Response length: ${responseLength} characters`);

    // Check for performance metrics in response
    if (testResult.result.usage) {
      const usage = testResult.result.usage;
      console.log(`   ⚡ Performance metrics:`);
      if (usage.totalTime)
        console.log(`      - Total time: ${usage.totalTime.toFixed(2)}ms`);
      if (usage.modelLoadTime)
        console.log(`      - Model load: ${usage.modelLoadTime.toFixed(2)}ms`);
      if (usage.requestTime)
        console.log(`      - Request time: ${usage.requestTime.toFixed(2)}ms`);
    }
  } else {
    console.log(`   ❌ Error: ${testResult.error}`);
  }

  return testResult;
}

async function checkOllamaStatus() {
  console.log("🔍 Checking Ollama status...");

  try {
    const response = await axios.get("http://localhost:11434/api/tags", {
      timeout: 5000,
    });

    console.log("✅ Ollama is running");
    console.log(
      `📋 Available models: ${response.data.models
        .map((m) => m.name)
        .join(", ")}`
    );
    return true;
  } catch (error) {
    console.log("❌ Ollama is not accessible on localhost:11434");
    console.log("💡 Make sure Ollama is installed and running");
    console.log("   Download from: https://ollama.ai");
    console.log("   Then run: ollama pull llama3.2:latest");
    return false;
  }
}

async function checkBackendStatus() {
  console.log("🔍 Checking MCP AI Workbench backend...");

  try {
    const response = await makeRPCCall("getAvailableProviders");
    if (response.success) {
      console.log("✅ Backend is running");
      const providers = response.result.providers || [];
      console.log(
        `📋 Available providers: ${providers.map((p) => p.name).join(", ")}`
      );
      return true;
    } else {
      console.log("❌ Backend responded with error");
      return false;
    }
  } catch (error) {
    console.log("❌ Backend is not accessible on localhost:4000");
    console.log("💡 Start the backend with: npm start");
    return false;
  }
}

async function runPerformanceTests() {
  console.log("🚀 Starting Local Model Performance Tests");
  console.log("=" * 60);

  // Check prerequisites
  const ollamaOk = await checkOllamaStatus();
  const backendOk = await checkBackendStatus();

  if (!backendOk) {
    console.log(
      "\n❌ Cannot run tests without backend. Please start the MCP AI Workbench."
    );
    return;
  }

  if (!ollamaOk) {
    console.log("\n⚠️ Ollama not available. Will only test external APIs.");
  }

  const results = {};

  // Run tests for each configuration
  for (const config of TEST_CONFIGS) {
    if (config.provider === "ollama" && !ollamaOk) {
      console.log(`\n⏭️ Skipping ${config.name} (Ollama not available)`);
      continue;
    }

    console.log(`\n🧪 Testing ${config.name}`);
    console.log("-" * 40);

    const configResults = [];

    for (const query of TEST_QUERIES) {
      const result = await testChatPerformance(config, query);
      configResults.push(result);

      // Small delay between requests
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    results[config.name] = configResults;
  }

  // Generate performance report
  console.log("\n📊 PERFORMANCE REPORT");
  console.log("=" * 60);

  for (const [configName, configResults] of Object.entries(results)) {
    const successfulTests = configResults.filter((r) => r.success);
    const failedTests = configResults.filter((r) => !r.success);

    if (successfulTests.length === 0) {
      console.log(`\n❌ ${configName}: All tests failed`);
      continue;
    }

    const avgTime =
      successfulTests.reduce((sum, r) => sum + r.duration, 0) /
      successfulTests.length;
    const minTime = Math.min(...successfulTests.map((r) => r.duration));
    const maxTime = Math.max(...successfulTests.map((r) => r.duration));

    const config = TEST_CONFIGS.find((c) => c.name === configName);
    const performanceRating =
      avgTime <= config.expectedTime
        ? "🚀 EXCELLENT"
        : avgTime <= config.expectedTime * 1.5
        ? "✅ GOOD"
        : avgTime <= config.expectedTime * 2
        ? "⚠️ SLOW"
        : "❌ POOR";

    console.log(`\n${configName}:`);
    console.log(
      `  Success rate: ${successfulTests.length}/${configResults.length} (${(
        (successfulTests.length / configResults.length) *
        100
      ).toFixed(1)}%)`
    );
    console.log(`  Average time: ${avgTime.toFixed(2)}ms ${performanceRating}`);
    console.log(`  Min time: ${minTime.toFixed(2)}ms`);
    console.log(`  Max time: ${maxTime.toFixed(2)}ms`);
    console.log(`  Target time: ${config.expectedTime}ms`);

    if (failedTests.length > 0) {
      console.log(`  Failed tests: ${failedTests.length}`);
    }
  }

  // Performance comparison
  if (results["Ollama Local Model"] && results["Gemini External API"]) {
    const ollamaAvg =
      results["Ollama Local Model"]
        .filter((r) => r.success)
        .reduce((sum, r) => sum + r.duration, 0) /
      results["Ollama Local Model"].filter((r) => r.success).length;

    const geminiAvg =
      results["Gemini External API"]
        .filter((r) => r.success)
        .reduce((sum, r) => sum + r.duration, 0) /
      results["Gemini External API"].filter((r) => r.success).length;

    const speedRatio = geminiAvg / ollamaAvg;

    console.log(`\n🏁 COMPARISON:`);
    if (speedRatio > 1) {
      console.log(`   Ollama is ${speedRatio.toFixed(1)}x faster than Gemini`);
    } else {
      console.log(
        `   Gemini is ${(1 / speedRatio).toFixed(1)}x faster than Ollama`
      );
    }
  }

  console.log(`\n✅ Performance testing completed!`);
}

// Run the tests
runPerformanceTests().catch((error) => {
  console.error("❌ Test execution failed:", error);
  process.exit(1);
});
