import { FastifyRequest, FastifyReply } from 'fastify';
import { VoiceProcessingService } from '../services/voiceProcessingService';
import { AIProviderService } from '../services/aiProviderService';
import type { VoiceProcessingRequest, VoiceProcessingResponse } from '../services/voiceProcessingService';
import type { VoiceProfile, VoiceProcessingOptions } from '../types/voiceInput';

// Initialize services
const aiProvider = new AIProviderService();
const voiceProcessor = new VoiceProcessingService(aiProvider);

export interface ProcessVoiceRequest {
  Body: {
    originalText: string;
    context?: string;
    options?: VoiceProcessingOptions;
    userProfile?: VoiceProfile;
  };
}

export interface VoiceProfileRequest {
  Body: {
    userId: string;
    profile: Partial<VoiceProfile>;
  };
}

export interface VoiceStatsRequest {
  Querystring: {
    userId?: string;
  };
}

/**
 * Process voice transcription with AI enhancement
 */
export async function processVoiceTranscription(
  request: FastifyRequest<ProcessVoiceRequest>,
  reply: FastifyReply
): Promise<void> {
  try {
    const { originalText, context, options, userProfile } = request.body;

    // Validate input
    if (!originalText || typeof originalText !== 'string') {
      return reply.status(400).send({
        success: false,
        error: 'originalText is required and must be a string'
      });
    }

    if (originalText.length > 5000) {
      return reply.status(400).send({
        success: false,
        error: 'Text too long. Maximum 5000 characters allowed.'
      });
    }

    // Process the voice transcription
    const processingRequest: VoiceProcessingRequest = {
      originalText: originalText.trim(),
      context,
      userProfile,
      options: {
        enableGrammarCorrection: true,
        enableContextCorrection: true,
        correctionSensitivity: 'medium',
        autoApplyCorrections: false,
        preserveUserIntent: true,
        ...options
      }
    };

    const result = await voiceProcessor.processVoiceTranscription(processingRequest);

    reply.send({
      success: result.success,
      data: result,
      error: result.error
    });

  } catch (error: any) {
    console.error('Voice processing error:', error);
    reply.status(500).send({
      success: false,
      error: 'Internal server error during voice processing'
    });
  }
}

/**
 * Get voice processing statistics
 */
export async function getVoiceStats(
  request: FastifyRequest<VoiceStatsRequest>,
  reply: FastifyReply
): Promise<void> {
  try {
    const cacheStats = voiceProcessor.getCacheStats();
    const availableProviders = await aiProvider.getAvailableProviders();

    reply.send({
      success: true,
      data: {
        cache: cacheStats,
        providers: availableProviders.providers,
        supportedLanguages: [
          'en-US', 'en-GB', 'es-ES', 'fr-FR', 'de-DE', 
          'it-IT', 'pt-BR', 'ru-RU', 'ja-JP', 'ko-KR', 'zh-CN'
        ],
        features: {
          grammarCorrection: true,
          contextCorrection: true,
          realTimeProcessing: true,
          multiProvider: true,
          caching: true
        }
      }
    });

  } catch (error: any) {
    console.error('Voice stats error:', error);
    reply.status(500).send({
      success: false,
      error: 'Failed to retrieve voice processing statistics'
    });
  }
}

/**
 * Clear voice processing cache
 */
export async function clearVoiceCache(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    voiceProcessor.clearCache();
    
    reply.send({
      success: true,
      message: 'Voice processing cache cleared successfully'
    });

  } catch (error: any) {
    console.error('Clear cache error:', error);
    reply.status(500).send({
      success: false,
      error: 'Failed to clear voice processing cache'
    });
  }
}

/**
 * Test voice processing with sample text
 */
export async function testVoiceProcessing(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const sampleTexts = [
      "hello world this is a test",
      "can you help me with this problem",
      "i need to send an email to my boss about the meeting tomorrow",
      "whats the weather like today"
    ];

    const results = [];

    for (const text of sampleTexts) {
      const result = await voiceProcessor.processVoiceTranscription({
        originalText: text,
        options: {
          enableGrammarCorrection: true,
          enableContextCorrection: true,
          correctionSensitivity: 'medium',
          autoApplyCorrections: false,
          preserveUserIntent: true
        }
      });

      results.push({
        original: text,
        corrected: result.correctedText,
        corrections: result.corrections,
        confidence: result.confidence,
        processingTime: result.processingTime,
        success: result.success
      });
    }

    reply.send({
      success: true,
      data: {
        testResults: results,
        summary: {
          totalTests: results.length,
          successfulTests: results.filter(r => r.success).length,
          averageProcessingTime: results.reduce((sum, r) => sum + r.processingTime, 0) / results.length,
          averageConfidence: results.reduce((sum, r) => sum + r.confidence, 0) / results.length
        }
      }
    });

  } catch (error: any) {
    console.error('Voice test error:', error);
    reply.status(500).send({
      success: false,
      error: 'Failed to run voice processing test'
    });
  }
}

/**
 * Get supported languages for voice input
 */
export async function getSupportedLanguages(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const languages = [
      { code: 'en-US', name: 'English (US)', flag: '🇺🇸' },
      { code: 'en-GB', name: 'English (UK)', flag: '🇬🇧' },
      { code: 'es-ES', name: 'Spanish (Spain)', flag: '🇪🇸' },
      { code: 'es-MX', name: 'Spanish (Mexico)', flag: '🇲🇽' },
      { code: 'fr-FR', name: 'French (France)', flag: '🇫🇷' },
      { code: 'de-DE', name: 'German (Germany)', flag: '🇩🇪' },
      { code: 'it-IT', name: 'Italian (Italy)', flag: '🇮🇹' },
      { code: 'pt-BR', name: 'Portuguese (Brazil)', flag: '🇧🇷' },
      { code: 'ru-RU', name: 'Russian (Russia)', flag: '🇷🇺' },
      { code: 'ja-JP', name: 'Japanese (Japan)', flag: '🇯🇵' },
      { code: 'ko-KR', name: 'Korean (South Korea)', flag: '🇰🇷' },
      { code: 'zh-CN', name: 'Chinese (Simplified)', flag: '🇨🇳' },
      { code: 'zh-TW', name: 'Chinese (Traditional)', flag: '🇹🇼' },
      { code: 'ar-SA', name: 'Arabic (Saudi Arabia)', flag: '🇸🇦' },
      { code: 'hi-IN', name: 'Hindi (India)', flag: '🇮🇳' }
    ];

    reply.send({
      success: true,
      data: {
        languages,
        defaultLanguage: 'en-US',
        autoDetection: false // Web Speech API doesn't support auto-detection
      }
    });

  } catch (error: any) {
    console.error('Languages error:', error);
    reply.status(500).send({
      success: false,
      error: 'Failed to retrieve supported languages'
    });
  }
}
