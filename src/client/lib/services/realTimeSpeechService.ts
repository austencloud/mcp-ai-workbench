import { writable, type Writable } from 'svelte/store';
import { voiceProcessingService } from './voiceProcessingService';
import type { VoiceProcessingOptions, VoiceCorrection } from '../types/voiceInput';

export interface SpeechChunk {
  id: string;
  text: string;
  timestamp: number;
  isFinal: boolean;
  confidence: number;
  position: { start: number; end: number };
  status: 'pending' | 'processing' | 'corrected' | 'failed';
  originalText?: string;
  correctedText?: string;
  corrections?: VoiceCorrection[];
  processingStartTime?: number;
}

export interface RealTimeSpeechState {
  isRecording: boolean;
  chunks: SpeechChunk[];
  currentText: string;
  pendingCorrections: number;
  totalChunks: number;
  isProcessingAny: boolean;
}

class RealTimeSpeechService {
  private chunks: Map<string, SpeechChunk> = new Map();
  private processingQueue: Set<string> = new Set();
  private maxConcurrentProcessing = 3;
  private chunkIdCounter = 0;
  private currentTextPosition = 0;

  // Reactive state store
  public state: Writable<RealTimeSpeechState> = writable({
    isRecording: false,
    chunks: [],
    currentText: '',
    pendingCorrections: 0,
    totalChunks: 0,
    isProcessingAny: false
  });

  private processingOptions: VoiceProcessingOptions = {
    enableGrammarCorrection: true,
    enableContextCorrection: true,
    correctionSensitivity: 'medium',
    autoApplyCorrections: false,
    preserveUserIntent: true
  };

  /**
   * Start a new speech session
   */
  public startSession(): void {
    this.chunks.clear();
    this.processingQueue.clear();
    this.chunkIdCounter = 0;
    this.currentTextPosition = 0;
    
    this.updateState({
      isRecording: true,
      chunks: [],
      currentText: '',
      pendingCorrections: 0,
      totalChunks: 0,
      isProcessingAny: false
    });
  }

  /**
   * End the current speech session
   */
  public endSession(): void {
    this.updateState({ isRecording: false });
    
    // Continue processing any remaining chunks
    this.processQueuedChunks();
  }

  /**
   * Add a new speech chunk (real-time transcription)
   */
  public addChunk(text: string, isFinal: boolean, confidence: number = 0.8): string {
    const chunkId = `chunk_${++this.chunkIdCounter}`;
    const startPosition = this.currentTextPosition;
    const endPosition = startPosition + text.length;

    const chunk: SpeechChunk = {
      id: chunkId,
      text: text.trim(),
      timestamp: Date.now(),
      isFinal,
      confidence,
      position: { start: startPosition, end: endPosition },
      status: 'pending',
      originalText: text.trim()
    };

    this.chunks.set(chunkId, chunk);
    
    // Update current text position for next chunk
    if (isFinal) {
      this.currentTextPosition = endPosition + 1; // +1 for space
    }

    // Update state immediately for real-time display
    this.updateStateFromChunks();

    // Queue for AI processing if final
    if (isFinal && chunk.text.length > 0) {
      this.queueForProcessing(chunkId);
    }

    return chunkId;
  }

  /**
   * Update an existing chunk (for interim results)
   */
  public updateChunk(chunkId: string, text: string, isFinal: boolean, confidence: number = 0.8): void {
    const chunk = this.chunks.get(chunkId);
    if (!chunk) return;

    const oldLength = chunk.text.length;
    const newLength = text.trim().length;
    
    chunk.text = text.trim();
    chunk.isFinal = isFinal;
    chunk.confidence = confidence;
    chunk.originalText = text.trim();
    
    // Adjust position if text length changed
    if (newLength !== oldLength) {
      chunk.position.end = chunk.position.start + newLength;
      this.adjustSubsequentPositions(chunkId, newLength - oldLength);
    }

    this.chunks.set(chunkId, chunk);
    this.updateStateFromChunks();

    // Queue for processing if now final
    if (isFinal && chunk.text.length > 0 && chunk.status === 'pending') {
      this.queueForProcessing(chunkId);
    }
  }

  /**
   * Get the current complete text
   */
  public getCurrentText(): string {
    const sortedChunks = Array.from(this.chunks.values())
      .sort((a, b) => a.position.start - b.position.start);

    return sortedChunks
      .map(chunk => chunk.correctedText || chunk.text)
      .join(' ')
      .trim();
  }

