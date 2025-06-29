<script lang="ts">
  import { getContext } from 'svelte';
  import { mcp } from '$lib/services/mcpClient';

  const mcpState = getContext<any>('mcpState');

  let newTodoText = $state('');
  let isCreating = $state(false);

  let filteredTodos = $derived(mcpState.todos.filter((todo: any) =>
    mcpState.selectedWorkspace ? todo.workspace === mcpState.selectedWorkspace.name : false
  ));

  async function createTodo() {
    if (!newTodoText.trim() || !mcpState.selectedWorkspace || isCreating) return;
    
    try {
      isCreating = true;
      const result = await mcp.createTodo({
        text: newTodoText.trim(),
        workspace: mcpState.selectedWorkspace.name
      });
      
      if (result.success) {
        mcpState.addTodo(result.todo);
        newTodoText = '';
      }
    } catch (error) {
      console.error('Failed to create todo:', error);
    } finally {
      isCreating = false;
    }
  }

  async function toggleTodo(todo: any) {
    try {
      const result = await mcp.updateTodo({
        id: todo.id,
        done: !todo.done
      });
      
      if (result.success) {
        mcpState.updateTodo(result.todo);
      }
    } catch (error) {
      console.error('Failed to update todo:', error);
    }
  }

  function handleKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      createTodo();
    }
  }
</script>

<div class="space-y-4">
  <!-- Add New Todo -->
  {#if mcpState.selectedWorkspace}
    <div class="flex gap-2">
      <input
        type="text"
        placeholder="Add new task..."
        class="input-futuristic flex-1 text-sm"
        bind:value={newTodoText}
        onkeypress={handleKeyPress}
        disabled={isCreating}
      />
      <button
        class="btn-futuristic btn-primary-futuristic px-4 py-2 text-sm hover-lift neon-glow"
        onclick={createTodo}
        disabled={!newTodoText.trim() || isCreating}
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
  {/if}

  <!-- Todo List -->
  <div class="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
    {#if filteredTodos.length === 0}
      <div class="glass rounded-xl p-6 text-center">
        {#if !mcpState.selectedWorkspace}
          <div class="text-white/60">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <p class="text-sm">Select a workspace to view tasks</p>
          </div>
        {:else}
          <div class="text-white/60">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p class="text-sm">No tasks yet. Add one above!</p>
          </div>
        {/if}
      </div>
    {:else}
      {#each filteredTodos as todo (todo.id)}
        <div class="glass rounded-xl p-3 hover:bg-white/15 transition-all duration-300 hover-lift">
          <div class="flex items-start gap-3">
            <input
              type="checkbox"
              class="mt-1 w-4 h-4 rounded border-white/30 bg-white/10 text-blue-400 focus:ring-blue-400/50"
              checked={todo.done}
              onchange={() => toggleTodo(todo)}
            />
            <span
              class="flex-1 text-sm text-white/90"
              class:line-through={todo.done}
              class:opacity-50={todo.done}
            >
              {todo.text}
            </span>
            {#if todo.done}
              <div class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            {/if}
          </div>
        </div>
      {/each}
    {/if}
  </div>

  <!-- Todo Stats -->
  {#if filteredTodos.length > 0}
    <div class="glass rounded-lg p-3">
      <div class="flex items-center justify-between text-xs">
        <span class="text-white/70">Progress</span>
        <span class="text-gradient font-medium">
          {filteredTodos.filter((t: any) => t.done).length} / {filteredTodos.length} completed
        </span>
      </div>
      <div class="mt-2 w-full bg-white/10 rounded-full h-2">
        <div
          class="bg-gradient-to-r from-blue-400 to-purple-400 h-2 rounded-full transition-all duration-500"
          style="width: {filteredTodos.length > 0 ? (filteredTodos.filter((t: any) => t.done).length / filteredTodos.length) * 100 : 0}%"
        ></div>
      </div>
    </div>
  {/if}
</div>
