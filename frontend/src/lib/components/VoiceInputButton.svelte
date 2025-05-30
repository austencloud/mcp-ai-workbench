<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { voiceInputService } from '$lib/services/voiceInputService';
  import type { VoiceInputState, VoiceTranscriptionResult, VoiceInputError } from '$lib/types/voiceInput';

  interface Props {
    onTranscription?: (text: string) => void;
    onError?: (error: string) => void;
    disabled?: boolean;
  }

  let { onTranscription, onError, disabled = false }: Props = $props();

  let voiceState: VoiceInputState = $state({
    isRecording: false,
    isProcessing: false,
    isSupported: false,
    hasPermission: false,
    currentTranscript: '',
    finalTranscript: '',
    confidence: 0,
    error: null,
    language: 'en-US'
  });

  let showTranscript = $state(false);
  let transcriptTimeout: NodeJS.Timeout | null = null;

  // Subscribe to voice service state
  const unsubscribe = voiceInputService.state.subscribe((state) => {
    voiceState = state;
    
    // Show transcript when there's content
    if (state.currentTranscript || state.finalTranscript) {
      showTranscript = true;
      
      // Auto-hide transcript after inactivity
      if (transcriptTimeout) {
        clearTimeout(transcriptTimeout);
      }
      transcriptTimeout = setTimeout(() => {
        if (!state.isRecording) {
          showTranscript = false;
        }
      }, 3000);
    }
  });

  onMount(() => {
    // Set up voice input event listeners
    voiceInputService.addEventListener({
      onResult: handleTranscriptionResult,
      onError: handleVoiceError,
      onStart: () => {
        showTranscript = true;
      },
      onEnd: () => {
        // Keep transcript visible briefly after recording ends
        setTimeout(() => {
          if (!voiceState.isRecording) {
            showTranscript = false;
          }
        }, 2000);
      }
    });
  });

  onDestroy(() => {
    unsubscribe();
    if (transcriptTimeout) {
      clearTimeout(transcriptTimeout);
    }
  });

  function handleTranscriptionResult(result: VoiceTranscriptionResult) {
    if (result.isFinal && result.originalText.trim()) {
      onTranscription?.(result.originalText.trim());
    }
  }

  function handleVoiceError(error: VoiceInputError) {
    onError?.(error.message);
  }

  async function toggleRecording() {
    if (disabled) return;

    try {
      if (voiceState.isRecording) {
        voiceInputService.stopRecording();
      } else {
        if (!voiceState.hasPermission) {
          const granted = await voiceInputService.requestPermission();
          if (!granted) {
            onError?.('Microphone permission is required for voice input');
            return;
          }
        }
        await voiceInputService.startRecording();
      }
    } catch (error: any) {
      onError?.(error.message || 'Failed to start voice recording');
    }
  }

  function getButtonClass() {
    if (disabled) {
      return 'btn-futuristic opacity-50 cursor-not-allowed';
    }
    
    if (voiceState.isRecording) {
      return 'btn-futuristic bg-red-500/20 border-red-400/30 text-red-300 hover:bg-red-500/30 animate-pulse';
    }
    
    if (!voiceState.isSupported) {
      return 'btn-futuristic opacity-50 cursor-not-allowed';
    }
    
    return 'btn-futuristic btn-secondary-futuristic hover-lift neon-glow';
  }

  function getButtonTitle() {
    if (!voiceState.isSupported) {
      return 'Voice input not supported in this browser';
    }
    if (!voiceState.hasPermission) {
      return 'Click to grant microphone permission';
    }
    if (voiceState.isRecording) {
      return 'Click to stop recording (or press Ctrl+Shift+V)';
    }
    return 'Click to start voice input (or press Ctrl+Shift+V)';
  }

  // Keyboard shortcut handler
  function handleKeydown(event: KeyboardEvent) {
    if (event.ctrlKey && event.shiftKey && event.key === 'V') {
      event.preventDefault();
      toggleRecording();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="relative">
  <!-- Voice Input Button -->
  <button
    class={getButtonClass()}
    onclick={toggleRecording}
    disabled={disabled || !voiceState.isSupported}
    title={getButtonTitle()}
    aria-label={voiceState.isRecording ? 'Stop voice recording' : 'Start voice recording'}
    aria-pressed={voiceState.isRecording}
  >
    {#if voiceState.isProcessing}
      <!-- Processing indicator -->
      <div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
    {:else if voiceState.isRecording}
      <!-- Recording indicator -->
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
        <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
      </svg>
    {:else}
      <!-- Microphone icon -->
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
      </svg>
    {/if}
  </button>

  <!-- Real-time Transcript Display -->
  {#if showTranscript && (voiceState.currentTranscript || voiceState.finalTranscript)}
    <div 
      class="absolute bottom-full mb-2 left-0 right-0 glass rounded-lg p-3 min-h-[2rem] max-w-sm"
      role="status"
      aria-live="polite"
      aria-label="Voice transcription"
    >
      <div class="text-xs text-white/60 mb-1 flex items-center justify-between">
        <span>Voice Input</span>
        {#if voiceState.confidence > 0}
          <span class="text-white/40">
            {Math.round(voiceState.confidence * 100)}% confidence
          </span>
        {/if}
      </div>
      
      <div class="text-sm text-white/90 min-h-[1.25rem]">
        {#if voiceState.finalTranscript}
          <span class="text-white">{voiceState.finalTranscript}</span>
        {/if}
        {#if voiceState.currentTranscript}
          <span class="text-white/70 italic">{voiceState.currentTranscript}</span>
        {/if}
        {#if !voiceState.finalTranscript && !voiceState.currentTranscript && voiceState.isRecording}
          <span class="text-white/50 italic">Listening...</span>
        {/if}
      </div>

      <!-- Visual recording indicator -->
      {#if voiceState.isRecording}
        <div class="flex items-center gap-1 mt-2">
          <div class="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
          <span class="text-xs text-red-300">Recording</span>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Error Display -->
  {#if voiceState.error}
    <div 
      class="absolute bottom-full mb-2 left-0 right-0 glass rounded-lg p-3 border-red-400/30 bg-red-500/10"
      role="alert"
      aria-live="assertive"
    >
      <div class="text-xs text-red-300 mb-1">Voice Input Error</div>
      <div class="text-sm text-red-200">{voiceState.error}</div>
    </div>
  {/if}
</div>

<style>
  .btn-futuristic {
    @apply relative p-3 rounded-xl border transition-all duration-300 flex items-center justify-center;
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
  }

  .btn-secondary-futuristic {
    @apply bg-white/5 border-white/20 text-white/80;
  }

  .btn-secondary-futuristic:hover {
    @apply bg-white/10 border-white/30 text-white/90;
  }

  .hover-lift:hover {
    transform: translateY(-2px) translateZ(0);
  }

  .neon-glow:hover {
    box-shadow: 0 0 20px rgba(255, 255, 255, 0.1);
  }
</style>
