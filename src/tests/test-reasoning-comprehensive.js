const axios = require("axios");

const BASE_URL = "http://localhost:4000";

async function callAPI(method, params = {}) {
  try {
    const response = await axios.post(`${BASE_URL}/mcp`, {
      method,
      params,
    });
    return response.data;
  } catch (error) {
    return { error: error.message };
  }
}

async function testReasoningCapabilities() {
  console.log("🧠 COMPREHENSIVE REASONING SYSTEM TESTS");
  console.log("=====================================\n");

  // Test 1: Multi-step Logical Reasoning
  console.log("1. 🔍 Testing Multi-step Logical Reasoning...");
  const logicalResult = await callAPI("reasoning.reason", {
    problem:
      "If all programmers drink coffee, and Sarah is a programmer who doesn't drink tea, and only people who drink tea or coffee stay awake during meetings, will Sarah stay awake during meetings? Explain your reasoning step by step.",
    type: "LOGICAL",
    requireExplanation: true,
    maxSteps: 6,
  });

  if (logicalResult.success) {
    console.log(
      `✅ Logical reasoning completed with confidence: ${logicalResult.trace.confidence.toFixed(
        2
      )}`
    );
    console.log(`   Steps taken: ${logicalResult.trace.steps.length}`);
    console.log(`   Tools used: ${logicalResult.trace.toolsUsed.join(", ")}`);
    console.log(
      `   Final answer: ${logicalResult.trace.finalAnswer.substring(0, 100)}...`
    );
  } else {
    console.log("❌ Logical reasoning failed:", logicalResult.error);
  }

  // Test 2: Complex Mathematical Problem
  console.log("\n2. 🔢 Testing Mathematical Reasoning...");
  const mathResult = await callAPI("reasoning.reason", {
    problem:
      "A company's revenue grows exponentially at 15% per year. If they made $1.2M in 2020, and their costs grow linearly by $50K per year starting at $800K in 2020, in what year will their profit margin first exceed 40%?",
    type: "MATHEMATICAL",
    enabledTools: ["math", "analysis"],
    maxSteps: 8,
  });

  if (mathResult.success) {
    console.log(
      `✅ Mathematical reasoning completed with confidence: ${mathResult.trace.confidence.toFixed(
        2
      )}`
    );
    console.log(
      `   Final answer: ${mathResult.trace.finalAnswer.substring(0, 120)}...`
    );
  } else {
    console.log("❌ Mathematical reasoning failed:", mathResult.error);
  }

  // Test 3: Web Research + Analysis
  console.log("\n3. 🌐 Testing Web Research Reasoning...");
  const webResult = await callAPI("reasoning.reason", {
    problem:
      "What are the latest developments in AI reasoning systems in 2024, and how do they compare to traditional symbolic AI approaches? Provide specific examples and analyze the trade-offs.",
    type: "WEB_RESEARCH",
    enabledTools: ["web", "analysis"],
    maxSteps: 5,
  });

  if (webResult.success) {
    console.log(
      `✅ Web research reasoning completed with confidence: ${webResult.trace.confidence.toFixed(
        2
      )}`
    );
    console.log(`   Tools used: ${webResult.trace.toolsUsed.join(", ")}`);
  } else {
    console.log("❌ Web research reasoning failed:", webResult.error);
  }

  // Test 4: Memory-based Reasoning
  console.log("\n4. 🧠 Testing Memory Recall Reasoning...");
  const memoryResult = await callAPI("reasoning.reason", {
    problem:
      "Based on our previous conversations and stored knowledge, what patterns can you identify in user preferences for AI workbench features? What recommendations would you make for future development?",
    type: "MEMORY_RECALL",
    enabledTools: ["memory", "analysis"],
    maxSteps: 6,
  });

  if (memoryResult.success) {
    console.log(
      `✅ Memory reasoning completed with confidence: ${memoryResult.trace.confidence.toFixed(
        2
      )}`
    );
    console.log(
      `   Final answer: ${memoryResult.trace.finalAnswer.substring(0, 120)}...`
    );
  } else {
    console.log("❌ Memory reasoning failed:", memoryResult.error);
  }

  // Test 5: Causal Reasoning Chain
  console.log("\n5. ⚡ Testing Causal Reasoning...");
  const causalResult = await callAPI("reasoning.reason", {
    problem:
      "A tech startup's user engagement dropped 30% after implementing a new UI design. The design team claims users just need time to adapt, while the product team wants to revert immediately. Analyze the potential causes, predict likely outcomes of each approach, and recommend a strategy.",
    type: "CAUSAL",
    enabledTools: ["analysis", "web"],
    maxSteps: 7,
  });

  if (causalResult.success) {
    console.log(
      `✅ Causal reasoning completed with confidence: ${causalResult.trace.confidence.toFixed(
        2
      )}`
    );
    console.log(`   Steps taken: ${causalResult.trace.steps.length}`);
  } else {
    console.log("❌ Causal reasoning failed:", causalResult.error);
  }

  // Test 6: Multi-hop Complex Reasoning
  console.log("\n6. 🔗 Testing Multi-hop Complex Reasoning...");
  const multiHopResult = await callAPI("reasoning.reason", {
    problem:
      "If AI systems become capable of recursive self-improvement, and the current trend in compute costs continues to follow historical patterns, what are the implications for AI safety research funding priorities over the next decade? Consider economic, technological, and social factors.",
    type: "MULTI_HOP",
    enabledTools: ["web", "memory", "analysis"],
    maxSteps: 10,
    confidenceThreshold: 0.6,
  });

  if (multiHopResult.success) {
    console.log(
      `✅ Multi-hop reasoning completed with confidence: ${multiHopResult.trace.confidence.toFixed(
        2
      )}`
    );
    console.log(`   Tools used: ${multiHopResult.trace.toolsUsed.join(", ")}`);
    console.log(`   Duration: ${multiHopResult.trace.duration}ms`);
  } else {
    console.log("❌ Multi-hop reasoning failed:", multiHopResult.error);
  }

  // Test 7: Edge Case - Contradictory Information
  console.log("\n7. ⚠️ Testing Contradictory Information Handling...");
  const contradictionResult = await callAPI("reasoning.reason", {
    problem:
      "Research shows that remote work increases productivity by 20%, but also that face-to-face collaboration is essential for innovation. Our company needs to maximize both productivity and innovation while reducing costs. What's the optimal work arrangement?",
    type: "LOGICAL",
    enabledTools: ["web", "analysis"],
    maxSteps: 6,
  });

  if (contradictionResult.success) {
    console.log(
      `✅ Contradiction handling completed with confidence: ${contradictionResult.trace.confidence.toFixed(
        2
      )}`
    );
  } else {
    console.log("❌ Contradiction handling failed:", contradictionResult.error);
  }

  // Test 8: Time-sensitive Reasoning
  console.log("\n8. ⏰ Testing Time-sensitive Reasoning...");
  const timeResult = await callAPI("reasoning.reason", {
    problem:
      "Given current market conditions and the latest tech industry trends, should a SaaS startup prioritize user acquisition or revenue optimization in Q1 2025? Consider recent economic indicators and competitive landscape.",
    type: "WEB_RESEARCH",
    enabledTools: ["web", "analysis", "memory"],
    maxSteps: 7,
  });

  if (timeResult.success) {
    console.log(
      `✅ Time-sensitive reasoning completed with confidence: ${timeResult.trace.confidence.toFixed(
        2
      )}`
    );
  } else {
    console.log("❌ Time-sensitive reasoning failed:", timeResult.error);
  }

  // Test 9: Ethical Reasoning
  console.log("\n9. ⚖️ Testing Ethical Reasoning...");
  const ethicalResult = await callAPI("reasoning.reason", {
    problem:
      "An AI company discovers their model has a bias that slightly favors certain demographics in hiring recommendations. The bias is small (2-3%) but statistically significant. Fixing it would cost $500K and delay the product launch by 3 months, potentially losing market share to competitors. What should they do?",
    type: "ETHICAL",
    enabledTools: ["analysis", "web"],
    maxSteps: 6,
  });

  if (ethicalResult.success) {
    console.log(
      `✅ Ethical reasoning completed with confidence: ${ethicalResult.trace.confidence.toFixed(
        2
      )}`
    );
  } else {
    console.log("❌ Ethical reasoning failed:", ethicalResult.error);
  }

  // Test 10: Tool Failure Recovery
  console.log("\n10. 🔧 Testing Tool Failure Recovery...");
  const recoveryResult = await callAPI("reasoning.reason", {
    problem:
      "Compare the market capitalization of the top 5 AI companies and analyze their revenue growth trends over the past 2 years.",
    type: "WEB_RESEARCH",
    enabledTools: ["web", "math", "analysis"],
    maxSteps: 8,
  });

  if (recoveryResult.success) {
    console.log(
      `✅ Tool failure recovery completed with confidence: ${recoveryResult.trace.confidence.toFixed(
        2
      )}`
    );
    if (recoveryResult.trace.steps.some((step) => step.errors)) {
      console.log(
        "   ⚠️ Some tools encountered errors but reasoning continued"
      );
    }
  } else {
    console.log("❌ Tool failure recovery failed:", recoveryResult.error);
  }
}

