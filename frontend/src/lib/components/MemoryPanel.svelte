<script lang="ts">
  import { onMount } from 'svelte';
  import { mcp } from '$lib/services/mcpClient';
  import type { MemoryItem, MemorySearchResult } from '$lib/types/memory';

  export let isOpen = false;
  export let userId = 'default-user';

  let searchQuery = '';
  let memories: MemorySearchResult[] = [];
  let loading = false;
  let selectedMemory: MemoryItem | null = null;
  let activeTab = 'search'; // 'search', 'timeline', 'insights', 'preferences'
  let userInsights: string[] = [];
  let episodicTimeline: any[] = [];
  let userPreferences: any[] = [];

  // Search memories
  async function searchMemories() {
    if (!searchQuery.trim()) return;
    
    loading = true;
    try {
      const response = await mcp.searchMemories({
        query: searchQuery,
        userId,
        limit: 20
      });

      if (response.success) {
        memories = response.memories || [];
      } else {
        console.error('Failed to search memories:', response);
      }
    } catch (error) {
      console.error('Error searching memories:', error);
    } finally {
      loading = false;
    }
  }

  // Load user insights
  async function loadUserInsights() {
    try {
      const response = await mcp.getUserInsights({ userId });
      if (response.success) {
        userInsights = response.insights || [];
      }
    } catch (error) {
      console.error('Error loading user insights:', error);
    }
  }

  // Load episodic timeline
  async function loadEpisodicTimeline() {
    try {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(); // Last 30 days
      const endDate = new Date().toISOString();

      const response = await mcp.getEpisodicTimeline({
        userId,
        startDate,
        endDate
      });
      if (response.success) {
        episodicTimeline = response.timeline || [];
      }
    } catch (error) {
      console.error('Error loading episodic timeline:', error);
    }
  }

  // Load user preferences
  async function loadUserPreferences() {
    try {
      const response = await mcp.getUserPreferences({ userId });
      if (response.success) {
        userPreferences = response.preferences || [];
      }
    } catch (error) {
      console.error('Error loading user preferences:', error);
    }
  }

  // Handle tab change
  function changeTab(tab: string) {
    activeTab = tab;
    switch (tab) {
      case 'insights':
        loadUserInsights();
        break;
      case 'timeline':
        loadEpisodicTimeline();
        break;
      case 'preferences':
        loadUserPreferences();
        break;
    }
  }

  // Format date
  function formatDate(date: string | Date) {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Get memory type color
  function getMemoryTypeColor(type: string) {
    const colors: Record<string, string> = {
      'fact': 'bg-blue-500/20 text-blue-300',
      'experience': 'bg-green-500/20 text-green-300',
      'observation': 'bg-yellow-500/20 text-yellow-300',
      'preference': 'bg-purple-500/20 text-purple-300',
      'skill': 'bg-indigo-500/20 text-indigo-300',
      'relationship': 'bg-pink-500/20 text-pink-300',
      'goal': 'bg-emerald-500/20 text-emerald-300',
      'task': 'bg-orange-500/20 text-orange-300',
      'knowledge': 'bg-cyan-500/20 text-cyan-300',
      'conversation': 'bg-violet-500/20 text-violet-300'
    };
    return colors[type.toLowerCase()] || 'bg-gray-500/20 text-gray-300';
  }

  onMount(() => {
    if (isOpen) {
      loadUserInsights();
    }
  });

  $: if (isOpen && activeTab === 'insights') {
    loadUserInsights();
  }
</script>

{#if isOpen}
  <div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="bg-gray-900/90 backdrop-blur-xl border border-gray-700/50 rounded-2xl w-full max-w-6xl h-[80vh] flex flex-col shadow-2xl">
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b border-gray-700/50">
        <div class="flex items-center space-x-4">
          <div class="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h2 class="text-2xl font-bold text-white">Memory Center</h2>
        </div>
        <button
          on:click={() => isOpen = false}
          class="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
          aria-label="Close memory panel"
        >
          <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Tab Navigation -->
      <div class="flex border-b border-gray-700/50">
        {#each [
          { id: 'search', label: 'Search', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' },
          { id: 'timeline', label: 'Timeline', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
          { id: 'insights', label: 'Insights', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
          { id: 'preferences', label: 'Preferences', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' }
        ] as tab}
          <button
            on:click={() => changeTab(tab.id)}
            class="flex items-center space-x-2 px-6 py-4 text-sm font-medium transition-colors {activeTab === tab.id ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-300'}"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={tab.icon} />
            </svg>
            <span>{tab.label}</span>
          </button>
        {/each}
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-hidden">
        {#if activeTab === 'search'}
          <div class="h-full flex flex-col">
            <!-- Search Bar -->
            <div class="p-6 border-b border-gray-700/50">
              <div class="flex space-x-4">
                <div class="flex-1 relative">
                  <input
                    bind:value={searchQuery}
                    on:keydown={(e) => e.key === 'Enter' && searchMemories()}
                    placeholder="Search your memories..."
                    class="w-full bg-gray-800/50 border border-gray-600/50 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                  />
                  <div class="absolute inset-y-0 right-0 flex items-center pr-3">
                    <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
                <button
                  on:click={searchMemories}
                  disabled={loading}
                  class="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl transition-colors"
                >
                  {loading ? 'Searching...' : 'Search'}
                </button>
              </div>
            </div>

            <!-- Search Results -->
            <div class="flex-1 overflow-y-auto p-6">
              {#if memories.length > 0}
                <div class="space-y-4">
                  {#each memories as result}
                    <button
                      type="button"
                      class="w-full bg-gray-800/30 border border-gray-700/30 rounded-xl p-4 hover:bg-gray-800/50 transition-colors text-left"
                      on:click={() => selectedMemory = result.memory}
                      aria-label="View memory details for {result.memory.type}"
                    >
                      <div class="flex items-start justify-between mb-2">
                        <span class="inline-block px-2 py-1 text-xs font-medium rounded-lg {getMemoryTypeColor(result.memory.type)}">
                          {result.memory.type}
                        </span>
                        <div class="flex items-center space-x-2 text-xs text-gray-400">
                          <span>Relevance: {(result.relevanceScore * 100).toFixed(0)}%</span>
                          <span>•</span>
                          <span>{formatDate(result.memory.createdAt)}</span>
                        </div>
                      </div>
                      <p class="text-gray-300 text-sm mb-2">{result.memory.content}</p>
                      {#if result.memory.tags.length > 0}
                        <div class="flex flex-wrap gap-1">
                          {#each result.memory.tags as tag}
                            <span class="px-2 py-1 bg-gray-700/50 text-gray-300 text-xs rounded-md">#{tag}</span>
                          {/each}
                        </div>
                      {/if}
                    </button>
                  {/each}
                </div>
              {:else if searchQuery}
                <div class="text-center text-gray-400 py-12">
                  <svg class="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <p>No memories found for "{searchQuery}"</p>
                </div>
              {:else}
                <div class="text-center text-gray-400 py-12">
                  <svg class="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <p>Enter a search query to find your memories</p>
                </div>
              {/if}
            </div>
          </div>
        {/if}

        {#if activeTab === 'timeline'}
          <div class="h-full overflow-y-auto p-6">
            {#if episodicTimeline.length > 0}
              <div class="space-y-6">
                {#each episodicTimeline as episode}
                  <div class="bg-gray-800/30 border border-gray-700/30 rounded-xl p-4">
                    <div class="flex items-start justify-between mb-3">
                      <h3 class="text-lg font-semibold text-white">{episode.event}</h3>
                      <span class="text-sm text-gray-400">{formatDate(episode.createdAt)}</span>
                    </div>
                    <p class="text-gray-300 mb-3">{episode.outcome}</p>
                    {#if episode.participants && episode.participants.length > 0}
                      <div class="mb-2">
                        <span class="text-sm text-gray-400">Participants: </span>
                        <span class="text-sm text-gray-300">{episode.participants.join(', ')}</span>
                      </div>
                    {/if}
                    {#if episode.emotions && episode.emotions.length > 0}
                      <div class="flex flex-wrap gap-1 mb-2">
                        {#each episode.emotions as emotion}
                          <span class="px-2 py-1 bg-orange-500/20 text-orange-300 text-xs rounded-md">{emotion}</span>
                        {/each}
                      </div>
                    {/if}
                    <div class="flex items-center justify-between">
                      <span class="inline-block px-2 py-1 text-xs font-medium rounded-lg {episode.success ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}">
                        {episode.success ? 'Success' : 'Challenge'}
                      </span>
                      <span class="text-xs text-gray-400">Importance: {(episode.importance * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                {/each}
              </div>
            {:else}
              <div class="text-center text-gray-400 py-12">
                <svg class="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>No recent experiences found</p>
              </div>
            {/if}
          </div>
        {/if}

        {#if activeTab === 'insights'}
          <div class="h-full overflow-y-auto p-6">
            {#if userInsights.length > 0}
              <div class="space-y-4">
                {#each userInsights as insight}
                  <div class="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-xl p-4">
                    <div class="flex items-start space-x-3">
                      <div class="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <p class="text-gray-300">{insight}</p>
                    </div>
                  </div>
                {/each}
              </div>
            {:else}
              <div class="text-center text-gray-400 py-12">
                <svg class="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <p>No insights available yet</p>
                <p class="text-sm mt-2">Insights will appear as you interact more with the system</p>
              </div>
            {/if}
          </div>
        {/if}

        {#if activeTab === 'preferences'}
          <div class="h-full overflow-y-auto p-6">
            {#if userPreferences.length > 0}
              <div class="space-y-6">
                {#each Object.entries(userPreferences.reduce((acc, pref) => {
                  if (!acc[pref.category]) acc[pref.category] = [];
                  acc[pref.category].push(pref);
                  return acc;
                }, {} as Record<string, any[]>)) as [category, prefs]}
                  <div class="bg-gray-800/30 border border-gray-700/30 rounded-xl p-4">
                    <h3 class="text-lg font-semibold text-white mb-3 capitalize">{category.replace('_', ' ')}</h3>
                    <div class="space-y-2">
                      {#each (prefs as any[]) as pref}
                        <div class="flex items-center justify-between">
                          <span class="text-gray-300">{pref.preference || 'Unknown preference'}</span>
                          <div class="flex items-center space-x-2">
                            <div class="w-24 bg-gray-700 rounded-full h-2">
                              <div class="bg-blue-500 h-2 rounded-full" style="width: {(pref.strength || 0) * 100}%"></div>
                            </div>
                            <span class="text-sm text-gray-400">{((pref.strength || 0) * 100).toFixed(0)}%</span>
                          </div>
                        </div>
                      {/each}
                    </div>
                  </div>
                {/each}
              </div>
            {:else}
              <div class="text-center text-gray-400 py-12">
                <svg class="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                </svg>
                <p>No preferences learned yet</p>
                <p class="text-sm mt-2">Preferences will be learned from your interactions</p>
              </div>
            {/if}
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<!-- Memory Detail Modal -->
{#if selectedMemory}
  <div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-60 flex items-center justify-center p-4">
    <div class="bg-gray-900/90 backdrop-blur-xl border border-gray-700/50 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
      <div class="p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-xl font-bold text-white">Memory Details</h3>
          <button
            on:click={() => selectedMemory = null}
            class="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
            aria-label="Close memory details"
          >
            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div class="space-y-4">
          <div>
            <span class="inline-block px-2 py-1 text-xs font-medium rounded-lg {getMemoryTypeColor(selectedMemory.type)} mb-2">
              {selectedMemory.type}
            </span>
            <p class="text-gray-300">{selectedMemory.content}</p>
          </div>
          
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="text-gray-400">Importance:</span>
              <span class="text-white ml-2">{(selectedMemory.importance * 100).toFixed(0)}%</span>
            </div>
            <div>
              <span class="text-gray-400">Confidence:</span>
              <span class="text-white ml-2">{(selectedMemory.confidence * 100).toFixed(0)}%</span>
            </div>
            <div>
              <span class="text-gray-400">Created:</span>
              <span class="text-white ml-2">{formatDate(selectedMemory.createdAt)}</span>
            </div>
            <div>
              <span class="text-gray-400">Accessed:</span>
              <span class="text-white ml-2">{selectedMemory.accessCount} times</span>
            </div>
          </div>
          
          {#if selectedMemory.tags.length > 0}
            <div>
              <span class="text-gray-400 text-sm">Tags:</span>
              <div class="flex flex-wrap gap-1 mt-1">
                {#each selectedMemory.tags as tag}
                  <span class="px-2 py-1 bg-gray-700/50 text-gray-300 text-xs rounded-md">#{tag}</span>
                {/each}
              </div>
            </div>
          {/if}
          
          {#if selectedMemory.relationships.length > 0}
            <div>
              <span class="text-gray-400 text-sm">Related Memories:</span>
              <span class="text-white ml-2">{selectedMemory.relationships.length} connections</span>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}
