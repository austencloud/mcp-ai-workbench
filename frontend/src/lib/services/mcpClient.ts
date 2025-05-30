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

// JSON-RPC Client
class MCPClient {
  private baseUrl: string;
  private requestId = 1;
  private connectedPort: number | null = null;

  constructor(baseUrl: string = "http://localhost:4000/rpc") {
    this.baseUrl = baseUrl;
  }

  private async discoverBackendPort(): Promise<string> {
    if (this.connectedPort) {
      return `http://localhost:${this.connectedPort}/rpc`;
    }

    const portsToTry = [4000, 4001, 4002, 4003, 4004, 4005];

    for (const port of portsToTry) {
      try {
        const testUrl = `http://localhost:${port}/health`;
        const response = await fetch(testUrl, {
          method: "GET",
          signal: AbortSignal.timeout(2000),
        });

        if (response.ok) {
          this.connectedPort = port;
          this.baseUrl = `http://localhost:${port}/rpc`;
          console.log(`✅ Connected to backend on port ${port}`);
          return this.baseUrl;
        }
      } catch (error) {
        continue;
      }
    }

    console.warn("⚠️ Could not find backend, using default port 4000");
    return "http://localhost:4000/rpc";
  }

  private async call(method: string, params?: any): Promise<any> {
    let currentUrl = this.baseUrl;

    try {
      const response = await fetch(currentUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method,
          params,
          id: this.requestId++,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message || "RPC Error");
      }

      return data.result;
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes("Failed to fetch") ||
          error.message.includes("HTTP error"))
      ) {
        console.log(
          "🔍 Connection failed, attempting to discover backend port..."
        );
        currentUrl = await this.discoverBackendPort();

        if (currentUrl !== this.baseUrl) {
          this.baseUrl = currentUrl;
          return this.call(method, params);
        }
      }
      throw error;
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
}

// Export singleton instance
export const mcp = new MCPClient();
