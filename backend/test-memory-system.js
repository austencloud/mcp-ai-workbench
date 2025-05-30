// Test Memory System Implementation
// Simple test to verify memory functionality

const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testMemorySystem() {
  console.log('🧠 Testing Memory System Implementation...\n');

  try {
    // Test 1: Store a memory
    console.log('1. Testing memory storage...');
    const rememberResponse = await axios.post(BASE_URL, {
      jsonrpc: '2.0',
      method: 'remember',
      params: {
        input: 'The user prefers dark mode and likes to work late at night. They are a software developer working on AI projects.',
        context: {
          userId: 'test-user-123',
          workspaceId: 'test-workspace',
          sessionId: 'test-session',
          timestamp: new Date(),
          relevantEntities: ['user preferences', 'work habits']
        },
        type: 'preference',
        importance: 0.8
      },
      id: 1
    });

    if (rememberResponse.data.result.success) {
      console.log('✅ Memory stored successfully');
      console.log('   Memory ID:', rememberResponse.data.result.memoryId);
    } else {
      console.log('❌ Failed to store memory:', rememberResponse.data.result.error);
    }

    // Test 2: Recall memories
    console.log('\n2. Testing memory recall...');
    const recallResponse = await axios.post(BASE_URL, {
      jsonrpc: '2.0',
      method: 'recall',
      params: {
        query: 'user preferences work habits',
        context: {
          userId: 'test-user-123',
          workspaceId: 'test-workspace'
        },
        maxResults: 5
      },
      id: 2
    });

    if (recallResponse.data.result.success) {
      console.log('✅ Memory recall successful');
      console.log('   Found memories:', recallResponse.data.result.data.totalResults);
      if (recallResponse.data.result.data.memories.length > 0) {
        console.log('   First memory relevance:', recallResponse.data.result.data.memories[0].relevanceScore);
      }
    } else {
      console.log('❌ Failed to recall memories:', recallResponse.data.result.error);
    }

    // Test 3: Add conversation message
    console.log('\n3. Testing conversation memory...');
    const conversationResponse = await axios.post(BASE_URL, {
      jsonrpc: '2.0',
      method: 'addConversationMessage',
      params: {
        conversationId: 'test-conversation-123',
        role: 'user',
        content: 'I need help with implementing a neural network for image classification. I prefer using PyTorch.',
        timestamp: new Date()
      },
      id: 3
    });

    if (conversationResponse.data.result.success) {
      console.log('✅ Conversation message added successfully');
    } else {
      console.log('❌ Failed to add conversation message:', conversationResponse.data.result.error);
    }

    // Test 4: Get conversation summary
    console.log('\n4. Testing conversation summary...');
    const summaryResponse = await axios.post(BASE_URL, {
      jsonrpc: '2.0',
      method: 'getConversationSummary',
      params: {
        conversationId: 'test-conversation-123'
      },
      id: 4
    });

    if (summaryResponse.data.result.success) {
      console.log('✅ Conversation summary generated');
      console.log('   Summary:', summaryResponse.data.result.data.summary);
    } else {
      console.log('❌ Failed to get conversation summary:', summaryResponse.data.result.error);
    }

    // Test 5: Search memories
    console.log('\n5. Testing memory search...');
    const searchResponse = await axios.post(BASE_URL, {
      jsonrpc: '2.0',
      method: 'searchMemories',
      params: {
        query: 'PyTorch neural network',
        userId: 'test-user-123',
        maxResults: 10
      },
      id: 5
    });

    if (searchResponse.data.result.success) {
      console.log('✅ Memory search successful');
      console.log('   Search results:', searchResponse.data.result.data.totalResults);
    } else {
      console.log('❌ Failed to search memories:', searchResponse.data.result.error);
    }

    // Test 6: Get memory statistics
    console.log('\n6. Testing memory statistics...');
    const statsResponse = await axios.post(BASE_URL, {
      jsonrpc: '2.0',
      method: 'getMemoryStats',
      params: {
        userId: 'test-user-123'
      },
      id: 6
    });

    if (statsResponse.data.result.success) {
      console.log('✅ Memory statistics retrieved');
      console.log('   Total memories:', statsResponse.data.result.data.stats.totalMemories);
      console.log('   System status:', statsResponse.data.result.data.stats.systemStatus);
    } else {
      console.log('❌ Failed to get memory statistics:', statsResponse.data.result.error);
    }

    // Test 7: Find similar memories
    console.log('\n7. Testing similarity search...');
    const similarResponse = await axios.post(BASE_URL, {
      jsonrpc: '2.0',
      method: 'findSimilarMemories',
      params: {
        content: 'The user likes to code in Python and prefers working at night',
        threshold: 0.5,
        limit: 5
      },
      id: 7
    });

    if (similarResponse.data.result.success) {
      console.log('✅ Similarity search successful');
      console.log('   Similar memories found:', similarResponse.data.result.data.totalResults);
    } else {
      console.log('❌ Failed to find similar memories:', similarResponse.data.result.error);
    }

    console.log('\n🎉 Memory system test completed!');

  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Server is not running. Please start the backend server first.');
      console.log('   Run: npm run dev');
    } else {
      console.log('❌ Test failed with error:', error.message);
      if (error.response?.data) {
        console.log('   Response:', JSON.stringify(error.response.data, null, 2));
      }
    }
  }
}

// Run the test
testMemorySystem();
