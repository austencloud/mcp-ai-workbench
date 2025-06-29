// Text to Vector Conversion Utilities
// Simple embedding generation using TF-IDF and word vectors

import { createHash } from "crypto";

export class Vectorizer {
  private vocabulary: Map<string, number>;
  private idfCache: Map<string, number>;
  private dimension: number;
  private documents: string[];

  constructor(dimension: number = 384) {
    this.vocabulary = new Map();
    this.idfCache = new Map();
    this.dimension = dimension;
    this.documents = [];
  }

  /**
   * Generate embedding vector for text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      // Preprocess text
      const processedText = this.preprocessText(text);
      const tokens = this.tokenize(processedText);

      // Generate TF-IDF based embedding
      const embedding = this.generateTfIdfEmbedding(tokens);

      // Normalize vector
      return this.normalizeVector(embedding);
    } catch (error) {
      console.error("Error generating embedding:", error);
      // Return zero vector on error
      return new Array(this.dimension).fill(0);
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  calculateSimilarity(vectorA: number[], vectorB: number[]): number {
    if (vectorA.length !== vectorB.length) {
      throw new Error("Vectors must have the same dimension");
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i] * vectorB[i];
      normA += vectorA[i] * vectorA[i];
      normB += vectorB[i] * vectorB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  /**
   * Find most similar vectors from a collection
   */
  findSimilar(
    queryVector: number[],
    vectors: { id: string; vector: number[] }[],
    threshold: number = 0.5,
    limit: number = 10
  ): { id: string; similarity: number }[] {
    const similarities = vectors.map((item) => ({
      id: item.id,
      similarity: this.calculateSimilarity(queryVector, item.vector),
    }));

    return similarities
      .filter((item) => item.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  /**
   * Batch generate embeddings for multiple texts
   */
  async batchGenerateEmbeddings(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];

    for (const text of texts) {
      const embedding = await this.generateEmbedding(text);
      embeddings.push(embedding);
    }

    return embeddings;
  }

  /**
   * Update vocabulary with new documents
   */
  updateVocabulary(documents: string[]): void {
    this.documents = documents;
    this.buildVocabulary(documents);
  }

  /**
   * Get vector dimension
   */
  getDimension(): number {
    return this.dimension;
  }

  /**
   * Create a hash for caching embeddings
   */
  createTextHash(text: string): string {
    return createHash("md5").update(text).digest("hex");
  }

  /**
   * Preprocess text for embedding generation
   */
  private preprocessText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ") // Remove punctuation
      .replace(/\s+/g, " ") // Normalize whitespace
      .trim();
  }

  /**
   * Tokenize text
   */
  private tokenize(text: string): string[] {
    // Simple tokenization without natural library
    const tokens = text
      .split(/\s+/)
      .filter((token) => token.length > 2)
      .filter((token) => !this.isStopWord(token))
      .map((token) => this.simpleStem(token));

    return tokens;
  }

  private simpleStem(word: string): string {
    // Simple stemming rules (basic Porter stemmer logic)
    word = word.toLowerCase();

    // Remove common suffixes
    if (word.endsWith("ing") && word.length > 6) {
      word = word.slice(0, -3);
    } else if (word.endsWith("ed") && word.length > 5) {
      word = word.slice(0, -2);
    } else if (word.endsWith("er") && word.length > 5) {
      word = word.slice(0, -2);
    } else if (word.endsWith("ly") && word.length > 5) {
      word = word.slice(0, -2);
    } else if (word.endsWith("tion") && word.length > 7) {
      word = word.slice(0, -4);
    }

    return word;
  }

  /**
   * Generate TF-IDF based embedding
   */
  private generateTfIdfEmbedding(tokens: string[]): number[] {
    const embedding = new Array(this.dimension).fill(0);

    const termFreq: Map<string, number> = new Map();
    tokens.forEach((token) => {
      termFreq.set(token, (termFreq.get(token) || 0) + 1);
    });

    let index = 0;
    for (const [term, freq] of termFreq.entries()) {
      if (index >= this.dimension) break;

      const tf = freq / tokens.length;
      const idf = this.getIdf(term);
      const tfidf = tf * idf;

      const position = this.hashToPosition(term);
      embedding[position] += tfidf;

      index++;
    }

    return embedding;
  }

  /**
   * Get IDF value for a term
   */
  private getIdf(term: string): number {
    if (this.idfCache.has(term)) {
      return this.idfCache.get(term)!;
    }

    const termOccurrences = this.documents.filter((doc) =>
      this.preprocessText(doc).includes(term)
    ).length;

    const idf = Math.log((this.documents.length || 1) / (termOccurrences || 1));
    this.idfCache.set(term, idf);
    return idf;
  }

  /**
   * Hash term to vector position
   */
  private hashToPosition(term: string): number {
    let hash = 0;
    for (let i = 0; i < term.length; i++) {
      const char = term.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) % this.dimension;
  }

  /**
   * Normalize vector to unit length
   */
  private normalizeVector(vector: number[]): number[] {
    const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));

    if (norm === 0) {
      return vector;
    }

    return vector.map((val) => val / norm);
  }

  /**
   * Build vocabulary from documents
   */
  private buildVocabulary(documents: string[]): void {
    this.vocabulary.clear();

    documents.forEach((doc) => {
      const tokens = this.tokenize(this.preprocessText(doc));
      const uniqueTokens = new Set(tokens);

      uniqueTokens.forEach((token) => {
        this.vocabulary.set(token, (this.vocabulary.get(token) || 0) + 1);
      });
    });
  }

  /**
   * Check if word is a stop word
   */
  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      "the",
      "a",
      "an",
      "and",
      "or",
      "but",
      "in",
      "on",
      "at",
      "to",
      "for",
      "of",
      "with",
      "by",
      "from",
      "up",
      "about",
      "into",
      "through",
      "during",
      "before",
      "after",
      "above",
      "below",
      "between",
      "among",
      "is",
      "are",
      "was",
      "were",
      "be",
      "been",
      "being",
      "have",
      "has",
      "had",
      "do",
      "does",
      "did",
      "will",
      "would",
      "could",
      "should",
      "may",
      "might",
      "must",
      "can",
      "this",
      "that",
      "these",
      "those",
      "i",
      "you",
      "he",
      "she",
      "it",
      "we",
      "they",
      "me",
      "him",
      "her",
      "us",
      "them",
    ]);
    return stopWords.has(word.toLowerCase());
  }
}

// Singleton instance
export const vectorizer = new Vectorizer();
