// Shared types between client and server
// This eliminates duplication and ensures consistency

// Re-export all reasoning types
export * from './reasoning';
export * from './api';
export * from './chat';
export * from './memory';
export * from './web';

// Common base types
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// User and workspace types
export interface User extends BaseEntity {
  email: string;
  name?: string;
  preferences: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  defaultModel: string;
  defaultProvider: string;
  enableReasoningMode: boolean;
  enableWebSearch: boolean;
  language: string;
}

export interface Workspace extends BaseEntity {
  name: string;
  description?: string;
  userId: string;
  settings: WorkspaceSettings;
}

export interface WorkspaceSettings {
  allowWebAccess: boolean;
  allowMemoryAccess: boolean;
  allowReasoningMode: boolean;
  maxTokens: number;
  temperature: number;
}

// AI Provider types
export interface AIProvider {
  id: string;
  name: string;
  type: 'openai' | 'anthropic' | 'google' | 'ollama' | 'custom';
  models: AIModel[];
  config: ProviderConfig;
  isActive: boolean;
}

export interface AIModel {
  id: string;
  name: string;
  displayName: string;
  provider: string;
  capabilities: ModelCapability[];
  maxTokens: number;
  costPer1kTokens?: number;
  isActive: boolean;
}

export type ModelCapability = 
  | 'text-generation'
  | 'reasoning'
  | 'code-generation'
  | 'image-analysis'
  | 'function-calling'
  | 'web-search'
  | 'memory-access';

export interface ProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
  customHeaders?: Record<string, string>;
}

// File and document types
export interface Document extends BaseEntity {
  name: string;
  content: string;
  type: DocumentType;
  size: number;
  workspaceId: string;
  metadata: DocumentMetadata;
}

export type DocumentType = 
  | 'text'
  | 'markdown'
  | 'code'
  | 'json'
  | 'csv'
  | 'pdf'
  | 'image';

export interface DocumentMetadata {
  language?: string;
  encoding?: string;
  mimeType?: string;
  tags: string[];
  summary?: string;
}

// Search and filtering
export interface SearchQuery {
  query: string;
  filters?: SearchFilters;
  sort?: SortOptions;
  pagination?: PaginationOptions;
}

export interface SearchFilters {
  type?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  tags?: string[];
  workspaceId?: string;
  userId?: string;
}

export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

// WebSocket message types
export interface WebSocketMessage {
  type: string;
  id?: string;
  data: any;
  timestamp: Date;
}

export interface WebSocketResponse extends WebSocketMessage {
  success: boolean;
  error?: string;
}

// Event types
export interface SystemEvent extends BaseEntity {
  type: EventType;
  source: string;
  data: any;
  userId?: string;
  workspaceId?: string;
}

export type EventType =
  | 'chat.message'
  | 'reasoning.started'
  | 'reasoning.completed'
  | 'memory.created'
  | 'memory.updated'
  | 'web.search'
  | 'web.scrape'
  | 'training.started'
  | 'training.completed'
  | 'error.occurred';

// Configuration types
export interface AppConfig {
  server: ServerConfig;
  client: ClientConfig;
  database: DatabaseConfig;
  ai: AIConfig;
  features: FeatureFlags;
}

export interface ServerConfig {
  port: number;
  host: string;
  cors: {
    origin: string[];
    credentials: boolean;
  };
  rateLimit: {
    max: number;
    windowMs: number;
  };
}

export interface ClientConfig {
  apiUrl: string;
  wsUrl: string;
  theme: string;
  features: string[];
}

export interface DatabaseConfig {
  url: string;
  type: 'sqlite' | 'postgresql' | 'mysql';
  pool: {
    min: number;
    max: number;
  };
}

export interface AIConfig {
  defaultProvider: string;
  defaultModel: string;
  providers: Record<string, ProviderConfig>;
  reasoning: {
    enabled: boolean;
    maxSteps: number;
    confidenceThreshold: number;
  };
}

export interface FeatureFlags {
  reasoningMode: boolean;
  webBrowsing: boolean;
  memorySystem: boolean;
  voiceInput: boolean;
  multiProvider: boolean;
  trainingMode: boolean;
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Error types
export interface AppError {
  code: string;
  message: string;
  details?: any;
  stack?: string;
  timestamp: Date;
}

export interface ValidationError extends AppError {
  field: string;
  value: any;
  constraint: string;
}

// Health check types
export interface HealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: Date;
  services: ServiceHealth[];
  version: string;
  uptime: number;
}

export interface ServiceHealth {
  name: string;
  status: 'healthy' | 'unhealthy';
  responseTime?: number;
  error?: string;
  details?: any;
}
