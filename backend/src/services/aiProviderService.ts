import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from "axios";

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

  constructor() {
    this.baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
    this.checkAvailability();
  }

  private async checkAvailability() {
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`);
      if (response.status === 200 && response.data.models) {
        this.models = response.data.models.map((model: any) => model.name);
        this.available = this.models.length > 0;
      }
    } catch {
      this.available = false;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`);
      return response.status === 200;
    } catch {
      return false;
    }
  }

  async chat(messages: ChatMessage[], options: any = {}): Promise<AIResponse> {
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

      const response = await axios.post(`${this.baseUrl}/api/chat`, {
        model,
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        stream: false,
        options: {
          temperature: parseFloat(process.env.TEMPERATURE || "0.7"),
          num_predict: parseInt(process.env.MAX_TOKENS || "4000"),
        },
      });

      const assistantMessage = response.data.message;
      if (!assistantMessage?.content) {
        throw new Error("No response from Ollama");
      }

      return {
        message: { role: "assistant", content: assistantMessage.content },
        success: true,
        provider: "Ollama",
        model: model,
      };
    } catch (error: any) {
      return {
        message: {
          role: "assistant",
          content: `❌ Ollama Error: ${
            error.response?.data?.error || error.message
          }`,
        },
        success: false,
        error: error.message,
      };
    }
  }
}

export class AIProviderService {
  private providers: Map<string, AIProvider> = new Map();
  private defaultProvider: string;

  constructor() {
    // Initialize all providers
    this.providers.set("openai", new OpenAIProvider());
    this.providers.set("anthropic", new AnthropicProvider());
    this.providers.set("google", new GoogleProvider());
    this.providers.set("deepseek", new DeepSeekProvider());
    this.providers.set("ollama", new OllamaProvider());

    this.defaultProvider = process.env.DEFAULT_AI_PROVIDER || "openai";
  }

  async getAvailableProviders(): Promise<
    { name: string; models: string[]; available: boolean }[]
  > {
    const results = [];
    for (const [key, provider] of this.providers) {
      results.push({
        name: provider.name,
        models: provider.models,
        available: provider.available && (await provider.testConnection()),
      });
    }
    return results;
  }

  async chat(
    messages: ChatMessage[],
    options: {
      provider?: string;
      model?: string;
      conversationId?: number;
    } = {}
  ): Promise<AIResponse> {
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
      };
    }

    if (!provider.available) {
      // Try to find an available provider
      for (const [key, fallbackProvider] of this.providers) {
        if (
          fallbackProvider.available &&
          (await fallbackProvider.testConnection())
        ) {
          console.log(
            `Falling back to ${fallbackProvider.name} from ${provider.name}`
          );
          return await fallbackProvider.chat(messages, options);
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
      };
    }

    return await provider.chat(messages, options);
  }

  getProvider(name: string): AIProvider | undefined {
    return this.providers.get(name);
  }

  async refreshOllamaModels(): Promise<void> {
    const ollama = this.providers.get("ollama") as OllamaProvider;
    if (ollama) {
      await (ollama as any).checkAvailability();
    }
  }
}
