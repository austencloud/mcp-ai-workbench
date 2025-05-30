// Memory Retrieval Service
// Intelligent search and context-aware memory retrieval

import { PrismaClient } from "@prisma/client";
import {
  MemoryItem,
  MemoryQuery,
  MemorySearchResult,
  MemoryType,
  MemoryContext,
} from "../types/memory";
import { VectorMemoryService } from "./vectorMemoryService";
import { TextProcessor } from "../utils/textProcessor";
import { vectorizer } from "../utils/vectorizer";

export class MemoryRetrievalService {
  private prisma: PrismaClient;
  private vectorService: VectorMemoryService;
  private textProcessor: TextProcessor;

  constructor() {
    this.prisma = new PrismaClient();
    this.vectorService = new VectorMemoryService();
    this.textProcessor = new TextProcessor();
  }

  /**
   * Search memories using multiple strategies
   */
  async searchMemories(query: MemoryQuery): Promise<MemorySearchResult[]> {
    try {
      // Use hybrid search combining multiple strategies
      const results = await this.hybridSearch(query.query);

      // Filter by query parameters
      let filteredResults = results;

      if (query.type && query.type.length > 0) {
        filteredResults = filteredResults.filter((result) =>
          query.type!.includes(result.memory.type)
        );
      }

      if (query.minImportance !== undefined) {
        filteredResults = filteredResults.filter(
          (result) => result.memory.importance >= query.minImportance!
        );
      }

      if (query.timeRange) {
        filteredResults = filteredResults.filter((result) => {
          const createdAt = result.memory.createdAt;
          if (query.timeRange!.start && createdAt < query.timeRange!.start) {
            return false;
          }
          if (query.timeRange!.end && createdAt > query.timeRange!.end) {
            return false;
          }
          return true;
        });
      }

      if (query.context) {
        filteredResults = filteredResults.filter((result) =>
          this.matchesContext(result.memory, query.context!)
        );
      }

      // Rank results based on context
      const rankedResults = await this.rankResults(filteredResults, query);

      // Return top results
      return rankedResults.slice(0, query.maxResults || 10);
    } catch (error) {
      console.error("Error searching memories:", error);
      return [];
    }
  }

  /**
   * Get relevant context for current input
   */
  async getRelevantContext(
    currentInput: string,
    userId?: string
  ): Promise<MemoryItem[]> {
    try {
      const query: MemoryQuery = {
        query: currentInput,
        context: userId ? { userId } : undefined,
        maxResults: 5,
        minImportance: 0.3,
      };

      const results = await this.searchMemories(query);
      return results.map((result) => result.memory);
    } catch (error) {
      console.error("Error getting relevant context:", error);
      return [];
    }
  }

  /**
   * Find memories by embedding similarity
   */
  async findMemoriesByEmbedding(
    embedding: number[],
    threshold: number = 0.7
  ): Promise<MemorySearchResult[]> {
    try {
      const similarVectors = await this.vectorService.findSimilarByVector(
        embedding,
        threshold,
        20
      );

      const results: MemorySearchResult[] = [];

      for (const { memoryId, similarity } of similarVectors) {
        const memory = await this.getMemoryById(memoryId);
        if (memory) {
          results.push({
            memory,
            relevanceScore: similarity,
            explanation: `Vector similarity: ${(similarity * 100).toFixed(1)}%`,
          });
        }
      }

      return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    } catch (error) {
      console.error("Error finding memories by embedding:", error);
      return [];
    }
  }

  /**
   * Get memory chain (related memories)
   */
  async getMemoryChain(memoryId: string): Promise<MemoryItem[]> {
    try {
      const memory = await this.getMemoryById(memoryId);
      if (!memory) return [];

      const chain: MemoryItem[] = [memory];
      const visited = new Set<string>([memoryId]);

      // Follow relationships to build chain
      await this.buildMemoryChain(memory, chain, visited, 3);

      return chain;
    } catch (error) {
      console.error("Error getting memory chain:", error);
      return [];
    }
  }

  /**
   * Suggest related memories
   */
  async suggestRelatedMemories(memoryId: string): Promise<MemoryItem[]> {
    try {
      const memory = await this.getMemoryById(memoryId);
      if (!memory) return [];

      // Get memories with similar content
      const embedding = await this.vectorService.getEmbedding(memoryId);
      if (!embedding) return [];

      const similarResults = await this.findMemoriesByEmbedding(embedding, 0.6);

      // Filter out the original memory
      const related = similarResults
        .filter((result) => result.memory.id !== memoryId)
        .slice(0, 5)
        .map((result) => result.memory);

      // Add memories with shared tags
      const tagMatches = await this.findMemoriesWithSharedTags(memory);

      // Combine and deduplicate
      const allRelated = [...related, ...tagMatches];
      const uniqueRelated = allRelated.filter(
        (mem, index, arr) => arr.findIndex((m) => m.id === mem.id) === index
      );

      return uniqueRelated.slice(0, 8);
    } catch (error) {
      console.error("Error suggesting related memories:", error);
      return [];
    }
  }

