// Memory Type Definitions for MCP AI Workbench
// Comprehensive TypeScript interfaces for the memory system

export interface MemoryItem {
  id: string;
  type: MemoryType;
  content: string;
  context: MemoryContext;
  importance: number; // 0-1 scale
  confidence: number; // 0-1 scale
  embedding?: number[];
  tags: string[];
  relationships: string[]; // IDs of related memories
  createdAt: Date;
  lastAccessed: Date;
  accessCount: number;
  source: MemorySource;
  metadata: MemoryMetadata;
}

export enum MemoryType {
  CONVERSATION = 'conversation',
  FACT = 'fact',
  PREFERENCE = 'preference',
  SKILL = 'skill',
  EXPERIENCE = 'experience',
  RELATIONSHIP = 'relationship',
  GOAL = 'goal',
  TASK = 'task',
  KNOWLEDGE = 'knowledge',
  OBSERVATION = 'observation'
}

export interface MemoryContext {
  conversationId?: string;
  workspaceId?: string;
  userId?: string;
  sessionId?: string;
  timestamp: Date;
  location?: string;
  trigger?: string;
  mood?: string;
  relevantEntities: string[];
}

export interface MemorySource {
  type: 'chat' | 'file' | 'web' | 'user_input' | 'system' | 'inference';
  identifier: string;
  reliability: number; // 0-1 scale
}

export interface MemoryMetadata {
  language?: string;
  sentiment?: number; // -1 to 1
  topics: string[];
  entities: NamedEntity[];
  keywords: string[];
  summary?: string;
  verified: boolean;
  contradicts?: string[]; // IDs of contradicting memories
}

export interface NamedEntity {
  text: string;
  type: 'PERSON' | 'ORGANIZATION' | 'LOCATION' | 'DATE' | 'CONCEPT' | 'PRODUCT';
  confidence: number;
}

export interface MemoryQuery {
  query: string;
  type?: MemoryType[];
  context?: Partial<MemoryContext>;
  maxResults?: number;
  minImportance?: number;
  timeRange?: {
    start?: Date;
    end?: Date;
  };
  includeEmbeddings?: boolean;
}

export interface MemorySearchResult {
  memory: MemoryItem;
  relevanceScore: number;
  explanation: string;
}

export interface ConversationMemory {
  conversationId: string;
  messages: ConversationMessage[];
  summary: string;
  keyTopics: string[];
  participants: string[];
  mood: string;
  outcomes: string[];
  followUpNeeded: boolean;
  createdAt: Date;
  lastUpdated: Date;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  importance: number;
  extractedInfo: ExtractedInfo;
}

export interface ExtractedInfo {
  facts: string[];
  preferences: UserPreference[];
  questions: string[];
  requests: string[];
  emotions: string[];
  entities: NamedEntity[];
}

export interface UserPreference {
  category: string;
  preference: string;
  strength: number; // 0-1 scale
  source: string;
  createdAt: Date;
}

export interface KnowledgeNode {
  id: string;
  concept: string;
  description: string;
  relationships: KnowledgeRelationship[];
  confidence: number;
  sources: string[];
  lastVerified: Date;
}

export interface KnowledgeRelationship {
  targetId: string;
  type: 'IS_A' | 'PART_OF' | 'RELATED_TO' | 'CAUSES' | 'IMPLIES' | 'CONTRADICTS';
  strength: number;
  bidirectional: boolean;
}

export interface MemoryStats {
  totalMemories: number;
  memoryByType: Record<MemoryType, number>;
  averageImportance: number;
  oldestMemory: Date;
  newestMemory: Date;
  memoryGrowthRate: number;
  retrievalFrequency: Record<string, number>;
}

export interface MemoryConfiguration {
  maxMemories: number;
  compressionThreshold: number;
  importanceDecayRate: number;
  similarityThreshold: number;
  autoCompressionEnabled: boolean;
  embeddingModel: string;
  retentionPeriods: Record<MemoryType, number>; // days
}

// Additional interfaces for episodic memory
export interface EpisodicMemory extends MemoryItem {
  event: string;
  outcome: string;
  participants: string[];
  location?: string;
  duration?: number;
  emotions: string[];
  lessons: string[];
  success: boolean;
}

export interface Pattern {
  id: string;
  description: string;
  frequency: number;
  confidence: number;
  relatedEpisodes: string[];
  predictiveValue: number;
}

// User modeling interfaces
export interface PersonalityProfile {
  userId: string;
  traits: Record<string, number>;
  communicationStyle: string;
  interests: string[];
  expertise: Record<string, number>;
  workingPatterns: string[];
  goals: string[];
  motivations: string[];
  lastUpdated: Date;
}

export interface UserInteraction {
  type: string;
  content: string;
  timestamp: Date;
  context: string;
  outcome?: string;
}

export interface UserPattern {
  pattern: string;
  frequency: number;
  contexts: string[];
  confidence: number;
}

// Memory management interfaces
export interface ForgetCriteria {
  olderThan?: Date;
  importance?: number;
  type?: MemoryType[];
  unused?: boolean;
  contradicted?: boolean;
}

export interface ArchiveCriteria {
  age: number; // days
  importance: number;
  accessCount: number;
}

// API request/response interfaces
export interface RememberParams {
  input: string;
  context: MemoryContext;
  type?: MemoryType;
  importance?: number;
}

export interface RecallParams {
  query: string;
  context?: MemoryContext;
  maxResults?: number;
  includeContext?: boolean;
}

export interface MemoryResponse {
  success: boolean;
  data?: any;
  error?: string;
  memoryId?: string;
}
