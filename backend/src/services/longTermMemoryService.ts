// Long-Term Memory Service
// Persistent knowledge storage and retrieval

import { PrismaClient } from "@prisma/client";
import {
  MemoryItem,
  MemoryQuery,
  MemorySearchResult,
  MemoryType,
  MemoryContext,
  MemorySource,
  MemoryMetadata,
} from "../types/memory";
import { VectorMemoryService } from "./vectorMemoryService";
import { TextProcessor } from "../utils/textProcessor";
import {
  generateMemoryId,
  calculateImportance,
  validateMemoryItem,
  sanitizeMemoryContent,
  createDefaultMetadata,
  shouldCompressMemory,
  generateMemoryTags,
} from "../utils/memoryUtils";
import { memoryConfig, memoryDefaults } from "../config/memoryConfig";

export class LongTermMemoryService {
  private prisma: PrismaClient;
  private vectorService: VectorMemoryService;
  private textProcessor: TextProcessor;

  constructor() {
    this.prisma = new PrismaClient();
    this.vectorService = new VectorMemoryService();
    this.textProcessor = new TextProcessor();
  }

  /**
   * Store a new memory
   */
  async storeMemory(memory: Partial<MemoryItem>): Promise<string> {
    try {
      // Validate memory
      const errors = validateMemoryItem(memory);
      if (errors.length > 0) {
        throw new Error(`Invalid memory: ${errors.join(", ")}`);
      }

      // Generate ID and sanitize content
      const memoryId = generateMemoryId();
      const sanitizedContent = sanitizeMemoryContent(memory.content!);

      // Calculate importance if not provided
      const importance = memory.importance ?? calculateImportance(memory);

      // Create metadata if not provided
      const metadata =
        memory.metadata ?? createDefaultMetadata(sanitizedContent);

      // Enhance metadata with NLP analysis
      const enhancedMetadata = await this.enhanceMetadata(
        sanitizedContent,
        metadata
      );

      // Generate tags
      const tags =
        memory.tags ??
        generateMemoryTags({
          ...memory,
          content: sanitizedContent,
          importance,
          metadata: enhancedMetadata,
        });

      // Create complete memory item
      const completeMemory: MemoryItem = {
        id: memoryId,
        type: memory.type!,
        content: sanitizedContent,
        context: memory.context!,
        importance,
        confidence: memory.confidence ?? memoryDefaults.confidence,
        embedding: undefined, // Will be generated separately
        tags,
        relationships: memory.relationships ?? [],
        createdAt: new Date(),
        lastAccessed: new Date(),
        accessCount: 0,
        source: memory.source!,
        metadata: enhancedMetadata,
      };

      // Check for similar memories to avoid duplicates
      const similarMemories = await this.findSimilarMemories(completeMemory);
      if (similarMemories.length > 0) {
        // Merge with most similar memory instead of creating duplicate
        const mostSimilar = similarMemories[0];
        await this.mergeMemories(mostSimilar.id, completeMemory);
        return mostSimilar.id;
      }

      // Store in database
      await this.prisma.memory.create({
        data: {
          id: memoryId,
          type: completeMemory.type,
          content: completeMemory.content,
          importance: completeMemory.importance,
          confidence: completeMemory.confidence,
          tags: completeMemory.tags,
          relationships: completeMemory.relationships,
          createdAt: completeMemory.createdAt,
          lastAccessed: completeMemory.lastAccessed,
          accessCount: completeMemory.accessCount,
          source: completeMemory.source as any,
          metadata: completeMemory.metadata as any,
          context: completeMemory.context as any,
          userId: completeMemory.context.userId,
          conversationId: completeMemory.context.conversationId,
          workspaceId: completeMemory.context.workspaceId,
        },
      });

      // Generate and store embedding
      const embedding = await this.vectorService.generateEmbedding(
        sanitizedContent
      );
      await this.vectorService.storeEmbedding(memoryId, embedding);

      // Update relationships
      await this.updateRelationships(memoryId, completeMemory);

      return memoryId;
    } catch (error) {
      console.error("Error storing memory:", error);
      throw error;
    }
  }