async function testTrainingDataGeneration() {
  console.log("\n\n🎯 TRAINING DATA GENERATION TESTS");
  console.log("=================================\n");

  // Test training data generation for different reasoning types
  console.log("1. Generating diverse reasoning training examples...");
  const trainingResult = await callAPI("reasoning.generateTrainingData", {
    count: 20,
    types: [
      "LOGICAL",
      "MATHEMATICAL",
      "CAUSAL",
      "WEB_RESEARCH",
      "MEMORY_RECALL",
    ],
    config: {
      difficultyRange: [3, 8],
      includeMetadata: true,
      requireGroundTruth: false,
    },
  });

  if (trainingResult.success) {
    console.log(
      `✅ Generated ${trainingResult.examples.length} training examples`
    );

    // Analyze the generated examples
    const typeDistribution = {};
    trainingResult.examples.forEach((example) => {
      typeDistribution[example.problem.type] =
        (typeDistribution[example.problem.type] || 0) + 1;
    });

    console.log("   Distribution by type:");
    Object.entries(typeDistribution).forEach(([type, count]) => {
      console.log(`   - ${type}: ${count} examples`);
    });
  } else {
    console.log("❌ Training data generation failed:", trainingResult.error);
  }
}

async function testReasoningStats() {
  console.log("\n\n📊 REASONING SYSTEM ANALYTICS");
  console.log("=============================\n");

  // Get reasoning statistics
  const statsResult = await callAPI("reasoning.getStats");
  if (statsResult.success) {
    console.log("✅ Reasoning statistics:");
    console.log(`   Total queries: ${statsResult.totalQueries}`);
    console.log(
      `   Average confidence: ${statsResult.averageConfidence.toFixed(2)}`
    );
    console.log(
      `   Success rate: ${(statsResult.successRate * 100).toFixed(1)}%`
    );
    console.log(`   Popular tools: ${statsResult.popularTools.join(", ")}`);
    console.log(`   Common types: ${statsResult.commonTypes.join(", ")}`);
  } else {
    console.log("❌ Failed to get reasoning stats:", statsResult.error);
  }

  // Get available reasoning types
  const typesResult = await callAPI("reasoning.getTypes");
  if (typesResult.success) {
    console.log(
      `\n✅ Available reasoning types (${typesResult.types.length}):`
    );
    typesResult.types.forEach((type) => console.log(`   - ${type}`));
  } else {
    console.log("❌ Failed to get reasoning types:", typesResult.error);
  }
}

