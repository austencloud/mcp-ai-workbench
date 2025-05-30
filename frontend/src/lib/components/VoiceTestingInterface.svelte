<script lang="ts">
  import { onMount } from 'svelte';
  import { mcp } from '$lib/services/mcpClient';
  import VoiceCorrectionDisplay from './VoiceCorrectionDisplay.svelte';

  interface TestResult {
    testCase: {
      id: string;
      name: string;
      description: string;
      input: string;
      category: string;
      sensitivity: string;
    };
    result: {
      correctedText: string;
      corrections: any[];
      confidence: number;
      processingTime: number;
      success: boolean;
    };
    passed: boolean;
    score: number;
    feedback: string[];
  }

  interface TestSuite {
    name: string;
    description: string;
    testCount: number;
  }

  let testSuites: TestSuite[] = $state([]);
  let selectedSuite = $state<string>('');
  let testResults: TestResult[] = $state([]);
  let isRunningTests = $state(false);
  let isConnected = $state(false);
  let connectionError = $state<string | null>(null);
  let customText = $state('');
  let customSensitivity = $state<'low' | 'medium' | 'high'>('medium');
  let customResults = $state<any>(null);
  let backendStats = $state<any>(null);

  async function checkBackendConnection() {
    try {
      connectionError = null;
      const response = await mcp.getVoiceStats();
      
      // Handle undefined or null response
      if (!response) {
        throw new Error('No response from backend');
      }
      
      // Check if response has success property and it's true
      if (response.success === true) {
        isConnected = true;
        backendStats = response.data;
        console.log('✅ Backend connected successfully');
      } else if (response.success === false) {
        throw new Error(response.error || 'Backend returned unsuccessful response');
      } else {
        // If no success property, treat as successful if we got data
        if (response.data || Object.keys(response).length > 0) {
          isConnected = true;
          backendStats = response;
          console.log('✅ Backend connected successfully (legacy response format)');
        } else {
          throw new Error('Backend response format not recognized');
        }
      }
    } catch (error) {
      console.error('Backend connection error:', error);
      isConnected = false;
      connectionError = 'Failed to connect to backend. Please check if the server is running on the correct port.';
    }
  }

  async function loadTestSuites() {
    if (!isConnected) return;
    
    try {
      const response = await mcp.runTestSuite();
      if (response?.success && response.data?.availableSuites) {
        testSuites = response.data.availableSuites;
      } else if (response?.data?.availableSuites) {
        // Handle legacy response format
        testSuites = response.data.availableSuites;
      }
    } catch (error) {
      console.error('Failed to load test suites:', error);
    }
  }

  async function runTestSuite() {
    if (!selectedSuite || !isConnected) return;
    
    isRunningTests = true;
    testResults = [];
    
    try {
      const response = await mcp.runTestSuite({ suite: selectedSuite });
      if (response?.success && response.data?.results) {
        testResults = response.data.results;
      } else if (response?.data?.results) {
        // Handle legacy response format
        testResults = response.data.results;
      }
    } catch (error) {
      console.error('Failed to run test suite:', error);
    } finally {
      isRunningTests = false;
    }
  }

  async function runAllTests() {
    if (!isConnected) return;
    
    isRunningTests = true;
    testResults = [];
    
    try {
      const response = await mcp.testVoiceProcessing();
      if (response?.success && response.data?.testResults) {
        const allResults = Object.values(response.data.testResults).flat();
        testResults = allResults as TestResult[];
      } else if (response?.data?.testResults) {
        // Handle legacy response format
        const allResults = Object.values(response.data.testResults).flat();
        testResults = allResults as TestResult[];
      }
    } catch (error) {
      console.error('Failed to run all tests:', error);
    } finally {
      isRunningTests = false;
    }
  }

  async function testCustomText() {
    if (!customText.trim() || !isConnected) return;
    
    try {
      const response = await mcp.testCorrectionSensitivity({ text: customText });
      if (response?.success && response.data) {
        customResults = response.data;
      } else if (response?.data) {
        // Handle legacy response format
        customResults = response.data;
      }
    } catch (error) {
      console.error('Failed to test custom text:', error);
    }
  }

  onMount(() => {
    checkBackendConnection().then(() => {
      if (isConnected) {
        loadTestSuites();
      }
    });
  });
