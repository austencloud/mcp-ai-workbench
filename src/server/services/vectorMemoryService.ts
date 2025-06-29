// Vector Memory Service
// Embedding-based memory storage and similarity search

import { PrismaClient } from "@prisma/client";
import { vectorizer } from "../utils/vectorizer";
import { embeddingConfig } from "../config/memoryConfig";

export class VectorMemoryService {
  private prisma: PrismaClient;
  private embeddingCache: Map<string, number[]>;
  private vectorIndex: Map<string, number[]>;

  constructor() {
    this.prisma = new PrismaClient();
    this.embeddingCache = new Map();
    this.vectorIndex = new Map();
    this.initializeVectorIndex();
  }

  /**
   * Generate embedding for text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      // Check cache first
      const textHash = vectorizer.createTextHash(text);
      if (this.embeddingCache.has(textHash)) {
        return this.embeddingCache.get(textHash)!;
      }

      // Generate new embedding
      const embedding = await vectorizer.generateEmbedding(text);

      // Cache the result
      this.embeddingCache.set(textHash, embedding);

      return embedding;
    } catch (error) {
      console.error("Error generating embedding:", error);
      throw error;
    }
  }

  /**
   * Store embedding for a memory
   */
  async storeEmbedding(memoryId: string, embedding: number[]): Promise<void> {
    try {
      // Store in database
      await this.prisma.memoryVector.upsert({
        where: { memoryId },
        update: {
          vector: embedding,
          model: embeddingConfig.model,
          dimension: embedding.length,
        },
        create: {
          memoryId,
          vector: embedding,
          model: embeddingConfig.model,
          dimension: embedding.length,
        },
      });

      // Update in-memory index
      this.vectorIndex.set(memoryId, embedding);
    } catch (error) {
      console.error("Error storing embedding:", error);
      throw error;
    }
  }

  /**
   * Find similar memories by vector similarity
   */
  async findSimilarByVector(
    vector: number[],
    threshold: number = 0.5,
    limit: number = 10
  ): Promise<{ memoryId: string; similarity: number }[]> {
    try {
      // Use in-memory index for fast similarity search
      const vectors = Array.from(this.vectorIndex.entries()).map(
        ([id, vec]) => ({
          id,
          vector: vec,
        })
      );

      const similarities = vectorizer.findSimilar(
        vector,
        vectors,
        threshold,
        limit
      );

      // Convert id to memoryId
      return similarities.map((item) => ({
        memoryId: item.id,
        similarity: item.similarity,
      }));
    } catch (error) {
      console.error("Error finding similar vectors:", error);
      return [];
    }
  }

  /**
   * Update embedding for existing memory
   */
  async updateEmbedding(memoryId: string, newText: string): Promise<void> {
    try {
      const embedding = await this.generateEmbedding(newText);
      await this.storeEmbedding(memoryId, embedding);
    } catch (error) {
      console.error("Error updating embedding:", error);
      throw error;
    }
  }

  /**
   * Get embedding for a memory
   */
  async getEmbedding(memoryId: string): Promise<number[] | null> {
    try {
      // Check in-memory index first
      if (this.vectorIndex.has(memoryId)) {
        return this.vectorIndex.get(memoryId)!;
      }

      // Fetch from database
      const vectorRecord = await this.prisma.memoryVector.findUnique({
        where: { memoryId },
      });

      if (vectorRecord) {
        const embedding = vectorRecord.vector as number[];
        this.vectorIndex.set(memoryId, embedding);
        return embedding;
      }

      return null;
    } catch (error) {
      console.error("Error getting embedding:", error);
      return null;
    }
  }

  /**
   * Delete embedding for a memory
   */
  async deleteEmbedding(memoryId: string): Promise<void> {
    try {
      await this.prisma.memoryVector.delete({
        where: { memoryId },
      });

      this.vectorIndex.delete(memoryId);
    } catch (error) {
      console.error("Error deleting embedding:", error);
      throw error;
    }
  }

  /**
   * Cluster memories based on vector similarity
   */
  async clusterMemories(
    threshold: number = 0.7
  ): Promise<{ [clusterId: string]: string[] }> {
    try {
      const clusters: { [clusterId: string]: string[] } = {};
      const processed = new Set<string>();
      let clusterId = 0;

      for (const [memoryId, vector] of this.vectorIndex.entries()) {
        if (processed.has(memoryId)) continue;

        const clusterKey = `cluster_${clusterId++}`;
        clusters[clusterKey] = [memoryId];
        processed.add(memoryId);

        // Find similar memories for this cluster
        const similar = await this.findSimilarByVector(vector, threshold, 50);

        for (const { memoryId: similarId } of similar) {
          if (!processed.has(similarId) && similarId !== memoryId) {
            clusters[clusterKey].push(similarId);
            processed.add(similarId);
          }
        }
      }

      return clusters;
    } catch (error) {
      console.error("Error clustering memories:", error);
      return {};
    }
  }

