// Memory-related shared types

export interface Memory {
  id: string;
  content: string;
  type: MemoryType;
  importance: number;
  tags: string[];
  metadata: MemoryMetadata;
  userId?: string;
  workspaceId?: string;
  createdAt: Date;
  updatedAt: Date;
  lastAccessed?: Date;
}

export enum MemoryType {
  FACT = 'fact',
  EXPERIENCE = 'experience',
  PREFERENCE = 'preference',
  SKILL = 'skill',
  RELATIONSHIP = 'relationship',
  GOAL = 'goal',
  CONTEXT = 'context',
  CONVERSATION = 'conversation'
}

export interface MemoryMetadata {
  source: string;
  confidence: number;
  verified: boolean;
  relatedMemories: string[];
  embedding?: number[];
  summary?: string;
}

export interface MemoryQuery {
  query: string;
  type?: MemoryType;
  maxResults?: number;
  threshold?: number;
  userId?: string;
  workspaceId?: string;
  includeMetadata?: boolean;
}

export interface MemorySearchResult {
  memory: Memory;
  score: number;
  relevance: string;
}

export interface MemoryCluster {
  id: string;
  name: string;
  memories: Memory[];
  centroid: number[];
  coherence: number;
  tags: string[];
}

export interface MemoryStats {
  totalMemories: number;
  memoriesByType: Record<MemoryType, number>;
  averageImportance: number;
  mostAccessedMemories: Memory[];
  recentMemories: Memory[];
  memoryGrowthRate: number;
}

export interface MemoryConsolidationResult {
  consolidatedMemories: Memory[];
  removedMemories: string[];
  newConnections: MemoryConnection[];
  summary: string;
}

export interface MemoryConnection {
  fromMemoryId: string;
  toMemoryId: string;
  strength: number;
  type: ConnectionType;
  description: string;
}

export enum ConnectionType {
  CAUSAL = 'causal',
  TEMPORAL = 'temporal',
  SEMANTIC = 'semantic',
  CONTEXTUAL = 'contextual',
  CONTRADICTORY = 'contradictory'
}
