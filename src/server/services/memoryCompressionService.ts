// Memory Compression Service
// Summarization and memory management

import { PrismaClient } from "@prisma/client";
import {
  MemoryItem,
  MemoryType,
  ArchiveCriteria,
  MemoryContext,
  MemorySource,
} from "../types/memory";
import { TextProcessor } from "../utils/textProcessor";
import { generateMemoryId, createDefaultSource } from "../utils/memoryUtils";
import { memoryConfig } from "../config/memoryConfig";

export class MemoryCompressionService {
  private prisma: PrismaClient;
  private textProcessor: TextProcessor;

  constructor() {
    this.prisma = new PrismaClient();
    this.textProcessor = new TextProcessor();
  }

  /**
   * Compress old memories that haven't been accessed recently
   */
  async compressOldMemories(): Promise<void> {
    try {
      console.log("Starting memory compression...");

      const candidates = await this.identifyCompressionCandidates();
      let compressedCount = 0;

      for (const cluster of candidates) {
        if (cluster.length >= 2) {
          const summary = await this.summarizeMemoryCluster(cluster);
          if (summary) {
            await this.createSummaryMemory(cluster, summary);
            await this.archiveOriginalMemories(cluster);
            compressedCount += cluster.length;
          }
        }
      }

      console.log(`Compressed ${compressedCount} memories into summaries`);
    } catch (error) {
      console.error("Error compressing old memories:", error);
      throw error;
    }
  }

  /**
   * Summarize a cluster of related memories
   */
  async summarizeMemoryCluster(memoryIds: string[]): Promise<string> {
    try {
      const memories = await this.getMemoriesByIds(memoryIds);
      if (memories.length === 0) return "";

      // Group memories by type and importance
      const importantMemories = memories.filter((m) => m.importance > 0.6);
      const regularMemories = memories.filter((m) => m.importance <= 0.6);

      let summary = `Summary of ${memories.length} related memories:\n\n`;

      // Summarize important memories in detail
      if (importantMemories.length > 0) {
        summary += "Key Information:\n";
        for (const memory of importantMemories) {
          const shortSummary = this.extractKeySentences(memory.content, 2);
          summary += `• ${shortSummary}\n`;
        }
        summary += "\n";
      }

      // Summarize regular memories more briefly
      if (regularMemories.length > 0) {
        summary += "Additional Context:\n";
        const topics = this.extractCommonTopics(regularMemories);
        const entities = this.extractCommonEntities(regularMemories);

        if (topics.length > 0) {
          summary += `Topics discussed: ${topics.slice(0, 5).join(", ")}\n`;
        }

        if (entities.length > 0) {
          summary += `Key entities: ${entities.slice(0, 5).join(", ")}\n`;
        }
      }

      // Add metadata
      const timeRange = this.getTimeRange(memories);
      summary += `\nTime period: ${timeRange.start.toDateString()} to ${timeRange.end.toDateString()}`;
      summary += `\nOriginal memories: ${memoryIds.length}`;

      return summary;
    } catch (error) {
      console.error("Error summarizing memory cluster:", error);
      return "";
    }
  }

  /**
   * Prune redundant memories
   */
  async pruneRedundantMemories(): Promise<void> {
    try {
      console.log("Starting redundant memory pruning...");

      // Find memories with very high similarity
      const duplicatePairs = await this.findDuplicateMemories();
      let prunedCount = 0;

      for (const [memoryId1, memoryId2, similarity] of duplicatePairs) {
        if (similarity > 0.95) {
          // Keep the more important/recent memory
          const memory1 = await this.getMemoryById(memoryId1);
          const memory2 = await this.getMemoryById(memoryId2);

          if (memory1 && memory2) {
            const keepMemory = this.selectBetterMemory(memory1, memory2);
            const removeMemory =
              keepMemory.id === memory1.id ? memory2 : memory1;

            // Merge relationships and tags
            await this.mergeMemoryData(keepMemory, removeMemory);

            // Remove the redundant memory
            await this.prisma.memory.delete({
              where: { id: removeMemory.id },
            });

            prunedCount++;
          }
        }
      }

      console.log(`Pruned ${prunedCount} redundant memories`);
    } catch (error) {
      console.error("Error pruning redundant memories:", error);
      throw error;
    }
  }

