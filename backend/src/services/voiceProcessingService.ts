import { AIProviderService } from "./aiProviderService";
import type { ChatMessage } from "./aiProviderService";
import type {
  VoiceTranscriptionResult,
  VoiceCorrection,
  VoiceProcessingOptions,
  VoiceProfile,
  CorrectionHistory,
} from "../types/voiceInput";

export interface VoiceProcessingRequest {
  originalText: string;
  context?: string;
  userProfile?: VoiceProfile;
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

export class VoiceProcessingService {
  private aiProvider: AIProviderService;
  private correctionCache: Map<string, VoiceProcessingResponse> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 1000;

  constructor(aiProvider: AIProviderService) {
    this.aiProvider = aiProvider;
  }

  /**
   * Process voice transcription with AI-powered text enhancement
   */
  async processVoiceTranscription(
    request: VoiceProcessingRequest
  ): Promise<VoiceProcessingResponse> {
    const startTime = Date.now();

    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(request);
      const cached = this.getCachedResult(cacheKey);
      if (cached) {
        return cached;
      }

      // Validate input
      if (!request.originalText?.trim()) {
        return {
          correctedText: request.originalText || "",
          corrections: [],
          confidence: 0,
          processingTime: Date.now() - startTime,
          success: false,
          error: "Empty text provided",
        };
      }

      // Build correction prompt based on options
      const prompt = this.buildCorrectionPrompt(request);

      // Get AI correction
      const aiResponse = await this.getAICorrection(prompt, request.options);

      if (!aiResponse.success) {
        return {
          correctedText: request.originalText,
          corrections: [],
          confidence: 0,
          processingTime: Date.now() - startTime,
          success: false,
          error: aiResponse.error || "AI processing failed",
        };
      }

      // Parse AI response
      const result = this.parseAIResponse(
        aiResponse.message.content,
        request.originalText
      );

      // Cache successful result
      const response: VoiceProcessingResponse = {
        ...result,
        processingTime: Date.now() - startTime,
        aiProvider: aiResponse.provider,
        success: true,
      };

      this.cacheResult(cacheKey, response);
      return response;
    } catch (error: any) {
      return {
        correctedText: request.originalText,
        corrections: [],
        confidence: 0,
        processingTime: Date.now() - startTime,
        success: false,
        error: error.message || "Unknown processing error",
      };
    }
  }

  /**
   * Build AI prompt for text correction based on user preferences
   */
  private buildCorrectionPrompt(request: VoiceProcessingRequest): string {
    const { originalText, context, userProfile, options } = request;

    let prompt = `Please correct the following voice transcription to create professional, properly formatted text. Focus on:\n\n`;
    prompt += `CRITICAL REQUIREMENTS:\n`;
    prompt += `1. Add proper punctuation (periods, commas, question marks, exclamation points)\n`;
    prompt += `2. Capitalize the first letter of sentences and proper nouns\n`;
    prompt += `3. Remove filler words (um, uh, like, you know, etc.)\n`;
    prompt += `4. Fix grammar and sentence structure\n`;
    prompt += `5. Ensure proper sentence breaks and paragraph structure\n`;
    prompt += `6. Preserve the original meaning and intent completely\n\n`;

    prompt += `Original voice transcription: "${originalText}"\n\n`;

    if (context) {
      prompt += `Context: ${context}\n\n`;
    }

    if (userProfile?.vocabularyPreferences?.length) {
      const vocab = userProfile.vocabularyPreferences
        .slice(0, 10)
        .map((v) => `"${v.term}" -> "${v.preferredForm}"`)
        .join(", ");
      prompt += `User vocabulary preferences: ${vocab}\n\n`;
    }

    if (options?.correctionSensitivity) {
      const sensitivity = options.correctionSensitivity;
      if (sensitivity === "low") {
        prompt += `CORRECTION LEVEL: MINIMAL\n`;
        prompt += `- Only fix obvious spelling errors and add basic punctuation\n`;
        prompt += `- Preserve informal tone and casual language\n`;
        prompt += `- Minimal grammar corrections\n`;
      } else if (sensitivity === "high") {
        prompt += `CORRECTION LEVEL: COMPREHENSIVE\n`;
        prompt += `- Apply extensive grammar, style, and clarity improvements\n`;
        prompt += `- Enhance sentence structure and flow\n`;
        prompt += `- Use professional language and formal tone\n`;
        prompt += `- Improve word choice and eliminate redundancy\n`;
        prompt += `- Ensure perfect punctuation and capitalization\n`;
      } else {
        prompt += `CORRECTION LEVEL: MODERATE\n`;
        prompt += `- Fix grammar, spelling, and punctuation errors\n`;
        prompt += `- Maintain the original tone and style\n`;
        prompt += `- Add necessary punctuation and capitalization\n`;
        prompt += `- Remove obvious filler words\n`;
      }
    }

    prompt += `\nPlease respond in the following JSON format:
{
  "correctedText": "the corrected text",
  "corrections": [
    {
      "original": "original phrase",
      "corrected": "corrected phrase", 
      "type": "grammar|spelling|context|punctuation",
      "confidence": 0.95,
      "startIndex": 0,
      "endIndex": 10
    }
  ],
  "confidence": 0.95
}

If no corrections are needed, return the original text with an empty corrections array.`;

    return prompt;
  }

