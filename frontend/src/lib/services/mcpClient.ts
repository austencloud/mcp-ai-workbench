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

  constructor(baseUrl: string = "http://localhost:4000/rpc") {
    this.baseUrl = baseUrl;
  }

  private async call(method: string, params?: any): Promise<any> {
    const response = await fetch(this.baseUrl, {
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
  }): Promise<{ message: ChatMessage; success: boolean }> {
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
}

// Export singleton instance
export const mcp = new MCPClient();