</script>

{#if connectionError}
  <div class="error-banner">
    <div class="error-content">
      <h3>Backend Connection Error</h3>
      <button class="retry-btn" onclick={() => checkBackendConnection()}>Retry</button>
    </div>
    <p class="error-message">{connectionError}</p>
  </div>
{/if}

{#if !isConnected}
  <div class="error-banner">
    <div class="error-content">
      <h3>Error</h3>
    </div>
    <p class="error-message">Failed to connect to backend. Please check if the server is running on the correct port.</p>
  </div>
{/if}

<div class="voice-testing-container">
  <h2>Voice Processing Test Suite</h2>
  
  <div class="test-controls">
    <div class="suite-selector">
      <label for="suite-select">Select Test Suite</label>
      <select id="suite-select" bind:value={selectedSuite} disabled={!isConnected}>
        <option value="">-- Choose a test suite --</option>
        {#each testSuites as suite}
          <option value={suite.name}>{suite.name} ({suite.testCount} tests)</option>
        {/each}
      </select>
    </div>
    
    <div class="connection-status">
      {#if isConnected}
        <span class="status-connected">Backend connected</span>
      {:else}
        <span class="status-disconnected">Backend not connected</span>
      {/if}
    </div>
    
    <div class="test-actions">
      <button 
        class="run-suite-btn" 
        onclick={runTestSuite}
        disabled={!selectedSuite || !isConnected || isRunningTests}
      >
        {isRunningTests ? 'Running...' : 'Run Suite'}
      </button>
      
      <button 
        class="run-all-btn" 
        onclick={runAllTests}
        disabled={!isConnected || isRunningTests}
      >
        Run All Tests
      </button>
    </div>
  </div>

  <details class="custom-testing">
    <summary>▶ Custom Text Testing</summary>
    <div class="custom-form">
      <textarea 
        bind:value={customText} 
        placeholder="Enter text to test voice processing corrections..."
        rows="3"
      ></textarea>
      
      <div class="custom-controls">
        <select bind:value={customSensitivity}>
          <option value="low">Low Sensitivity</option>
          <option value="medium">Medium Sensitivity</option>
          <option value="high">High Sensitivity</option>
        </select>
        
        <button 
          onclick={testCustomText}
          disabled={!customText.trim() || !isConnected}
        >
          Test Text
        </button>
      </div>
      
      {#if customResults}
        <div class="custom-results">
          <h4>Sensitivity Comparison Results</h4>
          {#each customResults.results as result}
            <div class="sensitivity-result">
              <h5>{result.sensitivity.toUpperCase()} Sensitivity</h5>
              <VoiceCorrectionDisplay 
                originalText={result.original}
                correctedText={result.corrected}
                corrections={result.corrections}
                confidence={result.confidence}
              />
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </details>

  {#if testResults.length > 0}
    <div class="test-results">
      <h3>Test Results ({testResults.length} tests)</h3>
      
      <div class="results-summary">
        <div class="summary-stat">
          <span class="stat-label">Passed:</span>
          <span class="stat-value passed">{testResults.filter(r => r.passed).length}</span>
        </div>
        <div class="summary-stat">
          <span class="stat-label">Failed:</span>
          <span class="stat-value failed">{testResults.filter(r => !r.passed).length}</span>
        </div>
        <div class="summary-stat">
          <span class="stat-label">Pass Rate:</span>
          <span class="stat-value">{Math.round((testResults.filter(r => r.passed).length / testResults.length) * 100)}%</span>
        </div>
      </div>
      
      <div class="results-list">
        {#each testResults as result}
          <div class="test-result" class:passed={result.passed} class:failed={!result.passed}>
            <div class="result-header">
              <h4>{result.testCase.name}</h4>
              <span class="result-status">{result.passed ? '✅' : '❌'}</span>
            </div>
            
            <p class="test-description">{result.testCase.description}</p>
            
            <VoiceCorrectionDisplay 
              originalText={result.testCase.input}
              correctedText={result.result.correctedText}
              corrections={result.result.corrections}
              confidence={result.result.confidence}
            />
            
            <div class="result-details">
              <span class="score">Score: {Math.round(result.score * 100)}%</span>
              <span class="processing-time">Time: {result.result.processingTime}ms</span>
              <span class="category">Category: {result.testCase.category}</span>
            </div>
            
            {#if result.feedback.length > 0}
              <div class="feedback">
                <h5>Feedback:</h5>
                <ul>
                  {#each result.feedback as item}
                    <li>{item}</li>
                  {/each}
                </ul>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .error-banner {
    @apply glass rounded-2xl p-4 border border-red-400/30 bg-red-500/10 mb-4;
  }

  .error-content {
    @apply flex items-center justify-between;
  }

  .error-message {
    @apply text-red-200/70 text-sm mt-2;
  }

  .retry-btn {
    @apply px-3 py-1 text-sm bg-white/5 border border-white/20 text-white/80 rounded-lg transition-all duration-300;
  }

  .retry-btn:hover {
    @apply bg-white/10 border-white/30 text-white/90;
  }

  .voice-testing-container {
    @apply p-6 space-y-6;
  }

  .test-controls {
    @apply grid grid-cols-1 md:grid-cols-2 gap-4 mb-6;
  }

  .suite-selector {
    @apply w-full;
  }

  .connection-status {
    @apply flex items-center;
  }

  .status-connected {
    @apply text-green-300;
  }

  .status-disconnected {
    @apply text-red-300;
  }

  .test-actions {
    @apply flex items-center gap-2;
  }

  .run-suite-btn {
    @apply px-4 py-2 bg-blue-500/20 border border-blue-400/30 text-blue-300 rounded-lg transition-all duration-300;
  }

  .run-suite-btn:hover {
    @apply bg-blue-500/30 border-blue-400/50 text-blue-200 transform -translate-y-px;
    box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
  }

  .run-all-btn {
    @apply px-4 py-2 bg-white/5 border border-white/20 text-white/80 rounded-lg transition-all duration-300;
  }

  .run-all-btn:hover {
    @apply bg-white/10 border-white/30 text-white/90 transform -translate-y-px;
  }

  .custom-testing {
    @apply border-t border-white/10 pt-6;
  }

  .custom-form {
    @apply space-y-4;
  }

  .custom-controls {
    @apply flex items-center gap-2;
  }

  .custom-results {
    @apply mt-4;
  }

  .sensitivity-result {
    @apply bg-white/5 rounded-lg p-4 border border-white/10 mb-4;
  }

  .test-results {
    @apply glass rounded-2xl p-6;
  }

  .results-summary {
    @apply grid grid-cols-2 md:grid-cols-4 gap-4 mb-6;
  }

  .summary-stat {
    @apply bg-white/5 rounded-lg p-3 text-center;
  }

  .results-list {
    @apply space-y-4 max-h-96 overflow-y-auto;
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
  }

  .results-list::-webkit-scrollbar {
    width: 4px;
  }

  .results-list::-webkit-scrollbar-track {
    background: transparent;
  }

  .results-list::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 2px;
  }

  .results-list::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  .test-result {
    @apply bg-white/5 rounded-lg p-4 border border-white/10;
  }

  .result-header {
    @apply flex items-center justify-between mb-2;
  }

  .result-status {
    @apply text-sm font-medium;
  }

  .test-description {
    @apply text-sm text-white/70 mb-3;
  }

  .result-details {
    @apply text-xs text-white/60 space-y-1;
  }

  .score {
    @apply font-medium;
  }

  .processing-time {
    @apply font-medium;
  }

  .category {
    @apply font-medium;
  }

  .feedback {
    @apply mt-3 pt-3 border-t border-white/10;
  }
</style>
