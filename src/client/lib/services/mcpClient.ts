import { writable, type Writable } from "svelte/store";
import { browser } from "$app/environment";
import type {
  ConnectionState,
  ConnectionStatus,
  BackendEndpoint,
} from "$lib/types/connection";

// Types
export interface Todo {
  id: number;
  text: string;
  done: boolean;
  workspace: string;
  createdAt: string;
  updatedAt: string;
}

export interface Workspace {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface Persona {
  name: string;
  prompt: string;
}

export interface Snippet {
  path: string;
  text: string;
  startLine?: number;
  endLine?: number;
}

// Re-export connection types for convenience
export type {
  ConnectionState,
  ConnectionStatus,
  BackendEndpoint,
} from "$lib/types/connection";

// Import services (after type definitions to avoid circular imports)
import { backendDiscoveryService } from "./BackendDiscoveryService";
import { connectionHealthService } from "./ConnectionHealthService";

// Request Queue for handling requests during connection issues
interface QueuedRequest {
  id: string;
  method: string;
  params: any;
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  timestamp: Date;
  retryCount: number;
}

// JSON-RPC Client with enhanced connection management
class MCPClient {
  private requestId = 1;
  private requestQueue: Map<string, QueuedRequest> = new Map();
  private isProcessingQueue = false;
  private readonly MAX_QUEUE_SIZE = 100;
  private readonly REQUEST_TIMEOUT = 30000; // 30 seconds
  private readonly MAX_REQUEST_RETRIES = 3;

  constructor() {
    // Initialize connection monitoring
    if (browser) {
      this.startQueueProcessor();
      this.setupConnectionMonitoring();
    }
  }

  /**
   * Setup connection monitoring and auto-recovery
   */
  private setupConnectionMonitoring(): void {
    // Subscribe to connection status changes (browser-only)
    if (connectionHealthService) {
      connectionHealthService.connectionHealth.subscribe((health) => {
        if (health.isHealthy && this.requestQueue.size > 0) {
          console.log(
            `🔄 Connection restored, processing ${this.requestQueue.size} queued requests`
          );
          this.processQueue();
        }
      });
    }
  }

  /**
   * Get current backend endpoint URL
   */
  private async getBackendUrl(): Promise<string> {
    if (!backendDiscoveryService) {
      // Fallback for SSR
      return "http://localhost:4000/rpc";
    }

    const endpoint = await backendDiscoveryService.getBestEndpoint();

    if (!endpoint) {
      throw new Error(
        "No backend endpoints available. Please ensure the backend server is running."
      );
    }

    return endpoint.rpcUrl;
  }

  /**
   * Enhanced call method with intelligent retry and queue management
   */
  private async call(method: string, params?: any): Promise<any> {
    const requestId = `${method}-${this.requestId++}-${Date.now()}`;

    // Check if we should queue the request (browser-only)
    if (
      connectionHealthService &&
      !connectionHealthService.getHealthStatus().isHealthy
    ) {
      return this.queueRequest(requestId, method, params);
    }

    try {
      return await this.executeRequest(method, params);
    } catch (error) {
      // Handle connection errors with intelligent retry
      if (this.isConnectionError(error)) {
        console.log(
          `🔍 Connection error for ${method}, attempting recovery...`
        );

        // Force endpoint rediscovery (browser-only)
        if (backendDiscoveryService) {
          await backendDiscoveryService.forceReconnect();
        }

        // Queue the request for retry
        return this.queueRequest(requestId, method, params);
      }

      throw error;
    }
  }

  /**
   * Execute a single request
   */
  private async executeRequest(method: string, params?: any): Promise<any> {
    const backendUrl = await this.getBackendUrl();

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.REQUEST_TIMEOUT
    );

    try {
      const response = await fetch(backendUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method,
          params,
          id: this.requestId,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message || "RPC Error");
      }

      return data.result;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Check if error is a connection-related error
   */
  private isConnectionError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;

    const connectionErrorPatterns = [
      "Failed to fetch",
      "HTTP error",
      "Network request failed",
      "fetch is not defined",
      "AbortError",
      "TimeoutError",
      "No backend endpoints available",
    ];

    return connectionErrorPatterns.some((pattern) =>
      error.message.includes(pattern)
    );
  }

  /**
   * Queue a request for later execution
   */
  private async queueRequest(
    id: string,
    method: string,
    params?: any
  ): Promise<any> {
    // Check queue size limit
    if (this.requestQueue.size >= this.MAX_QUEUE_SIZE) {
      throw new Error("Request queue is full. Please try again later.");
    }

    return new Promise((resolve, reject) => {
      const queuedRequest: QueuedRequest = {
        id,
        method,
        params,
        resolve,
        reject,
        timestamp: new Date(),
        retryCount: 0,
      };

      this.requestQueue.set(id, queuedRequest);
      console.log(
        `📥 Queued request ${method} (queue size: ${this.requestQueue.size})`
      );

      // Set timeout for queued request
      setTimeout(() => {
        const request = this.requestQueue.get(id);
        if (request) {
          this.requestQueue.delete(id);
          request.reject(new Error("Request timeout - backend unavailable"));
        }
      }, this.REQUEST_TIMEOUT);
    });
  }

