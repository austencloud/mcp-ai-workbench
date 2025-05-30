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
  let isRunning = $state(false);
  let customText = $state('');
  let sensitivityResults: any[] = $state([]);
  let showCustomTest = $state(false);

  onMount(async () => {
    await loadTestSuites();
  });

  async function loadTestSuites() {
    try {
      const response = await mcp.call('runTestSuite', {});
      if (response.success) {
        testSuites = response.data.availableSuites;
      }
    } catch (error) {
      console.error('Failed to load test suites:', error);
    }
  }

  async function runTestSuite() {
    if (!selectedSuite) return;
    
    isRunning = true;
    try {
      const response = await mcp.call('runTestSuite', { suite: selectedSuite });
      if (response.success) {
        testResults = response.data.results;
      }
    } catch (error) {
      console.error('Failed to run test suite:', error);
    } finally {
      isRunning = false;
    }
  }

  async function runAllTests() {
    isRunning = true;
    try {
      const response = await mcp.call('testVoiceProcessing', {});
      if (response.success) {
        // Flatten all test results from all suites
        const allResults = Object.values(response.data.testResults).flat() as TestResult[];
        testResults = allResults;
      }
    } catch (error) {
      console.error('Failed to run all tests:', error);
    } finally {
      isRunning = false;
    }
  }

  async function testSensitivity() {
    if (!customText.trim()) return;
    
    isRunning = true;
    try {
      const response = await mcp.call('testCorrectionSensitivity', { text: customText });
      if (response.success) {
        sensitivityResults = response.data.results;
      }
    } catch (error) {
      console.error('Failed to test sensitivity:', error);
    } finally {
      isRunning = false;
    }
  }

  function getScoreColor(score: number): string {
    if (score >= 80) return 'text-green-300';
    if (score >= 60) return 'text-yellow-300';
    return 'text-red-300';
  }

  function getPassedColor(passed: boolean): string {
    return passed ? 'text-green-300' : 'text-red-300';
  }
</script>

