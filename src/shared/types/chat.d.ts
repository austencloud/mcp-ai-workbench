export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp?: Date;
    metadata?: MessageMetadata;
}
export interface MessageMetadata {
    model?: string;
    provider?: string;
    tokens?: number;
    cost?: number;
    reasoning?: any;
    tools?: string[];
    confidence?: number;
}
export interface Conversation {
    id: string;
    title: string;
    messages: ChatMessage[];
    userId: string;
    workspaceId?: string;
    settings: ConversationSettings;
    createdAt: Date;
    updatedAt: Date;
}
export interface ConversationSettings {
    model: string;
    provider: string;
    temperature: number;
    maxTokens: number;
    enableWebSearch: boolean;
    enableMemoryAccess: boolean;
    enableReasoningMode: boolean;
    systemPrompt?: string;
}
export interface ChatRequest {
    messages: ChatMessage[];
    conversationId?: string;
    workspaceId?: string;
    settings?: Partial<ConversationSettings>;
    stream?: boolean;
}
export interface ChatResponse {
    message: ChatMessage;
    conversationId: string;
    usage?: TokenUsage;
    reasoning?: any;
    suggestions?: string[];
}
export interface TokenUsage {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cost?: number;
}
export interface ChatStreamChunk {
    type: 'start' | 'content' | 'end' | 'error';
    content?: string;
    metadata?: any;
    error?: string;
}
export interface ConversationSummary {
    id: string;
    title: string;
    messageCount: number;
    lastMessage: Date;
    participants: string[];
    topics: string[];
}
//# sourceMappingURL=chat.d.ts.map