<script lang="ts">
  import { onMount } from 'svelte';
  import { memoryService, memoryStats, userInsights, episodicTimeline, userPreferences } from '$lib/services/memoryService';
  import type { MemoryStats } from '$lib/types/memory';

  export let userId: string = 'default-user';

  let analytics: {
    totalMemories: number;
    memoryGrowth: number;
    topTopics: string[];
    activityLevel: 'low' | 'medium' | 'high';
  } = {
    totalMemories: 0,
    memoryGrowth: 0,
    topTopics: [],
    activityLevel: 'low'
  };

  let loading = true;
  let selectedTimeRange = '7d'; // 7d, 30d, 90d, all

  async function loadDashboardData() {
    loading = true;
    try {
      // Load all memory data
      await Promise.all([
        memoryService.getMemoryStats(userId),
        memoryService.getUserInsights(userId),
        memoryService.getEpisodicTimeline(userId, getTimeRange()),
        memoryService.getUserPreferences(userId),
        loadAnalytics()
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      loading = false;
    }
  }

  async function loadAnalytics() {
    analytics = await memoryService.getMemoryAnalytics();
  }

  function getTimeRange() {
    const now = new Date();
    const ranges = {
      '7d': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      '30d': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      '90d': new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
      'all': new Date(0)
    };
    return { start: ranges[selectedTimeRange], end: now };
  }

  function getActivityLevelColor(level: string): string {
    const colors = {
      'low': 'text-yellow-400',
      'medium': 'text-blue-400',
      'high': 'text-green-400'
    };
    return colors[level] || 'text-gray-400';
  }

  function getActivityLevelIcon(level: string): string {
    const icons = {
      'low': 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      'medium': 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
      'high': 'M13 10V3L4 14h7v7l9-11h-7z'
    };
    return icons[level] || icons['low'];
  }

  async function optimizeMemory() {
    try {
      const response = await memoryService.optimizeMemory();
      if (response.success) {
        // Reload dashboard data
        await loadDashboardData();
        showNotification('Memory optimization completed successfully', 'success');
      } else {
        showNotification('Memory optimization failed: ' + response.error, 'error');
      }
    } catch (error) {
      console.error('Error optimizing memory:', error);
      showNotification('Memory optimization failed', 'error');
    }
  }

  function showNotification(message: string, type: 'success' | 'error' = 'success') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-4 py-2 rounded-lg shadow-lg z-50 ${
      type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
    }`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  onMount(() => {
    memoryService.setCurrentUser(userId);
    loadDashboardData();
  });

  $: if (selectedTimeRange) {
    memoryService.getEpisodicTimeline(userId, getTimeRange());
  }
</script>

<div class="memory-dashboard p-6 space-y-6">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-3xl font-bold text-white">Memory Dashboard</h1>
      <p class="text-gray-400 mt-1">Insights into your AI memory system</p>
    </div>
    
    <div class="flex items-center space-x-4">
      <!-- Time Range Selector -->
      <select
        bind:value={selectedTimeRange}
        class="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="7d">Last 7 days</option>
        <option value="30d">Last 30 days</option>
        <option value="90d">Last 90 days</option>
        <option value="all">All time</option>
      </select>
      
      <!-- Optimize Button -->
      <button
        on:click={optimizeMemory}
        class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center space-x-2"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <span>Optimize</span>
      </button>
    </div>
  </div>

  {#if loading}
    <div class="flex items-center justify-center py-12">
      <div class="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      <span class="ml-3 text-gray-400">Loading memory data...</span>
    </div>
  {:else}
    <!-- Stats Overview -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <!-- Total Memories -->
      <div class="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-gray-400 text-sm">Total Memories</p>
            <p class="text-2xl font-bold text-white">{analytics.totalMemories}</p>
          </div>
          <div class="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
        </div>
      </div>

      <!-- Memory Growth -->
      <div class="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-gray-400 text-sm">Weekly Growth</p>
            <p class="text-2xl font-bold text-white">+{analytics.memoryGrowth}</p>
          </div>
          <div class="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
        </div>
      </div>

      <!-- Activity Level -->
      <div class="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-gray-400 text-sm">Activity Level</p>
            <p class="text-2xl font-bold {getActivityLevelColor(analytics.activityLevel)} capitalize">
              {analytics.activityLevel}
            </p>
          </div>
          <div class="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={getActivityLevelIcon(analytics.activityLevel)} />
            </svg>
          </div>
        </div>
      </div>

      <!-- System Health -->
      <div class="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-gray-400 text-sm">System Health</p>
            <p class="text-2xl font-bold text-green-400">
              {$memoryStats?.systemHealth?.status || 'Healthy'}
            </p>
          </div>
          <div class="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Top Topics -->
    {#if analytics.topTopics.length > 0}
      <div class="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
        <h3 class="text-lg font-semibold text-white mb-4">Top Topics</h3>
        <div class="flex flex-wrap gap-2">
          {#each analytics.topTopics as topic}
            <span class="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm border border-blue-500/30">
              {topic}
            </span>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Recent Insights -->
    {#if $userInsights.length > 0}
      <div class="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
        <h3 class="text-lg font-semibold text-white mb-4">Recent Insights</h3>
        <div class="space-y-3">
          {#each $userInsights.slice(0, 5) as insight}
            <div class="flex items-start space-x-3">
              <div class="w-6 h-6 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <p class="text-gray-300 text-sm">{insight}</p>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Recent Experiences -->
    {#if $episodicTimeline.length > 0}
      <div class="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
        <h3 class="text-lg font-semibold text-white mb-4">Recent Experiences</h3>
        <div class="space-y-4">
          {#each $episodicTimeline.slice(0, 3) as episode}
            <div class="border-l-4 border-blue-500 pl-4">
              <div class="flex items-start justify-between">
                <h4 class="font-medium text-white">{episode.event}</h4>
                <span class="text-xs text-gray-400">
                  {new Date(episode.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p class="text-gray-300 text-sm mt-1">{episode.outcome}</p>
              <div class="flex items-center space-x-2 mt-2">
                <span class="inline-block px-2 py-1 text-xs font-medium rounded {episode.success ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}">
                  {episode.success ? 'Success' : 'Challenge'}
                </span>
                {#if episode.emotions && episode.emotions.length > 0}
                  <span class="text-xs text-gray-400">
                    {episode.emotions.join(', ')}
                  </span>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- User Preferences -->
    {#if $userPreferences.length > 0}
      <div class="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
        <h3 class="text-lg font-semibold text-white mb-4">Learned Preferences</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          {#each Object.entries($userPreferences.reduce((acc, pref) => {
            if (!acc[pref.category]) acc[pref.category] = [];
            acc[pref.category].push(pref);
            return acc;
          }, {})).slice(0, 4) as [category, prefs]}
            <div>
              <h4 class="font-medium text-gray-300 mb-2 capitalize">{category.replace('_', ' ')}</h4>
              <div class="space-y-1">
                {#each prefs.slice(0, 3) as pref}
                  <div class="flex items-center justify-between text-sm">
                    <span class="text-gray-400">{pref.preference}</span>
                    <div class="flex items-center space-x-2">
                      <div class="w-16 bg-gray-700 rounded-full h-1.5">
                        <div class="bg-blue-500 h-1.5 rounded-full" style="width: {pref.strength * 100}%"></div>
                      </div>
                      <span class="text-xs text-gray-500">{(pref.strength * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Performance Metrics -->
    {#if $memoryStats?.systemHealth?.performanceMetrics}
      <div class="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
        <h3 class="text-lg font-semibold text-white mb-4">Performance Metrics</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="text-center">
            <p class="text-2xl font-bold text-blue-400">
              {$memoryStats.systemHealth.performanceMetrics.searchLatency}ms
            </p>
            <p class="text-gray-400 text-sm">Search Latency</p>
          </div>
          <div class="text-center">
            <p class="text-2xl font-bold text-green-400">
              {($memoryStats.systemHealth.performanceMetrics.storageUsage / 1024 / 1024).toFixed(1)}MB
            </p>
            <p class="text-gray-400 text-sm">Storage Used</p>
          </div>
          <div class="text-center">
            <p class="text-2xl font-bold text-purple-400">
              {($memoryStats.systemHealth.performanceMetrics.indexHealth * 100).toFixed(0)}%
            </p>
            <p class="text-gray-400 text-sm">Index Health</p>
          </div>
        </div>
      </div>
    {/if}
  {/if}
</div>

<style>
  .memory-dashboard {
    @apply min-h-screen bg-gray-900;
  }
  
  .animate-spin {
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
