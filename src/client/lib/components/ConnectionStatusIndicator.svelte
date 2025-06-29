<script lang="ts">
  import { onMount } from 'svelte';
  import { backendDiscoveryService } from '$lib/services/BackendDiscoveryService';
  import { connectionHealthService } from '$lib/services/ConnectionHealthService';
  import { ConnectionState, type ConnectionStatus } from '$lib/types/connection';

  // Reactive state
  let connectionStatus = $state<ConnectionStatus>({
    state: 'disconnected' as ConnectionState,
    port: null,
    lastConnected: null,
    retryCount: 0,
    error: null,
    latency: null
  });

  let connectionHealth = $state({
    isHealthy: false,
    lastHeartbeat: null,
    consecutiveFailures: 0,
    circuitBreakerState: 'closed'
  });

  let showDetails = $state(false);
  let showToast = $state(false);
  let toastMessage = $state('');
  let toastType = $state<'success' | 'error' | 'warning' | 'info'>('info');

  // Subscribe to connection status changes
  onMount(() => {
    let unsubscribeStatus: (() => void) | null = null;
    let unsubscribeHealth: (() => void) | null = null;

    if (backendDiscoveryService) {
      unsubscribeStatus = backendDiscoveryService.connectionStatus.subscribe(status => {
        const previousState = connectionStatus.state;
        connectionStatus = status;

        // Show toast notifications for state changes
        if (previousState !== status.state) {
          showStatusToast(status.state, status.error);
        }
      });
    }

    if (connectionHealthService) {
      unsubscribeHealth = connectionHealthService.connectionHealth.subscribe(health => {
        connectionHealth = health;
      });
    }

    return () => {
      unsubscribeStatus?.();
      unsubscribeHealth?.();
    };
  });

  function showStatusToast(state: ConnectionState, error?: string | null) {
    switch (state) {
      case ConnectionState.CONNECTED:
        showToastNotification('Connected to backend', 'success');
        break;
      case ConnectionState.CONNECTING:
        showToastNotification('Connecting to backend...', 'info');
        break;
      case ConnectionState.RECONNECTING:
        showToastNotification('Reconnecting...', 'warning');
        break;
      case ConnectionState.ERROR:
        showToastNotification(error || 'Connection error', 'error');
        break;
      case ConnectionState.DISCONNECTED:
        showToastNotification('Disconnected from backend', 'warning');
        break;
    }
  }

  function showToastNotification(message: string, type: typeof toastType) {
    toastMessage = message;
    toastType = type;
    showToast = true;
    
    setTimeout(() => {
      showToast = false;
    }, 4000);
  }

  function getStatusColor(state: ConnectionState): string {
    switch (state) {
      case ConnectionState.CONNECTED: return 'text-green-400';
      case ConnectionState.CONNECTING: return 'text-blue-400';
      case ConnectionState.RECONNECTING: return 'text-yellow-400';
      case ConnectionState.ERROR: return 'text-red-400';
      case ConnectionState.DISCONNECTED: return 'text-gray-400';
      default: return 'text-gray-400';
    }
  }

  function getStatusIcon(state: ConnectionState): string {
    switch (state) {
      case ConnectionState.CONNECTED: return '🟢';
      case ConnectionState.CONNECTING: return '🔵';
      case ConnectionState.RECONNECTING: return '🟡';
      case ConnectionState.ERROR: return '🔴';
      case ConnectionState.DISCONNECTED: return '⚫';
      default: return '⚫';
    }
  }

  function getStatusText(state: ConnectionState): string {
    switch (state) {
      case ConnectionState.CONNECTED: return 'Connected';
      case ConnectionState.CONNECTING: return 'Connecting';
      case ConnectionState.RECONNECTING: return 'Reconnecting';
      case ConnectionState.ERROR: return 'Error';
      case ConnectionState.DISCONNECTED: return 'Disconnected';
      default: return 'Unknown';
    }
  }

  async function handleReconnect() {
    showToastNotification('Forcing reconnection...', 'info');
    if (backendDiscoveryService) {
      await backendDiscoveryService.forceReconnect();
    }
  }

  function handleResetCircuitBreaker() {
    if (connectionHealthService) {
      connectionHealthService.resetCircuitBreaker();
      showToastNotification('Circuit breaker reset', 'info');
    }
  }

  function formatLatency(latency: number | null): string {
    if (latency === null) return 'N/A';
    if (latency < 100) return `${latency}ms`;
    if (latency < 1000) return `${latency}ms`;
    return `${(latency / 1000).toFixed(1)}s`;
  }

  function formatTimestamp(date: Date | null): string {
    if (!date) return 'Never';
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  }
</script>

