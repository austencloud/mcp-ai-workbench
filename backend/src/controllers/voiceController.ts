import { FastifyRequest, FastifyReply } from "fastify";
import { VoiceProcessingService } from "../services/voiceProcessingService";
import { VoiceTestingService } from "../services/voiceTestingService";
import { AIProviderService } from "../services/aiProviderService";
import type {
  VoiceProcessingRequest,
  VoiceProcessingResponse,
} from "../services/voiceProcessingService";
import type { VoiceProfile, VoiceProcessingOptions } from "../types/voiceInput";

// Initialize services
const aiProvider = new AIProviderService();
const voiceProcessor = new VoiceProcessingService(aiProvider);
const voiceTester = new VoiceTestingService();

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
    if (!originalText || typeof originalText !== "string") {
      return reply.status(400).send({
        success: false,
        error: "originalText is required and must be a string",
      });
    }

    if (originalText.length > 5000) {
      return reply.status(400).send({
        success: false,
        error: "Text too long. Maximum 5000 characters allowed.",
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
        correctionSensitivity: "medium",
        autoApplyCorrections: false,
        preserveUserIntent: true,
        ...options,
      },
    };

    const result = await voiceProcessor.processVoiceTranscription(
      processingRequest
    );

    reply.send({
      success: result.success,
      data: result,
      error: result.error,
    });
  } catch (error: any) {
    console.error("Voice processing error:", error);
    reply.status(500).send({
      success: false,
      error: "Internal server error during voice processing",
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
        providers: availableProviders,
        supportedLanguages: [
          "en-US",
          "en-GB",
          "es-ES",
          "fr-FR",
          "de-DE",
          "it-IT",
          "pt-BR",
          "ru-RU",
          "ja-JP",
          "ko-KR",
          "zh-CN",
        ],
        features: {
          grammarCorrection: true,
          contextCorrection: true,
          realTimeProcessing: true,
          multiProvider: true,
          caching: true,
        },
      },
    });
  } catch (error: any) {
    console.error("Voice stats error:", error);
    reply.status(500).send({
      success: false,
      error: "Failed to retrieve voice processing statistics",
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
      message: "Voice processing cache cleared successfully",
    });
  } catch (error: any) {
    console.error("Clear cache error:", error);
    reply.status(500).send({
      success: false,
      error: "Failed to clear voice processing cache",
    });
  }
}

/**
 * Test voice processing with comprehensive test suites
 */
export async function testVoiceProcessing(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const results = await voiceTester.runAllTests();

    // Calculate overall statistics
    const allResults = Object.values(results).flat();
    const totalTests = allResults.length;
    const passedTests = allResults.filter((r) => r.passed).length;
    const averageScore =
      allResults.reduce((sum, r) => sum + r.score, 0) / totalTests;
    const averageProcessingTime =
      allResults.reduce((sum, r) => sum + r.processingTime, 0) / totalTests;

    reply.send({
      success: true,
      data: {
        testResults: results,
        summary: {
          totalTests,
          passedTests,
          failedTests: totalTests - passedTests,
          passRate: (passedTests / totalTests) * 100,
          averageScore,
          averageProcessingTime,
          testSuites: Object.keys(results).length,
        },
      },
    });
  } catch (error: any) {
    console.error("Voice test error:", error);
    reply.status(500).send({
      success: false,
      error: "Failed to run voice processing test",
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
      { code: "en-US", name: "English (US)", flag: "🇺🇸" },
      { code: "en-GB", name: "English (UK)", flag: "🇬🇧" },
      { code: "es-ES", name: "Spanish (Spain)", flag: "🇪🇸" },
      { code: "es-MX", name: "Spanish (Mexico)", flag: "🇲🇽" },
      { code: "fr-FR", name: "French (France)", flag: "🇫🇷" },
      { code: "de-DE", name: "German (Germany)", flag: "🇩🇪" },
      { code: "it-IT", name: "Italian (Italy)", flag: "🇮🇹" },
      { code: "pt-BR", name: "Portuguese (Brazil)", flag: "🇧🇷" },
      { code: "ru-RU", name: "Russian (Russia)", flag: "🇷🇺" },
      { code: "ja-JP", name: "Japanese (Japan)", flag: "🇯🇵" },
      { code: "ko-KR", name: "Korean (South Korea)", flag: "🇰🇷" },
      { code: "zh-CN", name: "Chinese (Simplified)", flag: "🇨🇳" },
      { code: "zh-TW", name: "Chinese (Traditional)", flag: "🇹🇼" },
      { code: "ar-SA", name: "Arabic (Saudi Arabia)", flag: "🇸🇦" },
      { code: "hi-IN", name: "Hindi (India)", flag: "🇮🇳" },
    ];

    reply.send({
      success: true,
      data: {
        languages,
        defaultLanguage: "en-US",
        autoDetection: false, // Web Speech API doesn't support auto-detection
      },
    });
  } catch (error: any) {
    console.error("Languages error:", error);
    reply.status(500).send({
      success: false,
      error: "Failed to retrieve supported languages",
    });
  }
}

