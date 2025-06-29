// Test script for the reasoning system
// Run with: node test-reasoning-system.js

const axios = require('axios');

const BASE_URL = 'http://localhost:4000';

async function testReasoningSystem() {
  console.log('🧠 Testing Reasoning System...\n');

  try {
    // Test 1: Basic reasoning query
    console.log('📝 Test 1: Basic reasoning query');
    const basicTest = await axios.post(`${BASE_URL}/rpc`, {
      jsonrpc: '2.0',
      method: 'reasoning.reason',
      params: {
        problem: 'What are the main causes of climate change and how do they interconnect?',
        context: 'Environmental science discussion',
        requireExplanation: true
      },
      id: 1
    });

    if (basicTest.data.result.success) {
      console.log('✅ Basic reasoning test passed');
      console.log(`📊 Confidence: ${basicTest.data.result.trace.confidence.toFixed(2)}`);
      console.log(`🔧 Tools used: ${basicTest.data.result.trace.toolsUsed.join(', ')}`);
      console.log(`📝 Answer: ${basicTest.data.result.trace.finalAnswer.substring(0, 100)}...\n`);
    } else {
      console.log('❌ Basic reasoning test failed');
      console.log(`Error: ${basicTest.data.result.error}\n`);
    }

    // Test 2: Mathematical reasoning
    console.log('📝 Test 2: Mathematical reasoning');
    const mathTest = await axios.post(`${BASE_URL}/rpc`, {
      jsonrpc: '2.0',
      method: 'reasoning.reason',
      params: {
        problem: 'If a train travels 120 km in 2 hours, and then 180 km in 3 hours, what is its average speed for the entire journey?',
        type: 'mathematical',
        requireExplanation: true
      },
      id: 2
    });

    if (mathTest.data.result.success) {
      console.log('✅ Mathematical reasoning test passed');
      console.log(`📊 Confidence: ${mathTest.data.result.trace.confidence.toFixed(2)}`);
      console.log(`🔧 Tools used: ${mathTest.data.result.trace.toolsUsed.join(', ')}`);
      console.log(`📝 Answer: ${mathTest.data.result.trace.finalAnswer.substring(0, 100)}...\n`);
    } else {
      console.log('❌ Mathematical reasoning test failed');
      console.log(`Error: ${mathTest.data.result.error}\n`);
    }

    // Test 3: Web research reasoning
    console.log('📝 Test 3: Web research reasoning');
    const webTest = await axios.post(`${BASE_URL}/rpc`, {
      jsonrpc: '2.0',
      method: 'reasoning.reason',
      params: {
        problem: 'What are the latest developments in AI reasoning models in 2024?',
        type: 'web_research',
        requireExplanation: true
      },
      id: 3
    });

    if (webTest.data.result.success) {
      console.log('✅ Web research reasoning test passed');
      console.log(`📊 Confidence: ${webTest.data.result.trace.confidence.toFixed(2)}`);
      console.log(`🔧 Tools used: ${webTest.data.result.trace.toolsUsed.join(', ')}`);
      console.log(`📝 Answer: ${webTest.data.result.trace.finalAnswer.substring(0, 100)}...\n`);
    } else {
      console.log('❌ Web research reasoning test failed');
      console.log(`Error: ${webTest.data.result.error}\n`);
    }

    // Test 4: Get reasoning types
    console.log('📝 Test 4: Get available reasoning types');
    const typesTest = await axios.post(`${BASE_URL}/rpc`, {
      jsonrpc: '2.0',
      method: 'reasoning.getTypes',
      params: {},
      id: 4
    });

    if (typesTest.data.result.success) {
      console.log('✅ Reasoning types test passed');
      console.log(`📋 Available types: ${typesTest.data.result.types.join(', ')}\n`);
    } else {
      console.log('❌ Reasoning types test failed\n');
    }

    // Test 5: Generate training data
    console.log('📝 Test 5: Generate training data (small sample)');
    const trainingTest = await axios.post(`${BASE_URL}/rpc`, {
      jsonrpc: '2.0',
      method: 'reasoning.generateTrainingData',
      params: {
        count: 3,
        types: ['logical', 'causal'],
        config: {
          maxProblemsPerType: 2,
          difficultyRange: [3, 6],
          qualityThreshold: 0.6
        }
      },
      id: 5
    });

    if (trainingTest.data.result.success) {
      console.log('✅ Training data generation test passed');
      console.log(`📊 Generated ${trainingTest.data.result.examples.length} examples`);
      
      if (trainingTest.data.result.examples.length > 0) {
        const example = trainingTest.data.result.examples[0];
        console.log(`📝 Sample input: ${example.input.substring(0, 80)}...`);
        console.log(`📝 Sample output: ${example.output.substring(0, 80)}...`);
        console.log(`📊 Quality score: ${example.quality.toFixed(2)}\n`);
      }
    } else {
      console.log('❌ Training data generation test failed');
      console.log(`Error: ${trainingTest.data.result.error}\n`);
    }

    // Test 6: Chat with reasoning mode
    console.log('📝 Test 6: Chat with reasoning mode enabled');
    const chatTest = await axios.post(`${BASE_URL}/rpc`, {
      jsonrpc: '2.0',
      method: 'chat',
      params: {
        messages: [
          { role: 'user', content: 'Explain the logical fallacy in this argument: "All birds can fly. Penguins are birds. Therefore, penguins can fly."' }
        ],
        reasoningMode: true,
        enableWebSearch: false
      },
      id: 6
    });

    if (chatTest.data.result.success) {
      console.log('✅ Chat with reasoning mode test passed');
      console.log(`📝 Response: ${chatTest.data.result.message.content.substring(0, 100)}...`);
      if (chatTest.data.result.reasoning) {
        console.log(`🧠 Reasoning steps: ${chatTest.data.result.reasoning.steps.length}`);
        console.log(`📊 Confidence: ${chatTest.data.result.reasoning.confidence.toFixed(2)}\n`);
      }
    } else {
      console.log('❌ Chat with reasoning mode test failed');
      console.log(`Error: ${chatTest.data.result.error}\n`);
    }

    // Test 7: Get reasoning stats
    console.log('📝 Test 7: Get reasoning statistics');
    const statsTest = await axios.post(`${BASE_URL}/rpc`, {
      jsonrpc: '2.0',
      method: 'reasoning.getStats',
      params: {},
      id: 7
    });

    if (statsTest.data.result.success) {
      console.log('✅ Reasoning stats test passed');
      console.log(`📊 Total queries: ${statsTest.data.result.totalQueries}`);
      console.log(`📊 Success rate: ${(statsTest.data.result.successRate * 100).toFixed(1)}%`);
      console.log(`🔧 Popular tools: ${statsTest.data.result.popularTools.join(', ')}\n`);
    } else {
      console.log('❌ Reasoning stats test failed\n');
    }

    console.log('🎉 Reasoning system testing completed!');
    console.log('🚀 The reasoning system is now integrated and ready for use.');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Make sure the backend server is running on port 4000');
      console.log('   Run: cd backend && npm start');
    }
  }
}

// Run the tests
testReasoningSystem();
