<script lang="ts">
  import { setContext } from 'svelte';
  import { mcp, type Todo, type Workspace, type ChatMessage, type Persona, type Snippet } from '$lib/services/mcpClient';
  import '../app.css';

  import WorkspaceSelector from '$lib/components/WorkspaceSelector.svelte';
  import TodoPanel from '$lib/components/TodoPanel.svelte';
  import PersonaDropdown from '$lib/components/PersonaDropdown.svelte';
  import FilePicker from '$lib/components/FilePicker.svelte';
  import LineRangeInput from '$lib/components/LineRangeInput.svelte';
  import ChatPane from '$lib/components/ChatPane.svelte';
  import FileBrowser from '$lib/components/FileBrowser.svelte';
  import AIProviderSelector from '$lib/components/AIProviderSelector.svelte';

  let { children } = $props();

  // Svelte 5 runes for state management
  let workspaces = $state<Workspace[]>([]);
  let selectedWorkspace = $state<Workspace | null>(null);
  let todos = $state<Todo[]>([]);
  let conversation = $state<ChatMessage[]>([]);
  let currentPersona = $state<Persona>({ 
    name: 'Default', 
    prompt: 'You are a helpful assistant.' 
  });
  let attachedSnippets = $state<Snippet[]>([]);
  let isLoading = $state(false);
  let selectedAIProvider = $state<string>('openai');
  let selectedAIModel = $state<string>('');
  let conversations = $state<any[]>([]);
  let currentConversationId = $state<string | null>(null);

  // Create context object
  const mcpState = {
    get workspaces() { return workspaces; },
    set workspaces(value: Workspace[]) { workspaces = value; },
    
    get selectedWorkspace() { return selectedWorkspace; },
    set selectedWorkspace(value: Workspace | null) { selectedWorkspace = value; },
    
    get todos() { return todos; },
    set todos(value: Todo[]) { todos = value; },
    
    get conversation() { return conversation; },
    set conversation(value: ChatMessage[]) { conversation = value; },
    
    get currentPersona() { return currentPersona; },
    set currentPersona(value: Persona) { currentPersona = value; },
    
    get attachedSnippets() { return attachedSnippets; },
    set attachedSnippets(value: Snippet[]) { attachedSnippets = value; },
    
    get isLoading() { return isLoading; },
    set isLoading(value: boolean) { isLoading = value; },

    get selectedAIProvider() { return selectedAIProvider; },
    get selectedAIModel() { return selectedAIModel; },
    get conversations() { return conversations; },
    get currentConversationId() { return currentConversationId; },

    // Helper methods
    addWorkspace: (workspace: Workspace) => {
      workspaces = [...workspaces, workspace];
    },
    
    updateTodo: (updatedTodo: Todo) => {
      todos = todos.map(t => t.id === updatedTodo.id ? updatedTodo : t);
    },
    
    addTodo: (todo: Todo) => {
      todos = [...todos, todo];
    },
    
    addMessage: (message: ChatMessage) => {
      conversation = [...conversation, message];
    },
    
    addSnippet: (snippet: Snippet) => {
      attachedSnippets = [...attachedSnippets, snippet];
    },
    
    removeSnippet: (index: number) => {
      attachedSnippets = attachedSnippets.filter((_, i) => i !== index);
    },

    setAIProvider: (provider: string, model: string) => {
      selectedAIProvider = provider;
      selectedAIModel = model;
    },

    loadConversation: async (conversationId: string) => {
      try {
        const result = await mcp.getConversation({ id: parseInt(conversationId) });
        if (result.success && result.conversation) {
          conversation = result.conversation.messages.map((msg: any) => ({
            role: msg.role,
            content: msg.content
          }));
          currentConversationId = conversationId;
        }
      } catch (error) {
        console.error('Failed to load conversation:', error);
      }
    },

    saveConversation: async () => {
      if (conversation.length === 0) return;
      
      try {
        if (currentConversationId) {
          // For existing conversations, only save new messages
          // This is a simplified approach - in production you'd track which messages are already saved
          return;
        } else {
          // Create new conversation with first user message as title
          const title = conversation.find(msg => msg.role === 'user')?.content.substring(0, 50) + "..." || "New conversation";
          const result = await mcp.createConversation({
            workspaceId: selectedWorkspace?.id || 1,
            title
          });
          if (result.success) {
            currentConversationId = result.conversation.id.toString();
            // Reload conversations list to show the new one
            await mcpState.loadConversations();
          }
        }
      } catch (error) {
        console.error('Failed to save conversation:', error);
      }
    },

    newConversation: () => {
      conversation = [];
      currentConversationId = null;
    },

    loadConversations: async () => {
      try {
        if (!selectedWorkspace?.id) return;
        const result = await mcp.getConversations({
          workspaceId: selectedWorkspace.id
        });
        if (result.success) {
          conversations = result.conversations || [];
        }
      } catch (error) {
        console.error('Failed to load conversations:', error);
      }
    }
  };

  // Set context for child components
  setContext('mcpState', mcpState);

  // Initial data loading effect
  $effect(() => {
    loadInitialData();
  });

  // Load conversations when workspace changes
  $effect(() => {
    if (selectedWorkspace) {
      mcpState.loadConversations();
    }
  });

  async function loadInitialData() {
    try {
      isLoading = true;
      
      // Load workspaces
      const workspacesResult = await mcp.getWorkspaces();
      if (workspacesResult.success) {
        workspaces = workspacesResult.workspaces;
        if (workspaces.length > 0) {
          selectedWorkspace = workspaces[0];
        }
      }
      
      // Load todos
      const todosResult = await mcp.getTodos();
      if (todosResult.success) {
        todos = todosResult.todos;
      }
    } catch (error) {
      console.error('Failed to load initial data:', error);
    } finally {
      isLoading = false;
    }
  }