/**
 * Run specific test suite
 */
export async function runTestSuite(
  request: FastifyRequest<{ Querystring: { suite?: string } }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const { suite } = request.query;
    const testSuites = voiceTester.getTestSuites();

    if (suite) {
      const targetSuite = testSuites.find((s) => s.name === suite);
      if (!targetSuite) {
        return reply.status(400).send({
          success: false,
          error: `Test suite '${suite}' not found`,
          availableSuites: testSuites.map((s) => s.name),
        });
      }

      const results = await voiceTester.runTestSuite(targetSuite);
      const passedTests = results.filter((r) => r.passed).length;

      reply.send({
        success: true,
        data: {
          suiteName: suite,
          results,
          summary: {
            totalTests: results.length,
            passedTests,
            failedTests: results.length - passedTests,
            passRate: (passedTests / results.length) * 100,
            averageScore:
              results.reduce((sum, r) => sum + r.score, 0) / results.length,
            averageProcessingTime:
              results.reduce((sum, r) => sum + r.processingTime, 0) /
              results.length,
          },
        },
      });
    } else {
      // Return available test suites
      reply.send({
        success: true,
        data: {
          availableSuites: testSuites.map((suite) => ({
            name: suite.name,
            description: suite.description,
            testCount: suite.testCases.length,
          })),
        },
      });
    }
  } catch (error: any) {
    console.error("Test suite error:", error);
    reply.status(500).send({
      success: false,
      error: "Failed to run test suite",
    });
  }
}

/**
 * Test specific correction sensitivity levels
 */
export async function testCorrectionSensitivity(
  request: FastifyRequest<{ Body: { text: string } }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const { text } = request.body;

    if (!text || typeof text !== "string") {
      return reply.status(400).send({
        success: false,
        error: "Text is required and must be a string",
      });
    }

    const sensitivities: ("low" | "medium" | "high")[] = [
      "low",
      "medium",
      "high",
    ];
    const results = [];

    for (const sensitivity of sensitivities) {
      const result = await voiceProcessor.processVoiceTranscription({
        originalText: text,
        options: {
          enableGrammarCorrection: true,
          enableContextCorrection: true,
          correctionSensitivity: sensitivity,
          autoApplyCorrections: false,
          preserveUserIntent: true,
        },
      });

      results.push({
        sensitivity,
        original: text,
        corrected: result.correctedText,
        corrections: result.corrections,
        confidence: result.confidence,
        processingTime: result.processingTime,
        success: result.success,
        correctionCount: result.corrections.length,
      });
    }

    reply.send({
      success: true,
      data: {
        originalText: text,
        results,
        comparison: {
          mostCorrections: results.reduce((max, r) =>
            r.correctionCount > max.correctionCount ? r : max
          ),
          fastestProcessing: results.reduce((min, r) =>
            r.processingTime < min.processingTime ? r : min
          ),
          highestConfidence: results.reduce((max, r) =>
            r.confidence > max.confidence ? r : max
          ),
        },
      },
    });
  } catch (error: any) {
    console.error("Sensitivity test error:", error);
    reply.status(500).send({
      success: false,
      error: "Failed to test correction sensitivity",
    });
  }
}
