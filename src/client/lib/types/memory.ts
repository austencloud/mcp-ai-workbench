// Memory Types for Frontend
// Shared types for memory functionality

export enum MemoryType {
  FACT = 'FACT',
  EXPERIENCE = 'EXPERIENCE',
  OBSERVATION = 'OBSERVATION',
  PREFERENCE = 'PREFERENCE',
  PATTERN = 'PATTERN',
  SUMMARY = 'SUMMARY',
  ARCHIVE = 'ARCHIVE'
}

export interface MemoryContext {
  userId?: string;
  conversationId?: string;
  workspaceId?: string;
  timestamp: Date;
  relevantEntities: Entity[];
}

export interface MemorySource {
  type: 'user_input' | 'conversation' | 'system' | 'external';
  identifier: string;
  reliability: number;
}

export interface MemoryMetadata {
  language: string;
  topics: string[];
  entities: Entity[];
  keywords: string[];
  verified: boolean;
  [key: string]: any;
}

export interface Entity {
  text: string;
  type: string;
  confidence: number;
}

export interface MemoryItem {
  id: string;
  type: MemoryType;
  content: string;
  context: MemoryContext;
  importance: number;
  confidence: number;
  tags: string[];
  relationships: string[];
  createdAt: Date;
  lastAccessed: Date;
  accessCount: number;
  source: MemorySource;
  metadata: MemoryMetadata;
}

export interface MemorySearchResult {
  memory: MemoryItem;
  relevanceScore: number;
  explanation: string;
}

export interface MemoryQuery {
  query: string;
  type?: MemoryType[];
  context?: Partial<MemoryContext>;
  minImportance?: number;
  maxResults?: number;
  timeRange?: {
    start?: Date;
    end?: Date;
  };
  includeEmbeddings?: boolean;
}

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
  bidirectional?: boolean;
}

export interface UserPreference {
  category: string;
  preference: string;
  strength: number;
  source: string;
  createdAt: Date;
}

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

export interface Pattern {
  id: string;
  description: string;
  frequency: number;
  confidence: number;
  relatedEpisodes: string[];
  predictiveValue: number;
}

export interface ArchiveCriteria {
  age: number; // days
  importance: number; // threshold
  accessCount: number; // threshold
}

export interface MemoryResponse {
  success: boolean;
  memoryId?: string;
  data?: any;
  error?: string;
}

export interface RememberParams {
  input: string;
  context: MemoryContext;
  type?: MemoryType;
  importance?: number;
}

export interface RecallParams {
  query: string;
  context?: Partial<MemoryContext>;
  maxResults?: number;
  includeContext?: boolean;
}

// Memory Service Interface
export interface MemoryService {
  remember(params: RememberParams): Promise<MemoryResponse>;
  recall(params: RecallParams): Promise<MemoryResponse>;
  searchMemories(query: MemoryQuery): Promise<MemorySearchResult[]>;
  getMemoryContext(conversationId: string): Promise<MemoryResponse>;
  getMemoryStats(userId?: string): Promise<MemoryResponse>;
  optimizeMemory(): Promise<MemoryResponse>;
  
  // Episodic Memory
  recordEpisode(episode: Partial<EpisodicMemory>): Promise<MemoryResponse>;
  getEpisodicTimeline(userId: string, timeRange?: { start: Date; end: Date }): Promise<MemoryResponse>;
  predictOutcome(scenario: string): Promise<MemoryResponse>;
  
  // Semantic Memory
  addConcept(concept: string, description: string): Promise<MemoryResponse>;
  findRelatedConcepts(concept: string, maxDepth?: number): Promise<MemoryResponse>;
  verifyFact(statement: string): Promise<MemoryResponse>;
  
  // User Memory
  getUserPreferences(userId: string, category?: string): Promise<MemoryResponse>;
  adaptToUser(userId: string, context: string): Promise<MemoryResponse>;
  getUserInsights(userId: string): Promise<MemoryResponse>;
}

// Memory Events
export interface MemoryEvent {
  type: 'memory_created' | 'memory_updated' | 'memory_accessed' | 'memory_compressed';
  memoryId: string;
  timestamp: Date;
  details?: any;
}

// Memory Statistics
export interface MemoryStats {
  totalMemories: number;
  memoryTypes: Record<MemoryType, number>;
  averageImportance: number;
  compressionRatio: number;
  userActivity: {
    dailyInteractions: number;
    weeklyGrowth: number;
    topTopics: string[];
  };
  systemHealth: {
    status: 'healthy' | 'warning' | 'error';
    lastOptimization: Date;
    performanceMetrics: {
      searchLatency: number;
      storageUsage: number;
      indexHealth: number;
    };
  };
}

// Memory Configuration
export interface MemoryConfig {
  enabled: boolean;
  maxMemories: number;
  compressionThreshold: number;
  retentionPeriod: number; // days
  importanceDecay: number;
  vectorDimensions: number;
  embeddingModel: string;
  searchThreshold: number;
}

// Chat Integration
export interface ChatMemoryContext {
  conversationId: string;
  messageHistory: ChatMessage[];
  relevantMemories: MemoryItem[];
  userContext: PersonalityProfile;
  adaptationSuggestions: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  memoryReferences?: string[];
}

// Export utility functions
export function createMemoryContext(
  userId?: string,
  conversationId?: string,
  workspaceId?: string
): MemoryContext {
  return {
    userId,
    conversationId,
    workspaceId,
    timestamp: new Date(),
    relevantEntities: []
  };
}

export function createDefaultSource(
  type: MemorySource['type'],
  identifier: string,
  reliability: number = 0.8
): MemorySource {
  return {
    type,
    identifier,
    reliability
  };
}

export function formatMemoryType(type: MemoryType): string {
  return type.toLowerCase().replace('_', ' ');
}

export function getMemoryTypeColor(type: MemoryType): string {
  const colors = {
    [MemoryType.FACT]: 'blue',
    [MemoryType.EXPERIENCE]: 'green',
    [MemoryType.OBSERVATION]: 'yellow',
    [MemoryType.PREFERENCE]: 'purple',
    [MemoryType.PATTERN]: 'red',
    [MemoryType.SUMMARY]: 'gray',
    [MemoryType.ARCHIVE]: 'gray'
  };
  return colors[type] || 'gray';
}

export function calculateMemoryAge(createdAt: Date): number {
  return Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
}

export function isMemoryRecent(memory: MemoryItem, days: number = 7): boolean {
  return calculateMemoryAge(memory.createdAt) <= days;
}

export function sortMemoriesByRelevance(memories: MemorySearchResult[]): MemorySearchResult[] {
  return memories.sort((a, b) => b.relevanceScore - a.relevanceScore);
}

export function filterMemoriesByType(memories: MemoryItem[], types: MemoryType[]): MemoryItem[] {
  return memories.filter(memory => types.includes(memory.type));
}

export function groupMemoriesByType(memories: MemoryItem[]): Record<MemoryType, MemoryItem[]> {
  return memories.reduce((groups, memory) => {
    if (!groups[memory.type]) {
      groups[memory.type] = [];
    }
    groups[memory.type].push(memory);
    return groups;
  }, {} as Record<MemoryType, MemoryItem[]>);
}
