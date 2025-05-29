<script lang="ts">
  interface Props {
    onsend?: (message: string) => void;
  }

  let { onsend }: Props = $props();

  let message = $state('');
  let isDisabled = $state(false);

  function sendMessage() {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || isDisabled) return;

    onsend?.(trimmedMessage);
    message = '';
  }

  function handleKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
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
        class="flex-1 bg-white/5 text-high-contrast placeholder-white/70 border-none outline-none resize-none rounded-lg px-3 py-2"
        placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
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

      <button
        class="btn-futuristic btn-primary-futuristic p-3 hover-lift neon-glow flex-shrink-0"
        onclick={sendMessage}
        disabled={!message.trim() || isDisabled}
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
