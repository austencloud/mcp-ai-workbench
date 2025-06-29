<script lang="ts">
  import { getContext } from 'svelte';
  import { mcp } from '$lib/services/mcpClient';
  import { EditorView } from '@codemirror/view';
  import { EditorState } from '@codemirror/state';
  import { javascript } from '@codemirror/lang-javascript';
  import { python } from '@codemirror/lang-python';
  import { html } from '@codemirror/lang-html';
  import { css } from '@codemirror/lang-css';
  import { json } from '@codemirror/lang-json';
  import { oneDark } from '@codemirror/theme-one-dark';

  const mcpState = getContext<any>('mcpState');

  let currentPath = $state('.');
  let files = $state<any[]>([]);
  let isLoading = $state(false);
  let selectedFile = $state<any>(null);
  let fileContent = $state('');
  let showPreview = $state(false);
  let editorContainer = $state<HTMLDivElement>();
  let editorView: EditorView | null = null;

  // Load files for current directory
  async function loadFiles(path: string = '.') {
    try {
      isLoading = true;
      const result = await mcp.listFiles({ dir: path });
      
      if (result.success) {
        files = result.files.sort((a, b) => {
          // Directories first, then files
          if (a.isDirectory && !b.isDirectory) return -1;
          if (!a.isDirectory && b.isDirectory) return 1;
          return a.name.localeCompare(b.name);
        });
        currentPath = path;
      }
    } catch (error) {
      console.error('Failed to load files:', error);
    } finally {
      isLoading = false;
    }
  }

  // Navigate to directory
  function navigateToDirectory(file: any) {
    if (file.isDirectory) {
      loadFiles(file.path);
    }
  }

  // Go up one directory
  function goUp() {
    const parentPath = currentPath.split('/').slice(0, -1).join('/') || '.';
    loadFiles(parentPath);
  }

  // Preview file content
  async function previewFile(file: any) {
    if (file.isDirectory) return;
    
    try {
      selectedFile = file;
      showPreview = true;
      
      const result = await mcp.readFile({ path: file.path });
      if (result.success) {
        fileContent = result.text;
        setupEditor(file.name, result.text);
      }
    } catch (error) {
      console.error('Failed to read file:', error);
    }
  }

  // Setup CodeMirror editor
  function setupEditor(fileName: string, content: string) {
    if (editorView) {
      editorView.destroy();
    }

    const extensions = [
      oneDark,
      EditorView.theme({
        '&': { height: '400px' },
        '.cm-scroller': { fontFamily: 'JetBrains Mono, Consolas, monospace' }
      }),
      EditorView.lineWrapping
    ];

    // Add language support based on file extension
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'js':
      case 'jsx':
      case 'ts':
      case 'tsx':
        extensions.push(javascript());
        break;
      case 'py':
        extensions.push(python());
        break;
      case 'html':
      case 'htm':
        extensions.push(html());
        break;
      case 'css':
        extensions.push(css());
        break;
      case 'json':
        extensions.push(json());
        break;
    }

    const state = EditorState.create({
      doc: content,
      extensions
    });

    editorView = new EditorView({
      state,
      parent: editorContainer
    });
  }

  // Attach file to chat
  function attachFile(file: any) {
    if (file.isDirectory) return;
    
    mcpState.addSnippet({
      path: file.path,
      text: fileContent || 'Loading...'
    });
    
    // Load content if not already loaded
    if (!fileContent) {
      previewFile(file);
    }
  }

  // Get file icon
  function getFileIcon(file: any) {
    if (file.isDirectory) return '📁';
    
    const ext = file.name.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'js':
      case 'jsx':
      case 'ts':
      case 'tsx':
        return '📜';
      case 'py':
        return '🐍';
      case 'html':
      case 'htm':
        return '🌐';
      case 'css':
        return '🎨';
      case 'json':
        return '📋';
      case 'md':
        return '📝';
      case 'txt':
        return '📄';
      default:
        return '📄';
    }
  }

  // Format file size
  function formatFileSize(bytes: number) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  // Load initial files
  $effect(() => {
    loadFiles();
  });
</script>

<div class="space-y-4">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <h3 class="text-lg font-semibold text-high-contrast">File Browser</h3>
    <button
      class="btn-futuristic px-3 py-2 text-sm hover-lift focus-visible"
      onclick={() => loadFiles(currentPath)}
      disabled={isLoading}
      aria-label="Refresh file list"
    >
      {#if isLoading}
        <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
      {:else}
        🔄
      {/if}
    </button>
  </div>

  <!-- Current Path -->
  <div class="glass-readable rounded-lg p-3">
    <div class="flex items-center gap-2 text-sm">
      <span class="text-accessible">📍</span>
      <span class="text-medium-contrast font-mono">{currentPath}</span>
      {#if currentPath !== '.'}
        <button
          class="ml-auto text-blue-300 hover:text-blue-200 text-xs focus-visible"
          onclick={goUp}
          aria-label="Go up one directory"
        >
          ⬆️ Up
        </button>
      {/if}
    </div>
  </div>

  <!-- File List -->
  <div class="glass-readable rounded-xl p-4 flex-1 overflow-y-auto custom-scrollbar">
    {#if isLoading}
      <div class="flex items-center justify-center py-8">
        <div class="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
      </div>
    {:else if files.length === 0}
      <div class="text-center py-8 text-accessible">
        <div class="text-2xl mb-2">📂</div>
        <p>No files found</p>
      </div>
    {:else}
      <div class="space-y-2">
        {#each files as file (file.path)}
          <div class="flex items-center gap-3 p-2 rounded-lg hover:bg-white/10 transition-all duration-200 group">
            <span class="text-lg">{getFileIcon(file)}</span>
            
            <div class="flex-1 min-w-0">
              <button
                class="text-left w-full"
                onclick={() => file.isDirectory ? navigateToDirectory(file) : previewFile(file)}
              >
                <div class="font-medium text-medium-contrast truncate">{file.name}</div>
                <div class="text-xs text-accessible">
                  {file.isDirectory ? 'Directory' : formatFileSize(file.size)}
                </div>
              </button>
            </div>

            {#if !file.isDirectory}
              <div class="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <button
                  class="btn-futuristic px-2 py-1 text-xs hover-lift"
                  onclick={() => previewFile(file)}
                  title="Preview"
                >
                  👁️
                </button>
                <button
                  class="btn-futuristic px-2 py-1 text-xs hover-lift"
                  onclick={() => attachFile(file)}
                  title="Attach to chat"
                >
                  📎
                </button>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- File Preview Modal -->
  {#if showPreview && selectedFile}
    <div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="glass-readable rounded-2xl p-6 max-w-4xl w-full max-h-[80vh] overflow-hidden">
        <!-- Modal Header -->
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-3">
            <span class="text-lg">{getFileIcon(selectedFile)}</span>
            <div>
              <h3 class="font-semibold text-high-contrast">{selectedFile.name}</h3>
              <p class="text-xs text-accessible">{selectedFile.path}</p>
            </div>
          </div>
          <div class="flex gap-2">
            <button
              class="btn-futuristic px-3 py-2 text-sm hover-lift focus-visible"
              onclick={() => attachFile(selectedFile)}
              aria-label="Attach file to chat"
            >
              📎 Attach
            </button>
            <button
              class="btn-futuristic px-3 py-2 text-sm hover-lift focus-visible"
              onclick={() => showPreview = false}
              aria-label="Close file preview"
            >
              ✕
            </button>
          </div>
        </div>

        <!-- Editor Container -->
        <div bind:this={editorContainer} class="rounded-lg overflow-hidden"></div>
      </div>
    </div>
  {/if}
</div>
