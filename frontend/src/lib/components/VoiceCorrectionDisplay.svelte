<script lang="ts">
  import type { VoiceCorrection } from '$lib/types/voiceInput';

  interface Props {
    originalText: string;
    correctedText: string;
    corrections: VoiceCorrection[];
    confidence: number;
    onAccept?: (correctedText: string) => void;
    onReject?: () => void;
    onApplyCorrection?: (correction: VoiceCorrection) => void;
    showDiff?: boolean;
  }

  let {
    originalText,
    correctedText,
    corrections,
    confidence,
    onAccept,
    onReject,
    onApplyCorrection,
    showDiff = true
  }: Props = $props();

  let showDetails = $state(false);
  let selectedCorrection = $state<VoiceCorrection | null>(null);

  function handleAccept() {
    onAccept?.(correctedText);
  }

  function handleReject() {
    onReject?.();
  }

  function handleCorrectionClick(correction: VoiceCorrection) {
    selectedCorrection = selectedCorrection === correction ? null : correction;
    onApplyCorrection?.(correction);
  }

  function getCorrectionTypeColor(type: string): string {
    const colors = {
      grammar: 'text-blue-300',
      spelling: 'text-red-300',
      context: 'text-purple-300',
      punctuation: 'text-green-300'
    };
    return colors[type as keyof typeof colors] || 'text-white/70';
  }

  function getCorrectionTypeIcon(type: string): string {
    const icons = {
      grammar: '📝',
      spelling: '✏️',
      context: '🧠',
      punctuation: '❗'
    };
    return icons[type as keyof typeof icons] || '🔧';
  }

  function getConfidenceColor(confidence: number): string {
    if (confidence >= 0.8) return 'text-green-300';
    if (confidence >= 0.6) return 'text-yellow-300';
    return 'text-red-300';
  }

  function highlightDifferences(original: string, corrected: string): { original: string; corrected: string } {
    if (!showDiff || original === corrected) {
      return { original, corrected };
    }

    // Simple word-based diff highlighting
    const originalWords = original.split(' ');
    const correctedWords = corrected.split(' ');
    
    let highlightedOriginal = '';
    let highlightedCorrected = '';
    
    const maxLength = Math.max(originalWords.length, correctedWords.length);
    
    for (let i = 0; i < maxLength; i++) {
      const origWord = originalWords[i] || '';
      const corrWord = correctedWords[i] || '';
      
      if (origWord !== corrWord) {
        if (origWord) {
          highlightedOriginal += `<span class="bg-red-500/20 text-red-200 px-1 rounded">${origWord}</span> `;
        }
        if (corrWord) {
          highlightedCorrected += `<span class="bg-green-500/20 text-green-200 px-1 rounded">${corrWord}</span> `;
        }
      } else {
        highlightedOriginal += origWord + ' ';
        highlightedCorrected += corrWord + ' ';
      }
    }
    
    return {
      original: highlightedOriginal.trim(),
      corrected: highlightedCorrected.trim()
    };
  }

  let highlighted = $derived(highlightDifferences(originalText, correctedText));
  let hasCorrections = $derived(corrections.length > 0);
  let correctionSummary = $derived(corrections.reduce((acc, correction) => {
    acc[correction.type] = (acc[correction.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>));
</script>

{#if hasCorrections}
  <div class="glass rounded-xl p-4 border border-white/10">
    <!-- Header -->
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <div class="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
        <span class="text-sm font-medium text-white/90">AI Text Enhancement</span>
        <span class={`text-xs ${getConfidenceColor(confidence)}`}>
          {Math.round(confidence * 100)}% confidence
        </span>
      </div>
      
      <button
        class="text-xs text-white/60 hover:text-white/80 transition-colors"
        onclick={() => showDetails = !showDetails}
        aria-label={showDetails ? 'Hide details' : 'Show details'}
      >
        {showDetails ? '▼' : '▶'} Details
      </button>
    </div>

    <!-- Text Comparison -->
    <div class="space-y-3">
      {#if showDiff && originalText !== correctedText}
        <div class="space-y-2">
          <div class="text-xs text-white/60">Original:</div>
          <div class="text-sm text-white/80 p-2 bg-white/5 rounded-lg">
            {@html highlighted.original}
          </div>
          
          <div class="text-xs text-white/60">Suggested:</div>
          <div class="text-sm text-white/90 p-2 bg-white/5 rounded-lg border border-green-400/20">
            {@html highlighted.corrected}
          </div>
        </div>
      {:else}
        <div class="text-sm text-white/90 p-2 bg-white/5 rounded-lg">
          {correctedText}
        </div>
      {/if}

      <!-- Correction Summary -->
      {#if Object.keys(correctionSummary).length > 0}
        <div class="flex items-center gap-2 text-xs">
          <span class="text-white/60">Corrections:</span>
          {#each Object.entries(correctionSummary) as [type, count]}
            <span class={`${getCorrectionTypeColor(type)} flex items-center gap-1`}>
              <span>{getCorrectionTypeIcon(type)}</span>
              <span>{count} {type}</span>
            </span>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Detailed Corrections -->
    {#if showDetails && corrections.length > 0}
      <div class="mt-4 pt-3 border-t border-white/10">
        <div class="text-xs text-white/60 mb-2">Individual Corrections:</div>
        <div class="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
          {#each corrections as correction}
            <button
              class="w-full text-left p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-transparent hover:border-white/20 {selectedCorrection === correction ? 'border-blue-400/30 bg-blue-500/10' : ''}"
              onclick={() => handleCorrectionClick(correction)}
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="text-xs">{getCorrectionTypeIcon(correction.type)}</span>
                  <span class="text-xs {getCorrectionTypeColor(correction.type)} capitalize">
                    {correction.type}
                  </span>
                </div>
                <span class="text-xs {getConfidenceColor(correction.confidence)}">
                  {Math.round(correction.confidence * 100)}%
                </span>
              </div>
              <div class="text-xs text-white/70 mt-1">
                "<span class="text-red-300">{correction.original}</span>" → 
                "<span class="text-green-300">{correction.corrected}</span>"
              </div>
            </button>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Action Buttons -->
    <div class="flex items-center gap-2 mt-4 pt-3 border-t border-white/10">
      <button
        class="btn-futuristic btn-primary-futuristic px-4 py-2 text-sm hover-lift neon-glow"
        onclick={handleAccept}
        aria-label="Accept AI corrections"
      >
        ✓ Accept
      </button>
      
      <button
        class="btn-futuristic btn-secondary-futuristic px-4 py-2 text-sm hover-lift"
        onclick={handleReject}
        aria-label="Reject AI corrections"
      >
        ✗ Keep Original
      </button>
      
      <div class="flex-1"></div>
      
      <div class="text-xs text-white/50">
        {corrections.length} correction{corrections.length !== 1 ? 's' : ''}
      </div>
    </div>
  </div>
{/if}

<style>
  .btn-futuristic {
    @apply relative rounded-lg border transition-all duration-300 flex items-center justify-center;
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
  }

  .btn-primary-futuristic {
    @apply bg-blue-500/20 border-blue-400/30 text-blue-300;
  }

  .btn-primary-futuristic:hover {
    @apply bg-blue-500/30 border-blue-400/50 text-blue-200;
  }

  .btn-secondary-futuristic {
    @apply bg-white/5 border-white/20 text-white/80;
  }

  .btn-secondary-futuristic:hover {
    @apply bg-white/10 border-white/30 text-white/90;
  }

  .hover-lift:hover {
    transform: translateY(-1px) translateZ(0);
  }

  .neon-glow:hover {
    box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
  }

  .custom-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
  }

  .custom-scrollbar::-webkit-scrollbar {
    width: 4px;
  }

  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 2px;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.3);
  }
</style>
