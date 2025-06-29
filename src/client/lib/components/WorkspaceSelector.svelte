<script lang="ts">
  import { getContext } from 'svelte';
  import { mcp } from '$lib/services/mcpClient';

  const mcpState = getContext<any>('mcpState');

  let newWorkspaceName = $state('');
  let isCreating = $state(false);
  let showCreateForm = $state(false);

  async function createWorkspace() {
    if (!newWorkspaceName.trim() || isCreating) return;
    
    try {
      isCreating = true;
      const result = await mcp.createWorkspace({ name: newWorkspaceName.trim() });
      
      if (result.success) {
        mcpState.addWorkspace(result.workspace);
        mcpState.selectedWorkspace = result.workspace;
        newWorkspaceName = '';
        showCreateForm = false;
      }
    } catch (error) {
      console.error('Failed to create workspace:', error);
    } finally {
      isCreating = false;
    }
  }

  function handleKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      createWorkspace();
    } else if (event.key === 'Escape') {
      showCreateForm = false;
      newWorkspaceName = '';
    }
  }

  function cancelCreate() {
    showCreateForm = false;
    newWorkspaceName = '';
  }
</script>

<div class="space-y-4">
  <!-- What are workspaces? -->
  <div class="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-xs">
    <div class="flex items-start space-x-2">
      <div class="w-4 h-4 bg-blue-400/30 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
        <svg class="w-2 h-2 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
        </svg>
      </div>
      <div class="text-blue-300">
        <div class="font-medium mb-1">What are workspaces?</div>
        <div class="text-blue-200/80 leading-relaxed">
          Think of workspaces like project folders. Each one keeps your chats, files, and tasks organized for different projects or topics.
        </div>
      </div>
    </div>
  </div>

  <!-- Current Workspace Display -->
  {#if mcpState.selectedWorkspace}
    <div class="glass-readable rounded-lg p-4">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center space-x-2">
          <div class="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
          <span class="text-white/80 text-sm">Currently working in:</span>
        </div>
        {#if mcpState.workspaces.length > 1}
          <button 
            class="text-xs text-blue-300 hover:text-blue-200 transition-colors px-2 py-1 rounded-md hover:bg-white/5"
            onclick={() => showCreateForm = false}
            aria-label="Switch workspace"
          >
            Switch
          </button>
        {/if}
      </div>
      <div class="text-gradient font-semibold text-lg">{mcpState.selectedWorkspace.name}</div>
      
      <!-- Quick Stats -->
      <div class="flex items-center space-x-4 mt-3 text-xs text-white/60">
        <div class="flex items-center space-x-1">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.955 8.955 0 01-2.697-.413l-3.178 1.59a1 1 0 01-1.414-1.414l1.59-3.178A8.955 8.955 0 013 12a8 8 0 018-8 8 8 0 018 8z" />
          </svg>
          <span>{mcpState.conversations.length} chats</span>
        </div>
        <div class="flex items-center space-x-1">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <span>{mcpState.todos.filter((t: any) => t.workspace === mcpState.selectedWorkspace?.name).length} tasks</span>
        </div>
      </div>
    </div>
  {:else}
    <!-- No workspace selected -->
    <div class="glass-readable rounded-lg p-4 text-center">
      <div class="text-white/60 mb-3">
        <svg class="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
        <div class="text-sm">No workspace selected</div>
        <div class="text-xs mt-1">Choose or create one to get started</div>
      </div>
    </div>
  {/if}

  <!-- Workspace Switcher/Creator -->
  {#if mcpState.workspaces.length > 0 && !showCreateForm}
    <div class="space-y-2">
      {#if mcpState.workspaces.length > 1 || !mcpState.selectedWorkspace}
        <!-- Workspace List -->
        <div class="glass rounded-lg p-2 max-h-32 overflow-y-auto custom-scrollbar">
          {#each mcpState.workspaces as workspace (workspace.id)}
            <button 
              class="w-full text-left p-2 rounded hover:bg-white/10 transition-colors text-sm {mcpState.selectedWorkspace?.id === workspace.id ? 'bg-white/15 border border-white/20 text-white' : 'text-white/80'}"
              onclick={() => mcpState.selectedWorkspace = workspace}
            >
              <div class="flex items-center space-x-2">
                <div class="w-2 h-2 rounded-full {mcpState.selectedWorkspace?.id === workspace.id ? 'bg-green-400' : 'bg-white/30'}"></div>
                <span class="font-medium">{workspace.name}</span>
              </div>
            </button>
          {/each}
        </div>
      {/if}
      
      <!-- Add New Button -->
      <button 
        class="w-full btn-futuristic text-sm py-3 flex items-center justify-center space-x-2 hover-lift"
        onclick={() => showCreateForm = true}
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        <span>Create New Workspace</span>
      </button>
    </div>
  {:else if showCreateForm || mcpState.workspaces.length === 0}
    <!-- Create New Workspace Form -->
    <div class="glass-readable rounded-lg p-4 space-y-3">
      <div class="flex items-center justify-between">
        <h3 class="font-medium text-white">Create New Workspace</h3>
        {#if mcpState.workspaces.length > 0}
          <button 
            class="text-white/60 hover:text-white/80 transition-colors"
            onclick={cancelCreate}
            aria-label="Close workspace creation form"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        {/if}
      </div>
      
      <div class="text-xs text-white/60 mb-3">
        Examples: "Marketing Project", "Learning Python", "Personal Notes"
      </div>
      
      <input
        type="text"
        placeholder="Enter workspace name..."
        class="input-futuristic text-sm w-full"
        bind:value={newWorkspaceName}
        onkeydown={handleKeyPress}
        disabled={isCreating}
      />
      
      <div class="flex gap-2">
        <button
          class="btn-futuristic btn-primary-futuristic px-4 py-2 text-sm hover-lift neon-glow flex-1"
          onclick={createWorkspace}
          disabled={!newWorkspaceName.trim() || isCreating}
        >
          {#if isCreating}
            <div class="flex items-center justify-center space-x-2">
              <div class="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>Creating...</span>
            </div>
          {:else}
            Create Workspace
          {/if}
        </button>
        
        {#if mcpState.workspaces.length > 0}
          <button
            class="btn-futuristic px-4 py-2 text-sm"
            onclick={cancelCreate}
            disabled={isCreating}
          >
            Cancel
          </button>
        {/if}
      </div>
    </div>
  {/if}
</div>
