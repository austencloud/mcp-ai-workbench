<script lang="ts">
  import { getContext } from 'svelte';
  import { mcp } from '$lib/services/mcpClient';

  const mcpState = getContext<any>('mcpState');

  let newWorkspaceName = $state('');
  let isCreating = $state(false);

  async function createWorkspace() {
    if (!newWorkspaceName.trim() || isCreating) return;
    
    try {
      isCreating = true;
      const result = await mcp.createWorkspace({ name: newWorkspaceName.trim() });
      
      if (result.success) {
        mcpState.addWorkspace(result.workspace);
        mcpState.selectedWorkspace = result.workspace;
        newWorkspaceName = '';
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
    }
  }
</script>

<div class="space-y-4">
  <!-- Workspace Selector -->
  <div class="glass rounded-xl p-3">
    <select
      class="w-full bg-transparent text-white border-none outline-none cursor-pointer"
      bind:value={mcpState.selectedWorkspace}
      disabled={mcpState.workspaces.length === 0}
    >
      <option disabled selected={!mcpState.selectedWorkspace} class="bg-slate-800 text-white">
        {mcpState.workspaces.length === 0 ? 'No workspaces' : 'Select workspace'}
      </option>
      {#each mcpState.workspaces as workspace (workspace.id)}
        <option value={workspace} class="bg-slate-800 text-white">{workspace.name}</option>
      {/each}
    </select>
  </div>

  <!-- Add New Workspace -->
  <div class="flex gap-2">
    <input
      type="text"
      placeholder="New workspace name"
      class="input-futuristic flex-1 text-sm"
      bind:value={newWorkspaceName}
      onkeydown={handleKeyPress}
      disabled={isCreating}
    />
    <button
      class="btn-futuristic btn-primary-futuristic px-4 py-2 text-sm hover-lift neon-glow"
      onclick={createWorkspace}
      disabled={!newWorkspaceName.trim() || isCreating}
    >
      {#if isCreating}
        <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
      {:else}
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
      {/if}
    </button>
  </div>

  {#if mcpState.selectedWorkspace}
    <div class="glass rounded-lg p-3 text-sm">
      <div class="flex items-center space-x-2">
        <div class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
        <span class="text-white/80">Active:</span>
        <span class="text-gradient font-medium">{mcpState.selectedWorkspace.name}</span>
      </div>
    </div>
  {/if}
</div>
