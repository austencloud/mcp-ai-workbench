<script lang="ts">
  import type { ChatMessage } from '$lib/services/mcpClient';

  interface Props {
    message: ChatMessage & { webSearchUsed?: boolean; mathComputationUsed?: boolean };
  }

  let { message }: Props = $props();
</script>

<div class="flex gap-3 mb-4" class:flex-row-reverse={message.role === 'user'}>
  <!-- Avatar -->
  <div class="flex-shrink-0">
    {#if message.role === 'user'}
      <div class="w-10 h-10 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      </div>
    {:else}
      <div class="w-10 h-10 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      </div>
    {/if}
  </div>

  <!-- Message Content -->
  <div class="flex-1 max-w-[80%]">
    <!-- Header -->
    <div class="flex items-center gap-2 mb-1" class:justify-end={message.role === 'user'}>
      <span class="text-xs text-white/60 font-medium">
        {message.role === 'user' ? 'You' : 'Assistant'}
      </span>
      {#if message.webSearchUsed}
        <div class="flex items-center gap-1 px-2 py-0.5 bg-green-500/20 border border-green-400/30 rounded-full">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
          </svg>
          <span class="text-xs text-green-300 font-medium">Web Search</span>
        </div>
      {/if}
      {#if message.mathComputationUsed}
        <div class="flex items-center gap-1 px-2 py-0.5 bg-blue-500/20 border border-blue-400/30 rounded-full">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <span class="text-xs text-blue-300 font-medium">Math Computation</span>
        </div>
      {/if}
      <div class="w-1 h-1 bg-white/30 rounded-full"></div>
      <span class="text-xs text-white/40">
        {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>

    <!-- Message Bubble -->
    <div
      class="chat-bubble-futuristic text-sm text-white/90 leading-relaxed"
      class:chat-bubble-user={message.role === 'user'}
      class:chat-bubble-assistant={message.role === 'assistant'}
    >
      <div class="whitespace-pre-wrap break-words">
        {message.content}
      </div>
    </div>
  </div>
</div>
