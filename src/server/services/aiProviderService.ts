import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from "axios";
import { WebBrowsingService } from "./webBrowsingService";
import { SearchProgressManager } from "./searchProgressManager";
import { MathComputationService } from "./mathComputationService";
import { MathQuery } from "../types/mathComputation";
import fs from "fs";
import path from "path";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AIResponse {
  message: {
    role: "assistant";
    content: string;
  };
  success: boolean;
  provider?: string;
  model?: string;
  usage?: any;
  error?: string;
  webSearchUsed?: boolean;
  mathComputationUsed?: boolean;
}

export interface AIProvider {
  name: string;
  models: string[];
  available: boolean;
  testConnection(): Promise<boolean>;
  chat(messages: ChatMessage[], options?: any): Promise<AIResponse>;
}

class OpenAIProvider implements AIProvider {
  name = "OpenAI";
  models = ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"];
  available = false;
  private client: OpenAI | null = null;

  constructor() {
    if (
      process.env.OPENAI_API_KEY &&
      process.env.OPENAI_API_KEY !== "sk-placeholder-key-replace-with-real-key"
    ) {
      this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      this.available = true;
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.client) return false;
    try {
      await this.client.models.list();
      return true;
    } catch {
      return false;
    }
  }

  async chat(messages: ChatMessage[], options: any = {}): Promise<AIResponse> {
    if (!this.client) {
      return {
        message: {
          role: "assistant",
          content: "🔑 OpenAI API key not configured.",
        },
        success: false,
        error: "API key not configured",
      };
    }

    try {
      const completion = await this.client.chat.completions.create({
        model: options.model || process.env.OPENAI_MODEL || "gpt-4o",
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        max_tokens: parseInt(process.env.MAX_TOKENS || "4000"),
        temperature: parseFloat(process.env.TEMPERATURE || "0.7"),
      });

      const assistantMessage = completion.choices[0]?.message;
      if (!assistantMessage?.content) {
        throw new Error("No response from OpenAI");
      }

      return {
        message: { role: "assistant", content: assistantMessage.content },
        success: true,
        provider: "OpenAI",
        model: completion.model,
        usage: completion.usage,
      };
    } catch (error: any) {
      return {
        message: {
          role: "assistant",
          content: `❌ OpenAI Error: ${error.message}`,
        },
        success: false,
        error: error.message,
      };
    }
  }
}

class AnthropicProvider implements AIProvider {
  name = "Anthropic";
  models = [
    "claude-3-5-sonnet-20241022",
    "claude-3-5-haiku-20241022",
    "claude-3-opus-20240229",
  ];
  available = false;
  private client: Anthropic | null = null;

  constructor() {
    if (
      process.env.ANTHROPIC_API_KEY &&
      process.env.ANTHROPIC_API_KEY !==
        "sk-ant-placeholder-key-replace-with-real-key"
    ) {
      this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      this.available = true;
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.client) return false;
    try {
      // Test with a minimal request
      await this.client.messages.create({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 10,
        messages: [{ role: "user", content: "Hi" }],
      });
      return true;
    } catch {
      return false;
    }
  }

  async chat(messages: ChatMessage[], options: any = {}): Promise<AIResponse> {
    if (!this.client) {
      return {
        message: {
          role: "assistant",
          content: "🔑 Anthropic API key not configured.",
        },
        success: false,
        error: "API key not configured",
      };
    }

    try {
      // Convert system messages to system parameter
      const systemMessage = messages.find((m) => m.role === "system")?.content;
      const conversationMessages = messages.filter((m) => m.role !== "system");

      const response = await this.client.messages.create({
        model:
          options.model ||
          process.env.ANTHROPIC_MODEL ||
          "claude-3-5-sonnet-20241022",
        max_tokens: parseInt(process.env.MAX_TOKENS || "4000"),
        temperature: parseFloat(process.env.TEMPERATURE || "0.7"),
        system: systemMessage,
        messages: conversationMessages.map((msg) => ({
          role: msg.role as "user" | "assistant",
          content: msg.content,
        })),
      });

      const content = response.content[0];
      if (content.type !== "text") {
        throw new Error("Unexpected response type from Claude");
      }

      return {
        message: { role: "assistant", content: content.text },
        success: true,
        provider: "Anthropic",
        model: response.model,
        usage: response.usage,
      };
    } catch (error: any) {
      return {
        message: {
          role: "assistant",
          content: `❌ Claude Error: ${error.message}`,
        },
        success: false,
        error: error.message,
      };
    }
  }
}

