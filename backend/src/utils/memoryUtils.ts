// Memory Processing Utilities
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';
import { 
  MemoryItem, 
  MemoryType, 
  MemoryContext, 
  MemorySource, 
  MemoryMetadata,
  NamedEntity 
} from '../types/memory';
import { importanceWeights } from '../config/memoryConfig';

/**
 * Generate a unique memory ID
 */
export function generateMemoryId(): string {
  return uuidv4();
}

/**
 * Create a hash for memory content to detect duplicates
 */
export function createContentHash(content: string): string {
  return createHash('sha256').update(content.toLowerCase().trim()).digest('hex');
}

/**
 * Calculate memory importance based on multiple factors
 */
export function calculateImportance(
  memory: Partial<MemoryItem>,
  context?: MemoryContext
): number {
  const weights = importanceWeights;
  let importance = 0;

  // Recency score (newer = more important)
  const now = new Date();
  const createdAt = memory.createdAt || now;
  const ageInDays = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
  const recencyScore = Math.max(0, 1 - (ageInDays / 365)); // Decay over a year
  importance += recencyScore * weights.recency;

  // Access frequency score
  const accessCount = memory.accessCount || 0;
  const accessFrequency = Math.min(1, accessCount / 10); // Cap at 10 accesses
  importance += accessFrequency * weights.accessFrequency;

  // Uniqueness score (based on content length and complexity)
  const content = memory.content || '';
  const uniquenessScore = Math.min(1, content.length / 1000); // Longer content = more unique
  importance += uniquenessScore * weights.uniqueness;

  // Emotional significance (based on sentiment and emotional keywords)
  const sentiment = memory.metadata?.sentiment || 0;
  const emotionalSignificance = Math.abs(sentiment); // Strong emotions = more important
  importance += emotionalSignificance * weights.emotionalSignificance;

  // Source reliability
  const sourceReliability = memory.source?.reliability || 0.5;
  importance += sourceReliability * weights.sourceReliability;

  // Context relevance boost
  if (context) {
    if (context.conversationId && memory.context?.conversationId === context.conversationId) {
      importance += 0.1; // Boost for same conversation
    }
    if (context.workspaceId && memory.context?.workspaceId === context.workspaceId) {
      importance += 0.1; // Boost for same workspace
    }
  }

  // Type-specific importance adjustments
  switch (memory.type) {
    case MemoryType.PREFERENCE:
      importance += 0.2; // User preferences are always important
      break;
    case MemoryType.GOAL:
      importance += 0.15; // Goals are important
      break;
    case MemoryType.FACT:
      importance += 0.1; // Facts are moderately important
      break;
    case MemoryType.TASK:
      importance -= 0.1; // Tasks are less important over time
      break;
  }

  return Math.max(0, Math.min(1, importance));
}

/**
 * Extract keywords from text content
 */
export function extractKeywords(text: string, maxKeywords: number = 10): string[] {
  // Simple keyword extraction - in production, use more sophisticated NLP
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3)
    .filter(word => !isStopWord(word));

  // Count word frequency
  const wordCount: Record<string, number> = {};
  words.forEach(word => {
    wordCount[word] = (wordCount[word] || 0) + 1;
  });

  // Sort by frequency and return top keywords
  return Object.entries(wordCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, maxKeywords)
    .map(([word]) => word);
}

/**
 * Simple stop word check
 */
function isStopWord(word: string): boolean {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
    'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after',
    'above', 'below', 'between', 'among', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those',
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them'
  ]);
  return stopWords.has(word.toLowerCase());
}

/**
 * Extract named entities from text (simplified version)
 */
