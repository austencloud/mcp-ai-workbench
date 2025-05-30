<script lang="ts">
  import VoiceTestingInterface from '$lib/components/VoiceTestingInterface.svelte';
</script>

<svelte:head>
  <title>Voice Testing - MCP AI Workbench</title>
  <meta name="description" content="Voice processing testing and diagnostics interface" />
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-4">
  <div class="max-w-7xl mx-auto">
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-white mb-2">Voice Processing Test Suite</h1>
      <p class="text-white/70">Test and analyze voice processing capabilities</p>
    </div>
    
    <VoiceTestingInterface />
  </div>
</div>