class GoogleProvider implements AIProvider {
  name = "Google";
  models = ["gemini-2.0-flash-exp", "gemini-1.5-pro", "gemini-1.5-flash"];
  available = false;
  private client: GoogleGenerativeAI | null = null;

  constructor() {
    if (
      process.env.GOOGLE_API_KEY &&
      process.env.GOOGLE_API_KEY !== "placeholder-key-replace-with-real-key"
    ) {
      this.client = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
      this.available = true;
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.client) return false;
    try {
      const model = this.client.getGenerativeModel({
        model: "gemini-1.5-flash",
      });
      await model.generateContent("Hi");
      return true;
    } catch {
      return false;
    }
  }

  async chat(messages: ChatMessage[], options: any = {}): Promise<AIResponse> {
    if (!this.client) {
      return {
        message: {
          role: "assistant",
          content: "🔑 Google API key not configured.",
        },
        success: false,
        error: "API key not configured",
      };
    }

    try {
      const model = this.client.getGenerativeModel({
        model:
          options.model || process.env.GOOGLE_MODEL || "gemini-2.0-flash-exp",
        generationConfig: {
          maxOutputTokens: parseInt(process.env.MAX_TOKENS || "4000"),
          temperature: parseFloat(process.env.TEMPERATURE || "0.7"),
        },
      });

      // Convert messages to Gemini format
      const history = messages.slice(0, -1).map((msg) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      }));

      const lastMessage = messages[messages.length - 1];
      const chat = model.startChat({ history });
      const result = await chat.sendMessage(lastMessage.content);

      return {
        message: { role: "assistant", content: result.response.text() },
        success: true,
        provider: "Google",
        model:
          options.model || process.env.GOOGLE_MODEL || "gemini-2.0-flash-exp",
      };
    } catch (error: any) {
      return {
        message: {
          role: "assistant",
          content: `❌ Gemini Error: ${error.message}`,
        },
        success: false,
        error: error.message,
      };
    }
  }
}

class DeepSeekProvider implements AIProvider {
  name = "DeepSeek";
  models = ["deepseek-chat", "deepseek-coder"];
  available = false;
  private apiKey: string | null = null;

