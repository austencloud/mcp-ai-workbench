<script lang="ts">
  import { getContext } from 'svelte';
  import { mcp, type ChatMessage } from '$lib/services/mcpClient';
  import MessageBubble from './MessageBubble.svelte';
  import StreamingMessageBubble from './StreamingMessageBubble.svelte';
  import InputBar from './InputBar.svelte';
  import SearchProgressIndicator from './SearchProgressIndicator.svelte';
  import MemoryIntegration from './MemoryIntegration.svelte';
  import MemoryPanel from './MemoryPanel.svelte';
  import { memoryService } from '$lib/services/memoryService.svelte';
  import { MemoryType } from '$lib/types/memory';

  const mcpState = getContext<any>('mcpState');

  let chatContainer: HTMLDivElement;
  let inputBar: any;
  let isSending = $state(false);
  let showMemoryPanel = $state(false);
  let memoryContext = $state('');
  let currentMessage = $state('');
  let isStreaming = $state(false);
  let streamingContent = $state('');
  let streamingMessageIndex = $state(-1);
  let memoryOperations = $state<Array<{
    messageIndex: number;
    operation: string;
    success: boolean;
    memoryId?: string;
    error?: string;
    timestamp: Date;
  }>>([]);
  let copyButtonState = $state<'idle' | 'copying' | 'success' | 'error'>('idle');

  // Function to track memory operations
  function trackMemoryOperation(operation: string, success: boolean, memoryId?: string, error?: string) {
    memoryOperations.push({
      messageIndex: mcpState.conversation.length - 1,
      operation,
      success,
      memoryId,
      error,
      timestamp: new Date()
    });
  }

  // Extract semantic memories from user input and AI response
  async function extractSemanticMemories(userInput: string, aiResponse: string) {
    try {
      // Patterns to detect user preferences and facts
      const preferencePatterns = [
        /I (?:am|really|actually) (?:fond of|love|like|enjoy|prefer|hate|dislike|can't stand) (.+)/i,
        /My favorite (.+) is (.+)/i,
        /I (?:work|live|study) (?:in|at|as) (.+)/i,
        /I'm (?:a|an) (.+)/i,
        /My name is (.+)/i,
        /I'm from (.+)/i,
        /I speak (.+)/i,
        /I have (?:a|an) (.+)/i
      ];

      // Check if AI acknowledged remembering something
      const aiRememberPatterns = [
        /I (?:will|'ll) remember (?:that )?(.+)/i,
        /I'll note (?:that )?(.+)/i,
        /(?:Got it|Understood)[\.,]? (.+)/i,
        /I've noted (?:that )?(.+)/i
      ];

      // Extract user preferences
      for (const pattern of preferencePatterns) {
        const match = userInput.match(pattern);
        if (match) {
          let preference = match[1] || match[2] || match[0];
          preference = preference.replace(/[\.!,]$/, '').trim();
          
          if (preference && preference.length > 2 && preference.length < 200) {
            console.log('Extracting user preference:', preference);
            
            const result = await memoryService.remember({
              input: `User preference: ${preference}`,
              context: {
                userId: 'default-user',
                workspaceId: mcpState.selectedWorkspace?.id,
                conversationId: mcpState.currentConversationId || 'new',
                timestamp: new Date(),
                relevantEntities: []
              },
              type: MemoryType.PREFERENCE,
              importance: 0.8
            });

            trackMemoryOperation('semantic extraction (user preference)', result.success, result.memoryId, result.error);
          }
        }
      }

      // Check if AI acknowledged remembering something and extract what it remembered
      for (const pattern of aiRememberPatterns) {
        const match = aiResponse.match(pattern);
        if (match) {
          let rememberedFact = match[1];
          if (rememberedFact) {
            rememberedFact = rememberedFact.replace(/[\.!,]$/, '').trim();
            
            if (rememberedFact.length > 5 && rememberedFact.length < 200) {
              console.log('Extracting AI-acknowledged fact:', rememberedFact);
              
              const result = await memoryService.remember({
                input: `Acknowledged fact: ${rememberedFact}`,
                context: {
                  userId: 'default-user',
                  workspaceId: mcpState.selectedWorkspace?.id,
                  conversationId: mcpState.currentConversationId || 'new',
                  timestamp: new Date(),
                  relevantEntities: []
                },
                type: MemoryType.FACT,
                importance: 0.7
              });

              trackMemoryOperation('semantic extraction (AI acknowledged)', result.success, result.memoryId, result.error);
            }
          }
        }
      }

      // Extract key concepts mentioned
      const keywordPatterns = [
        /(?:I work with|I use|I program in|I develop with) (.+)/i,
        /(?:I'm learning|I'm studying) (.+)/i,
        /(?:I'm interested in|I focus on) (.+)/i
      ];

      for (const pattern of keywordPatterns) {
        const match = userInput.match(pattern);
        if (match) {
          let concept = match[1].replace(/[\.!,]$/, '').trim();
          
          if (concept && concept.length > 2 && concept.length < 100) {
            console.log('Extracting concept:', concept);
            
            const result = await memoryService.addConcept(concept, `User mentioned: ${concept} (extracted from: "${userInput}")`);

            trackMemoryOperation('concept extraction', result.success, result.memoryId, result.error);
          }
        }
      }

    } catch (error) {
      console.error('Failed to extract semantic memories:', error);
      trackMemoryOperation('semantic extraction', false, undefined, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // Simulate streaming by revealing words progressively
  async function simulateStreaming(fullContent: string): Promise<void> {
    const words = fullContent.split(' ');
    streamingContent = '';

    for (let i = 0; i < words.length; i++) {
      if (!isStreaming) break; // Stop if streaming was cancelled

      streamingContent = words.slice(0, i + 1).join(' ');

      // Auto-scroll during streaming
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }

      // Adjust delay based on word length and content
      const word = words[i];
      let delay = 50; // Base delay

      if (word.includes('.') || word.includes('!') || word.includes('?')) {
        delay = 200; // Pause at sentence endings
      } else if (word.includes(',') || word.includes(';')) {
        delay = 100; // Pause at commas
      } else if (word.length > 8) {
        delay = 80; // Slower for long words
      }

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

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

    const sendStartTime = performance.now();
    console.log('🚀 [CHAT-UI] Starting message send');

    try {
      isSending = true;
      inputBar?.setDisabled(true);

      const userMessage: ChatMessage = {
        role: 'user',
        content: messageText
      };
      mcpState.addMessage(userMessage);

      // Defer memory operations to not block the main chat flow
      const memoryPromises: Promise<any>[] = [];

      // Store user message in memory (async)
      memoryPromises.push(
        memoryService.addConversationMessage(
          mcpState.currentConversationId || 'new',
          'user',
          messageText
        ).then(result => {
          trackMemoryOperation('addConversationMessage (user)', result.success, undefined, result.error);
          return result;
        })
      );

      // Auto-save conversation after adding user message (async)
      memoryPromises.push(mcpState.saveConversation());

      // Get relevant memory context (async, with timeout)
      const memorySearchPromise = Promise.race([
        memoryService.searchMemories({
          query: messageText,
          maxResults: 3,
          minImportance: 0.3
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Memory search timeout')), 1500)
        )
      ]).then(result => {
        return result;
      }).catch(() => {
        console.log('⚠️ [CHAT-UI] Memory search timed out or failed, proceeding without context');
        return [];
      });

      // Prepare messages - start with basic conversation
      let systemPrompt = mcpState.currentPersona.prompt;

      // Try to get memory context quickly, but don't wait too long
      const memorySearchStartTime = performance.now();
      const searchResults = await memorySearchPromise;
      const memorySearchDuration = performance.now() - memorySearchStartTime;
      console.log(`🧠 [CHAT-UI] Memory search completed in ${memorySearchDuration.toFixed(2)}ms`);

      // Add memory context if available
      if (Array.isArray(searchResults) && searchResults.length > 0) {
        const memoryContextText = searchResults
          .map((result: any) => `[${result.memory.type}] ${result.memory.content}`)
          .join('\n');
        systemPrompt += `\n\nRelevant memories:\n${memoryContextText}`;
        console.log(`📝 [CHAT-UI] Added ${searchResults.length} memory contexts`);
      }

      // Prepare messages for API call
      const messages: ChatMessage[] = [
        // System message with persona and memory context
        {
          role: 'system',
          content: systemPrompt
        },
        // Add attached snippets as context
        ...mcpState.attachedSnippets.map((snippet: any) => ({
          role: 'user' as const,
          content: `File: ${snippet.path}\n${snippet.startLine && snippet.endLine ? `Lines ${snippet.startLine}-${snippet.endLine}:\n` : ''}${snippet.text}`
        })),
        // Add conversation history
        ...mcpState.conversation
      ];

      // Add placeholder message for streaming
      const placeholderMessage: ChatMessage = {
        role: 'assistant',
        content: ''
      };
      mcpState.addMessage(placeholderMessage);
      streamingMessageIndex = mcpState.conversation.length - 1;
      isStreaming = true;
      streamingContent = '';

      // Send to backend with AI provider selection
      const chatStartTime = performance.now();
      console.log(`📤 [CHAT-UI] Sending to backend - Provider: ${mcpState.selectedAIProvider}, Model: ${mcpState.selectedAIModel}`);

      const result = await mcp.chat({
        messages,
        workspace: mcpState.selectedWorkspace?.id,
        conversationId: mcpState.currentConversationId ? parseInt(mcpState.currentConversationId) : undefined,
        provider: mcpState.selectedAIProvider,
        model: mcpState.selectedAIModel
      });

      const chatDuration = performance.now() - chatStartTime;
      console.log(`📥 [CHAT-UI] Backend response received in ${chatDuration.toFixed(2)}ms`);

      if (result.success && result.message) {
        // Update the placeholder message with the actual response
        const messageWithFlags = {
          ...result.message,
          webSearchUsed: result.webSearchUsed || false,
          mathComputationUsed: result.mathComputationUsed || false
        };

        // Simulate streaming by revealing words progressively
        await simulateStreaming(messageWithFlags.content);

        // Update the existing message instead of adding a new one
        mcpState.conversation[streamingMessageIndex] = messageWithFlags;

        // Stop streaming
        isStreaming = false;

        // Defer post-response memory operations to not block UI
        setTimeout(async () => {
          const postResponseStartTime = performance.now();

          try {
            // Store AI response in memory (async)
            const aiMemoryResult = await memoryService.addConversationMessage(
              mcpState.currentConversationId || 'new',
              'assistant',
              result.message.content
            );
            trackMemoryOperation('addConversationMessage (assistant)', aiMemoryResult.success, undefined, aiMemoryResult.error);

            // Extract semantic information from the conversation (async)
            await extractSemanticMemories(messageText, result.message.content);

            // Auto-save after AI response (async)
            await mcpState.saveConversation();

            const postResponseDuration = performance.now() - postResponseStartTime;
            console.log(`💾 [CHAT-UI] Post-response memory operations completed in ${postResponseDuration.toFixed(2)}ms (async)`);
          } catch (memoryError) {
            console.error('Post-response memory operations failed:', memoryError);
          }
        }, 0);
      } else {
        // Add error message
        mcpState.addMessage({
          role: 'assistant',
          content: 'Sorry, I encountered an error processing your message. Please try again.'
        });
      }

      const totalDuration = performance.now() - sendStartTime;
      console.log(`✅ [CHAT-UI] Total message send completed in ${totalDuration.toFixed(2)}ms`);

    } catch (error) {
      const totalDuration = performance.now() - sendStartTime;
      console.error(`❌ [CHAT-UI] Message send failed after ${totalDuration.toFixed(2)}ms:`, error);

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

  async function copyConversation() {
    const conversationData = {
      timestamp: new Date().toISOString(),
      conversationId: mcpState.currentConversationId,
      workspace: mcpState.selectedWorkspace?.name || 'No workspace',
      aiProvider: mcpState.selectedAIProvider,
      aiModel: mcpState.selectedAIModel,
      messageCount: mcpState.conversation.length,
      messages: mcpState.conversation.map((msg: any, index: number) => ({
        index: index + 1,
        role: msg.role,
        content: msg.content,
        webSearchUsed: msg.webSearchUsed || false,
        mathComputationUsed: msg.mathComputationUsed || false,
        timestamp: new Date().toISOString(), // In a real app, you'd store actual timestamps
        memoryOperations: memoryOperations.filter(op => op.messageIndex === index)
      })),
      memoryOperations: {
        total: memoryOperations.length,
        successful: memoryOperations.filter(op => op.success).length,
        failed: memoryOperations.filter(op => !op.success).length,
        operations: memoryOperations
      }
    };

    const formattedConversation = `# MCP AI Workbench Conversation Export

**Exported:** ${conversationData.timestamp}
**Conversation ID:** ${conversationData.conversationId || 'New conversation'}
**Workspace:** ${conversationData.workspace}
**AI Provider:** ${conversationData.aiProvider}
**AI Model:** ${conversationData.aiModel}
**Total Messages:** ${conversationData.messageCount}

## Memory Operations Summary
**Total Operations:** ${conversationData.memoryOperations.total}
**Successful:** ${conversationData.memoryOperations.successful}
**Failed:** ${conversationData.memoryOperations.failed}

---

${conversationData.messages.map((msg: any) => `
## Message ${msg.index} - ${msg.role.charAt(0).toUpperCase() + msg.role.slice(1)}
${msg.webSearchUsed ? '🌐 **Web Search Used**\n' : ''}${msg.mathComputationUsed ? '🧮 **Mathematical Computation Used**\n' : ''}
${msg.memoryOperations.length > 0 ? `🧠 **Memory Operations:**\n${msg.memoryOperations.map((op: any) => `- ${op.operation}: ${op.success ? '✅ Success' : '❌ Failed'}${op.error ? ` (${op.error})` : ''}${op.memoryId ? ` [ID: ${op.memoryId}]` : ''}`).join('\n')}\n\n` : ''}
${msg.content}

---
`).join('')}

## Detailed Memory Operations Log
${conversationData.memoryOperations.operations.length > 0 ?
  conversationData.memoryOperations.operations.map((op: any) => `
**${op.timestamp}** - Message ${op.messageIndex + 1}
- Operation: ${op.operation}
- Status: ${op.success ? '✅ Success' : '❌ Failed'}
${op.error ? `- Error: ${op.error}` : ''}
${op.memoryId ? `- Memory ID: ${op.memoryId}` : ''}
`).join('') : 'No memory operations recorded.'}

*Exported from MCP AI Workbench*`;

    try {
      copyButtonState = 'copying';
      await navigator.clipboard.writeText(formattedConversation);
      copyButtonState = 'success';
      console.log('Conversation copied to clipboard');

      // Reset button state after 2 seconds
      setTimeout(() => {
        copyButtonState = 'idle';
      }, 2000);
    } catch (error) {
      copyButtonState = 'error';
      console.error('Failed to copy conversation:', error);

      // Reset button state after 3 seconds
      setTimeout(() => {
        copyButtonState = 'idle';
      }, 3000);

      // Fallback: create a downloadable file
      const blob = new Blob([formattedConversation], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `conversation-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
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

      <!-- Memory Panel Button -->
      <button
        class="btn-futuristic px-4 py-2 text-xs hover-lift"
        onclick={() => showMemoryPanel = !showMemoryPanel}
        title="Open Memory Center"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        Memory
      </button>

      {#if mcpState.conversation.length > 0}
        <button
          class="btn-futuristic px-4 py-2 text-xs hover-lift {copyButtonState === 'success' ? 'bg-green-500/20 border-green-400/30' : copyButtonState === 'error' ? 'bg-red-500/20 border-red-400/30' : ''}"
          onclick={copyConversation}
          disabled={isSending || copyButtonState === 'copying'}
          title="Copy conversation to clipboard"
        >
          {#if copyButtonState === 'copying'}
            <div class="flex items-center">
              <div class="w-3 h-3 mr-1 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Copying...
            </div>
          {:else if copyButtonState === 'success'}
            <div class="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              Copied!
            </div>
          {:else if copyButtonState === 'error'}
            <div class="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Failed
            </div>
          {:else}
            <div class="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy
            </div>
          {/if}
        </button>
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
          {#if index === streamingMessageIndex && isStreaming}
            <StreamingMessageBubble {message} isStreaming={true} streamedContent={streamingContent} />
          {:else}
            <MessageBubble {message} />
          {/if}
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
                  <!-- Web search indicator could be added here in the future -->
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
    <!-- Memory Integration -->
    <MemoryIntegration
      conversationId={mcpState.currentConversationId}
      bind:currentMessage={currentMessage}
      userId="default-user"
      workspaceId={mcpState.selectedWorkspace?.id}
      on:memoryContext={(e) => memoryContext = e.detail.context}
      on:memoryStored={(e) => trackMemoryOperation('manual memory storage', true, e.detail.memoryId)}
      on:episodeRecorded={(e) => trackMemoryOperation('episode recording', true, e.detail.episodeId)}
    />

    <!-- Minimal Search Progress Indicator -->
    <SearchProgressIndicator isInputArea={true} />

    <InputBar bind:this={inputBar} onsend={sendMessage} />
  </div>
</div>

<!-- Memory Panel -->
<MemoryPanel bind:isOpen={showMemoryPanel} userId="default-user" />