export function extractEntities(text: string): NamedEntity[] {
  const entities: NamedEntity[] = [];
  
  // Simple regex patterns for entity extraction
  const patterns = {
    PERSON: /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, // First Last name pattern
    ORGANIZATION: /\b[A-Z][a-zA-Z]+ (Inc|Corp|LLC|Ltd|Company|Organization)\b/g,
    LOCATION: /\b[A-Z][a-z]+ (City|State|Country|Street|Avenue|Road)\b/g,
    DATE: /\b\d{1,2}\/\d{1,2}\/\d{4}\b|\b\d{4}-\d{2}-\d{2}\b/g,
  };

  Object.entries(patterns).forEach(([type, pattern]) => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => {
        entities.push({
          text: match,
          type: type as NamedEntity['type'],
          confidence: 0.7 // Simple confidence score
        });
      });
    }
  });

  return entities;
}

/**
 * Calculate text similarity using simple cosine similarity
 */
export function calculateTextSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/));
  const words2 = new Set(text2.toLowerCase().split(/\s+/));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

/**
 * Validate memory item structure
 */
export function validateMemoryItem(memory: Partial<MemoryItem>): string[] {
  const errors: string[] = [];

  if (!memory.content || memory.content.trim().length === 0) {
    errors.push('Memory content is required');
  }

  if (!memory.type || !Object.values(MemoryType).includes(memory.type)) {
    errors.push('Valid memory type is required');
  }

  if (memory.importance !== undefined && (memory.importance < 0 || memory.importance > 1)) {
    errors.push('Importance must be between 0 and 1');
  }

  if (memory.confidence !== undefined && (memory.confidence < 0 || memory.confidence > 1)) {
    errors.push('Confidence must be between 0 and 1');
  }

  if (!memory.context || !memory.context.timestamp) {
    errors.push('Memory context with timestamp is required');
  }

  if (!memory.source || !memory.source.type) {
    errors.push('Memory source is required');
  }

  return errors;
}

/**
 * Sanitize memory content
 */
export function sanitizeMemoryContent(content: string): string {
  return content
    .trim()
    .replace(/\s+/g, ' ') // Normalize whitespace
    .substring(0, 10000); // Limit content length
}

/**
 * Create default memory metadata
 */
export function createDefaultMetadata(content: string): MemoryMetadata {
  return {
    topics: [],
    entities: extractEntities(content),
    keywords: extractKeywords(content),
    verified: false,
    sentiment: 0,
  };
}

/**
 * Create default memory source
 */
export function createDefaultSource(type: MemorySource['type'], identifier: string): MemorySource {
  return {
    type,
    identifier,
    reliability: 0.8, // Default reliability
  };
}

/**
 * Check if memory should be compressed based on age and access patterns
 */
export function shouldCompressMemory(memory: MemoryItem, compressionThreshold: number): boolean {
  const ageInDays = (Date.now() - memory.createdAt.getTime()) / (1000 * 60 * 60 * 24);
  const lastAccessedDays = (Date.now() - memory.lastAccessed.getTime()) / (1000 * 60 * 60 * 24);
  
  return (
    ageInDays > 30 && // Older than 30 days
    lastAccessedDays > 7 && // Not accessed in 7 days
    memory.accessCount < 3 && // Low access count
    memory.importance < 0.5 // Low importance
  );
}

/**
 * Generate memory tags based on content and context
 */
export function generateMemoryTags(memory: Partial<MemoryItem>): string[] {
  const tags: string[] = [];
  
  // Add type-based tag
  if (memory.type) {
    tags.push(memory.type);
  }
  
  // Add context-based tags
  if (memory.context?.workspaceId) {
    tags.push(`workspace:${memory.context.workspaceId}`);
  }
  
  if (memory.context?.conversationId) {
    tags.push(`conversation:${memory.context.conversationId}`);
  }
  
  // Add source-based tag
  if (memory.source?.type) {
    tags.push(`source:${memory.source.type}`);
  }
  
  // Add importance-based tag
  if (memory.importance !== undefined) {
    if (memory.importance > 0.8) {
      tags.push('high-importance');
    } else if (memory.importance < 0.3) {
      tags.push('low-importance');
    }
  }
  
  return tags;
}