  constructor() {
    if (
      process.env.DEEPSEEK_API_KEY &&
      process.env.DEEPSEEK_API_KEY !==
        "sk-placeholder-key-replace-with-real-key"
    ) {
      this.apiKey = process.env.DEEPSEEK_API_KEY;
      this.available = true;
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.apiKey) return false;
    try {
      const response = await axios.post(
        "https://api.deepseek.com/v1/chat/completions",
        {
          model: "deepseek-chat",
          messages: [{ role: "user", content: "Hi" }],
          max_tokens: 10,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );
      return response.status === 200;
    } catch {
      return false;
    }
  }

  async chat(messages: ChatMessage[], options: any = {}): Promise<AIResponse> {
    if (!this.apiKey) {
      return {
        message: {
          role: "assistant",
          content: "🔑 DeepSeek API key not configured.",
        },
        success: false,
        error: "API key not configured",
      };
    }

    try {
      const response = await axios.post(
        "https://api.deepseek.com/v1/chat/completions",
        {
          model: options.model || process.env.DEEPSEEK_MODEL || "deepseek-chat",
          messages: messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
          max_tokens: parseInt(process.env.MAX_TOKENS || "4000"),
          temperature: parseFloat(process.env.TEMPERATURE || "0.7"),
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      const assistantMessage = response.data.choices[0]?.message;
      if (!assistantMessage?.content) {
        throw new Error("No response from DeepSeek");
      }

      return {
        message: { role: "assistant", content: assistantMessage.content },
        success: true,
        provider: "DeepSeek",
        model: response.data.model,
        usage: response.data.usage,
      };
    } catch (error: any) {
      return {
        message: {
          role: "assistant",
          content: `❌ DeepSeek Error: ${
            error.response?.data?.error?.message || error.message
          }`,
        },
        success: false,
        error: error.message,
      };
    }
  }
}

class OllamaProvider implements AIProvider {
  name = "Ollama";
  models: string[] = [];
  available = false;
  private baseUrl: string;
  private modelCache: Map<string, boolean> = new Map();
  private lastModelCheck: number = 0;
  private readonly MODEL_CHECK_INTERVAL = 30000; // 30 seconds

  constructor() {
    this.baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
    this.checkAvailability();
  }

  private async checkAvailability() {
    const startTime = performance.now();
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`, {
        timeout: 5000, // 5 second timeout
      });
      if (response.status === 200 && response.data.models) {
        this.models = response.data.models.map((model: any) => model.name);
        this.available = this.models.length > 0;

        // Cache model availability
        this.models.forEach((model) => this.modelCache.set(model, true));
        this.lastModelCheck = Date.now();

        const duration = performance.now() - startTime;
        console.log(
          `🔍 [OLLAMA] Model check completed in ${duration.toFixed(
            2
          )}ms - Found ${this.models.length} models`
        );
      }
    } catch (error) {
      this.available = false;
      const duration = performance.now() - startTime;
      console.log(
        `❌ [OLLAMA] Model check failed in ${duration.toFixed(2)}ms:`,
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }

  async testConnection(): Promise<boolean> {
    const startTime = performance.now();
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`, {
        timeout: 3000, // 3 second timeout for connection test
      });
      const duration = performance.now() - startTime;
      console.log(
        `🔗 [OLLAMA] Connection test completed in ${duration.toFixed(2)}ms`
      );
      return response.status === 200;
    } catch (error) {
      const duration = performance.now() - startTime;
      console.log(
        `❌ [OLLAMA] Connection test failed in ${duration.toFixed(2)}ms`
      );
      return false;
    }
  }

  private async ensureModelLoaded(model: string): Promise<void> {
    // Check if we need to refresh model cache
    if (Date.now() - this.lastModelCheck > this.MODEL_CHECK_INTERVAL) {
      await this.checkAvailability();
    }

    // Quick check if model is cached as available
    if (this.modelCache.get(model)) {
      return;
    }

    const startTime = performance.now();
    try {
      // Attempt to load the model by making a minimal request
      await axios.post(
        `${this.baseUrl}/api/generate`,
        {
          model,
          prompt: "",
          stream: false,
          options: { num_predict: 1 },
        },
        { timeout: 10000 }
      );

      this.modelCache.set(model, true);
      const duration = performance.now() - startTime;
      console.log(
        `🚀 [OLLAMA] Model ${model} loaded in ${duration.toFixed(2)}ms`
      );
    } catch (error) {
      const duration = performance.now() - startTime;
      console.log(
        `⚠️ [OLLAMA] Model ${model} loading took ${duration.toFixed(
          2
        )}ms (may still work)`
      );
      // Don't throw - the model might still work for actual requests
    }
  }

  async chat(messages: ChatMessage[], options: any = {}): Promise<AIResponse> {
    const overallStartTime = performance.now();

    if (!this.available) {
      return {
        message: {
          role: "assistant",
          content:
            "🔌 Ollama not available. Make sure Ollama is running locally.",
        },
        success: false,
        error: "Ollama not available",
      };
    }

    try {
      const model =
        options.model ||
        process.env.OLLAMA_MODEL ||
        this.models[0] ||
        "llama3.2:latest";

      console.log(`🤖 [OLLAMA] Starting chat with model: ${model}`);

      // Ensure model is loaded (with timing)
      const modelLoadStartTime = performance.now();
      await this.ensureModelLoaded(model);
      const modelLoadDuration = performance.now() - modelLoadStartTime;
      console.log(
        `⚡ [OLLAMA] Model preparation: ${modelLoadDuration.toFixed(2)}ms`
      );

      // Prepare request with optimized settings for speed
      const requestStartTime = performance.now();
      const requestPayload = {
        model,
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        stream: false, // TODO: Implement streaming in Phase 2
        options: {
          temperature: parseFloat(process.env.TEMPERATURE || "0.7"),
          num_predict: parseInt(process.env.MAX_TOKENS || "4000"),
          // Performance optimizations
          num_ctx: 4096, // Reduce context window for speed
          num_thread: 8, // Use multiple threads
          repeat_penalty: 1.1,
          top_k: 40,
          top_p: 0.9,
        },
      };

      console.log(`📤 [OLLAMA] Sending request to ${this.baseUrl}/api/chat`);

      const response = await axios.post(
        `${this.baseUrl}/api/chat`,
        requestPayload,
        {
          timeout: 60000, // 60 second timeout
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const requestDuration = performance.now() - requestStartTime;
      console.log(
        `📥 [OLLAMA] Request completed in ${requestDuration.toFixed(2)}ms`
      );

      const assistantMessage = response.data.message;
      if (!assistantMessage?.content) {
        throw new Error("No response from Ollama");
      }

      const overallDuration = performance.now() - overallStartTime;
      console.log(
        `✅ [OLLAMA] Total chat duration: ${overallDuration.toFixed(2)}ms`
      );
      console.log(
        `📊 [OLLAMA] Response length: ${assistantMessage.content.length} characters`
      );

      return {
        message: { role: "assistant", content: assistantMessage.content },
        success: true,
        provider: "Ollama",
        model: model,
        usage: {
          totalTime: overallDuration,
          modelLoadTime: modelLoadDuration,
          requestTime: requestDuration,
          responseLength: assistantMessage.content.length,
        },
      };
    } catch (error: any) {
      const overallDuration = performance.now() - overallStartTime;
      console.error(
        `❌ [OLLAMA] Chat failed after ${overallDuration.toFixed(2)}ms:`,
        error instanceof Error ? error.message : "Unknown error"
      );

      return {
        message: {
          role: "assistant",
          content: `❌ Ollama Error: ${
            error.response?.data?.error || error.message
          }. Please check if Ollama is running and the model is available.`,
        },
        success: false,
        error: error.message,
        usage: {
          totalTime: overallDuration,
          failed: true,
        },
      };
    }
  }
}

export class AIProviderService {
  private providers: Map<string, AIProvider> = new Map();
  private defaultProvider: string;
  private webBrowsingService: WebBrowsingService;
  private mathComputationService: MathComputationService;
  private preferencesFile: string;

  constructor() {
    // Initialize all providers
    this.providers.set("openai", new OpenAIProvider());
    this.providers.set("anthropic", new AnthropicProvider());
    this.providers.set("google", new GoogleProvider());
    this.providers.set("deepseek", new DeepSeekProvider());
    this.providers.set("ollama", new OllamaProvider());

    this.preferencesFile = path.join(process.cwd(), "ai-preferences.json");
    this.defaultProvider =
      this.loadSavedProvider() || process.env.DEFAULT_AI_PROVIDER || "ollama";

    // Initialize web browsing service with AI service reference
    this.webBrowsingService = new WebBrowsingService(this);

    // Initialize mathematical computation service with AI capability
    this.mathComputationService = new MathComputationService({}, this);
  }

  private loadSavedProvider(): string | null {
    try {
      if (fs.existsSync(this.preferencesFile)) {
        const preferences = JSON.parse(
          fs.readFileSync(this.preferencesFile, "utf8")
        );
        const savedProvider = preferences.provider;
        const savedModel = preferences.model;

        if (savedProvider && this.providers.has(savedProvider)) {
          // Only log in development mode
          if (process.env.NODE_ENV === "development") {
            console.log(
              `[AI] Loaded saved provider: ${savedProvider} with model: ${
                savedModel || "default"
              }`
            );
          }
          return savedProvider;
        }
      }
    } catch (error) {
      // Silent fail for production
      if (process.env.NODE_ENV === "development") {
        console.log(`[AI] Could not load saved preferences: ${error}`);
      }
    }
    return null;
  }

  private saveProviderPreference(provider: string, model?: string): void {
    try {
      const preferences = {
        provider,
        model: model || null,
        timestamp: Date.now(),
      };
      fs.writeFileSync(
        this.preferencesFile,
        JSON.stringify(preferences, null, 2)
      );
      console.log(
        `[AI] Saved provider preference: ${provider} with model: ${
          model || "default"
        }`
      );
    } catch (error) {
      console.log(`[AI] Could not save preferences: ${error}`);
    }
  }

  getSavedPreferences(): {
    provider: string | null;
    model: string | null;
  } {
    try {
      if (fs.existsSync(this.preferencesFile)) {
        const preferences = JSON.parse(
          fs.readFileSync(this.preferencesFile, "utf8")
        );
        return {
          provider: preferences.provider || null,
          model: preferences.model || null,
        };
      }
    } catch (error) {
      console.log(`[AI] Could not load preferences: ${error}`);
    }
    return { provider: null, model: null };
  }

  private async detectWebSearchNeed(message: string): Promise<boolean> {
    const simpleDateQueries = [
      /^what day is it\??$/i,
      /^what's today\??$/i,
      /^current date\??$/i,
      /^today's date\??$/i,
      /^what day of the week is it\??$/i,
      /^what time is it\??$/i,
      /^what day of the week is tomorrow\??$/i,
      /^what's tomorrow\??$/i,
    ];

    if (simpleDateQueries.some((pattern) => pattern.test(message.trim()))) {
      console.log(
        `[AI] Simple date query detected, skipping web search: "${message}"`
      );
      return false;
    }

    try {
      const analysisPrompt = `Does this query need web search for current/real-time info?

Query: "${message}"

Answer only "YES" or "NO":`;

      let analysisResult = "";
      const timeout = 5000; // 5 second timeout

      // Try Ollama first with timeout
      const ollamaProvider = this.providers.get("ollama");
      if (ollamaProvider?.available) {
        try {
          const analysisPromise = ollamaProvider.chat(
            [{ role: "user", content: analysisPrompt }],
            { model: "llama3.2:latest" }
          );

          const timeoutPromise = new Promise<AIResponse>((_, reject) =>
            setTimeout(() => reject(new Error("Timeout")), timeout)
          );

          const result = await Promise.race([analysisPromise, timeoutPromise]);
          if (result.success) {
            analysisResult = result.message.content.trim().toUpperCase();
          }
        } catch (error) {
          console.log("[AI] Ollama analysis failed/timeout, trying fallback");
        }
      }

      // Fallback to Google with timeout
      if (!analysisResult && this.providers.get("google")?.available) {
        try {
          const analysisPromise = this.providers
            .get("google")!
            .chat([{ role: "user", content: analysisPrompt }], {
              model: "gemini-1.5-flash",
            });

          const timeoutPromise = new Promise<AIResponse>((_, reject) =>
            setTimeout(() => reject(new Error("Timeout")), timeout)
          );

          const result = await Promise.race([analysisPromise, timeoutPromise]);
          if (result.success) {
            analysisResult = result.message.content.trim().toUpperCase();
          }
        } catch (error) {
          console.log(
            "[AI] Google analysis failed/timeout, using fallback logic"
          );
        }
      }

      if (analysisResult.includes("YES")) {
        console.log(`[AI] AI-powered web search triggered for: "${message}"`);
        return true;
      } else if (analysisResult.includes("NO")) {
        console.log(
          `[AI] AI-powered decision: no web search needed for: "${message}"`
        );
        return false;
      }
    } catch (error) {
      console.log("[AI] AI analysis failed, falling back to regex patterns");
    }

    // Fast fallback to simple keyword detection
    const webSearchKeywords = [
      /(?:latest|recent|news|current|today|now|this year|2024|2025)/i,
      /(?:near me|in [A-Z][a-z]+|weather|movies|restaurants|showtimes)/i,
      /(?:who is|what is.*(?:company|person|place|stock))/i,
      /(?:when was.*(?:born|founded|created|invented))/i,
    ];

    const needsSearch =
      webSearchKeywords.some((pattern) => pattern.test(message)) &&
      message.length > 15 &&
      !/(hello|hi|thanks|what is \d+|how are you)/i.test(message);

    if (needsSearch) {
      console.log(`[AI] Fallback regex triggered web search for: "${message}"`);
    }

    return needsSearch;
  }

  private async detectMathQuery(message: string): Promise<boolean> {
    if (message.length > 200) return false;

    // Fast regex-based detection first (most efficient)
    const isMathRegex = this.mathComputationService.isMathQuery(message);
    if (isMathRegex) return true;

    // Only use AI for ambiguous cases, with timeout
    try {
      const timeout = 2000;
      const aiDetectionPromise =
        this.mathComputationService.isMathQueryAI(message);
      const timeoutPromise = new Promise<boolean>((_, reject) =>
        setTimeout(() => reject(new Error("AI detection timeout")), timeout)
      );

      return await Promise.race([aiDetectionPromise, timeoutPromise]);
    } catch (error) {
      console.log(
        `[Math] AI detection failed/timeout, using regex result: ${isMathRegex}`
      );
      return isMathRegex;
    }
  }

  private async performMathComputation(query: string): Promise<string> {
    try {
      console.log(`[AI] Performing mathematical computation for: "${query}"`);

      const mathQuery: MathQuery = {
        expression: query,
        precision: 50,
        format: "auto",
      };

      const result = await this.mathComputationService.compute(mathQuery);

      if (!result.success) {
        return `I attempted to calculate "${query}" but encountered an error: ${result.error}. Let me try to help you with this calculation using my general knowledge.`;
      }

      let response = `I calculated "${query}" using high-precision mathematical computation:\n\n`;
      response += `**Precise Result:** ${result.result}\n`;

      if (
        result.approximateResult &&
        result.approximateResult !== result.result
      ) {
        response += `**Approximate:** ${result.approximateResult}\n`;
      }

      response += `**Method:** ${result.method}\n`;
      response += `**Precision:** ${result.precision} decimal places\n`;
      response += `**Operation Type:** ${result.operationType}\n`;

      if (result.metadata.executionTime) {
        response += `**Computation Time:** ${result.metadata.executionTime}ms\n`;
      }

      // Add verification note for square roots
      if (result.operationType === "square_root") {
        response += `\n*This result was computed using high-precision arithmetic to avoid AI hallucination about mathematical values.*`;
      }

      return response;
    } catch (error) {
      console.error("[AI] Math computation failed:", error);
      return `I attempted to calculate "${query}" but encountered an issue. Let me provide what I can from my mathematical knowledge, though I recommend using a calculator for precise results.`;
    }
  }

  private async performWebSearch(query: string): Promise<string> {
    try {
      // Generate session ID for progress tracking
      const sessionId = SearchProgressManager.generateSessionId();

      const searchResult = await this.webBrowsingService.searchAndAnalyze(
        query,
        3,
        sessionId
      );

      if (searchResult.results.length === 0) {
        return `I searched the web but couldn't find specific information about "${query}".`;
      }

      const topResults = searchResult.results.slice(0, 3);
      let webInfo = `Based on my web search, here's what I found about "${query}":\n\n`;

      topResults.forEach((result, index) => {
        webInfo += `${index + 1}. **${result.title}**\n`;
        webInfo += `   ${result.snippet}\n`;
        webInfo += `   Source: ${result.source}\n\n`;
      });

      if (searchResult.analysis && searchResult.analysis.length > 100) {
        webInfo += `**Analysis:** ${searchResult.analysis}`;
      }

      return webInfo;
    } catch (error) {
      console.error("[AI] Web search failed:", error);
      return `I attempted to search the web for "${query}" but encountered an issue. Let me provide what I can from my training data, though it may not be the most current information.`;
    }
  }

  private getDirectDateAnswer(query: string): string | null {
    const simpleDateQueries = [
      /what day is it|what's today|current date|today's date|what day of the week is it/i,
      /what day of the week is tomorrow|what's tomorrow/i,
      /what time is it/i,
    ];

    if (simpleDateQueries.some((pattern) => pattern.test(query))) {
      const now = new Date();

      if (/tomorrow/i.test(query)) {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dayOfWeek = tomorrow.toLocaleDateString("en-US", {
          weekday: "long",
        });
        const fullDate = tomorrow.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });
        return `Tomorrow is ${dayOfWeek}, ${fullDate}.`;
      } else if (/time/i.test(query)) {
        const timeString = now.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          second: "2-digit",
          timeZoneName: "short",
        });
        return `The current time is ${timeString}.`;
      } else {
        const dayOfWeek = now.toLocaleDateString("en-US", {
          weekday: "long",
        });
        const fullDate = now.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });
        return `Today is ${dayOfWeek}, ${fullDate}.`;
      }
    }

    return null;
  }

  async chat(
    messages: ChatMessage[],
    options: {
      provider?: string;
      model?: string;
      conversationId?: number;
      enableWebSearch?: boolean;
    } = {}
  ): Promise<AIResponse> {
    const lastMessage = messages[messages.length - 1];
    let webSearchUsed = false;
    let mathComputationUsed = false;
    let enhancedMessages = [...messages];

    // Save provider preference when a provider/model is used
    if (options.provider || options.model) {
      this.saveProviderPreference(
        options.provider || this.defaultProvider,
        options.model
      );
    }

    // Check for simple date queries first
    if (lastMessage.role === "user") {
      const directAnswer = this.getDirectDateAnswer(lastMessage.content);
      if (directAnswer) {
        console.log(
          `[AI] Providing direct date answer: "${lastMessage.content}"`
        );
        return {
          message: { role: "assistant", content: directAnswer },
          success: true,
          provider: "System",
          webSearchUsed: false,
          mathComputationUsed: false,
        };
      }
    }

    // Check for mathematical queries before web search
    if (lastMessage.role === "user") {
      const isMathQuery = await this.detectMathQuery(lastMessage.content);

      if (isMathQuery) {
        console.log(
          `[AI] Detected mathematical query: "${lastMessage.content}"`
        );

        const mathResult = await this.performMathComputation(
          lastMessage.content
        );
        mathComputationUsed = true;

        return {
          message: { role: "assistant", content: mathResult },
          success: true,
          provider: "MathComputation",
          webSearchUsed: false,
          mathComputationUsed: true,
        };
      }
    }

    // Auto-detect web search need (default enabled unless explicitly disabled)
    if (options.enableWebSearch !== false && lastMessage.role === "user") {
      const needsWebSearch = await this.detectWebSearchNeed(
        lastMessage.content
      );

      if (needsWebSearch) {
        console.log(
          `[AI] Detected web search need for: "${lastMessage.content}"`
        );

        const webResults = await this.performWebSearch(lastMessage.content);
        webSearchUsed = true;

        // Add web search context to the conversation
        enhancedMessages = [
          ...messages.slice(0, -1),
          {
            role: "system",
            content: `IMPORTANT: You have access to current web search results below. Use this information to answer the user's question accurately and factually.

Web search results for "${lastMessage.content}":

${webResults}

Based on these current search results, provide a comprehensive answer to the user's question. Always cite your sources and indicate that the information comes from web search. If the user asks about current information like today's date, time, or recent events, use the search results to provide accurate, up-to-date information.`,
          },
          lastMessage,
        ];
      }
    }

    const providerName = options.provider || this.defaultProvider;
    const provider = this.providers.get(providerName);

    if (!provider) {
      return {
        message: {
          role: "assistant",
          content: `❌ Unknown AI provider: ${providerName}`,
        },
        success: false,
        error: "Unknown provider",
        webSearchUsed,
        mathComputationUsed,
      };
    }

    if (!provider.available) {
      for (const [key, fallbackProvider] of this.providers) {
        if (
          fallbackProvider.available &&
          (await fallbackProvider.testConnection())
        ) {
          console.log(
            `Falling back to ${fallbackProvider.name} from ${provider.name}`
          );
          const result = await fallbackProvider.chat(enhancedMessages, options);
          return { ...result, webSearchUsed, mathComputationUsed };
        }
      }

      return {
        message: {
          role: "assistant",
          content:
            "❌ No AI providers are currently available. Please check your API keys and connections.",
        },
        success: false,
        error: "No providers available",
        webSearchUsed,
        mathComputationUsed,
      };
    }

    const result = await provider.chat(enhancedMessages, options);
    return { ...result, webSearchUsed, mathComputationUsed };
  }

  getProvider(name: string): AIProvider | undefined {
    return this.providers.get(name);
  }

  async getAvailableProviders(): Promise<
    Array<{
      name: string;
      models: string[];
      available: boolean;
      connected?: boolean;
    }>
  > {
    const providers = [];

    for (const [key, provider] of this.providers) {
      let connected = false;
      if (provider.available) {
        try {
          // Add 3 second timeout for connection tests
          const connectionPromise = provider.testConnection();
          const timeoutPromise = new Promise<boolean>((_, reject) =>
            setTimeout(() => reject(new Error("Connection test timeout")), 3000)
          );

          connected = await Promise.race([connectionPromise, timeoutPromise]);
        } catch {
          connected = false;
        }
      }

      providers.push({
        name: provider.name,
        models: provider.models,
        available: provider.available,
        connected,
      });
    }

    return providers;
  }

  async refreshOllamaModels(): Promise<void> {
    const ollama = this.providers.get("ollama") as OllamaProvider;
    if (ollama) {
      await (ollama as any).checkAvailability();
    }
  }

  async generateResponse(messages: ChatMessage[]): Promise<string> {
    const result = await this.chat(messages);
    return result.message.content;
  }
}