<!-- Connection Status Indicator -->
<div class="fixed top-4 right-4 z-50">
  <!-- Main Status Button -->
  <button
    class="glass-readable rounded-lg px-3 py-2 flex items-center gap-2 hover:bg-white/10 transition-all duration-200 focus-visible"
    onclick={() => showDetails = !showDetails}
    title="Connection Status - Click for details"
  >
    <span class="text-lg">{getStatusIcon(connectionStatus.state)}</span>
    <span class="{getStatusColor(connectionStatus.state)} text-sm font-medium">
      {getStatusText(connectionStatus.state)}
    </span>
    {#if connectionStatus.port}
      <span class="text-xs text-white/60">:{connectionStatus.port}</span>
    {/if}
    {#if connectionStatus.latency}
      <span class="text-xs text-white/60">{formatLatency(connectionStatus.latency)}</span>
    {/if}
  </button>

  <!-- Detailed Status Panel -->
  {#if showDetails}
    <div class="absolute top-full right-0 mt-2 w-80 glass-readable rounded-xl p-4 shadow-xl border border-white/20">
      <div class="space-y-4">
        <!-- Header -->
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-high-contrast">Connection Status</h3>
          <button
            class="text-white/60 hover:text-white transition-colors"
            onclick={() => showDetails = false}
            aria-label="Close details"
          >
            ✕
          </button>
        </div>

        <!-- Current Status -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-accessible">Status:</span>
            <span class="{getStatusColor(connectionStatus.state)} font-medium">
              {getStatusIcon(connectionStatus.state)} {getStatusText(connectionStatus.state)}
            </span>
          </div>
          
          {#if connectionStatus.port}
            <div class="flex items-center justify-between">
              <span class="text-accessible">Port:</span>
              <span class="text-medium-contrast font-mono">{connectionStatus.port}</span>
            </div>
          {/if}

          {#if connectionStatus.latency}
            <div class="flex items-center justify-between">
              <span class="text-accessible">Latency:</span>
              <span class="text-medium-contrast">{formatLatency(connectionStatus.latency)}</span>
            </div>
          {/if}

          <div class="flex items-center justify-between">
            <span class="text-accessible">Last Connected:</span>
            <span class="text-medium-contrast text-sm">{formatTimestamp(connectionStatus.lastConnected)}</span>
          </div>

          {#if connectionStatus.retryCount > 0}
            <div class="flex items-center justify-between">
              <span class="text-accessible">Retry Count:</span>
              <span class="text-yellow-400">{connectionStatus.retryCount}</span>
            </div>
          {/if}
        </div>

        <!-- Health Information -->
        <div class="border-t border-white/10 pt-3 space-y-2">
          <h4 class="text-medium-contrast font-medium">Health Monitor</h4>
          
          <div class="flex items-center justify-between">
            <span class="text-accessible">Healthy:</span>
            <span class="{connectionHealth.isHealthy ? 'text-green-400' : 'text-red-400'}">
              {connectionHealth.isHealthy ? '✅ Yes' : '❌ No'}
            </span>
          </div>

          <div class="flex items-center justify-between">
            <span class="text-accessible">Last Heartbeat:</span>
            <span class="text-medium-contrast text-sm">{formatTimestamp(connectionHealth.lastHeartbeat)}</span>
          </div>

          {#if connectionHealth.consecutiveFailures > 0}
            <div class="flex items-center justify-between">
              <span class="text-accessible">Failures:</span>
              <span class="text-red-400">{connectionHealth.consecutiveFailures}</span>
            </div>
          {/if}

          <div class="flex items-center justify-between">
            <span class="text-accessible">Circuit Breaker:</span>
            <span class="text-medium-contrast capitalize">{connectionHealth.circuitBreakerState}</span>
          </div>
        </div>

        <!-- Error Information -->
        {#if connectionStatus.error}
          <div class="border-t border-white/10 pt-3">
            <h4 class="text-medium-contrast font-medium mb-2">Error Details</h4>
            <div class="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p class="text-red-400 text-sm">{connectionStatus.error}</p>
            </div>
          </div>
        {/if}

        <!-- Actions -->
        <div class="border-t border-white/10 pt-3 flex gap-2">
          <button
            class="btn-futuristic px-3 py-2 text-sm hover-lift flex-1"
            onclick={handleReconnect}
          >
            🔄 Reconnect
          </button>
          
          {#if connectionHealth.circuitBreakerState === 'open'}
            <button
              class="btn-futuristic px-3 py-2 text-sm hover-lift flex-1"
              onclick={handleResetCircuitBreaker}
            >
              🔧 Reset
            </button>
          {/if}
        </div>
      </div>
    </div>
  {/if}
</div>

<!-- Toast Notifications -->
{#if showToast}
  <div class="fixed top-16 right-4 z-50 animate-slide-in-right">
    <div class="glass-readable rounded-lg px-4 py-3 flex items-center gap-3 shadow-xl border border-white/20 max-w-sm">
      <span class="text-lg">
        {#if toastType === 'success'}🟢
        {:else if toastType === 'error'}🔴
        {:else if toastType === 'warning'}🟡
        {:else}🔵{/if}
      </span>
      <p class="text-medium-contrast text-sm">{toastMessage}</p>
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

  .animate-slide-in-right {
    animation: slide-in-right 0.3s ease-out;
  }
</style>
