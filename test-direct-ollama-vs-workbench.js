#!/usr/bin/env node

/**
 * Direct comparison between Ollama API and MCP AI Workbench
 * to identify performance bottlenecks
 */

import axios from "axios";

const OLLAMA_API = "http://localhost:11434/api/chat";
const WORKBENCH_API = "http://localhost:4000/rpc";

const TEST_QUERY = "What is 2 + 2?";
const MODEL = "llama3:latest";

async function testDirectOllama() {
  console.log("🔥 Testing Direct Ollama API...");
  const startTime = performance.now();
  
  try {
    const response = await axios.post(OLLAMA_API, {
      model: MODEL,
      messages: [{ role: "user", content: TEST_QUERY }],
      stream: false,
    }, {
      timeout: 30000,
    });

    const duration = performance.now() - startTime;
    
    if (response.data.message) {
      console.log(`✅ Direct Ollama: ${duration.toFixed(2)}ms`);
      console.log(`📊 Response: "${response.data.message.content}"`);
      
      if (response.data.total_duration) {
        const totalMs = response.data.total_duration / 1000000; // Convert nanoseconds to ms
        const loadMs = response.data.load_duration ? response.data.load_duration / 1000000 : 0;
        const inferenceMs = totalMs - loadMs;
        
        console.log(`⚡ Ollama metrics:`);
        console.log(`   - Total: ${totalMs.toFixed(2)}ms`);
        console.log(`   - Load: ${loadMs.toFixed(2)}ms`);
        console.log(`   - Inference: ${inferenceMs.toFixed(2)}ms`);
      }
      
      return { success: true, duration, response: response.data };
    } else {
      throw new Error("No response message");
    }
  } catch (error) {
    const duration = performance.now() - startTime;
    console.log(`❌ Direct Ollama failed: ${duration.toFixed(2)}ms - ${error.message}`);
    return { success: false, duration, error: error.message };
  }
}

async function testWorkbenchOllama() {
  console.log("\n🏢 Testing MCP AI Workbench...");
  const startTime = performance.now();
  
  try {
    const response = await axios.post(WORKBENCH_API, {
      jsonrpc: "2.0",
      method: "chat",
      params: {
        messages: [{ role: "user", content: TEST_QUERY }],
        provider: "ollama",
        model: MODEL,
      },
      id: Date.now(),
    }, {
      timeout: 30000,
    });

    const duration = performance.now() - startTime;
    
    if (response.data.result && response.data.result.success) {
      console.log(`✅ Workbench: ${duration.toFixed(2)}ms`);
      console.log(`📊 Response: "${response.data.result.message.content}"`);
      
      if (response.data.result.usage) {
        const usage = response.data.result.usage;
        console.log(`⚡ Workbench metrics:`);
        if (usage.totalTime) console.log(`   - Total: ${usage.totalTime.toFixed(2)}ms`);
        if (usage.modelLoadTime) console.log(`   - Model load: ${usage.modelLoadTime.toFixed(2)}ms`);
        if (usage.requestTime) console.log(`   - Request: ${usage.requestTime.toFixed(2)}ms`);
      }
      
      return { success: true, duration, response: response.data.result };
    } else {
      throw new Error(response.data.error?.message || "Request failed");
    }
  } catch (error) {
    const duration = performance.now() - startTime;
    console.log(`❌ Workbench failed: ${duration.toFixed(2)}ms - ${error.message}`);
    return { success: false, duration, error: error.message };
  }
}

async function testWorkbenchWithoutMemory() {
  console.log("\n🏢 Testing MCP AI Workbench (minimal request)...");
  const startTime = performance.now();
  
  try {
    const response = await axios.post(WORKBENCH_API, {
      jsonrpc: "2.0",
      method: "chat",
      params: {
        messages: [{ role: "user", content: TEST_QUERY }],
        provider: "ollama",
        model: MODEL,
        enableWebSearch: false, // Disable web search
      },
      id: Date.now(),
    }, {
      timeout: 30000,
    });

    const duration = performance.now() - startTime;
    
    if (response.data.result && response.data.result.success) {
      console.log(`✅ Workbench (minimal): ${duration.toFixed(2)}ms`);
      console.log(`📊 Response: "${response.data.result.message.content}"`);
      return { success: true, duration, response: response.data.result };
    } else {
      throw new Error(response.data.error?.message || "Request failed");
    }
  } catch (error) {
    const duration = performance.now() - startTime;
    console.log(`❌ Workbench (minimal) failed: ${duration.toFixed(2)}ms - ${error.message}`);
    return { success: false, duration, error: error.message };
  }
}

async function runComparison() {
  console.log("🚀 Direct Ollama vs MCP AI Workbench Performance Comparison");
  console.log("=" * 70);
  
  // Test 1: Direct Ollama API
  const directResult = await testDirectOllama();
  
  // Small delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test 2: Workbench with all features
  const workbenchResult = await testWorkbenchOllama();
  
  // Small delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test 3: Workbench minimal
  const workbenchMinimalResult = await testWorkbenchWithoutMemory();
  
  // Analysis
  console.log("\n📊 PERFORMANCE ANALYSIS");
  console.log("=" * 70);
  
  if (directResult.success && workbenchResult.success) {
    const overhead = workbenchResult.duration - directResult.duration;
    const overheadPercent = (overhead / directResult.duration) * 100;
    
    console.log(`Direct Ollama: ${directResult.duration.toFixed(2)}ms`);
    console.log(`Workbench Full: ${workbenchResult.duration.toFixed(2)}ms`);
    if (workbenchMinimalResult.success) {
      console.log(`Workbench Minimal: ${workbenchMinimalResult.duration.toFixed(2)}ms`);
    }
    
    console.log(`\n🔍 Analysis:`);
    console.log(`   Workbench overhead: +${overhead.toFixed(2)}ms (+${overheadPercent.toFixed(1)}%)`);
    
    if (workbenchMinimalResult.success) {
      const minimalOverhead = workbenchMinimalResult.duration - directResult.duration;
      const featureOverhead = workbenchResult.duration - workbenchMinimalResult.duration;
      console.log(`   Minimal overhead: +${minimalOverhead.toFixed(2)}ms`);
      console.log(`   Feature overhead: +${featureOverhead.toFixed(2)}ms`);
    }
    
    if (overhead > 1000) {
      console.log(`\n⚠️ HIGH OVERHEAD DETECTED (>${overhead.toFixed(0)}ms)`);
      console.log(`   Possible causes:`);
      console.log(`   - Memory operations blocking request`);
      console.log(`   - Web search detection overhead`);
      console.log(`   - Database operations in request path`);
      console.log(`   - Multiple model loading attempts`);
    } else if (overhead > 500) {
      console.log(`\n⚠️ MODERATE OVERHEAD (${overhead.toFixed(0)}ms)`);
      console.log(`   Consider further optimization`);
    } else {
      console.log(`\n✅ ACCEPTABLE OVERHEAD (${overhead.toFixed(0)}ms)`);
    }
  }
  
  console.log(`\n✅ Comparison completed!`);
}

// Run the comparison
runComparison().catch(error => {
  console.error("❌ Comparison failed:", error);
  process.exit(1);
});