  /**
   * Get chunks with pending corrections
   */
  public getPendingCorrections(): SpeechChunk[] {
    return Array.from(this.chunks.values())
      .filter(chunk => chunk.status === 'processing' || chunk.status === 'pending');
  }

  /**
   * Check if all chunks are processed
   */
  public isFullyProcessed(): boolean {
    return Array.from(this.chunks.values())
      .every(chunk => chunk.status === 'corrected' || chunk.status === 'failed');
  }

  /**
   * Set processing options
   */
  public setProcessingOptions(options: Partial<VoiceProcessingOptions>): void {
    this.processingOptions = { ...this.processingOptions, ...options };
  }

  /**
   * Force process all pending chunks
   */
  public async processAllPending(): Promise<void> {
    const pendingChunks = Array.from(this.chunks.values())
      .filter(chunk => chunk.status === 'pending' && chunk.isFinal);

    for (const chunk of pendingChunks) {
      this.queueForProcessing(chunk.id);
    }

    await this.waitForAllProcessing();
  }

  /**
   * Wait for all processing to complete
   */
  public async waitForAllProcessing(): Promise<void> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (this.processingQueue.size === 0) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);

      // Timeout after 30 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, 30000);
    });
  }

  /**
   * Queue a chunk for AI processing
   */
  private queueForProcessing(chunkId: string): void {
    if (this.processingQueue.size >= this.maxConcurrentProcessing) {
      // Will be processed when a slot becomes available
      return;
    }

    this.processChunk(chunkId);
  }

  /**
   * Process queued chunks
   */
  private processQueuedChunks(): void {
    const pendingChunks = Array.from(this.chunks.values())
      .filter(chunk => chunk.status === 'pending' && chunk.isFinal)
      .slice(0, this.maxConcurrentProcessing - this.processingQueue.size);

    for (const chunk of pendingChunks) {
      this.processChunk(chunk.id);
    }
  }

  /**
   * Process a single chunk with AI correction
   */
  private async processChunk(chunkId: string): Promise<void> {
    const chunk = this.chunks.get(chunkId);
    if (!chunk || chunk.status !== 'pending') return;

    this.processingQueue.add(chunkId);
    chunk.status = 'processing';
    chunk.processingStartTime = Date.now();
    
    this.updateStateFromChunks();

    try {
      const response = await voiceProcessingService.processTranscription({
        originalText: chunk.text,
        options: this.processingOptions
      });

      if (response.success) {
        chunk.correctedText = response.correctedText;
        chunk.corrections = response.corrections;
        chunk.status = 'corrected';
      } else {
        chunk.status = 'failed';
        chunk.correctedText = chunk.text; // Fallback to original
      }
    } catch (error) {
      console.warn(`Chunk processing failed for ${chunkId}:`, error);
      chunk.status = 'failed';
      chunk.correctedText = chunk.text; // Fallback to original
    } finally {
      this.processingQueue.delete(chunkId);
      this.chunks.set(chunkId, chunk);
      this.updateStateFromChunks();
      
      // Process next queued chunk if any
      this.processQueuedChunks();
    }
  }

  /**
   * Adjust positions of subsequent chunks
   */
  private adjustSubsequentPositions(chunkId: string, delta: number): void {
    const targetChunk = this.chunks.get(chunkId);
    if (!targetChunk) return;

    for (const [id, chunk] of this.chunks) {
      if (chunk.position.start > targetChunk.position.start) {
        chunk.position.start += delta;
        chunk.position.end += delta;
        this.chunks.set(id, chunk);
      }
    }
  }

  /**
   * Update reactive state from current chunks
   */
  private updateStateFromChunks(): void {
    const chunksArray = Array.from(this.chunks.values())
      .sort((a, b) => a.position.start - b.position.start);

    const currentText = this.getCurrentText();
    const pendingCorrections = this.processingQueue.size;
    const isProcessingAny = pendingCorrections > 0;

    this.updateState({
      chunks: chunksArray,
      currentText,
      pendingCorrections,
      totalChunks: this.chunks.size,
      isProcessingAny
    });
  }

  /**
   * Update state helper
   */
  private updateState(updates: Partial<RealTimeSpeechState>): void {
    this.state.update(current => ({ ...current, ...updates }));
  }
}

export const realTimeSpeechService = new RealTimeSpeechService();