  /**
   * Process queued requests
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.size === 0) {
      return;
    }

    this.isProcessingQueue = true;
    console.log(`🔄 Processing ${this.requestQueue.size} queued requests`);

    const requests = Array.from(this.requestQueue.values());

    for (const request of requests) {
      try {
        const result = await this.executeRequest(
          request.method,
          request.params
        );
        request.resolve(result);
        this.requestQueue.delete(request.id);
        console.log(`✅ Processed queued request ${request.method}`);
      } catch (error) {
        request.retryCount++;

        if (request.retryCount >= this.MAX_REQUEST_RETRIES) {
          request.reject(error);
          this.requestQueue.delete(request.id);
          console.error(
            `❌ Failed queued request ${request.method} after ${request.retryCount} retries`
          );
        } else {
          console.log(
            `🔄 Retrying queued request ${request.method} (attempt ${
              request.retryCount + 1
            })`
          );
        }
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * Start queue processor
   */
  private startQueueProcessor(): void {
    // Process queue every 5 seconds (browser-only)
    setInterval(() => {
      if (
        connectionHealthService &&
        connectionHealthService.getHealthStatus().isHealthy
      ) {
        this.processQueue();
      }
    }, 5000);
  }

  /**
   * Clear expired requests from queue
   */
  private cleanupQueue(): void {
    const now = Date.now();
    const expiredRequests: string[] = [];

    for (const [id, request] of this.requestQueue) {
      if (now - request.timestamp.getTime() > this.REQUEST_TIMEOUT) {
        expiredRequests.push(id);
        request.reject(new Error("Request expired"));
      }
    }

    expiredRequests.forEach((id) => this.requestQueue.delete(id));

    if (expiredRequests.length > 0) {
      console.log(`🧹 Cleaned up ${expiredRequests.length} expired requests`);
    }
  }

  // Todo methods
  async getTodos(
    workspace?: string
  ): Promise<{ todos: Todo[]; success: boolean }> {
    return this.call("getTodos", workspace ? { workspace } : undefined);
  }

  async createTodo(params: {
    text: string;
    workspace: string;
  }): Promise<{ todo: Todo; success: boolean }> {
    return this.call("createTodo", params);
  }

  async updateTodo(params: {
    id: number;
    done?: boolean;
    text?: string;
  }): Promise<{ todo: Todo; success: boolean }> {
    return this.call("updateTodo", params);
  }

  async deleteTodo(params: { id: number }): Promise<{ success: boolean }> {
    return this.call("deleteTodo", params);
  }

  // Workspace methods
  async getWorkspaces(): Promise<{
    workspaces: Workspace[];
    success: boolean;
  }> {
    return this.call("getWorkspaces");
  }

  async createWorkspace(params: {
    name: string;
  }): Promise<{ workspace: Workspace; success: boolean }> {
    return this.call("createWorkspace", params);
  }

  async updateWorkspace(params: {
    id: number;
    name: string;
  }): Promise<{ workspace: Workspace; success: boolean }> {
    return this.call("updateWorkspace", params);
  }

  async deleteWorkspace(params: { id: number }): Promise<{ success: boolean }> {
    return this.call("deleteWorkspace", params);
  }

  // File methods
  async readFile(params: {
    path: string;
    start?: number;
    end?: number;
  }): Promise<{ text: string; success: boolean }> {
    return this.call("readFile", params);
  }

  async listFiles(params: {
    dir: string;
  }): Promise<{ files: any[]; success: boolean }> {
    return this.call("listFiles", params);
  }

  // Chat methods
  async chat(params: {
    messages: ChatMessage[];
    workspace?: number;
    conversationId?: number;
    provider?: string;
    model?: string;
  }): Promise<{
    message: ChatMessage & {
      webSearchUsed?: boolean;
      mathComputationUsed?: boolean;
    };
    success: boolean;
    webSearchUsed?: boolean;
    mathComputationUsed?: boolean;
  }> {
    return this.call("chat", params);
  }

  async getAvailableProviders(): Promise<{
    providers: any[];
    success: boolean;
  }> {
    return this.call("getAvailableProviders");
  }

  async refreshOllamaModels(): Promise<{ success: boolean }> {
    return this.call("refreshOllamaModels");
  }

  async getSavedPreferences(): Promise<{
    preferences: { provider: string | null; model: string | null };
    success: boolean;
  }> {
    return this.call("getSavedPreferences");
  }