  /**
   * Hybrid search combining multiple strategies
   */
  private async hybridSearch(query: string): Promise<MemorySearchResult[]> {
    try {
      const results = new Map<string, MemorySearchResult>();

      // 1. Keyword search
      const keywordResults = await this.keywordSearch(query);
      keywordResults.forEach((result) => {
        results.set(result.memory.id, result);
      });

      // 2. Semantic search using embeddings
      const embedding = await this.vectorService.generateEmbedding(query);
      const semanticResults = await this.findMemoriesByEmbedding(
        embedding,
        0.5
      );

      semanticResults.forEach((result) => {
        const existing = results.get(result.memory.id);
        if (existing) {
          // Combine scores
          existing.relevanceScore = Math.max(
            existing.relevanceScore,
            result.relevanceScore * 0.8
          );
          existing.explanation += ` + ${result.explanation}`;
        } else {
          results.set(result.memory.id, {
            ...result,
            relevanceScore: result.relevanceScore * 0.8,
          });
        }
      });

      // 3. Entity-based search
      const entities = this.textProcessor.extractEntities(query);
      for (const entity of entities) {
        const entityResults = await this.entitySearch(entity.text);
        entityResults.forEach((result) => {
          const existing = results.get(result.memory.id);
          if (existing) {
            existing.relevanceScore += result.relevanceScore * 0.3;
            existing.explanation += ` + Entity match: ${entity.text}`;
          } else {
            results.set(result.memory.id, {
              ...result,
              relevanceScore: result.relevanceScore * 0.3,
            });
          }
        });
      }

      return Array.from(results.values());
    } catch (error) {
      console.error("Error in hybrid search:", error);
      return [];
    }
  }

  /**
   * Keyword-based search
   */
  private async keywordSearch(query: string): Promise<MemorySearchResult[]> {
    try {
      const keywords = this.textProcessor.extractKeywords(query);
      const searchTerms = [query, ...keywords];

      const memories = await this.prisma.memory.findMany({
        where: {
          OR: searchTerms.map((term) => ({
            content: { contains: term, mode: "insensitive" as any },
          })),
        },
        orderBy: { importance: "desc" },
        take: 50,
      });

      return memories.map((memory) => ({
        memory: this.convertToMemoryItem(memory),
        relevanceScore: this.calculateKeywordRelevance(memory.content, query),
        explanation: "Keyword match",
      }));
    } catch (error) {
      console.error("Error in keyword search:", error);
      return [];
    }
  }

  /**
   * Entity-based search
   */
  private async entitySearch(entity: string): Promise<MemorySearchResult[]> {
    try {
      // Search by content only for now, as JSON array queries are complex
      const memories = await this.prisma.memory.findMany({
        where: {
          content: { contains: entity },
        },
        orderBy: { importance: "desc" },
        take: 20,
      });

      return memories.map((memory) => ({
        memory: this.convertToMemoryItem(memory),
        relevanceScore: 0.6,
        explanation: `Entity match: ${entity}`,
      }));
    } catch (error) {
      console.error("Error in entity search:", error);
      return [];
    }
  }

  /**
   * Rank search results based on context
   */
  private async rankResults(
    results: MemorySearchResult[],
    query: MemoryQuery
  ): Promise<MemorySearchResult[]> {
    try {
      for (const result of results) {
        let contextBonus = 0;

        // Recency bonus
        const ageInDays =
          (Date.now() - result.memory.createdAt.getTime()) /
          (1000 * 60 * 60 * 24);
        const recencyBonus = Math.max(0, 1 - ageInDays / 365) * 0.1;
        contextBonus += recencyBonus;

        // Access frequency bonus
        const accessBonus = Math.min(0.1, result.memory.accessCount * 0.01);
        contextBonus += accessBonus;

        // Context relevance bonus
        if (query.context) {
          if (query.context.userId === result.memory.context.userId) {
            contextBonus += 0.2;
          }
          if (
            query.context.conversationId ===
            result.memory.context.conversationId
          ) {
            contextBonus += 0.3;
          }
          if (query.context.workspaceId === result.memory.context.workspaceId) {
            contextBonus += 0.1;
          }
        }

        // Apply context bonus
        result.relevanceScore = Math.min(
          1,
          result.relevanceScore + contextBonus
        );
      }

      return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    } catch (error) {
      console.error("Error ranking results:", error);
      return results;
    }
  }

