<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { voiceInputService } from '$lib/services/voiceInputService';
  import { voiceProcessingService } from '$lib/services/voiceProcessingService';
  import { realTimeSpeechService } from '$lib/services/realTimeSpeechService';
  import { windowFocusService } from '$lib/services/windowFocusService';
  import VoiceCorrectionDisplay from './VoiceCorrectionDisplay.svelte';
  import type {
    VoiceInputState,
    VoiceTranscriptionResult,
    VoiceInputError,
    VoiceCorrection,
    VoiceProcessingOptions
  } from '$lib/types/voiceInput';

  interface Props {
    onTranscription?: (text: string) => void;
    onError?: (error: string) => void;
    disabled?: boolean;
    enableAICorrection?: boolean;
    enableRealTimeMode?: boolean; // New prop for real-time processing
    correctionOptions?: VoiceProcessingOptions;
  }

  let {
    onTranscription,
    onError,
    disabled = false,
    enableAICorrection = true,
    enableRealTimeMode = true,
    correctionOptions = {
      enableGrammarCorrection: true,
      enableContextCorrection: true,
      correctionSensitivity: 'medium',
      autoApplyCorrections: false,
      preserveUserIntent: true
    }
  }: Props = $props();

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



  // AI Processing state
  let isProcessingAI = $state(false);
  let correctedText = $state('');
  let corrections: VoiceCorrection[] = $state([]);
  let processingConfidence = $state(0);
  let showCorrections = $state(false);

  // Real-time speech state
  let currentChunkId: string | null = null;
  let realTimeState = $state({
    currentText: '',
    pendingCorrections: 0,
    isProcessingAny: false
  });

  // Subscribe to voice service state
  const unsubscribe = voiceInputService.state.subscribe((state) => {
    voiceState = state;
  });

  // Subscribe to real-time speech service state
  const unsubscribeRealTime = realTimeSpeechService.state.subscribe((state) => {
    realTimeState = {
      currentText: state.currentText,
      pendingCorrections: state.pendingCorrections,
      isProcessingAny: state.isProcessingAny
    };

    // Update transcription callback with real-time text
    if (enableRealTimeMode && state.currentText !== realTimeState.currentText) {
      onTranscription?.(state.currentText);
    }
  });

  onMount(() => {
    // Initialize window focus service
    windowFocusService.initialize();

    // Set up voice input event listeners
    voiceInputService.addEventListener({
      onResult: handleTranscriptionResult,
      onError: handleVoiceError,
      onStart: () => {
        if (enableRealTimeMode) {
          realTimeSpeechService.startSession();
          realTimeSpeechService.setProcessingOptions(correctionOptions);
        }
      },
      onEnd: () => {
        if (enableRealTimeMode) {
          realTimeSpeechService.endSession();
        }
      }
    });

    // Set up window focus/blur handlers for voice input
    const unsubscribeFocus = windowFocusService.onFocus((hasFocus) => {
      if (hasFocus && windowFocusService.shouldResumeVoice()) {
        // Resume voice input if it was active before blur
        resumeVoiceInput();
      }
    });

    const unsubscribeBlur = windowFocusService.onBlur(() => {
      // Pause voice input when window loses focus
      if (voiceState.isRecording) {
        windowFocusService.setVoiceActiveBeforeBlur(true);
        pauseVoiceInput();
      } else {
        windowFocusService.setVoiceActiveBeforeBlur(false);
      }
    });

    // Store unsubscribe functions for cleanup
    return () => {
      unsubscribeFocus();
      unsubscribeBlur();
    };
  });

  onDestroy(() => {
    unsubscribe();
    unsubscribeRealTime();
    windowFocusService.destroy();
  });

  /**
   * Pause voice input (called when window loses focus)
   */
  function pauseVoiceInput() {
    if (voiceState.isRecording) {
      voiceInputService.stopRecording();
    }
  }

  /**
   * Resume voice input (called when window regains focus)
   */
  async function resumeVoiceInput() {
    if (!disabled && windowFocusService.isActive()) {
      try {
        await voiceInputService.startRecording();
      } catch (error: any) {
        onError?.(error.message || 'Failed to resume voice recording');
        windowFocusService.setVoiceActiveBeforeBlur(false);
      }
    }
  }

  async function handleTranscriptionResult(result: VoiceTranscriptionResult) {
    if (enableRealTimeMode) {
      // Real-time mode: handle both interim and final results
      if (result.isFinal) {
        // Update or create final chunk
        if (currentChunkId) {
          realTimeSpeechService.updateChunk(currentChunkId, result.originalText, true, result.confidence);
          currentChunkId = null;
        } else {
          realTimeSpeechService.addChunk(result.originalText, true, result.confidence);
        }
      } else {
        // Update interim chunk
        if (currentChunkId) {
          realTimeSpeechService.updateChunk(currentChunkId, result.originalText, false, result.confidence);
        } else {
          currentChunkId = realTimeSpeechService.addChunk(result.originalText, false, result.confidence);
        }
      }
    } else {
      // Legacy mode: process final results only
      if (result.isFinal && result.originalText.trim()) {
        const finalText = result.originalText.trim();

        if (enableAICorrection) {
          // Process with AI for corrections
          await processWithAI(finalText);
        } else {
          // Use original text directly
          onTranscription?.(finalText);
        }
      }
    }
  }

  async function processWithAI(text: string) {
    try {
      isProcessingAI = true;
      showCorrections = false;

      // Add timeout for AI processing (15 seconds)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('AI processing timeout')), 15000);
      });

      const processingPromise = voiceProcessingService.processTranscription({
        originalText: text,
        options: correctionOptions
      });

      const response = await Promise.race([processingPromise, timeoutPromise]);

      if (response.success) {
        correctedText = response.correctedText;
        corrections = response.corrections;
        processingConfidence = response.confidence;

        if (correctionOptions.autoApplyCorrections || corrections.length === 0) {
          // Auto-apply or no corrections needed
          onTranscription?.(correctedText);
        } else {
          // Show corrections for user review
          showCorrections = true;
        }
      } else {
        // Fallback to original text on AI processing failure
        onTranscription?.(text);
        onError?.(`AI processing failed: ${response.error}`);
      }
    } catch (error: any) {
      console.error('AI processing error:', error);
      // Fallback to original text on error
      onTranscription?.(text);

      if (error.message === 'AI processing timeout') {
        onError?.('AI processing timed out. Using original text.');
      } else {
        onError?.(`AI processing error: ${error.message}`);
      }
    } finally {
      isProcessingAI = false;
    }
  }

  function handleAcceptCorrections(acceptedText: string) {
    onTranscription?.(acceptedText);
    showCorrections = false;
  }

  function handleRejectCorrections() {
    // Use original transcript
    if (voiceState.finalTranscript) {
      onTranscription?.(voiceState.finalTranscript);
    }
    showCorrections = false;
  }

  function handleVoiceError(error: VoiceInputError) {
    onError?.(error.message);
  }

  async function toggleRecording() {
    if (disabled) return;

    try {
      if (voiceState.isRecording) {
        voiceInputService.stopRecording();
        windowFocusService.setVoiceActiveBeforeBlur(false);
      } else {
        // Check if window has focus before starting
        if (!windowFocusService.isActive()) {
          onError?.('Please focus the window before starting voice input');
          return;
        }

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
    if (!windowFocusService.isActive()) {
      return 'Focus the window to enable voice input';
    }
    if (!voiceState.hasPermission) {
      return 'Click to grant microphone permission';
    }
    if (voiceState.isRecording) {
      return 'Click to stop recording (or press Ctrl+Shift+V) - Auto-pauses when window loses focus';
    }
    return 'Click to start voice input (or press Ctrl+Shift+V) - Auto-pauses when window loses focus';
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
    <div class="relative">
      {#if voiceState.isProcessing || isProcessingAI}
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

      <!-- Small AI processing indicator dot -->
      {#if isProcessingAI || (enableRealTimeMode && realTimeState.isProcessingAny)}
        <div class="absolute -top-1 -right-1 w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
      {/if}

      <!-- Pending corrections indicator -->
      {#if enableRealTimeMode && realTimeState.pendingCorrections > 0}
        <div class="absolute -bottom-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full text-xs flex items-center justify-center text-black font-bold">
          {realTimeState.pendingCorrections}
        </div>
      {/if}
    </div>
  </button>



  <!-- AI Correction Display -->
  {#if showCorrections && corrections.length > 0}
    <div class="absolute bottom-full mb-2 left-0 right-0 max-w-md">
      <VoiceCorrectionDisplay
        originalText={voiceState.finalTranscript}
        {correctedText}
        {corrections}
        confidence={processingConfidence}
        onAccept={handleAcceptCorrections}
        onReject={handleRejectCorrections}
        showDiff={true}
      />
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