</script>

<div class="h-screen relative overflow-hidden">
  {#if isLoading}
    <div class="flex items-center justify-center h-full">
      <div class="glass p-8 rounded-3xl pulse-glow">
        <div class="flex flex-col items-center space-y-4">
          <div class="w-12 h-12 border-4 border-blue-400/30 border-t-blue-400 rounded-full animate-spin"></div>
          <p class="text-white/80 font-medium">Initializing MCP Workbench...</p>
        </div>
      </div>
    </div>
  {:else}
    <div class="grid grid-cols-sidebar h-full gap-4 p-4">
      <!-- Sidebar -->
      <aside class="sidebar-futuristic p-6 flex flex-col custom-scrollbar">
        <div class="flex flex-col h-full space-y-6">
          <!-- Header -->
          <div class="text-center mb-8 flex-shrink-0">
            <h1 class="text-2xl font-bold text-gradient mb-2">MCP Workbench</h1>
            <p class="text-white/60 text-sm">AI-Powered Workspace</p>
          </div>

          <!-- Workspace Section -->
          <div class="space-y-3 flex-shrink-0">
            <div class="flex items-center space-x-2">
              <div class="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <h2 class="text-lg font-semibold text-white/90">Workspace</h2>
            </div>
            <WorkspaceSelector />
          </div>

          <!-- Todos Section -->
          <div class="space-y-3 flex-shrink-0">
            <div class="flex items-center space-x-2">
              <div class="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
              <h2 class="text-lg font-semibold text-white/90">Tasks</h2>
            </div>
            <TodoPanel />
          </div>

          <!-- Chat History Section -->
          <div class="space-y-3 flex-1 flex flex-col min-h-0">
            <div class="flex items-center space-x-2 flex-shrink-0">
              <div class="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
              <h2 class="text-lg font-semibold text-white/90">Chat History</h2>
              <button
                class="ml-auto text-xs text-blue-300 hover:text-blue-200 transition-colors"
                onclick={() => mcpState.newConversation()}
              >
                ➕ New
              </button>
            </div>
            <div class="glass-readable rounded-lg p-3 flex-1 overflow-y-auto custom-scrollbar">
              {#if mcpState.conversations.length > 0}
                <div class="space-y-2">
                  {#each mcpState.conversations as conv (conv.id)}
                    <button 
                      class="w-full text-left p-2 rounded hover:bg-white/10 transition-colors text-sm text-white/80 cursor-pointer hover-scale {mcpState.currentConversationId === conv.id.toString() ? 'bg-white/15 border border-white/20' : ''}"
                      onclick={() => mcpState.loadConversation(conv.id.toString())}
                    >
                      💬 {conv.title}
                      <div class="text-xs text-white/50 mt-1">
                        {new Date(conv.createdAt).toLocaleDateString()}
                      </div>
                    </button>
                  {/each}
                </div>
              {:else}
                <div class="text-center py-4 text-white/60">
                  <div class="text-2xl mb-2">💬</div>
                  <p class="text-sm">No conversations yet</p>
                  <p class="text-xs mt-1">Start a chat to see history</p>
                </div>
              {/if}
            </div>
          </div>

          <!-- Files Section - Collapsed -->
          <div class="space-y-3 flex-shrink-0">
            <div class="flex items-center space-x-2">
              <div class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <h2 class="text-sm font-medium text-white/70">Files</h2>
              <button class="ml-auto text-xs text-white/50 hover:text-white/80 transition-colors">
                📁 Browse
              </button>
            </div>
          </div>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="flex flex-col h-full min-h-0">
        <!-- Top Bar -->
        <div class="glass p-4 rounded-2xl flex-shrink-0 dropdown-parent" style="position: relative; z-index: 100;">
          <div class="flex gap-3 items-center">
            <PersonaDropdown />
            <div class="w-px h-8 bg-white/20"></div>
            <div class="dropdown-parent">
              <AIProviderSelector />
            </div>
            <div class="w-px h-8 bg-white/20"></div>
            <FilePicker />
            <LineRangeInput />
          </div>
        </div>

        <!-- Chat Area - Seamless connection to top bar -->
        <div class="glass rounded-2xl overflow-hidden flex-1 mt-0" style="margin-top: 0.75rem;">
          <ChatPane />
        </div>
      </main>
    </div>
  {/if}
</div>

{@render children?.()}
