<script lang="ts">
  import { getContext } from 'svelte';
  import { mcp } from '$lib/services/mcpClient';

  const mcpState = getContext<any>('mcpState');

  let fileInput: HTMLInputElement;
  let isLoading = $state(false);

  async function handleFileSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    
    if (!file) return;

    try {
      isLoading = true;
      
      // Read file content
      const text = await file.text();
      
      // Add snippet to attached snippets
      mcpState.addSnippet({
        path: file.name,
        text: text
      });
      
      // Reset file input
      target.value = '';
    } catch (error) {
      console.error('Failed to read file:', error);
    } finally {
      isLoading = false;
    }
  }

  function openFilePicker() {
    fileInput?.click();
  }

  function removeSnippet(index: number) {
    mcpState.removeSnippet(index);
  }
</script>

<div class="flex items-center gap-3">
  <!-- File Input (Hidden) -->
  <input
    bind:this={fileInput}
    type="file"
    class="hidden"
    accept=".txt,.md,.js,.ts,.py,.html,.css,.json,.xml,.yml,.yaml,.svelte,.vue,.jsx,.tsx"
    onchange={handleFileSelect}
  />

  <!-- File Picker Button -->
  <button
    class="btn-futuristic flex items-center gap-2 hover-lift neon-glow"
    onclick={openFilePicker}
    disabled={isLoading}
  >
    {#if isLoading}
      <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
    {:else}
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
      </svg>
    {/if}
    <span class="text-sm">Attach File</span>
  </button>

  <!-- Attached Files Count -->
  {#if mcpState.attachedSnippets.length > 0}
    <div class="glass px-2 py-1 rounded-full text-xs font-medium text-blue-300 border-blue-400/30">
      {mcpState.attachedSnippets.length}
    </div>
  {/if}
</div>

<!-- Attached Files List -->
{#if mcpState.attachedSnippets.length > 0}
  <div class="mt-4">
    <div class="text-xs text-white/70 mb-2 font-medium">Attached Files:</div>
    <div class="space-y-2">
      {#each mcpState.attachedSnippets as snippet, index (index)}
        <div class="glass rounded-lg p-3 hover:bg-white/15 transition-all duration-300">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-400 to-purple-400 flex items-center justify-center flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-white/90 truncate">{snippet.path}</div>
              {#if snippet.startLine !== undefined && snippet.endLine !== undefined}
                <div class="text-xs text-white/60">
                  Lines {snippet.startLine}-{snippet.endLine}
                </div>
              {:else}
                <div class="text-xs text-white/60">
                  Full file • {snippet.text.length} characters
                </div>
              {/if}
            </div>
            <button
              class="btn-futuristic p-2 text-xs hover-lift"
              onclick={() => removeSnippet(index)}
              aria-label="Remove attached file"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      {/each}
    </div>
  </div>
{/if}
