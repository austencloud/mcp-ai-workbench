import { mcp } from './mcpClient';
import type {
  VoiceTranscriptionResult,
  VoiceCorrection,
  VoiceProcessingOptions
} from '../types/voiceInput';

export interface VoiceProcessingRequest {
  originalText: string;
  context?: string;
  options?: VoiceProcessingOptions;
}

export interface VoiceProcessingResponse {
  correctedText: string;
  corrections: VoiceCorrection[];
  confidence: number;
  processingTime: number;
  aiProvider?: string;
  success: boolean;
  error?: string;
}

export interface VoiceStats {
  cache: {
    size: number;
    maxSize: number;
    hitRate?: number;
  };
  providers: any[];
  supportedLanguages: string[];
  features: {
    grammarCorrection: boolean;
    contextCorrection: boolean;
    realTimeProcessing: boolean;
    multiProvider: boolean;
    caching: boolean;
  };
}

export interface SupportedLanguage {
  code: string;
  name: string;
  flag: string;
}

class VoiceProcessingService {
  private processingQueue: Map<string, Promise<VoiceProcessingResponse>> = new Map();
  private readonly DEBOUNCE_DELAY = 300; // ms
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Process voice transcription with AI enhancement
   */
  async processTranscription(request: VoiceProcessingRequest): Promise<VoiceProcessingResponse> {
    try {
      // Check if already processing this text
      const cacheKey = this.generateCacheKey(request);
      const existingPromise = this.processingQueue.get(cacheKey);
      if (existingPromise) {
        return await existingPromise;
      }

      // Create processing promise
      const processingPromise = this.performProcessing(request);
      this.processingQueue.set(cacheKey, processingPromise);

      try {
        const result = await processingPromise;
        return result;
      } finally {
        // Clean up queue
        this.processingQueue.delete(cacheKey);
      }

    } catch (error: any) {
      return {
        correctedText: request.originalText,
        corrections: [],
        confidence: 0,
        processingTime: 0,
        success: false,
        error: error.message || 'Processing failed'
      };
    }
  }

  /**
   * Process transcription with debouncing for real-time input
   */
  async processTranscriptionDebounced(
    request: VoiceProcessingRequest,
    callback: (result: VoiceProcessingResponse) => void
  ): Promise<void> {
    const key = this.generateCacheKey(request);
    
    // Clear existing timer
    const existingTimer = this.debounceTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(async () => {
      try {
        const result = await this.processTranscription(request);
        callback(result);
      } catch (error) {
        console.error('Debounced processing failed:', error);
      } finally {
        this.debounceTimers.delete(key);
      }
    }, this.DEBOUNCE_DELAY);

    this.debounceTimers.set(key, timer);
  }

  /**
   * Perform the actual processing via backend
   */
  private async performProcessing(request: VoiceProcessingRequest): Promise<VoiceProcessingResponse> {
    const response = await mcp.call('processVoiceTranscription', {
      originalText: request.originalText,
      context: request.context,
      options: {
        enableGrammarCorrection: true,
        enableContextCorrection: true,
        correctionSensitivity: 'medium',
        autoApplyCorrections: false,
        preserveUserIntent: true,
        ...request.options
      }
    });

    if (!response.success) {
      throw new Error(response.error || 'Backend processing failed');
    }

    return response.data;
  }

  /**
   * Get voice processing statistics
   */
  async getStats(): Promise<VoiceStats> {
    const response = await mcp.call('getVoiceStats', {});
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to get voice stats');
    }

    return response.data;
  }

  /**
   * Clear voice processing cache
   */
  async clearCache(): Promise<void> {
    const response = await mcp.call('clearVoiceCache', {});
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to clear cache');
    }
  }

  /**
   * Test voice processing with sample data
   */
  async testProcessing(): Promise<any> {
    const response = await mcp.call('testVoiceProcessing', {});
    
    if (!response.success) {
      throw new Error(response.error || 'Test failed');
    }

    return response.data;
  }

  /**
   * Get supported languages
   */
  async getSupportedLanguages(): Promise<{
    languages: SupportedLanguage[];
    defaultLanguage: string;
    autoDetection: boolean;
  }> {
    const response = await mcp.call('getSupportedLanguages', {});
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to get supported languages');
    }

    return response.data;
  }

  /**
   * Apply corrections to text
   */
  applyCorrections(originalText: string, corrections: VoiceCorrection[]): string {
    if (!corrections.length) {
      return originalText;
    }

    // Sort corrections by start index in descending order to avoid index shifting
    const sortedCorrections = [...corrections].sort((a, b) => b.startIndex - a.startIndex);
    
    let result = originalText;
    
    for (const correction of sortedCorrections) {
      const { startIndex, endIndex, corrected } = correction;
      
      // Validate indices
      if (startIndex >= 0 && endIndex <= result.length && startIndex <= endIndex) {
        result = result.substring(0, startIndex) + corrected + result.substring(endIndex);
      }
    }

    return result;
  }

  /**
   * Get correction summary
   */
  getCorrectionSummary(corrections: VoiceCorrection[]): {
    totalCorrections: number;
    byType: Record<string, number>;
    averageConfidence: number;
  } {
    if (!corrections.length) {
      return {
        totalCorrections: 0,
        byType: {},
        averageConfidence: 0
      };
    }

    const byType: Record<string, number> = {};
    let totalConfidence = 0;

    for (const correction of corrections) {
      byType[correction.type] = (byType[correction.type] || 0) + 1;
      totalConfidence += correction.confidence;
    }

    return {
      totalCorrections: corrections.length,
      byType,
      averageConfidence: totalConfidence / corrections.length
    };
  }

  /**
   * Generate cache key for request
   */
  private generateCacheKey(request: VoiceProcessingRequest): string {
    const key = `${request.originalText}|${request.context || ''}|${JSON.stringify(request.options || {})}`;
    return btoa(key).substring(0, 32);
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    // Clear all debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
    
    // Clear processing queue
    this.processingQueue.clear();
  }
}

export const voiceProcessingService = new VoiceProcessingService();
