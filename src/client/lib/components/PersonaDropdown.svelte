<script lang="ts">
  import { getContext } from 'svelte';
  import type { Persona } from '$lib/services/mcpClient';

  const mcpState = getContext<any>('mcpState');
  let isOpen = $state(false);
  let dropdownElement: HTMLDivElement;

  const personas: Persona[] = [
    {
      name: 'Default',
      prompt: 'You are a helpful assistant.'
    },
    {
      name: 'Researcher',
      prompt: 'You are a research assistant. You help analyze information, find patterns, and provide detailed insights. You ask clarifying questions and provide well-sourced answers.'
    },
    {
      name: 'Coder',
      prompt: 'You are a code reviewer and programming assistant. You help with code analysis, debugging, best practices, and technical implementation. You provide clear, actionable coding advice.'
    },
    {
      name: 'Strategist',
      prompt: 'You are a business strategist. You help with planning, decision-making, and strategic thinking. You consider multiple perspectives and provide structured analysis.'
    }
  ];

  function selectPersona(persona: Persona) {
    mcpState.currentPersona = persona;
    isOpen = false;
  }

  function handleClickOutside(event: MouseEvent) {
    if (dropdownElement && !dropdownElement.contains(event.target as Node)) {
      isOpen = false;
    }
  }

  function handleEscape(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      isOpen = false;
    }
  }

  $effect(() => {
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  });
</script>

<div class="relative dropdown-parent" bind:this={dropdownElement}>
  <button
    class="btn-futuristic flex items-center gap-2 w-full justify-between hover-lift neon-glow"
    onclick={() => isOpen = !isOpen}
  >
    <div class="flex items-center gap-2">
      <div class="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      </div>
      <span class="text-white/90 font-medium">{mcpState.currentPersona.name}</span>
    </div>
    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-white/70 transition-transform duration-200" class:rotate-180={isOpen} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
    </svg>
  </button>

  {#if isOpen}
    <div class="dropdown-menu top-full left-0 right-0 mt-2 glass rounded-xl p-2 dropdown-container space-y-1">
      {#each personas as persona (persona.name)}
        <button
          class="w-full text-left p-3 rounded-lg transition-all duration-200 hover:bg-slate-700/50"
            class:bg-slate-600={mcpState.currentPersona.name === persona.name}
          class:border-slate-400={mcpState.currentPersona.name === persona.name}
          onclick={() => selectPersona(persona)}
        >
          <div class="flex items-start gap-3">
            <div class="w-6 h-6 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span class="text-xs font-bold text-white">{persona.name[0]}</span>
            </div>
            <div class="flex-1 min-w-0">
              <div class="font-medium text-white/90 text-sm">{persona.name}</div>
              <div class="text-xs text-white/60 truncate mt-1">
                {persona.prompt.slice(0, 80)}...
              </div>
            </div>
            {#if mcpState.currentPersona.name === persona.name}
              <div class="w-2 h-2 bg-blue-400 rounded-full animate-pulse flex-shrink-0 mt-2"></div>
            {/if}
          </div>
        </button>
      {/each}
    </div>
  {/if}
</div>

<!-- Click outside to close -->
{#if isOpen}
  <div
    class="fixed inset-0 dropdown-overlay"
    role="button"
    tabindex="-1"
    onclick={() => isOpen = false}
    onkeydown={(e) => e.key === 'Escape' && (isOpen = false)}
    aria-label="Close dropdown"
  ></div>
{/if}