  async saveProviderPreference(params: {
    provider: string;
    model?: string;
  }): Promise<{ success: boolean }> {
    return this.call("saveProviderPreference", params);
  }

  // Conversation methods
  async getConversations(params: {
    workspaceId: number;
  }): Promise<{ conversations: any[]; success: boolean }> {
    return this.call("getConversations", params);
  }

  async createConversation(params: {
    workspaceId: number;
    title?: string;
  }): Promise<{ conversation: any; success: boolean }> {
    return this.call("createConversation", params);
  }

  async getConversation(params: {
    id: number;
  }): Promise<{ conversation: any; success: boolean }> {
    return this.call("getConversation", params);
  }

  async addMessage(params: {
    conversationId: string;
    message: ChatMessage;
  }): Promise<{ success: boolean }> {
    return this.call("addMessage", params);
  }

  async deleteConversation(params: {
    id: number;
  }): Promise<{ success: boolean }> {
    return this.call("deleteConversation", params);
  }

  // Memory methods
  async searchMemories(params: {
    userId: string;
    query: string;
    type?: string;
    limit?: number;
  }): Promise<{ memories: any[]; success: boolean }> {
    return this.call("searchMemories", params);
  }

  async getUserInsights(params: {
    userId: string;
  }): Promise<{ insights: any; success: boolean }> {
    return this.call("getUserInsights", params);
  }

  async getEpisodicTimeline(params: {
    userId: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<{ timeline: any[]; success: boolean }> {
    return this.call("getEpisodicTimeline", params);
  }

  async getUserPreferences(params: {
    userId: string;
  }): Promise<{ preferences: any[]; success: boolean }> {
    return this.call("getUserPreferences", params);
  }

  // Additional memory methods
  async remember(params: {
    input: string;
    context: any;
    type?: string;
    importance?: number;
  }): Promise<{ success: boolean; memoryId?: string; error?: string }> {
    return this.call("remember", params);
  }

  async addConversationMessage(params: {
    conversationId: string;
    role: "user" | "assistant" | "system";
    content: string;
    timestamp?: Date;
  }): Promise<{ success: boolean; error?: string }> {
    return this.call("addConversationMessage", params);
  }

  async recordEpisode(params: {
    event: string;
    outcome: string;
    participants?: string[];
    emotions?: string[];
    success?: boolean;
    context: any;
  }): Promise<{ success: boolean; memoryId?: string; error?: string }> {
    return this.call("recordEpisode", params);
  }

  async addConcept(params: {
    concept: string;
    description: string;
  }): Promise<{ success: boolean; memoryId?: string; error?: string }> {
    return this.call("addConcept", params);
  }

  async adaptToUser(params: {
    userId: string;
    context?: string;
  }): Promise<{ success: boolean; adaptation?: string; error?: string }> {
    return this.call("adaptToUser", params);
  }

  async getMemoryStats(params: {
    userId?: string;
  }): Promise<{ success: boolean; stats?: any; error?: string }> {
    return this.call("getMemoryStats", params);
  }

  async recall(params: {
    query: string;
    context: any;
    maxResults?: number;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    return this.call("recall", params);
  }

  async getMemoryContext(params: {
    conversationId: string;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    return this.call("getMemoryContext", params);
  }

  async optimizeMemory(): Promise<{ success: boolean; error?: string }> {
    return this.call("optimizeMemory");
  }

  async predictOutcome(params: {
    scenario: string;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    return this.call("predictOutcome", params);
  }

  async findRelatedConcepts(params: {
    concept: string;
    maxDepth?: number;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    return this.call("findRelatedConcepts", params);
  }

  async verifyFact(params: {
    statement: string;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    return this.call("verifyFact", params);
  }

  async getConversationSummary(params: {
    conversationId: string;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    return this.call("getConversationSummary", params);
  }

  async findSimilarMemories(params: {
    content: string;
    threshold?: number;
    limit?: number;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    return this.call("findSimilarMemories", params);
  }

  // Voice processing methods
  async processVoiceTranscription(params: {
    originalText: string;
    context?: string;
    options?: any;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    return this.call("processVoiceTranscription", params);
  }

  async getVoiceStats(): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    return this.call("getVoiceStats", {});
  }

  async clearVoiceCache(): Promise<{ success: boolean; error?: string }> {
    return this.call("clearVoiceCache", {});
  }

  async testVoiceProcessing(): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    return this.call("testVoiceProcessing", {});
  }

  async getSupportedLanguages(): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    return this.call("getSupportedLanguages", {});
  }

  async runTestSuite(params?: {
    suite?: string;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    return this.call("runTestSuite", params || {});
  }

  async testCorrectionSensitivity(params: {
    text: string;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    return this.call("testCorrectionSensitivity", params);
  }
}

// Export singleton instance
export const mcp = new MCPClient();