  /**
   * Batch process embeddings for multiple texts
   */
  async batchGenerateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const embeddings: number[][] = [];

      // Process in batches to avoid memory issues
      const batchSize = embeddingConfig.batchSize;

      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        const batchEmbeddings = await vectorizer.batchGenerateEmbeddings(batch);
        embeddings.push(...batchEmbeddings);
      }

      return embeddings;
    } catch (error) {
      console.error("Error batch generating embeddings:", error);
      throw error;
    }
  }

  /**
   * Get vector statistics
   */
  async getVectorStats(): Promise<{
    totalVectors: number;
    averageDimension: number;
    indexSize: number;
    cacheSize: number;
  }> {
    try {
      const totalVectors = await this.prisma.memoryVector.count();

      const vectors = await this.prisma.memoryVector.findMany({
        select: { dimension: true },
      });

      const averageDimension =
        vectors.length > 0
          ? vectors.reduce((sum, v) => sum + v.dimension, 0) / vectors.length
          : 0;

      return {
        totalVectors,
        averageDimension,
        indexSize: this.vectorIndex.size,
        cacheSize: this.embeddingCache.size,
      };
    } catch (error) {
      console.error("Error getting vector stats:", error);
      return {
        totalVectors: 0,
        averageDimension: 0,
        indexSize: 0,
        cacheSize: 0,
      };
    }
  }

  /**
   * Rebuild vector index from database
   */
  async rebuildVectorIndex(): Promise<void> {
    try {
      console.log("Rebuilding vector index...");

      this.vectorIndex.clear();

      const vectors = await this.prisma.memoryVector.findMany();

      vectors.forEach((vectorRecord) => {
        this.vectorIndex.set(
          vectorRecord.memoryId,
          vectorRecord.vector as number[]
        );
      });

      console.log(`Vector index rebuilt with ${vectors.length} vectors`);
    } catch (error) {
      console.error("Error rebuilding vector index:", error);
      throw error;
    }
  }

  /**
   * Clear embedding cache
   */
  clearCache(): void {
    this.embeddingCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number } {
    // Simple cache stats (in production, implement proper hit rate tracking)
    return {
      size: this.embeddingCache.size,
      hitRate: 0.8, // Placeholder
    };
  }

  /**
   * Initialize vector index from database
   */
  private async initializeVectorIndex(): Promise<void> {
    try {
      const vectors = await this.prisma.memoryVector.findMany({
        select: {
          memoryId: true,
          vector: true,
        },
      });

      vectors.forEach((vectorRecord) => {
        this.vectorIndex.set(
          vectorRecord.memoryId,
          vectorRecord.vector as number[]
        );
      });

      // Only log if there are vectors to avoid cluttering startup
      if (vectors.length > 0) {
        console.log(`Vector index initialized with ${vectors.length} vectors`);
      }
    } catch (error) {
      console.error("Error initializing vector index:", error);
    }
  }

  /**
   * Compute similarity between two memory IDs
   */
  async computeSimilarity(
    memoryId1: string,
    memoryId2: string
  ): Promise<number> {
    try {
      const vector1 = await this.getEmbedding(memoryId1);
      const vector2 = await this.getEmbedding(memoryId2);

      if (!vector1 || !vector2) {
        return 0;
      }

      return vectorizer.calculateSimilarity(vector1, vector2);
    } catch (error) {
      console.error("Error computing similarity:", error);
      return 0;
    }
  }

  /**
   * Find nearest neighbors for a memory
   */
  async findNearestNeighbors(
    memoryId: string,
    k: number = 5
  ): Promise<{ memoryId: string; similarity: number }[]> {
    try {
      const vector = await this.getEmbedding(memoryId);
      if (!vector) return [];

      return await this.findSimilarByVector(vector, 0, k + 1).then((results) =>
        results.filter((r) => r.memoryId !== memoryId).slice(0, k)
      );
    } catch (error) {
      console.error("Error finding nearest neighbors:", error);
      return [];
    }
  }
}
