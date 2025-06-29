<script lang="ts">
  import VoiceInputButton from './VoiceInputButton.svelte';

  interface Props {
    onsend?: (message: string) => void;
    appendVoiceInput?: boolean; // Control whether to append or replace voice input
  }

  let { onsend, appendVoiceInput = true }: Props = $props();

  let message = $state('');
  let isDisabled = $state(false);
  let textareaElement: HTMLTextAreaElement;

  function sendMessage() {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || isDisabled) return;

    onsend?.(trimmedMessage);
    message = '';

    // Reset textarea height
    if (textareaElement) {
      textareaElement.style.height = 'auto';
    }
  }

  function handleKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  function handleVoiceTranscription(text: string) {
    if (appendVoiceInput && message.trim()) {
      // Append to existing text with a space separator
      message = message.trim() + ' ' + text;
    } else {
      // Replace message with voice transcription
      message = text;
    }

    // Auto-resize textarea
    if (textareaElement) {
      textareaElement.style.height = 'auto';
      textareaElement.style.height = Math.min(textareaElement.scrollHeight, 128) + 'px';
    }

    // Focus textarea for continued typing
    textareaElement?.focus();
  }

  function handleVoiceError(error: string) {
    console.warn('Voice input error:', error);
    // Could show a toast notification here in the future
  }

  // Allow parent to disable input
  export function setDisabled(disabled: boolean) {
    isDisabled = disabled;
  }
</script>

<div class="p-6 border-t border-white/10">
  <div class="glass rounded-2xl p-4">
    <div class="flex gap-3 items-end">
      <textarea
        bind:this={textareaElement}
        class="flex-1 bg-white/5 text-high-contrast placeholder-white/70 border-none outline-none resize-none rounded-lg px-3 py-2"
        placeholder="Type your message or use voice input... (Enter to send, Shift+Enter for new line, Ctrl+Shift+V for voice)"
        rows="1"
        bind:value={message}
        onkeydown={handleKeyPress}
        disabled={isDisabled}
        style="min-height: 2.5rem; max-height: 8rem;"
        oninput={(e) => {
          const target = e.target as HTMLTextAreaElement;
          target.style.height = 'auto';
          target.style.height = Math.min(target.scrollHeight, 128) + 'px';
        }}
      ></textarea>

      <!-- Voice Input Button -->
      <VoiceInputButton
        onTranscription={handleVoiceTranscription}
        onError={handleVoiceError}
        disabled={isDisabled}
        enableAICorrection={true}
        enableRealTimeMode={true}
        correctionOptions={{
          enableGrammarCorrection: true,
          enableContextCorrection: true,
          correctionSensitivity: 'medium',
          autoApplyCorrections: false,
          preserveUserIntent: true
        }}
      />

      <!-- Send Button -->
      <button
        class="btn-futuristic btn-primary-futuristic p-3 hover-lift neon-glow flex-shrink-0"
        onclick={sendMessage}
        disabled={!message.trim() || isDisabled}
        aria-label="Send message"
      >
        {#if isDisabled}
          <div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
        {:else}
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        {/if}
      </button>
    </div>

    <!-- Input hints -->
    <div class="flex items-center justify-between mt-3 text-xs text-white/50">
      <div class="flex items-center gap-4">
        <span>💡 Tip: Use Shift+Enter for new lines</span>
      </div>
      <div class="flex items-center gap-2">
        {#if message.length > 0}
          <span>{message.length} characters</span>
        {/if}
      </div>
    </div>
  </div>
</div>