  /**
   * Archive memories based on criteria
   */
  async archiveMemories(criteria: ArchiveCriteria): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - criteria.age);

      const memories = await this.prisma.memory.findMany({
        where: {
          AND: [
            { createdAt: { lt: cutoffDate } },
            { importance: { lt: criteria.importance } },
            { accessCount: { lt: criteria.accessCount } },
          ],
        },
      });

      console.log(`Archiving ${memories.length} memories based on criteria`);

      // Create archive summary
      if (memories.length > 0) {
        const archiveId = generateMemoryId();
        const archiveSummary = await this.createArchiveSummary(memories);

        await this.prisma.memory.create({
          data: {
            id: archiveId,
            type: "ARCHIVE" as any,
            content: archiveSummary,
            importance: 0.3,
            confidence: 0.8,
            tags: ["archive", "compressed"],
            relationships: memories.map((m) => m.id),
            source: createDefaultSource("system", "compression") as any,
            metadata: {
              archive: true,
              originalCount: memories.length,
              archiveDate: new Date(),
              criteria,
            } as any,
            context: {
              timestamp: new Date(),
              relevantEntities: [],
            } as any,
          },
        });

        // Remove original memories
        await this.prisma.memory.deleteMany({
          where: {
            id: { in: memories.map((m) => m.id) },
          },
        });
      }
    } catch (error) {
      console.error("Error archiving memories:", error);
      throw error;
    }
  }

  /**
   * Expand compressed memory (restore from summary)
   */
  async expandCompressedMemory(summaryId: string): Promise<MemoryItem[]> {
    try {
      const summary = await this.getMemoryById(summaryId);
      if (!summary || !(summary.metadata as any).compressed) {
        return [];
      }

      // This would typically restore from a backup or detailed storage
      // For now, we'll return the summary as a single memory
      return [summary];
    } catch (error) {
      console.error("Error expanding compressed memory:", error);
      return [];
    }
  }

  /**
   * Identify compression candidates
   */
  private async identifyCompressionCandidates(): Promise<string[][]> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30); // Compress memories older than 30 days

      const oldMemories = await this.prisma.memory.findMany({
        where: {
          AND: [
            { createdAt: { lt: cutoffDate } },
            { accessCount: { lt: 3 } },
            { importance: { lt: 0.7 } },
          ],
        },
        orderBy: { createdAt: "asc" },
      });

      // Group similar memories for compression
      const clusters: string[][] = [];
      const processed = new Set<string>();

      for (const memory of oldMemories) {
        if (processed.has(memory.id)) continue;

        const cluster = [memory.id];
        processed.add(memory.id);

        // Find similar memories
        const similar = oldMemories.filter(
          (other) =>
            !processed.has(other.id) && this.areMemoriesSimilar(memory, other)
        );

        for (const similarMemory of similar) {
          cluster.push(similarMemory.id);
          processed.add(similarMemory.id);
        }

        if (cluster.length >= 2) {
          clusters.push(cluster);
        }
      }

      return clusters;
    } catch (error) {
      console.error("Error identifying compression candidates:", error);
      return [];
    }
  }

  /**
   * Create summary memory from cluster
   */
  private async createSummaryMemory(
    memoryIds: string[],
    summary: string
  ): Promise<void> {
    try {
      const memories = await this.getMemoriesByIds(memoryIds);
      const summaryId = generateMemoryId();

      // Combine tags and relationships
      const allTags = new Set<string>();
      const allRelationships = new Set<string>();
      let totalImportance = 0;
      let maxConfidence = 0;

      for (const memory of memories) {
        memory.tags.forEach((tag) => allTags.add(tag));
        memory.relationships.forEach((rel) => allRelationships.add(rel));
        totalImportance += memory.importance;
        maxConfidence = Math.max(maxConfidence, memory.confidence);
      }

      const avgImportance = totalImportance / memories.length;

      await this.prisma.memory.create({
        data: {
          id: summaryId,
          type: "SUMMARY" as any,
          content: summary,
          importance: Math.min(0.8, avgImportance + 0.1), // Slightly boost summary importance
          confidence: maxConfidence,
          tags: [...allTags, "compressed", "summary"],
          relationships: [...allRelationships],
          source: createDefaultSource("system", "compression") as any,
          metadata: {
            compressed: true,
            originalMemories: memoryIds,
            compressionDate: new Date(),
            originalCount: memories.length,
          } as any,
          context: {
            timestamp: new Date(),
            relevantEntities: [],
          } as any,
        },
      });
    } catch (error) {
      console.error("Error creating summary memory:", error);
      throw error;
    }
  }

  /**
   * Archive original memories after compression
   */
  private async archiveOriginalMemories(memoryIds: string[]): Promise<void> {
    try {
      // Instead of deleting, we could move to an archive table
      // For now, we'll delete them since we have the summary
      await this.prisma.memory.deleteMany({
        where: {
          id: { in: memoryIds },
        },
      });
    } catch (error) {
      console.error("Error archiving original memories:", error);
      throw error;
    }
  }

  /**
   * Get memories by IDs
   */
  private async getMemoriesByIds(ids: string[]): Promise<MemoryItem[]> {
    try {
      const memories = await this.prisma.memory.findMany({
        where: { id: { in: ids } },
      });

      return memories.map((memory) => ({
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
      }));
    } catch (error) {
      console.error("Error getting memories by IDs:", error);
      return [];
    }
  }

  /**
   * Get memory by ID
   */
  private async getMemoryById(id: string): Promise<MemoryItem | null> {
    try {
      const memory = await this.prisma.memory.findUnique({
        where: { id },
      });

      if (!memory) return null;

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
    } catch (error) {
      console.error("Error getting memory by ID:", error);
      return null;
    }
  }

  /**
   * Check if two memories are similar enough to compress together
   */
  private areMemoriesSimilar(memory1: any, memory2: any): boolean {
    // Check tag overlap
    const tags1 = new Set(memory1.tags as string[]);
    const tags2 = new Set(memory2.tags as string[]);
    const tagOverlap = [...tags1].filter((tag) => tags2.has(tag)).length;
    const tagSimilarity = tagOverlap / Math.max(tags1.size, tags2.size);

    // Check content similarity (simple keyword matching)
    const keywords1 = this.textProcessor.extractKeywords(memory1.content);
    const keywords2 = this.textProcessor.extractKeywords(memory2.content);
    const keywordOverlap = keywords1.filter((k) =>
      keywords2.includes(k)
    ).length;
    const keywordSimilarity =
      keywordOverlap / Math.max(keywords1.length, keywords2.length);

    // Check time proximity (within 7 days)
    const timeDiff = Math.abs(
      memory1.createdAt.getTime() - memory2.createdAt.getTime()
    );
    const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
    const timeProximity = daysDiff <= 7;

    return (tagSimilarity > 0.3 || keywordSimilarity > 0.4) && timeProximity;
  }

  /**
   * Extract key sentences from content
   */
  private extractKeySentences(content: string, maxSentences: number): string {
    const sentences = content
      .split(/[.!?]+/)
      .filter((s) => s.trim().length > 10);

    if (sentences.length <= maxSentences) {
      return content;
    }

    // Simple extraction - take first and last sentences, plus any with important keywords
    const importantKeywords = [
      "important",
      "key",
      "critical",
      "remember",
      "note",
    ];
    const keySentences: string[] = [];

    // Always include first sentence
    if (sentences.length > 0) {
      keySentences.push(sentences[0].trim());
    }

    // Look for sentences with important keywords
    for (const sentence of sentences.slice(1, -1)) {
      if (
        importantKeywords.some((keyword) =>
          sentence.toLowerCase().includes(keyword)
        )
      ) {
        keySentences.push(sentence.trim());
        if (keySentences.length >= maxSentences) break;
      }
    }

    // Include last sentence if we have room
    if (keySentences.length < maxSentences && sentences.length > 1) {
      keySentences.push(sentences[sentences.length - 1].trim());
    }

    return keySentences.join(". ") + ".";
  }

  /**
   * Extract common topics from memories
   */
  private extractCommonTopics(memories: MemoryItem[]): string[] {
    const topicCounts = new Map<string, number>();

    for (const memory of memories) {
      const topics = memory.metadata.topics || [];
      for (const topic of topics) {
        topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
      }
    }

    return Array.from(topicCounts.entries())
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .map(([topic]) => topic);
  }

  /**
   * Extract common entities from memories
   */
  private extractCommonEntities(memories: MemoryItem[]): string[] {
    const entityCounts = new Map<string, number>();

    for (const memory of memories) {
      const entities = memory.metadata.entities || [];
      for (const entity of entities) {
        entityCounts.set(entity.text, (entityCounts.get(entity.text) || 0) + 1);
      }
    }

    return Array.from(entityCounts.entries())
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .map(([entity]) => entity);
  }

  /**
   * Get time range for memories
   */
  private getTimeRange(memories: MemoryItem[]): { start: Date; end: Date } {
    const dates = memories.map((m) => m.createdAt);
    return {
      start: new Date(Math.min(...dates.map((d) => d.getTime()))),
      end: new Date(Math.max(...dates.map((d) => d.getTime()))),
    };
  }

  /**
   * Find duplicate memories
   */
  private async findDuplicateMemories(): Promise<[string, string, number][]> {
    try {
      // This is a simplified implementation
      // In practice, you'd use vector similarity or more sophisticated matching
      const memories = await this.prisma.memory.findMany({
        select: { id: true, content: true, tags: true },
      });

      const duplicates: [string, string, number][] = [];

      for (let i = 0; i < memories.length; i++) {
        for (let j = i + 1; j < memories.length; j++) {
          const similarity = this.calculateContentSimilarity(
            memories[i].content,
            memories[j].content
          );

          if (similarity > 0.8) {
            duplicates.push([memories[i].id, memories[j].id, similarity]);
          }
        }
      }

      return duplicates;
    } catch (error) {
      console.error("Error finding duplicate memories:", error);
      return [];
    }
  }

  /**
   * Calculate content similarity
   */
  private calculateContentSimilarity(
    content1: string,
    content2: string
  ): number {
    const words1 = content1.toLowerCase().split(/\s+/);
    const words2 = content2.toLowerCase().split(/\s+/);

    const set1 = new Set(words1);
    const set2 = new Set(words2);

    const intersection = [...set1].filter((word) => set2.has(word));
    const union = new Set([...set1, ...set2]);

    return intersection.length / union.size;
  }

  /**
   * Select better memory between two similar ones
   */
  private selectBetterMemory(
    memory1: MemoryItem,
    memory2: MemoryItem
  ): MemoryItem {
    // Prefer more important memory
    if (memory1.importance !== memory2.importance) {
      return memory1.importance > memory2.importance ? memory1 : memory2;
    }

    // Prefer more recently accessed
    if (memory1.lastAccessed !== memory2.lastAccessed) {
      return memory1.lastAccessed > memory2.lastAccessed ? memory1 : memory2;
    }

    // Prefer more frequently accessed
    if (memory1.accessCount !== memory2.accessCount) {
      return memory1.accessCount > memory2.accessCount ? memory1 : memory2;
    }

    // Prefer more recent
    return memory1.createdAt > memory2.createdAt ? memory1 : memory2;
  }

  /**
   * Merge data from one memory into another
   */
  private async mergeMemoryData(
    keepMemory: MemoryItem,
    removeMemory: MemoryItem
  ): Promise<void> {
    try {
      const mergedTags = [
        ...new Set([...keepMemory.tags, ...removeMemory.tags]),
      ];
      const mergedRelationships = [
        ...new Set([
          ...keepMemory.relationships,
          ...removeMemory.relationships,
        ]),
      ];

      await this.prisma.memory.update({
        where: { id: keepMemory.id },
        data: {
          tags: mergedTags,
          relationships: mergedRelationships,
          accessCount: keepMemory.accessCount + removeMemory.accessCount,
          importance: Math.max(keepMemory.importance, removeMemory.importance),
        },
      });
    } catch (error) {
      console.error("Error merging memory data:", error);
    }
  }

  /**
   * Create archive summary
   */
  private async createArchiveSummary(memories: any[]): Promise<string> {
    const memoryIds = memories.map((m) => m.id);
    return this.summarizeMemoryCluster(memoryIds);
  }

  /**
   * Get compression statistics
   */
  async getCompressionStats(): Promise<{
    totalMemories: number;
    compressedMemories: number;
    compressionRatio: number;
    spaceSaved: number;
  }> {
    try {
      const totalMemories = await this.prisma.memory.count();
      const compressedMemories = await this.prisma.memory.count({
        where: {
          OR: [{ type: "SUMMARY" }, { type: "ARCHIVE" }],
        },
      });

      const compressionRatio =
        totalMemories > 0 ? compressedMemories / totalMemories : 0;

      // Estimate space saved (simplified calculation)
      const spaceSaved = compressedMemories * 0.7; // Assume 70% space saving

      return {
        totalMemories,
        compressedMemories,
        compressionRatio,
        spaceSaved,
      };
    } catch (error) {
      console.error("Error getting compression stats:", error);
      return {
        totalMemories: 0,
        compressedMemories: 0,
        compressionRatio: 0,
        spaceSaved: 0,
      };
    }
  }
}