<div class="p-6 space-y-6">
  <div class="glass rounded-2xl p-6">
    <h2 class="text-2xl font-bold text-white mb-4">Voice Processing Test Suite</h2>
    
    <!-- Test Suite Selection -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <div>
        <label class="block text-sm font-medium text-white/80 mb-2">Select Test Suite</label>
        <select 
          bind:value={selectedSuite}
          class="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
        >
          <option value="">Choose a test suite...</option>
          {#each testSuites as suite}
            <option value={suite.name}>{suite.name} ({suite.testCount} tests)</option>
          {/each}
        </select>
      </div>
      
      <div class="flex items-end gap-2">
        <button
          class="btn-futuristic btn-primary-futuristic px-4 py-2 hover-lift neon-glow"
          onclick={runTestSuite}
          disabled={!selectedSuite || isRunning}
        >
          {isRunning ? 'Running...' : 'Run Suite'}
        </button>
        
        <button
          class="btn-futuristic btn-secondary-futuristic px-4 py-2 hover-lift"
          onclick={runAllTests}
          disabled={isRunning}
        >
          Run All Tests
        </button>
      </div>
    </div>

    <!-- Custom Text Testing -->
    <div class="border-t border-white/10 pt-6">
      <button
        class="text-white/80 hover:text-white transition-colors mb-4"
        onclick={() => showCustomTest = !showCustomTest}
      >
        {showCustomTest ? '▼' : '▶'} Custom Text Testing
      </button>
      
      {#if showCustomTest}
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-white/80 mb-2">Test Custom Text</label>
            <textarea
              bind:value={customText}
              class="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white resize-none"
              rows="3"
              placeholder="Enter text to test with different sensitivity levels..."
            ></textarea>
          </div>
          
          <button
            class="btn-futuristic btn-primary-futuristic px-4 py-2 hover-lift neon-glow"
            onclick={testSensitivity}
            disabled={!customText.trim() || isRunning}
          >
            Test Sensitivity Levels
          </button>
        </div>
      {/if}
    </div>
  </div>

  <!-- Sensitivity Test Results -->
  {#if sensitivityResults.length > 0}
    <div class="glass rounded-2xl p-6">
      <h3 class="text-xl font-bold text-white mb-4">Sensitivity Level Comparison</h3>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        {#each sensitivityResults as result}
          <div class="bg-white/5 rounded-lg p-4 border border-white/10">
            <div class="flex items-center justify-between mb-2">
              <span class="font-medium text-white capitalize">{result.sensitivity}</span>
              <span class="text-xs text-white/60">{result.processingTime}ms</span>
            </div>
            
            <div class="text-sm text-white/80 mb-2">
              {result.correctionCount} corrections
            </div>
            
            <VoiceCorrectionDisplay
              originalText={result.original}
              correctedText={result.corrected}
              corrections={result.corrections}
              confidence={result.confidence}
              showDiff={true}
            />
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Test Results -->
  {#if testResults.length > 0}
    <div class="glass rounded-2xl p-6">
      <h3 class="text-xl font-bold text-white mb-4">Test Results</h3>
      
      <!-- Summary -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-white/5 rounded-lg p-3 text-center">
          <div class="text-2xl font-bold text-white">{testResults.length}</div>
          <div class="text-xs text-white/60">Total Tests</div>
        </div>
        <div class="bg-white/5 rounded-lg p-3 text-center">
          <div class="text-2xl font-bold text-green-300">{testResults.filter(r => r.passed).length}</div>
          <div class="text-xs text-white/60">Passed</div>
        </div>
        <div class="bg-white/5 rounded-lg p-3 text-center">
          <div class="text-2xl font-bold text-red-300">{testResults.filter(r => !r.passed).length}</div>
          <div class="text-xs text-white/60">Failed</div>
        </div>
        <div class="bg-white/5 rounded-lg p-3 text-center">
          <div class="text-2xl font-bold text-white">
            {Math.round((testResults.filter(r => r.passed).length / testResults.length) * 100)}%
          </div>
          <div class="text-xs text-white/60">Pass Rate</div>
        </div>
      </div>

      <!-- Individual Test Results -->
      <div class="space-y-4 max-h-96 overflow-y-auto custom-scrollbar">
        {#each testResults as result}
          <div class="bg-white/5 rounded-lg p-4 border border-white/10">
            <div class="flex items-center justify-between mb-2">
              <div>
                <span class="font-medium text-white">{result.testCase.name}</span>
                <span class="text-xs text-white/60 ml-2">({result.testCase.category})</span>
              </div>
              <div class="flex items-center gap-2">
                <span class={`text-sm font-medium ${getScoreColor(result.score)}`}>
                  {result.score}/100
                </span>
                <span class={`text-sm font-medium ${getPassedColor(result.passed)}`}>
                  {result.passed ? '✓ PASS' : '✗ FAIL'}
                </span>
              </div>
            </div>
            
            <div class="text-sm text-white/70 mb-3">{result.testCase.description}</div>
            
            <VoiceCorrectionDisplay
              originalText={result.testCase.input}
              correctedText={result.result.correctedText}
              corrections={result.result.corrections}
              confidence={result.result.confidence}
              showDiff={true}
            />
            
            {#if result.feedback.length > 0}
              <div class="mt-3 pt-3 border-t border-white/10">
                <div class="text-xs text-white/60 mb-1">Feedback:</div>
                <ul class="text-xs text-white/70 space-y-1">
                  {#each result.feedback as feedback}
                    <li class="flex items-start gap-1">
                      <span class={feedback.startsWith('✓') ? 'text-green-300' : feedback.startsWith('✗') ? 'text-red-300' : 'text-white/60'}>
                        {feedback}
                      </span>
                    </li>
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
  .btn-futuristic {
    @apply relative rounded-lg border transition-all duration-300 flex items-center justify-center;
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
  }

  .btn-primary-futuristic {
    @apply bg-blue-500/20 border-blue-400/30 text-blue-300;
  }

  .btn-primary-futuristic:hover {
    @apply bg-blue-500/30 border-blue-400/50 text-blue-200;
  }

  .btn-secondary-futuristic {
    @apply bg-white/5 border-white/20 text-white/80;
  }

  .btn-secondary-futuristic:hover {
    @apply bg-white/10 border-white/30 text-white/90;
  }

  .hover-lift:hover {
    transform: translateY(-1px) translateZ(0);
  }

  .neon-glow:hover {
    box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
  }

  .custom-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
  }

  .custom-scrollbar::-webkit-scrollbar {
    width: 4px;
  }

  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 2px;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.3);
  }
</style>
