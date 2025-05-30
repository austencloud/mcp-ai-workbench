<script lang="ts">
  interface VoiceCorrection {
    type: string;
    original: string;
    corrected: string;
    position?: { start: number; end: number };
    confidence?: number;
    reason?: string;
  }

  interface Props {
    originalText: string;
    correctedText: string;
    corrections: VoiceCorrection[];
    confidence: number;
    showDiff?: boolean;
    onAccept?: (text: string) => void;
    onReject?: () => void;
  }

  let {
    originalText,
    correctedText,
    corrections,
    confidence,
    showDiff = false,
    onAccept,
    onReject
  }: Props = $props();

  function getConfidenceColor(confidence: number): string {
    if (confidence >= 0.8) return '#4ade80';
    if (confidence >= 0.6) return '#facc15';
    return '#f87171';
  }

  function getConfidenceText(confidence: number): string {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  }

  function getCorrectionTypeColor(type: string): string {
    const typeColors: Record<string, string> = {
      grammar: '#60a5fa',
      spelling: '#f87171',
      punctuation: '#4ade80',
      capitalization: '#a78bfa',
      filler_removal: '#fb923c',
      default: '#9ca3af'
    };
    return typeColors[type] || typeColors.default;
  }

  function formatType(type: string): string {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
</script>

<div style="display: flex; flex-direction: column; gap: 0.75rem;">
  <!-- Text Display -->
  <div class="glass-readable" style="padding: 0.75rem; border-radius: 0.5rem;">
    {#if showDiff && originalText !== correctedText}
      <div style="font-size: 0.875rem; color: rgba(255, 255, 255, 0.6); margin-bottom: 0.5rem;">Changes:</div>
      <div style="color: white; line-height: 1.6;">
        <!-- Simple diff display -->
        <div style="background: rgba(239, 68, 68, 0.2); color: #fca5a5; padding: 0.25rem; border-radius: 0.25rem; margin-bottom: 0.5rem; text-decoration: line-through;">
          Original: {originalText}
        </div>
        <div style="background: rgba(34, 197, 94, 0.2); color: #86efac; padding: 0.25rem; border-radius: 0.25rem;">
          Corrected: {correctedText}
        </div>
      </div>
    {:else}
      <div style="color: white;">{correctedText}</div>
    {/if}
  </div>

  <!-- Metadata -->
  <div style="display: flex; align-items: center; gap: 1rem; font-size: 0.875rem;">
    <div style="display: flex; align-items: center; gap: 0.5rem;">
      <span style="color: rgba(255, 255, 255, 0.6);">Confidence:</span>
      <span style="font-weight: 500; color: {getConfidenceColor(confidence)};">
        {getConfidenceText(confidence)} ({Math.round(confidence * 100)}%)
      </span>
    </div>
    
    <div style="display: flex; align-items: center; gap: 0.5rem;">
      <span style="color: rgba(255, 255, 255, 0.6);">Corrections:</span>
      <span style="color: white; font-weight: 500;">{corrections.length}</span>
    </div>
  </div>

  <!-- Corrections List -->
  {#if corrections.length > 0}
    <div style="display: flex; flex-direction: column; gap: 0.5rem;">
      <div style="font-size: 0.75rem; color: rgba(255, 255, 255, 0.6);">Applied Corrections:</div>
      <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
        {#each corrections as correction}
          <div style="padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.75rem; background: rgba(59, 130, 246, 0.2); color: {getCorrectionTypeColor(correction.type)}; border: 1px solid rgba(59, 130, 246, 0.3);">
            <span style="text-transform: capitalize;">{correction.type.replace('_', ' ')}</span>
            {#if correction.reason}
              <span style="color: rgba(255, 255, 255, 0.6); margin-left: 0.25rem;">• {correction.reason}</span>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Action Buttons -->
  {#if onAccept || onReject}
    <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
      {#if onReject}
        <button
          onclick={() => onReject?.()}
          class="correction-btn correction-btn-reject"
        >
          Use Original
        </button>
      {/if}
      {#if onAccept}
        <button
          onclick={() => onAccept?.(correctedText)}
          class="correction-btn correction-btn-accept"
        >
          Use Corrected
        </button>
      {/if}
    </div>
  {/if}
</div>

<style>
  .glass-readable {
    background: rgba(31, 41, 55, 0.8);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .correction-btn {
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s;
    border: 1px solid;
  }

  .correction-btn-reject {
    background: rgba(239, 68, 68, 0.2);
    color: #fca5a5;
    border-color: rgba(239, 68, 68, 0.3);
  }

  .correction-btn-reject:hover {
    background: rgba(239, 68, 68, 0.3);
  }

  .correction-btn-accept {
    background: rgba(34, 197, 94, 0.2);
    color: #86efac;
    border-color: rgba(34, 197, 94, 0.3);
  }

  .correction-btn-accept:hover {
    background: rgba(34, 197, 94, 0.3);
  }
</style>
