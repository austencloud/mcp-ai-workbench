<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { searchProgressService, type SearchSession } from '$lib/services/searchProgressService';
  import { faviconService } from '$lib/services/faviconService';

  export let isInputArea = false; // New prop to determine if this is the minimal input area version

  let activeSessions: Map<string, SearchSession> = new Map();
  let isConnected = false;
  let connectionError: string | null = null;
  let showDetailedView = false;
  let currentSiteIndex = 0;

  // Subscribe to search progress updates
  const unsubscribeSessions = searchProgressService.activeSessions.subscribe(sessions => {
    activeSessions = sessions;
  });

  const unsubscribeConnected = searchProgressService.isConnected.subscribe(connected => {
    isConnected = connected;
  });

  const unsubscribeError = searchProgressService.connectionError.subscribe(error => {
    connectionError = error;
  });

  onMount(() => {
    // Preload common favicons
    faviconService.preloadCommonFavicons();

    // Auto-cycle through sites for the minimal view
    if (isInputArea) {
      const interval = setInterval(() => {
        const visibleSessions = Array.from(activeSessions.values()).filter(s => s.visible);
        if (visibleSessions.length > 0) {
          const session = visibleSessions[0];
          if (session.sites.length > 0) {
            currentSiteIndex = (currentSiteIndex + 1) % session.sites.length;
          }
        }
      }, 2000); // Change site every 2 seconds

      return () => clearInterval(interval);
    }
  });

  onDestroy(() => {
    unsubscribeSessions();
    unsubscribeConnected();
    unsubscribeError();
  });

  function hideSession(sessionId: string) {
    searchProgressService.hideSession(sessionId);
  }

  function getStatusIcon(status: string): string {
    switch (status) {
      case 'pending': return '⏳';
      case 'searching': return '🔍';
      case 'completed': return '✅';
      case 'error': return '❌';
      default: return '🔄';
    }
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'pending': return 'text-yellow-400';
      case 'searching': return 'text-blue-400';
      case 'completed': return 'text-green-400';
      case 'error': return 'text-red-400';
      default: return 'text-gray-400';
    }
  }

  function getCurrentStatusText(session: SearchSession): string {
    if (session.sites.length === 0) return 'Initializing search...';

    const currentSite = session.sites[currentSiteIndex % session.sites.length];
    if (!currentSite) return 'Searching...';

    switch (currentSite.status) {
      case 'pending': return `Queuing ${currentSite.domain}...`;
      case 'searching': return `Reading ${currentSite.domain}...`;
      case 'completed': return `Analyzed ${currentSite.domain}`;
      case 'error': return `Failed ${currentSite.domain}`;
      default: return `Processing ${currentSite.domain}...`;
    }
  }

  function getScrollingUrls(session: SearchSession): string[] {
    return session.sites.map(site => site.domain);
  }

  // Get visible sessions
  $: visibleSessions = Array.from(activeSessions.values()).filter(session => session.visible);
</script>

