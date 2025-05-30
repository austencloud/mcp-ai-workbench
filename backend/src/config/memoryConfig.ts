// Memory System Configuration
import { MemoryConfiguration, MemoryType } from '../types/memory';

export const memoryConfig: MemoryConfiguration = {
  maxMemories: parseInt(process.env.MAX_MEMORIES_PER_USER || '100000'),
  compressionThreshold: parseInt(process.env.MEMORY_COMPRESSION_THRESHOLD || '10000'),
  importanceDecayRate: parseFloat(process.env.IMPORTANCE_DECAY_RATE || '0.95'),
  similarityThreshold: parseFloat(process.env.SIMILARITY_THRESHOLD || '0.7'),
  autoCompressionEnabled: process.env.AUTO_COMPRESSION_ENABLED === 'true',
  embeddingModel: process.env.EMBEDDING_MODEL || 'all-MiniLM-L6-v2',
  retentionPeriods: {
    [MemoryType.CONVERSATION]: parseInt(process.env.CONVERSATION_RETENTION_DAYS || '90'),
    [MemoryType.FACT]: parseInt(process.env.FACT_RETENTION_DAYS || '365'),
    [MemoryType.PREFERENCE]: parseInt(process.env.PREFERENCE_RETENTION_DAYS || '730'),
    [MemoryType.SKILL]: parseInt(process.env.SKILL_RETENTION_DAYS || '365'),
    [MemoryType.EXPERIENCE]: parseInt(process.env.EXPERIENCE_RETENTION_DAYS || '180'),
    [MemoryType.RELATIONSHIP]: parseInt(process.env.RELATIONSHIP_RETENTION_DAYS || '365'),
    [MemoryType.GOAL]: parseInt(process.env.GOAL_RETENTION_DAYS || '365'),
    [MemoryType.TASK]: parseInt(process.env.TASK_RETENTION_DAYS || '30'),
    [MemoryType.KNOWLEDGE]: parseInt(process.env.KNOWLEDGE_RETENTION_DAYS || '730'),
    [MemoryType.OBSERVATION]: parseInt(process.env.OBSERVATION_RETENTION_DAYS || '60'),
  }
};

export const embeddingConfig = {
  model: process.env.EMBEDDING_MODEL || 'all-MiniLM-L6-v2',
  dimension: parseInt(process.env.VECTOR_DIMENSION || '384'),
  batchSize: parseInt(process.env.EMBEDDING_BATCH_SIZE || '32'),
  maxTokens: parseInt(process.env.EMBEDDING_MAX_TOKENS || '512'),
};

export const redisConfig = {
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  keyPrefix: 'mcp:memory:',
  ttl: parseInt(process.env.REDIS_TTL || '3600'), // 1 hour default
};

export const neo4jConfig = {
  uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
  user: process.env.NEO4J_USER || 'neo4j',
  password: process.env.NEO4J_PASSWORD || 'password',
};

export const memoryDefaults = {
  importance: 0.5,
  confidence: 0.8,
  maxContextWindow: 50, // messages
  compressionRatio: 0.3, // compress to 30% of original size
  minAccessCountForRetention: 2,
  maxRelationships: 10,
  defaultTags: ['auto-generated'],
};

export const nlpConfig = {
  language: 'en',
  enableSentimentAnalysis: true,
  enableEntityExtraction: true,
  enableKeywordExtraction: true,
  enableTopicModeling: true,
  minKeywordScore: 0.3,
  maxKeywords: 10,
  maxEntities: 20,
};

export const performanceConfig = {
  maxSearchResults: 100,
  searchTimeout: 5000, // 5 seconds
  embeddingTimeout: 10000, // 10 seconds
  compressionBatchSize: 1000,
  indexRebuildInterval: 86400000, // 24 hours in ms
  memoryCleanupInterval: 3600000, // 1 hour in ms
};

export const securityConfig = {
  encryptSensitiveMemories: process.env.ENCRYPT_MEMORIES === 'true',
  encryptionKey: process.env.MEMORY_ENCRYPTION_KEY || 'default-key-change-in-production',
  auditMemoryAccess: process.env.AUDIT_MEMORY_ACCESS === 'true',
  maxMemorySize: parseInt(process.env.MAX_MEMORY_SIZE || '1048576'), // 1MB
  allowedSources: ['chat', 'file', 'web', 'user_input', 'system', 'inference'],
};

// Importance calculation weights
export const importanceWeights = {
  recency: 0.3,
  accessFrequency: 0.2,
  uniqueness: 0.2,
  emotionalSignificance: 0.15,
  sourceReliability: 0.15,
};

// Memory type priorities for compression
export const compressionPriorities = {
  [MemoryType.CONVERSATION]: 1, // Compress first
  [MemoryType.OBSERVATION]: 2,
  [MemoryType.TASK]: 3,
  [MemoryType.EXPERIENCE]: 4,
  [MemoryType.KNOWLEDGE]: 5,
  [MemoryType.FACT]: 6,
  [MemoryType.SKILL]: 7,
  [MemoryType.RELATIONSHIP]: 8,
  [MemoryType.GOAL]: 9,
  [MemoryType.PREFERENCE]: 10, // Compress last
};

export function getMemoryConfig(): MemoryConfiguration {
  return memoryConfig;
}

export function isMemoryEnabled(): boolean {
  return process.env.MEMORY_ENABLED !== 'false';
}

export function getEmbeddingConfig() {
  return embeddingConfig;
}

export function getRedisConfig() {
  return redisConfig;
}

export function getNeo4jConfig() {
  return neo4jConfig;
}

export function getMemoryDefaults() {
  return memoryDefaults;
}

export function getNLPConfig() {
  return nlpConfig;
}

export function getPerformanceConfig() {
  return performanceConfig;
}

export function getSecurityConfig() {
  return securityConfig;
}

export function getImportanceWeights() {
  return importanceWeights;
}

export function getCompressionPriorities() {
  return compressionPriorities;
}
