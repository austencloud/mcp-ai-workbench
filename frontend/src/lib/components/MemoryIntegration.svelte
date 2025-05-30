<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { memoryService, userInsights, recentMemories, isMemoryLoading } from '$lib/services/memoryService';
  import type { MemoryItem } from '$lib/types/memory';

  export let conversationId: string | null = null;
  export let currentMessage: string = '';
  export let userId: string = 'default-user';
  export let workspaceId: string | null = null;

  const dispatch = createEventDispatcher();

  let relevantMemories: MemoryItem[] = [];
  let memoryContext: string = '';
  let showMemoryPanel = false;
  let adaptationSuggestions: string = '';
  let isAnalyzing = false;

  // Auto-analyze current message for relevant memories
  $: if (currentMessage && currentMessage.length > 10) {
    analyzeCurrentMessage();
  }

  async function analyzeCurrentMessage() {
    if (isAnalyzing || !currentMessage.trim()) return;
    
    isAnalyzing = true;
    try {
      // Search for relevant memories
      const results = await memoryService.searchMemories({
        query: currentMessage,
        maxResults: 3,
        minImportance: 0.3
      });

      relevantMemories = results.map(r => r.memory);

      // Get user adaptation suggestions
      if (userId) {
        const adaptResponse = await memoryService.adaptToUser(userId, currentMessage);
        if (adaptResponse.success) {
          adaptationSuggestions = adaptResponse.data.adaptation || '';
        }
      }

      // Build memory context for AI
      if (relevantMemories.length > 0) {
        memoryContext = buildMemoryContext(relevantMemories);
        dispatch('memoryContext', { context: memoryContext, memories: relevantMemories });
      }
    } catch (error) {
      console.error('Error analyzing message for memories:', error);
    } finally {
      isAnalyzing = false;
    }
  }

  function buildMemoryContext(memories: MemoryItem[]): string {
    if (memories.length === 0) return '';

    let context = 'Relevant memories:\n';
    memories.forEach((memory, index) => {
      context += `${index + 1}. [${memory.type}] ${memory.content}\n`;
      if (memory.tags.length > 0) {
        context += `   Tags: ${memory.tags.join(', ')}\n`;
      }
    });

    return context;
  }

  async function rememberCurrentMessage(type: string = 'observation', importance: number = 0.5) {
    if (!currentMessage.trim()) return;

    try {
      const response = await memoryService.remember({
        input: currentMessage,
        context: {
          userId,
          conversationId,
          workspaceId,
          timestamp: new Date(),
          relevantEntities: []
        },
        type: type as any,
        importance
      });

      if (response.success) {
        dispatch('memoryStored', { memoryId: response.memoryId, type });
        // Show success feedback
        showSuccessToast('Memory stored successfully');
      } else {
        console.error('Failed to store memory:', response.error);
      }
    } catch (error) {
      console.error('Error storing memory:', error);
    }
  }

  async function recordExperience(event: string, outcome: string, success: boolean = true) {
    try {
      const response = await memoryService.recordEpisode({
        event,
        outcome,
        success,
        participants: [userId],
        emotions: success ? ['satisfaction'] : ['frustration'],
        lessons: []
      });

      if (response.success) {
        dispatch('episodeRecorded', { episodeId: response.memoryId });
        showSuccessToast('Experience recorded');
      }
    } catch (error) {
      console.error('Error recording experience:', error);
    }
  }

  function showSuccessToast(message: string) {
    // Simple toast notification - could be enhanced with a proper toast system
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  function getMemoryTypeColor(type: string): string {
    const colors: Record<string, string> = {
      'fact': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      'experience': 'bg-green-500/20 text-green-300 border-green-500/30',
      'observation': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      'preference': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      'skill': 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
      'relationship': 'bg-pink-500/20 text-pink-300 border-pink-500/30',
      'goal': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      'task': 'bg-orange-500/20 text-orange-300 border-orange-500/30',
      'knowledge': 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
      'conversation': 'bg-violet-500/20 text-violet-300 border-violet-500/30'
    };
    return colors[type.toLowerCase()] || 'bg-gray-500/20 text-gray-300 border-gray-500/30';
  }

  onMount(() => {
    // Set up memory service context
    memoryService.setCurrentUser(userId);
    if (workspaceId) memoryService.setCurrentWorkspace(workspaceId);
    if (conversationId) memoryService.setCurrentConversation(conversationId);

    // Load initial memory data
    memoryService.refreshAllMemoryData();
  });

  // Update context when props change
  $: if (userId) memoryService.setCurrentUser(userId);
  $: if (workspaceId) memoryService.setCurrentWorkspace(workspaceId);
  $: if (conversationId) memoryService.setCurrentConversation(conversationId);
</script>

<!-- Memory Integration UI -->
<div class="memory-integration">
  <!-- Memory Status Indicator -->
  {#if isAnalyzing || $isMemoryLoading}
    <div class="flex items-center space-x-2 text-xs text-blue-400 mb-2">
      <div class="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin"></div>
      <span>Analyzing memories...</span>
    </div>
  {/if}

  <!-- Relevant Memories Display -->
  {#if relevantMemories.length > 0}
    <div class="bg-gray-800/30 border border-gray-700/30 rounded-lg p-3 mb-3">
      <div class="flex items-center justify-between mb-2">
        <h4 class="text-sm font-medium text-gray-300">Relevant Memories</h4>
        <button
          on:click={() => showMemoryPanel = !showMemoryPanel}
          class="text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          {showMemoryPanel ? 'Hide' : 'Show'} Details
        </button>
      </div>
      
      {#if showMemoryPanel}
        <div class="space-y-2">
          {#each relevantMemories as memory}
            <div class="bg-gray-900/50 border border-gray-600/30 rounded-md p-2">
              <div class="flex items-start justify-between mb-1">
                <span class="inline-block px-2 py-1 text-xs font-medium rounded {getMemoryTypeColor(memory.type)}">
                  {memory.type}
                </span>
                <span class="text-xs text-gray-400">
                  {new Date(memory.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p class="text-xs text-gray-300">{memory.content}</p>
              {#if memory.tags.length > 0}
                <div class="flex flex-wrap gap-1 mt-1">
                  {#each memory.tags.slice(0, 3) as tag}
                    <span class="px-1 py-0.5 bg-gray-700/50 text-gray-400 text-xs rounded">#{tag}</span>
                  {/each}
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {:else}
        <div class="text-xs text-gray-400">
          {relevantMemories.length} relevant {relevantMemories.length === 1 ? 'memory' : 'memories'} found
        </div>
      {/if}
    </div>
  {/if}

  <!-- Adaptation Suggestions -->
  {#if adaptationSuggestions}
    <div class="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3 mb-3">
      <h4 class="text-sm font-medium text-purple-300 mb-2">AI Adaptation Suggestions</h4>
      <div class="text-xs text-gray-300 whitespace-pre-line">{adaptationSuggestions}</div>
    </div>
  {/if}

  <!-- User Insights -->
  {#if $userInsights.length > 0}
    <div class="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-3">
      <h4 class="text-sm font-medium text-blue-300 mb-2">User Insights</h4>
      <div class="space-y-1">
        {#each $userInsights.slice(0, 2) as insight}
          <div class="text-xs text-gray-300">• {insight}</div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Quick Memory Actions -->
  <div class="flex flex-wrap gap-2 mb-3">
    <button
      on:click={() => rememberCurrentMessage('fact', 0.7)}
      disabled={!currentMessage.trim()}
      class="px-2 py-1 bg-blue-600/20 hover:bg-blue-600/30 disabled:opacity-50 text-blue-300 text-xs rounded border border-blue-600/30 transition-colors"
      title="Remember as important fact"
    >
      Remember as Fact
    </button>

    <button
      on:click={() => rememberCurrentMessage('observation', 0.5)}
      disabled={!currentMessage.trim()}
      class="px-2 py-1 bg-yellow-600/20 hover:bg-yellow-600/30 disabled:opacity-50 text-yellow-300 text-xs rounded border border-yellow-600/30 transition-colors"
      title="Remember as observation"
    >
      Note This
    </button>
    
    <button
      on:click={() => recordExperience(currentMessage, 'User interaction', true)}
      disabled={!currentMessage.trim()}
      class="px-2 py-1 bg-green-600/20 hover:bg-green-600/30 disabled:opacity-50 text-green-300 text-xs rounded border border-green-600/30 transition-colors"
      title="Record as experience"
    >
      Record Experience
    </button>
  </div>

  <!-- Recent Memories Summary -->
  {#if $recentMemories.length > 0}
    <div class="text-xs text-gray-400 mb-2">
      Recent activity: {$recentMemories.length} memories in the last 7 days
    </div>
  {/if}
</div>

<style>
  .memory-integration {
    @apply text-sm;
  }
  
  .memory-integration button:disabled {
    @apply cursor-not-allowed;
  }
  
  .memory-integration .animate-spin {
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
</style>