  /**
   * Check if memory matches context
   */
  private matchesContext(
    memory: MemoryItem,
    context: Partial<MemoryContext>
  ): boolean {
    if (context.userId && memory.context.userId !== context.userId) {
      return false;
    }
    if (
      context.conversationId &&
      memory.context.conversationId !== context.conversationId
    ) {
      return false;
    }
    if (
      context.workspaceId &&
      memory.context.workspaceId !== context.workspaceId
    ) {
      return false;
    }
    return true;
  }

  /**
   * Get memory by ID
   */
  private async getMemoryById(id: string): Promise<MemoryItem | null> {
    try {
      const memory = await this.prisma.memory.findUnique({
        where: { id },
      });

      return memory ? this.convertToMemoryItem(memory) : null;
    } catch (error) {
      console.error("Error getting memory by ID:", error);
      return null;
    }
  }

  /**
   * Build memory chain by following relationships
   */
  private async buildMemoryChain(
    memory: MemoryItem,
    chain: MemoryItem[],
    visited: Set<string>,
    maxDepth: number
  ): Promise<void> {
    if (maxDepth <= 0) return;

    for (const relationshipId of memory.relationships) {
      if (visited.has(relationshipId)) continue;

      const relatedMemory = await this.getMemoryById(relationshipId);
      if (relatedMemory) {
        visited.add(relationshipId);
        chain.push(relatedMemory);
        await this.buildMemoryChain(
          relatedMemory,
          chain,
          visited,
          maxDepth - 1
        );
      }
    }
  }

  /**
   * Find memories with shared tags
   */
  private async findMemoriesWithSharedTags(
    memory: MemoryItem
  ): Promise<MemoryItem[]> {
    try {
      if (memory.tags.length === 0) return [];

      // For now, we'll use a simpler approach by searching content for tag keywords
      // This is a workaround for complex JSON array queries
      const tagSearchTerms = memory.tags.join(" ");

      const memories = await this.prisma.memory.findMany({
        where: {
          AND: [
            { id: { not: memory.id } },
            { content: { contains: tagSearchTerms } },
          ],
        },
        orderBy: { importance: "desc" },
        take: 10,
      });

      return memories.map(this.convertToMemoryItem);
    } catch (error) {
      console.error("Error finding memories with shared tags:", error);
      return [];
    }
  }

  /**
   * Calculate keyword relevance score
   */
  private calculateKeywordRelevance(content: string, query: string): number {
    const contentLower = content.toLowerCase();
    const queryLower = query.toLowerCase();

    // Exact match gets highest score
    if (contentLower.includes(queryLower)) {
      return 0.9;
    }

    // Check for individual keywords
    const queryKeywords = this.textProcessor.extractKeywords(query);
    const contentKeywords = this.textProcessor.extractKeywords(content);

    const matchingKeywords = queryKeywords.filter((keyword) =>
      contentKeywords.includes(keyword)
    );

    const keywordScore =
      queryKeywords.length > 0
        ? matchingKeywords.length / queryKeywords.length
        : 0;

    return keywordScore * 0.7;
  }

  /**
   * Convert database record to MemoryItem
   */
  private convertToMemoryItem(memory: any): MemoryItem {
    return {
      id: memory.id,
      type: memory.type as MemoryType,
      content: memory.content,
      context: memory.context as any,
      importance: memory.importance,
      confidence: memory.confidence,
      tags: memory.tags as string[],
      relationships: memory.relationships as string[],
      createdAt: memory.createdAt,
      lastAccessed: memory.lastAccessed,
      accessCount: memory.accessCount,
      source: memory.source as any,
      metadata: memory.metadata as any,
    };
  }

  /**
   * Get search statistics
   */
  async getSearchStats(): Promise<{
    totalSearches: number;
    averageResultCount: number;
    popularQueries: string[];
    searchPerformance: number;
  }> {
    try {
      // This would typically be tracked in a separate analytics table
      // For now, return mock data
      return {
        totalSearches: 0,
        averageResultCount: 0,
        popularQueries: [],
        searchPerformance: 0,
      };
    } catch (error) {
      console.error("Error getting search stats:", error);
      return {
        totalSearches: 0,
        averageResultCount: 0,
        popularQueries: [],
        searchPerformance: 0,
      };
    }
  }
}
