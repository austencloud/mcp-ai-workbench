<script lang="ts">
  import { getContext } from 'svelte';
  import { mcp, type ChatMessage } from '$lib/services/mcpClient';
  import MessageBubble from './MessageBubble.svelte';
  import InputBar from './InputBar.svelte';

  const mcpState = getContext<any>('mcpState');

  let chatContainer: HTMLDivElement;
  let inputBar: any;
  let isSending = $state(false);

  // Auto-scroll to bottom when new messages are added
  $effect(() => {
    if (mcpState.conversation.length > 0 && chatContainer) {
      setTimeout(() => {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }, 100);
    }
  });

  async function sendMessage(messageText: string) {
    if (!messageText.trim() || isSending) return;

    try {
      isSending = true;
      inputBar?.setDisabled(true);

      const userMessage: ChatMessage = {
        role: 'user',
        content: messageText
      };
      mcpState.addMessage(userMessage);

      // Auto-save conversation after adding user message
      await mcpState.saveConversation();

      // Prepare messages for API call
      const messages: ChatMessage[] = [
        // System message with persona
        {
          role: 'system',
          content: mcpState.currentPersona.prompt
        },
        // Add attached snippets as context
        ...mcpState.attachedSnippets.map((snippet: any) => ({
          role: 'user' as const,
          content: `File: ${snippet.path}\n${snippet.startLine && snippet.endLine ? `Lines ${snippet.startLine}-${snippet.endLine}:\n` : ''}${snippet.text}`
        })),
        // Add conversation history
        ...mcpState.conversation
      ];

      // Send to backend with AI provider selection
      const result = await mcp.chat({
        messages,
        workspace: mcpState.selectedWorkspace?.id,
        conversationId: mcpState.currentConversationId ? parseInt(mcpState.currentConversationId) : undefined,
        provider: mcpState.selectedAIProvider,
        model: mcpState.selectedAIModel
      });

      if (result.success && result.message) {
        mcpState.addMessage(result.message);
        // Auto-save after AI response
        await mcpState.saveConversation();
      } else {
        // Add error message
        mcpState.addMessage({
          role: 'assistant',
          content: 'Sorry, I encountered an error processing your message. Please try again.'
        });
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      mcpState.addMessage({
        role: 'assistant',
        content: 'Sorry, I encountered a connection error. Please check your connection and try again.'
      });
    } finally {
      isSending = false;
      inputBar?.setDisabled(false);
    }
  }

  function clearConversation() {
    mcpState.newConversation();
  }

  let warningInfo = $derived(() => {
    const messageCount = mcpState.conversation.length;
    if (messageCount > 20) {
      return { level: 'critical', message: 'Very long conversation may significantly impact AI response quality' };
    } else if (messageCount > 12) {
      return { level: 'warning', message: 'Long conversation may start affecting response quality' };
    }
    return null;
  });
</script>

<div class="flex flex-col h-full chat-container">
  <!-- Chat Header -->
  <div class="flex items-center justify-between p-6 border-b border-white/10 flex-shrink-0">
    <div class="flex items-center gap-3">
      <div class="flex items-center gap-2">
        <div class="w-3 h-3 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-pulse"></div>
        <h3 class="font-semibold text-white/90 text-lg">AI Chat</h3>
      </div>
      {#if mcpState.currentPersona.name !== 'Default'}
        <div class="glass px-3 py-1 rounded-full text-xs font-medium text-white/80">
          {mcpState.currentPersona.name}
        </div>
      {/if}
    </div>

    <div class="flex items-center gap-3">
      {#if mcpState.attachedSnippets.length > 0}
        <div class="glass px-3 py-1 rounded-full text-xs font-medium text-blue-300 border-blue-400/30">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
          {mcpState.attachedSnippets.length} file{mcpState.attachedSnippets.length !== 1 ? 's' : ''}
        </div>
      {/if}

      {#if mcpState.conversation.length > 0}
        <button
          class="btn-futuristic px-4 py-2 text-xs hover-lift"
          onclick={clearConversation}
          disabled={isSending}
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Clear
        </button>
      {/if}
    </div>
  </div>

  <!-- Messages Area -->
  <div
    bind:this={chatContainer}
    class="flex-1 overflow-y-auto p-6 custom-scrollbar min-h-0"
  >
    {#if mcpState.conversation.length === 0}
      <div class="flex items-center justify-center h-full">
        <div class="text-center max-w-md">
          <div class="glass-readable rounded-3xl p-8 mb-6">
            <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.955 8.955 0 01-2.697-.413l-3.178 1.59a1 1 0 01-1.414-1.414l1.59-3.178A8.955 8.955 0 013 12a8 8 0 018-8 8 8 0 018 8z" />
              </svg>
            </div>
            <h3 class="text-xl font-bold text-high-contrast mb-3">Start a conversation</h3>
            <p class="text-accessible text-sm leading-relaxed">
              {#if mcpState.selectedWorkspace}
                Ask questions, get help, or discuss your work in the <span class="text-gradient font-medium">{mcpState.selectedWorkspace.name}</span> workspace.
              {:else}
                Select a workspace and start chatting with your AI assistant.
              {/if}
            </p>
          </div>

          <!-- Quick Actions -->
          <div class="grid grid-cols-2 gap-3 text-xs">
            <div class="glass rounded-xl p-3 hover:bg-white/15 transition-all duration-300 cursor-pointer hover-lift">
              <div class="text-blue-300 font-medium mb-1">💡 Ask for help</div>
              <div class="text-white/60">Get assistance with your tasks</div>
            </div>
            <div class="glass rounded-xl p-3 hover:bg-white/15 transition-all duration-300 cursor-pointer hover-lift">
              <div class="text-purple-300 font-medium mb-1">📝 Review code</div>
              <div class="text-white/60">Analyze attached files</div>
            </div>
          </div>
        </div>
      </div>
    {:else}
      <div class="space-y-6">
        {#each mcpState.conversation as message, index (index)}
          <MessageBubble {message} />
        {/each}

        {#if isSending}
          <div class="flex gap-3 mb-4">
            <div class="flex-shrink-0">
              <div class="w-10 h-10 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
            </div>
            <div class="flex-1 max-w-[80%]">
              <div class="chat-bubble-futuristic chat-bubble-assistant">
                <div class="flex items-center space-x-2">
                  <div class="flex space-x-1">
                    <div class="w-2 h-2 bg-white/60 rounded-full animate-bounce"></div>
                    <div class="w-2 h-2 bg-white/60 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
                    <div class="w-2 h-2 bg-white/60 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
                  </div>
                  <span class="text-white/60 text-xs">Thinking...</span>
                </div>
              </div>
            </div>
          </div>
        {/if}

        {#if warningInfo()}
          {@const warning = warningInfo()}
          {#if warning}
            <div class="p-4 rounded-lg {warning.level === 'critical' ? 'bg-red-500/10' : 'bg-yellow-500/10'} border {warning.level === 'critical' ? 'border-red-500' : 'border-yellow-500'} text-sm">
              <div class="flex items-center gap-2">
                {#if warning.level === 'critical'}
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14h4m2 4H8l4-8h4l-4 8zm0-8V4a1 1 0 00-1-1h-2a1 1 0 00-1 1v2m8 8h2a1 1 0 001-1v-2a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                {:else}
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3l2 2m-2-2l-2 2m2-2V7m0 14v-3l-2-2m2 2l2-2m-2 2z" />
                  </svg>
                {/if}
                <div class="flex-1">
                  {warning.message}
                </div>
              </div>
            </div>
          {/if}
        {/if}
      </div>
    {/if}
  </div>

  <!-- Input Area -->
  <div class="flex-shrink-0">
    <InputBar bind:this={inputBar} onsend={sendMessage} />
  </div>
</div>
