<script lang="ts">
  import { mcp } from '$lib/services/mcpClient';
  import { getContext, onMount } from 'svelte';

  const mcpState = getContext<any>('mcpState');

  let providers = $state<any[]>([]);
  let selectedProvider = $state('openai');
  let selectedModel = $state('');
  let isLoading = $state(false);
  let showProviders = $state(false);
  let dropdownElement: HTMLDivElement;

  // Load available providers
  async function loadProviders() {
    try {
      isLoading = true;
      const result = await mcp.getAvailableProviders();
      
      if (result.success && result.providers) {
        providers = result.providers;
        
        const availableProvider = providers.find(p => p?.available && p?.name);
        if (availableProvider) {
          selectedProvider = availableProvider.name.toLowerCase();
          selectedModel = availableProvider.models?.[0] || '';
        }
      }
    } catch (error) {
      console.error('Failed to load providers:', error);
      providers = [];
    } finally {
      isLoading = false;
    }
  }

  // Refresh Ollama models
  async function refreshOllama() {
    try {
      await mcp.refreshOllamaModels();
      await loadProviders(); // Reload providers after refresh
    } catch (error) {
      console.error('Failed to refresh Ollama models:', error);
    }
  }

  // Get provider icon
  function getProviderIcon(providerName: string) {
    switch (providerName.toLowerCase()) {
      case 'openai': return '🤖';
      case 'anthropic': return '🧠';
      case 'google': return '🔍';
      case 'deepseek': return '🌊';
      case 'ollama': return '🦙';
      default: return '🤖';
    }
  }

  // Get model display name
  function getModelDisplayName(model: string) {
    // Shorten long model names for display
    if (model.length > 20) {
      return model.substring(0, 17) + '...';
    }
    return model;
  }

  function selectModel(provider: string, model: string) {
    selectedProvider = provider.toLowerCase();
    selectedModel = model;
    showProviders = false;
  }

  function handleClickOutside(event: MouseEvent) {
    if (dropdownElement && !dropdownElement.contains(event.target as Node)) {
      showProviders = false;
    }
  }

  function handleEscape(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      showProviders = false;
    }
  }

  onMount(() => {
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  });

  // Update context when selection changes
  $effect(() => {
    if (selectedProvider && selectedModel) {
      mcpState.setAIProvider(selectedProvider, selectedModel);
    }
  });

  // Load providers on mount
  $effect(() => {
    loadProviders();
  });
</script>

<div class="relative dropdown-parent" bind:this={dropdownElement}>
  <!-- Provider Selector Button -->
  <button
    class="btn-futuristic px-4 py-2 flex items-center gap-2 hover-lift focus-visible"
    onclick={() => showProviders = !showProviders}
    disabled={isLoading}
    aria-expanded={showProviders}
    aria-haspopup="true"
    aria-label="Select AI Provider"
  >
    {#if isLoading}
      <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
    {:else}
      <span class="text-lg">{getProviderIcon(selectedProvider)}</span>
      <span class="text-sm font-medium">
        {selectedProvider.charAt(0).toUpperCase() + selectedProvider.slice(1)}
      </span>
      {#if selectedModel}
        <span class="text-xs text-white/60">
          {getModelDisplayName(selectedModel)}
        </span>
      {/if}
    {/if}
    <span class="text-xs ml-1 transition-transform duration-200" class:rotate-180={showProviders}>
      ▼
    </span>
  </button>

  <!-- Provider Dropdown -->
  {#if showProviders}
    <div
      class="dropdown-menu top-full left-0 mt-2 w-80 glass-readable rounded-xl p-4 border border-white/20 shadow-2xl"
      role="menu"
      aria-label="AI Provider Selection"
    >
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-semibold text-high-contrast">AI Providers</h3>
          <button
            class="text-xs text-blue-300 hover:text-blue-200 focus-visible"
            onclick={refreshOllama}
            aria-label="Refresh Ollama models"
          >
            🔄 Refresh Ollama
          </button>
        </div>

        {#each providers as provider (provider.name)}
          <div class="space-y-2">
            <!-- Provider Header -->
            <div class="flex items-center gap-2">
              <span class="text-lg">{getProviderIcon(provider.name)}</span>
              <span class="font-medium text-medium-contrast">{provider.name}</span>
              <div class="ml-auto flex items-center gap-1">
                <div
                  class="w-2 h-2 rounded-full"
                  class:bg-green-400={provider.available}
                  class:bg-red-400={!provider.available}
                ></div>
                <span class="text-xs text-accessible">
                  {provider.available ? 'Available' : 'Unavailable'}
                </span>
              </div>
            </div>

            <!-- Models -->
            {#if provider.available && provider.models.length > 0}
              <div class="ml-6 space-y-1">
                {#each provider.models as model (model)}
                  <button
                    class="flex items-center gap-2 cursor-pointer group w-full text-left p-2 rounded hover:bg-white/10 transition-colors"
                    onclick={() => selectModel(provider.name, model)}
                    class:bg-white-15={selectedModel === model && selectedProvider === provider.name.toLowerCase()}
                  >
                    <div
                      class="w-3 h-3 rounded-full border-2 border-white/30 flex items-center justify-center"
                      class:bg-blue-500={selectedModel === model && selectedProvider === provider.name.toLowerCase()}
                      class:border-blue-500={selectedModel === model && selectedProvider === provider.name.toLowerCase()}
                    >
                      {#if selectedModel === model && selectedProvider === provider.name.toLowerCase()}
                        <div class="w-1 h-1 bg-white rounded-full"></div>
                      {/if}
                    </div>
                    <span class="text-sm text-accessible group-hover:text-high-contrast transition-colors">
                      {model}
                    </span>
                  </button>
                {/each}
              </div>
            {:else if !provider.available}
              <div class="ml-6 text-xs text-accessible">
                {#if provider.name === 'Ollama'}
                  Ollama not running or no models installed
                {:else}
                  API key not configured
                {/if}
              </div>
            {:else}
              <div class="ml-6 text-xs text-accessible">
                No models available
              </div>
            {/if}
          </div>
        {/each}

        {#if providers.length === 0}
          <div class="text-center py-4 text-white/60">
            <div class="text-2xl mb-2">🤖</div>
            <p class="text-sm">No AI providers configured</p>
            <p class="text-xs mt-1">Check your API keys in .env file</p>
          </div>
        {/if}
      </div>

      <!-- Close Button -->
      <div class="mt-4 pt-3 border-t border-white/10">
        <button
          class="btn-futuristic px-3 py-1 text-sm w-full hover-lift focus-visible"
          onclick={() => showProviders = false}
          aria-label="Close AI provider selection"
        >
          Close
        </button>
      </div>
    </div>
  {/if}
</div>

<!-- Click outside to close -->
{#if showProviders}
  <div
    class="fixed inset-0 dropdown-overlay"
    role="button"
    tabindex="-1"
    onclick={() => showProviders = false}
    onkeydown={(e) => e.key === 'Escape' && (showProviders = false)}
    aria-label="Close dropdown"
  ></div>
{/if}

<style>
  .rotate-180 {
    transform: rotate(180deg);
  }
</style>