  /**
   * Get AI correction using the multi-provider system
   */
  private async getAICorrection(
    prompt: string,
    options?: VoiceProcessingOptions
  ) {
    const messages: ChatMessage[] = [
      {
        role: "system",
        content:
          "You are an expert text correction assistant. Provide accurate grammar and spelling corrections while preserving the user's original intent and meaning.",
      },
      {
        role: "user",
        content: prompt,
      },
    ];

    // Use fastest available provider for real-time corrections
    const preferredProviders = ["google", "deepseek", "openai", "anthropic"];

    for (const provider of preferredProviders) {
      try {
        const response = await this.aiProvider.chat(messages, {
          provider,
          model: this.getOptimalModel(provider),
          enableWebSearch: false, // Disable web search for voice processing
        });

        if (response.success) {
          return response;
        }
      } catch (error) {
        console.warn(`Voice processing failed with ${provider}:`, error);
        continue;
      }
    }

    // Fallback to any available provider
    return await this.aiProvider.chat(messages, { enableWebSearch: false });
  }

  /**
   * Get optimal model for each provider for voice processing
   */
  private getOptimalModel(provider: string): string {
    const modelMap: Record<string, string> = {
      google: "gemini-1.5-flash", // Fast and efficient
      deepseek: "deepseek-chat",
      openai: "gpt-4o-mini", // Faster than full GPT-4
      anthropic: "claude-3-haiku-20240307", // Fastest Claude model
    };

    return modelMap[provider] || "";
  }

  /**
   * Parse AI response and extract corrections
   */
  private parseAIResponse(
    content: string,
    originalText: string
  ): {
    correctedText: string;
    corrections: VoiceCorrection[];
    confidence: number;
  } {
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        correctedText: parsed.correctedText || originalText,
        corrections: this.validateCorrections(parsed.corrections || []),
        confidence: Math.min(Math.max(parsed.confidence || 0.5, 0), 1),
      };
    } catch (error) {
      console.warn("Failed to parse AI response:", error);

      // Fallback: return original text with no corrections
      return {
        correctedText: originalText,
        corrections: [],
        confidence: 0.5,
      };
    }
  }

  /**
   * Validate and sanitize corrections array
   */
  private validateCorrections(corrections: any[]): VoiceCorrection[] {
    return corrections
      .filter((c) => c && typeof c === "object")
      .map((c) => ({
        original: String(c.original || ""),
        corrected: String(c.corrected || ""),
        type: ["grammar", "spelling", "context", "punctuation"].includes(c.type)
          ? c.type
          : "grammar",
        confidence: Math.min(Math.max(Number(c.confidence) || 0.5, 0), 1),
        startIndex: Math.max(Number(c.startIndex) || 0, 0),
        endIndex: Math.max(Number(c.endIndex) || 0, 0),
      }))
      .filter((c) => c.original && c.corrected && c.original !== c.corrected);
  }

  /**
   * Generate cache key for request
   */
  private generateCacheKey(request: VoiceProcessingRequest): string {
    const key = `${request.originalText}|${request.context || ""}|${
      request.options?.correctionSensitivity || "medium"
    }`;
    return Buffer.from(key, "utf8").toString("base64").substring(0, 64);
  }

  /**
   * Get cached result if available and not expired
   */
  private getCachedResult(key: string): VoiceProcessingResponse | null {
    const cached = this.correctionCache.get(key);
    if (!cached) return null;

    // Check if cache entry is expired
    if (Date.now() - cached.processingTime > this.CACHE_TTL) {
      this.correctionCache.delete(key);
      return null;
    }

    return cached;
  }

  /**
   * Cache processing result
   */
  private cacheResult(key: string, result: VoiceProcessingResponse): void {
    // Implement LRU cache behavior
    if (this.correctionCache.size >= this.MAX_CACHE_SIZE) {
      const firstKey = this.correctionCache.keys().next().value;
      if (firstKey) {
        this.correctionCache.delete(firstKey);
      }
    }

    this.correctionCache.set(key, result);
  }

  /**
   * Clear correction cache
   */
  public clearCache(): void {
    this.correctionCache.clear();
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { size: number; maxSize: number; hitRate?: number } {
    return {
      size: this.correctionCache.size,
      maxSize: this.MAX_CACHE_SIZE,
    };
  }
}
