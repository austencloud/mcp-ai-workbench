<script lang="ts">
  import { onMount } from 'svelte';
  import type { ChatMessage } from '$lib/services/mcpClient';

  interface Props {
    message: ChatMessage;
    isStreaming?: boolean;
    streamedContent?: string;
  }

  let { message, isStreaming = false, streamedContent = '' }: Props = $props();

  let displayedContent = $state('');
  let currentIndex = $state(0);
  let isTyping = $state(false);

  // Streaming animation for AI responses
  onMount(() => {
    if (message.role === 'assistant' && isStreaming) {
      startStreamingAnimation();
    } else {
      displayedContent = message.content;
    }
  });

  // Watch for streaming content updates
  $effect(() => {
    if (isStreaming && streamedContent) {
      displayedContent = streamedContent;
    }
  });

  function startStreamingAnimation() {
    isTyping = true;
    const content = message.content;
    const words = content.split(' ');
    let wordIndex = 0;
    
    const interval = setInterval(() => {
      if (wordIndex < words.length) {
        displayedContent = words.slice(0, wordIndex + 1).join(' ');
        wordIndex++;
      } else {
        clearInterval(interval);
        isTyping = false;
      }
    }, 50); // Adjust speed as needed
  }

  function getMessageClasses(role: string): string {
    if (role === 'user') {
      return 'ml-auto bg-gradient-to-r from-blue-600 to-purple-600 text-white';
    } else {
      return 'mr-auto bg-gray-800/50 border border-gray-700/30 text-gray-100';
    }
  }

  function formatContent(content: string): string {
    // Basic markdown-like formatting
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-gray-700 px-1 rounded">$1</code>')
      .replace(/\n/g, '<br>');
  }
</script>

<div class="flex items-start space-x-3 mb-6">
  <!-- Avatar -->
  <div class="flex-shrink-0">
    {#if message.role === 'user'}
      <div class="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      </div>
    {:else}
      <div class="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>
    {/if}
  </div>

  <!-- Message Content -->
  <div class="flex-1 min-w-0">
    <div class="max-w-3xl {getMessageClasses(message.role)} rounded-2xl px-4 py-3 shadow-lg">
      <!-- Special indicators -->
      {#if message.webSearchUsed}
        <div class="flex items-center space-x-2 mb-2 text-blue-300 text-sm">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
          </svg>
          <span>Web Search Used</span>
        </div>
      {/if}

      {#if message.mathComputationUsed}
        <div class="flex items-center space-x-2 mb-2 text-green-300 text-sm">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <span>Mathematical Computation Used</span>
        </div>
      {/if}

      <!-- Message text with streaming effect -->
      <div class="prose prose-invert max-w-none">
        {@html formatContent(displayedContent)}
        
        <!-- Typing indicator -->
        {#if isTyping}
          <span class="inline-block w-2 h-4 bg-current animate-pulse ml-1">|</span>
        {/if}
      </div>

      <!-- Streaming indicator for real-time responses -->
      {#if isStreaming && message.role === 'assistant'}
        <div class="flex items-center space-x-2 mt-2 text-gray-400 text-xs">
          <div class="flex space-x-1">
            <div class="w-1 h-1 bg-current rounded-full animate-bounce" style="animation-delay: 0ms"></div>
            <div class="w-1 h-1 bg-current rounded-full animate-bounce" style="animation-delay: 150ms"></div>
            <div class="w-1 h-1 bg-current rounded-full animate-bounce" style="animation-delay: 300ms"></div>
          </div>
          <span>AI is thinking...</span>
        </div>
      {/if}
    </div>

    <!-- Timestamp -->
    <div class="text-xs text-gray-500 mt-1 {message.role === 'user' ? 'text-right' : 'text-left'}">
      {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
    </div>
  </div>
</div>

<style>
  @keyframes bounce {
    0%, 80%, 100% {
      transform: translateY(0);
    }
    40% {
      transform: translateY(-4px);
    }
  }

  .animate-bounce {
    animation: bounce 1s infinite;
  }
</style>