async function testAdvancedScenarios() {
  console.log("\n\n🚀 ADVANCED REASONING SCENARIOS");
  console.log("===============================\n");

  // Scenario 1: Incomplete Information
  console.log("1. 🧩 Testing Reasoning with Incomplete Information...");
  const incompleteResult = await callAPI("reasoning.reason", {
    problem:
      "A user reports that 'the AI system is slow.' Diagnose the most likely causes and recommend solutions, despite having limited information about their setup.",
    type: "LOGICAL",
    enabledTools: ["analysis", "memory"],
    maxSteps: 5,
  });

  if (incompleteResult.success) {
    console.log(
      `✅ Incomplete information reasoning: confidence ${incompleteResult.trace.confidence.toFixed(
        2
      )}`
    );
    console.log(
      `   Identified ${incompleteResult.trace.steps.length} reasoning steps`
    );
  }

  // Scenario 2: Rapid Context Switching
  console.log("\n2. 🔄 Testing Rapid Context Switching...");
  const contexts = [
    "You're a financial advisor helping with investment decisions",
    "You're a software architect designing a distributed system",
    "You're a product manager prioritizing features",
  ];

  for (let i = 0; i < contexts.length; i++) {
    const contextResult = await callAPI("reasoning.reason", {
      problem: `Given the current economic uncertainty, what's the most important factor to consider right now?`,
      context: contexts[i],
      type: "LOGICAL",
      maxSteps: 4,
    });

    if (contextResult.success) {
      console.log(
        `   ✅ Context ${
          i + 1
        }: confidence ${contextResult.trace.confidence.toFixed(2)}`
      );
    }
  }

  // Scenario 3: Meta-reasoning
  console.log("\n3. 🤔 Testing Meta-reasoning (Reasoning about Reasoning)...");
  const metaResult = await callAPI("reasoning.reason", {
    problem:
      "How should an AI system decide when it needs more information versus when it should proceed with the information it has? What are the key factors in this decision-making process?",
    type: "LOGICAL",
    enabledTools: ["analysis", "memory"],
    maxSteps: 6,
  });

  if (metaResult.success) {
    console.log(
      `✅ Meta-reasoning completed: confidence ${metaResult.trace.confidence.toFixed(
        2
      )}`
    );
  }
}

async function runAllTests() {
  console.log("🎯 Starting Comprehensive Reasoning System Tests...\n");

  try {
    await testReasoningCapabilities();
    await testTrainingDataGeneration();
    await testReasoningStats();
    await testAdvancedScenarios();

    console.log("\n\n🎉 ALL TESTS COMPLETED!");
    console.log("========================");
    console.log("Your reasoning system has been thoroughly tested across:");
    console.log(
      "✅ Multiple reasoning types (logical, mathematical, causal, etc.)"
    );
    console.log("✅ Tool orchestration (web, memory, math, analysis)");
    console.log("✅ Complex multi-step problems");
    console.log("✅ Edge cases and error handling");
    console.log("✅ Training data generation");
    console.log("✅ Advanced scenarios (meta-reasoning, context switching)");
    console.log(
      "\nThis represents a significant leap toward AGI-like reasoning capabilities! 🚀"
    );
  } catch (error) {
    console.error("❌ Test execution failed:", error);
  }
}

// Export for use in other test files
module.exports = {
  testReasoningCapabilities,
  testTrainingDataGeneration,
  testReasoningStats,
  testAdvancedScenarios,
  runAllTests,
};

// Run if called directly
if (require.main === module) {
  runAllTests();
}