{#if isInputArea}
  <!-- Minimal Horizontal Search Indicator for Input Area -->
  {#if visibleSessions.length > 0}
    {#each visibleSessions as session (session.id)}
      <div class="flex items-center justify-between w-full py-2 px-3 bg-blue-500/10 border border-blue-500/20 rounded-lg mb-2">
        <!-- Left side: Scrolling URLs -->
        <div class="flex-1 overflow-hidden">
          <div class="flex items-center space-x-4">
            <!-- Search icon -->
            <div class="flex items-center space-x-2">
              <div class="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <span class="text-xs text-blue-300">🔍</span>
            </div>

            <!-- Scrolling URLs -->
            <div class="flex-1 overflow-hidden">
              <div class="flex space-x-6 animate-scroll-left">
                {#each session.sites as site, index}
                  <div class="flex items-center space-x-2 whitespace-nowrap">
                    <img
                      src={`https://www.google.com/s2/favicons?domain=${site.domain}&sz=16`}
                      alt={site.domain}
                      class="w-3 h-3 object-contain"
                      on:error={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const fallback = target.nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = 'inline';
                      }}
                    />
                    <span class="text-xs hidden">{faviconService.getFallbackEmoji(site.domain)}</span>
                    <span class="text-xs text-gray-300">{site.domain}</span>
                    <span class="text-xs {getStatusColor(site.status)}">{getStatusIcon(site.status)}</span>
                  </div>
                {/each}
              </div>
            </div>
          </div>
        </div>

        <!-- Right side: Status and expand button -->
        <div class="flex items-center space-x-3 ml-4">
          <span class="text-xs text-gray-400">{getCurrentStatusText(session)}</span>
          <button
            on:click={() => showDetailedView = !showDetailedView}
            class="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            title="Show detailed search progress"
          >
            📊
          </button>
        </div>
      </div>

      <!-- Detailed Dropdown View -->
      {#if showDetailedView}
        <div class="mt-2 p-4 bg-gray-900/50 border border-gray-700/50 rounded-lg backdrop-blur-sm">
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <h4 class="text-sm font-medium text-white/90">Search Progress Details</h4>
              <button
                on:click={() => showDetailedView = false}
                class="text-gray-400 hover:text-white transition-colors"
                title="Hide details"
              >
                ✕
              </button>
            </div>

            <div class="text-xs text-gray-400">
              Query: <span class="text-white/80">{session.query}</span>
            </div>

            <!-- Progress Bar -->
            <div>
              <div class="flex items-center justify-between mb-1">
                <span class="text-xs text-gray-400">Overall Progress</span>
                <span class="text-xs text-gray-400">{Math.round(session.progress)}%</span>
              </div>
              <div class="w-full bg-gray-700/50 rounded-full h-2">
                <div
                  class="h-full bg-gradient-to-r from-blue-400 to-purple-400 rounded-full transition-all duration-500"
                  style="width: {session.progress}%"
                ></div>
              </div>
            </div>

            <!-- Site Details -->
            {#if session.sites.length > 0}
              <div class="space-y-2">
                <span class="text-xs text-gray-400">Sites Being Analyzed:</span>
                {#each session.sites as site}
                  <div class="flex items-center justify-between p-2 bg-gray-800/30 rounded">
                    <div class="flex items-center space-x-2">
                      <img
                        src={`https://www.google.com/s2/favicons?domain=${site.domain}&sz=16`}
                        alt={site.domain}
                        class="w-4 h-4"
                      />
                      <span class="text-xs text-white/80">{site.domain}</span>
                    </div>
                    <div class="flex items-center space-x-2">
                      <span class="text-xs {getStatusColor(site.status)}">{getStatusIcon(site.status)}</span>
                      <span class="text-xs text-gray-400 capitalize">{site.status}</span>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </div>
      {/if}
    {/each}
  {/if}
{:else}
  <!-- Original detailed view for non-input areas -->
  {#if visibleSessions.length > 0}
    <div class="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {#each visibleSessions as session (session.id)}
        <div
          class="glass-readable rounded-2xl p-4 border border-white/20 backdrop-blur-xl shadow-2xl animate-slide-in-right"
          style="animation-duration: 0.3s;"
        >
          <!-- Header -->
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <div class="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
              <span class="text-sm font-medium text-white/90">Web Search</span>
            </div>
            <button
              on:click={() => hideSession(session.id)}
              class="text-white/60 hover:text-white/90 transition-colors"
              aria-label="Hide search progress"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Query -->
          <div class="mb-3">
            <p class="text-xs text-white/70 mb-1">Searching for:</p>
            <p class="text-sm text-white/90 font-medium truncate" title={session.query}>
              {session.query}
            </p>
          </div>

          <!-- Progress Bar -->
          <div class="mb-3">
            <div class="flex items-center justify-between mb-1">
              <span class="text-xs text-white/70">Progress</span>
              <span class="text-xs text-white/70">{Math.round(session.progress)}%</span>
            </div>
            <div class="w-full bg-white/10 rounded-full h-2 overflow-hidden">
              <div
                class="h-full bg-gradient-to-r from-blue-400 to-purple-400 rounded-full transition-all duration-500 ease-out"
                style="width: {session.progress}%"
              ></div>
            </div>
          </div>

          <!-- Sites Progress -->
          {#if session.sites.length > 0}
            <div class="space-y-2">
              <p class="text-xs text-white/70 mb-2">Visiting sites:</p>
              {#each session.sites as site (site.domain)}
                <div class="flex items-center gap-3 p-2 rounded-lg bg-white/5 border border-white/10">
                  <!-- Favicon -->
                  <div class="flex-shrink-0 w-6 h-6 rounded-md overflow-hidden bg-white/10 flex items-center justify-center">
                    {#if site.favicon}
                      <img
                        src={site.favicon}
                        alt={site.domain}
                        class="w-4 h-4 object-contain"
                        on:error={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const fallback = target.nextElementSibling as HTMLElement;
                          if (fallback) fallback.style.display = 'block';
                        }}
                      />
                      <span class="text-xs hidden">{faviconService.getFallbackEmoji(site.domain)}</span>
                    {:else}
                      <span class="text-xs">{faviconService.getFallbackEmoji(site.domain)}</span>
                    {/if}
                  </div>

                  <!-- Site Info -->
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <span class="text-xs font-medium text-white/90 truncate">
                        {site.domain}
                      </span>
                      <span class="text-xs {getStatusColor(site.status)}">
                        {getStatusIcon(site.status)}
                      </span>
                    </div>
                    {#if site.status === 'searching'}
                      <div class="flex items-center gap-1 mt-1">
                        <div class="flex space-x-1">
                          <div class="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style="animation-delay: 0ms"></div>
                          <div class="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style="animation-delay: 150ms"></div>
                          <div class="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style="animation-delay: 300ms"></div>
                        </div>
                        <span class="text-xs text-blue-400">Analyzing...</span>
                      </div>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          {/if}

          <!-- Status Message -->
          {#if session.status === 'error'}
            <div class="mt-3 p-2 rounded-lg bg-red-500/20 border border-red-400/30">
              <div class="flex items-center gap-2">
                <span class="text-red-400">❌</span>
                <span class="text-xs text-red-300">Search failed</span>
              </div>
            </div>
          {:else if session.status === 'completed'}
            <div class="mt-3 p-2 rounded-lg bg-green-500/20 border border-green-400/30">
              <div class="flex items-center gap-2">
                <span class="text-green-400">✅</span>
                <span class="text-xs text-green-300">Search completed</span>
              </div>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
{/if}

<!-- Connection Status (only show if there's an error) -->
{#if connectionError && !isConnected}
  <div class="fixed bottom-4 right-4 z-50">
    <div class="glass-readable rounded-xl p-3 border border-red-400/30 bg-red-500/20">
      <div class="flex items-center gap-2">
        <span class="text-red-400">⚠️</span>
        <span class="text-xs text-red-300">Search progress unavailable</span>
        <button 
          on:click={() => searchProgressService.reconnect()}
          class="text-xs text-red-300 hover:text-red-200 underline ml-2"
        >
          Retry
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  @keyframes slide-in-right {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes scroll-left {
    0% {
      transform: translateX(0);
    }
    100% {
      transform: translateX(-100%);
    }
  }

  .animate-slide-in-right {
    animation: slide-in-right 0.3s ease-out;
  }

  .animate-scroll-left {
    animation: scroll-left 15s linear infinite;
  }

  .animate-scroll-left:hover {
    animation-play-state: paused;
  }
</style>
