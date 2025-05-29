<script lang="ts">
  import { getContext } from 'svelte';

  const mcpState = getContext<any>('mcpState');

  let startLine = $state<number | ''>('');
  let endLine = $state<number | ''>('');

  function applyLineRange() {
    if (mcpState.attachedSnippets.length === 0) return;
    
    const lastSnippetIndex = mcpState.attachedSnippets.length - 1;
    const lastSnippet = mcpState.attachedSnippets[lastSnippetIndex];
    
    if (!lastSnippet) return;

    const lines = lastSnippet.text.split('\n');
    const start = typeof startLine === 'number' ? Math.max(0, startLine - 1) : 0;
    const end = typeof endLine === 'number' ? Math.min(lines.length, endLine) : lines.length;
    
    if (start >= end) return;

    const slicedText = lines.slice(start, end).join('\n');
    
    // Update the last snippet with sliced content
    const updatedSnippets = [...mcpState.attachedSnippets];
    updatedSnippets[lastSnippetIndex] = {
      ...lastSnippet,
      text: slicedText,
      startLine: start + 1,
      endLine: end
    };
    
    mcpState.attachedSnippets = updatedSnippets;
    
    // Reset inputs
    startLine = '';
    endLine = '';
  }

  function handleKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      applyLineRange();
    }
  }

  let canApply = $derived(mcpState.attachedSnippets.length > 0 &&
    (typeof startLine === 'number' || typeof endLine === 'number'));
</script>

<div class="flex items-center gap-3">
  <div class="flex items-center gap-2">
    <div class="text-xs text-white/70 font-medium">Lines:</div>

    <input
      type="number"
      placeholder="Start"
      class="input-futuristic w-16 text-xs text-center"
      bind:value={startLine}
      onkeydown={handleKeyPress}
      disabled={mcpState.attachedSnippets.length === 0}
      min="1"
    />

    <span class="text-xs text-white/50">→</span>

    <input
      type="number"
      placeholder="End"
      class="input-futuristic w-16 text-xs text-center"
      bind:value={endLine}
      onkeydown={handleKeyPress}
      disabled={mcpState.attachedSnippets.length === 0}
      min="1"
    />
  </div>

  <button
    class="btn-futuristic px-3 py-2 text-xs hover-lift neon-glow"
    onclick={applyLineRange}
    disabled={!canApply}
  >
    <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 4V2a1 1 0 011-1h4a1 1 0 011 1v2m3 0V2a1 1 0 011-1h4a1 1 0 011 1v2m-9 4h10a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V10a2 2 0 012-2z" />
    </svg>
    Slice
  </button>
</div>

{#if mcpState.attachedSnippets.length === 0}
  <div class="text-xs text-white/50 mt-2 flex items-center gap-1">
    <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    Attach a file first to slice by line range
  </div>
{:else if mcpState.attachedSnippets.length > 0}
  <div class="text-xs text-white/60 mt-2 flex items-center gap-1">
    <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    Will slice the most recently attached file
  </div>
{/if}