  /**
   * Retrieve memories based on query
   */
  async retrieveMemories(query: MemoryQuery): Promise<MemorySearchResult[]> {
    try {
      const results: MemorySearchResult[] = [];

      // Build database query
      const whereClause: any = {};

      if (query.type && query.type.length > 0) {
        whereClause.type = { in: query.type };
      }

      if (query.minImportance !== undefined) {
        whereClause.importance = { gte: query.minImportance };
      }

      if (query.timeRange) {
        whereClause.createdAt = {};
        if (query.timeRange.start) {
          whereClause.createdAt.gte = query.timeRange.start;
        }
        if (query.timeRange.end) {
          whereClause.createdAt.lte = query.timeRange.end;
        }
      }

      if (query.context) {
        if (query.context.userId) {
          whereClause.userId = query.context.userId;
        }
        if (query.context.conversationId) {
          whereClause.conversationId = query.context.conversationId;
        }
        if (query.context.workspaceId) {
          whereClause.workspaceId = query.context.workspaceId;
        }
      }

      // Fetch memories from database
      const memories = await this.prisma.memory.findMany({
        where: whereClause,
        orderBy: [{ importance: "desc" }, { lastAccessed: "desc" }],
        take: query.maxResults ?? 50,
      });

      // Convert to MemoryItem format and calculate relevance
      for (const memoryRecord of memories) {
        const memory: MemoryItem = {
          id: memoryRecord.id,
          type: memoryRecord.type as MemoryType,
          content: memoryRecord.content,
          context: memoryRecord.context as any as MemoryContext,
          importance: memoryRecord.importance,
          confidence: memoryRecord.confidence,
          tags: memoryRecord.tags as string[],
          relationships: memoryRecord.relationships as string[],
          createdAt: memoryRecord.createdAt,
          lastAccessed: memoryRecord.lastAccessed,
          accessCount: memoryRecord.accessCount,
          source: memoryRecord.source as any as MemorySource,
          metadata: memoryRecord.metadata as any as MemoryMetadata,
        };

        // Calculate relevance score
        const relevanceScore = await this.calculateRelevanceScore(
          memory,
          query
        );

        if (relevanceScore > 0.1) {
          // Minimum relevance threshold
          results.push({
            memory,
            relevanceScore,
            explanation: this.generateExplanation(
              memory,
              query,
              relevanceScore
            ),
          });

          // Update access tracking
          await this.updateAccessTracking(memory.id);
        }
      }

      // Sort by relevance and return
      return results
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, query.maxResults ?? 10);
    } catch (error) {
      console.error("Error retrieving memories:", error);
      return [];
    }
  }

  /**
   * Update an existing memory
   */
  async updateMemory(id: string, updates: Partial<MemoryItem>): Promise<void> {
    try {
      const updateData: any = {};

      if (updates.content) {
        updateData.content = sanitizeMemoryContent(updates.content);
        // Regenerate embedding if content changed
        const embedding = await this.vectorService.generateEmbedding(
          updateData.content
        );
        await this.vectorService.storeEmbedding(id, embedding);
      }

      if (updates.importance !== undefined) {
        updateData.importance = updates.importance;
      }

      if (updates.confidence !== undefined) {
        updateData.confidence = updates.confidence;
      }

      if (updates.tags) {
        updateData.tags = updates.tags;
      }

      if (updates.relationships) {
        updateData.relationships = updates.relationships;
      }

      if (updates.metadata) {
        updateData.metadata = updates.metadata;
      }

      updateData.lastAccessed = new Date();

      await this.prisma.memory.update({
        where: { id },
        data: updateData,
      });
    } catch (error) {
      console.error("Error updating memory:", error);
      throw error;
    }
  }

  /**
   * Delete a memory
   */
  async deleteMemory(id: string): Promise<void> {
    try {
      // Remove from vector index
      await this.vectorService.deleteEmbedding(id);

      // Remove relationships
      await this.removeFromRelationships(id);

      // Delete from database
      await this.prisma.memory.delete({
        where: { id },
      });
    } catch (error) {
      console.error("Error deleting memory:", error);
      throw error;
    }
  }

  /**
   * Consolidate similar memories
   */
  async consolidateMemories(): Promise<void> {
    try {
      console.log("Starting memory consolidation...");

      const clusters = await this.vectorService.clusterMemories(0.8);

      for (const [clusterId, memoryIds] of Object.entries(clusters)) {
        if (memoryIds.length > 1) {
          await this.consolidateCluster(memoryIds);
        }
      }

      console.log("Memory consolidation completed");
    } catch (error) {
      console.error("Error consolidating memories:", error);
      throw error;
    }
  }

  /**
   * Validate memory integrity
   */
  async validateMemory(memory: MemoryItem): Promise<boolean> {
    try {
      const errors = validateMemoryItem(memory);
      return errors.length === 0;
    } catch (error) {
      console.error("Error validating memory:", error);
      return false;
    }
  }

  /**
   * Resolve conflicts between memories
   */
  async resolveConflicts(memoryId: string): Promise<void> {
    try {
      const memory = await this.getMemoryById(memoryId);
      if (!memory) return;

      const conflictingIds = memory.metadata.contradicts || [];

      for (const conflictId of conflictingIds) {
        const conflictingMemory = await this.getMemoryById(conflictId);
        if (!conflictingMemory) continue;

        // Resolve based on confidence and source reliability
        if (
          memory.confidence > conflictingMemory.confidence ||
          memory.source.reliability > conflictingMemory.source.reliability
        ) {
          // Current memory wins, mark conflicting as less reliable
          await this.updateMemory(conflictId, {
            confidence: conflictingMemory.confidence * 0.8,
            metadata: {
              ...conflictingMemory.metadata,
              verified: false,
            },
          });
        }
      }
    } catch (error) {
      console.error("Error resolving conflicts:", error);
      throw error;
    }
  }

  /**
   * Get memory by ID
   */
  private async getMemoryById(id: string): Promise<MemoryItem | null> {
    try {
      const memoryRecord = await this.prisma.memory.findUnique({
        where: { id },
      });

      if (!memoryRecord) return null;

      return {
        id: memoryRecord.id,
        type: memoryRecord.type as MemoryType,
        content: memoryRecord.content,
        context: memoryRecord.context as any as MemoryContext,
        importance: memoryRecord.importance,
        confidence: memoryRecord.confidence,
        tags: memoryRecord.tags as string[],
        relationships: memoryRecord.relationships as string[],
        createdAt: memoryRecord.createdAt,
        lastAccessed: memoryRecord.lastAccessed,
        accessCount: memoryRecord.accessCount,
        source: memoryRecord.source as any as MemorySource,
        metadata: memoryRecord.metadata as any as MemoryMetadata,
      };
    } catch (error) {
      console.error("Error getting memory by ID:", error);
      return null;
    }
  }

  /**
   * Find similar memories to avoid duplicates
   */
  private async findSimilarMemories(memory: MemoryItem): Promise<MemoryItem[]> {
    try {
      const embedding = await this.vectorService.generateEmbedding(
        memory.content
      );
      const similar = await this.vectorService.findSimilarByVector(
        embedding,
        0.9,
        5
      );

      const similarMemories: MemoryItem[] = [];

      for (const { memoryId } of similar) {
        const similarMemory = await this.getMemoryById(memoryId);
        if (similarMemory) {
          similarMemories.push(similarMemory);
        }
      }

      return similarMemories;
    } catch (error) {
      console.error("Error finding similar memories:", error);
      return [];
    }
  }

  /**
   * Enhance metadata with NLP analysis
   */
  private async enhanceMetadata(
    content: string,
    metadata: MemoryMetadata
  ): Promise<MemoryMetadata> {
    const sentiment = this.textProcessor.analyzeSentiment(content);
    const entities = this.textProcessor.extractEntities(content);
    const keywords = this.textProcessor.extractKeywords(content);
    const topics = this.textProcessor.extractTopics(content);

    return {
      ...metadata,
      sentiment,
      entities: [...(metadata.entities || []), ...entities],
      keywords: [...(metadata.keywords || []), ...keywords],
      topics: [...(metadata.topics || []), ...topics],
    };
  }

  /**
   * Calculate relevance score for search results
   */
  private async calculateRelevanceScore(
    memory: MemoryItem,
    query: MemoryQuery
  ): Promise<number> {
    let score = 0;

    // Base importance score
    score += memory.importance * 0.3;

    // Content similarity (using vector similarity if available)
    const queryEmbedding = await this.vectorService.generateEmbedding(
      query.query
    );
    const memoryEmbedding = await this.vectorService.getEmbedding(memory.id);

    if (memoryEmbedding) {
      // Import vectorizer directly for similarity calculation
      const { vectorizer } = await import("../utils/vectorizer");
      const similarity = vectorizer.calculateSimilarity(
        queryEmbedding,
        memoryEmbedding
      );
      score += similarity * 0.4;
    }

    // Keyword matching
    const queryKeywords = this.textProcessor.extractKeywords(query.query);
    const memoryKeywords = memory.metadata.keywords || [];
    const keywordOverlap = queryKeywords.filter((k) =>
      memoryKeywords.includes(k)
    ).length;
    score += (keywordOverlap / Math.max(queryKeywords.length, 1)) * 0.2;

    // Recency bonus
    const ageInDays =
      (Date.now() - memory.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    const recencyScore = Math.max(0, 1 - ageInDays / 365);
    score += recencyScore * 0.1;

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Generate explanation for search result
   */
  private generateExplanation(
    memory: MemoryItem,
    query: MemoryQuery,
    relevanceScore: number
  ): string {
    const reasons: string[] = [];

    if (memory.importance > 0.7) {
      reasons.push("high importance");
    }

    if (relevanceScore > 0.8) {
      reasons.push("strong content similarity");
    }

    if (
      memory.metadata.keywords?.some((k) =>
        query.query.toLowerCase().includes(k)
      )
    ) {
      reasons.push("keyword match");
    }

    if (query.context?.conversationId === memory.context.conversationId) {
      reasons.push("same conversation");
    }

    return reasons.length > 0
      ? `Relevant due to: ${reasons.join(", ")}`
      : "General relevance";
  }

  /**
   * Update access tracking for a memory
   */
  private async updateAccessTracking(memoryId: string): Promise<void> {
    try {
      await this.prisma.memory.update({
        where: { id: memoryId },
        data: {
          lastAccessed: new Date(),
          accessCount: { increment: 1 },
        },
      });
    } catch (error) {
      console.error("Error updating access tracking:", error);
    }
  }

  /**
   * Update relationships between memories
   */
  private async updateRelationships(
    memoryId: string,
    memory: MemoryItem
  ): Promise<void> {
    // Implementation for relationship management
    // This would involve finding related memories and updating bidirectional relationships
  }

  /**
   * Merge two memories
   */
  private async mergeMemories(
    existingId: string,
    newMemory: MemoryItem
  ): Promise<void> {
    // Implementation for merging similar memories
    // This would combine content, update importance, merge metadata, etc.
  }

  /**
   * Consolidate a cluster of similar memories
   */
  private async consolidateCluster(memoryIds: string[]): Promise<void> {
    // Implementation for consolidating multiple similar memories into one
  }

  /**
   * Remove memory from all relationships
   */
  private async removeFromRelationships(memoryId: string): Promise<void> {
    // Implementation for cleaning up relationships when deleting a memory
  }
}
