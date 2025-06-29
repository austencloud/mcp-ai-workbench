// Episodic Memory Service
// Store and retrieve specific events and experiences

import { PrismaClient } from "@prisma/client";
import {
  EpisodicMemory,
  Pattern,
  MemoryType,
  MemoryContext,
  MemorySource,
  MemoryMetadata,
} from "../types/memory";
import { TextProcessor } from "../utils/textProcessor";
import { generateMemoryId, createDefaultSource } from "../utils/memoryUtils";
import { memoryDefaults } from "../config/memoryConfig";

export class EpisodicMemoryService {
  private prisma: PrismaClient;
  private textProcessor: TextProcessor;

  constructor() {
    this.prisma = new PrismaClient();
    this.textProcessor = new TextProcessor();
  }

  /**
   * Record a new episode
   */
  async recordEpisode(episode: Partial<EpisodicMemory>): Promise<string> {
    try {
      const episodeId = generateMemoryId();

      // Create complete episodic memory
      const completeEpisode: EpisodicMemory = {
        id: episodeId,
        type: MemoryType.EXPERIENCE,
        content: episode.content || `${episode.event}: ${episode.outcome}`,
        context: episode.context!,
        importance: episode.importance || memoryDefaults.importance,
        confidence: episode.confidence || memoryDefaults.confidence,
        tags: episode.tags || [],
        relationships: episode.relationships || [],
        createdAt: new Date(),
        lastAccessed: new Date(),
        accessCount: 0,
        source: episode.source || createDefaultSource("system", "episodic"),
        metadata: episode.metadata || {
          language: "en",
          topics: [],
          entities: [],
          keywords: [],
          verified: true,
        },
        event: episode.event!,
        outcome: episode.outcome!,
        participants: episode.participants || [],
        location: episode.location,
        duration: episode.duration,
        emotions: episode.emotions || [],
        lessons: episode.lessons || [],
        success: episode.success || false,
      };

      // Extract lessons and patterns from the episode
      const extractedLessons = await this.extractLessons(completeEpisode);
      completeEpisode.lessons = [
        ...completeEpisode.lessons,
        ...extractedLessons,
      ];

      // Store in database as regular memory with episodic metadata
      await this.prisma.memory.create({
        data: {
          id: episodeId,
          type: MemoryType.EXPERIENCE,
          content: completeEpisode.content,
          importance: completeEpisode.importance,
          confidence: completeEpisode.confidence,
          tags: completeEpisode.tags,
          relationships: completeEpisode.relationships,
          createdAt: completeEpisode.createdAt,
          lastAccessed: completeEpisode.lastAccessed,
          accessCount: completeEpisode.accessCount,
          source: completeEpisode.source as any,
          metadata: {
            ...completeEpisode.metadata,
            episodic: {
              event: completeEpisode.event,
              outcome: completeEpisode.outcome,
              participants: completeEpisode.participants,
              location: completeEpisode.location,
              duration: completeEpisode.duration,
              emotions: completeEpisode.emotions,
              lessons: completeEpisode.lessons,
              success: completeEpisode.success,
            },
          } as any,
          context: completeEpisode.context as any,
          userId: completeEpisode.context.userId,
          conversationId: completeEpisode.context.conversationId,
          workspaceId: completeEpisode.context.workspaceId,
        },
      });

      // Link to related episodes
      await this.linkRelatedEpisodes(episodeId);

      return episodeId;
    } catch (error) {
      console.error("Error recording episode:", error);
      throw error;
    }
  }

  /**
   * Get timeline of episodes for a user
   */
  async getTimeline(
    userId: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<EpisodicMemory[]> {
    try {
      const whereClause: any = {
        type: MemoryType.EXPERIENCE,
        userId,
      };

      if (timeRange) {
        whereClause.createdAt = {};
        if (timeRange.start) {
          whereClause.createdAt.gte = timeRange.start;
        }
        if (timeRange.end) {
          whereClause.createdAt.lte = timeRange.end;
        }
      }

      const episodes = await this.prisma.memory.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
      });

      return episodes.map(this.convertToEpisodicMemory);
    } catch (error) {
      console.error("Error getting timeline:", error);
      return [];
    }
  }

  /**
   * Find similar experiences
   */
  async findSimilarExperiences(description: string): Promise<EpisodicMemory[]> {
    try {
      // Extract key concepts from description
      const keywords = this.textProcessor.extractKeywords(description);
      const entities = this.textProcessor.extractEntities(description);

      // Search for episodes with similar content or metadata
      const episodes = await this.prisma.memory.findMany({
        where: {
          type: MemoryType.EXPERIENCE,
          OR: [
            { content: { contains: description } },
            ...keywords.map((keyword) => ({
              content: { contains: keyword },
            })),
            ...entities.map((entity) => ({
              content: { contains: entity.text },
            })),
          ],
        },
        orderBy: { importance: "desc" },
        take: 10,
      });

      return episodes.map(this.convertToEpisodicMemory);
    } catch (error) {
      console.error("Error finding similar experiences:", error);
      return [];
    }
  }

  /**
   * Learn from experience and update patterns
   */
  async learnFromExperience(episodeId: string): Promise<void> {
    try {
      const episode = await this.getEpisodeById(episodeId);
      if (!episode) return;

      // Extract patterns from this episode
      const patterns = await this.extractPatterns([episode]);

      // Update or create pattern records
      for (const pattern of patterns) {
        await this.updatePattern(pattern);
      }

      // Update relationships with similar episodes
      await this.linkRelatedEpisodes(episodeId);
    } catch (error) {
      console.error("Error learning from experience:", error);
    }
  }

  /**
   * Predict outcome based on similar experiences
   */
  async predictOutcome(scenario: string): Promise<string> {
    try {
      const similarExperiences = await this.findSimilarExperiences(scenario);

      if (similarExperiences.length === 0) {
        return "No similar experiences found to predict outcome.";
      }

      // Analyze outcomes of similar experiences
      const successfulOutcomes = similarExperiences
        .filter((exp) => exp.success)
        .map((exp) => exp.outcome);

      const failedOutcomes = similarExperiences
        .filter((exp) => !exp.success)
        .map((exp) => exp.outcome);

      const successRate = successfulOutcomes.length / similarExperiences.length;

      let prediction = `Based on ${similarExperiences.length} similar experiences:\n`;
      prediction += `Success rate: ${(successRate * 100).toFixed(1)}%\n\n`;

      if (successfulOutcomes.length > 0) {
        prediction += `Likely positive outcomes:\n`;
        prediction += successfulOutcomes
          .slice(0, 3)
          .map((outcome) => `• ${outcome}`)
          .join("\n");
      }

      if (failedOutcomes.length > 0) {
        prediction += `\n\nPotential challenges:\n`;
        prediction += failedOutcomes
          .slice(0, 3)
          .map((outcome) => `• ${outcome}`)
          .join("\n");
      }

      // Add lessons learned
      const allLessons = similarExperiences.flatMap((exp) => exp.lessons);
      if (allLessons.length > 0) {
        prediction += `\n\nKey lessons from past experiences:\n`;
        prediction += [...new Set(allLessons)]
          .slice(0, 3)
          .map((lesson) => `• ${lesson}`)
          .join("\n");
      }

      return prediction;
    } catch (error) {
      console.error("Error predicting outcome:", error);
      return "Unable to predict outcome due to an error.";
    }
  }

  /**
   * Extract patterns from episodes
   */
  private async extractPatterns(
    episodes: EpisodicMemory[]
  ): Promise<Pattern[]> {
    const patterns: Pattern[] = [];

    // Group episodes by similar events
    const eventGroups = new Map<string, EpisodicMemory[]>();

    for (const episode of episodes) {
      const eventKey = this.normalizeEvent(episode.event);
      if (!eventGroups.has(eventKey)) {
        eventGroups.set(eventKey, []);
      }
      eventGroups.get(eventKey)!.push(episode);
    }

    // Create patterns from groups with multiple episodes
    for (const [eventKey, groupEpisodes] of eventGroups) {
      if (groupEpisodes.length >= 2) {
        const successRate =
          groupEpisodes.filter((ep) => ep.success).length /
          groupEpisodes.length;

        patterns.push({
          id: generateMemoryId(),
          description: `Pattern for: ${eventKey}`,
          frequency: groupEpisodes.length,
          confidence: Math.min(0.9, groupEpisodes.length * 0.2),
          relatedEpisodes: groupEpisodes.map((ep) => ep.id),
          predictiveValue: successRate,
        });
      }
    }

    return patterns;
  }

  /**
   * Extract lessons from an episode
   */
  private async extractLessons(episode: EpisodicMemory): Promise<string[]> {
    const lessons: string[] = [];

    // Extract lessons based on success/failure
    if (episode.success) {
      lessons.push(
        `Successful approach: ${episode.event} led to ${episode.outcome}`
      );

      if (episode.participants.length > 0) {
        lessons.push(
          `Effective collaboration with: ${episode.participants.join(", ")}`
        );
      }
    } else {
      lessons.push(
        `Avoid: ${episode.event} as it resulted in ${episode.outcome}`
      );

      if (
        episode.emotions.includes("frustration") ||
        episode.emotions.includes("anger")
      ) {
        lessons.push(
          "Consider emotional management strategies for similar situations"
        );
      }
    }

    // Extract lessons from duration
    if (episode.duration) {
      if (episode.duration > 3600) {
        // More than 1 hour
        lessons.push(
          "Consider breaking down similar tasks into smaller chunks"
        );
      }
    }

    return lessons;
  }

  /**
   * Link related episodes
   */
  private async linkRelatedEpisodes(episodeId: string): Promise<void> {
    try {
      const episode = await this.getEpisodeById(episodeId);
      if (!episode) return;

      const similarEpisodes = await this.findSimilarExperiences(episode.event);
      const relatedIds = similarEpisodes
        .filter((ep) => ep.id !== episodeId)
        .slice(0, 5)
        .map((ep) => ep.id);

      if (relatedIds.length > 0) {
        await this.prisma.memory.update({
          where: { id: episodeId },
          data: {
            relationships: relatedIds,
          },
        });
      }
    } catch (error) {
      console.error("Error linking related episodes:", error);
    }
  }

  /**
   * Get episode by ID
   */
  private async getEpisodeById(id: string): Promise<EpisodicMemory | null> {
    try {
      const memory = await this.prisma.memory.findUnique({
        where: { id, type: MemoryType.EXPERIENCE },
      });

      return memory ? this.convertToEpisodicMemory(memory) : null;
    } catch (error) {
      console.error("Error getting episode by ID:", error);
      return null;
    }
  }

  /**
   * Convert database record to EpisodicMemory
   */
  private convertToEpisodicMemory(memory: any): EpisodicMemory {
    const episodicData = (memory.metadata as any)?.episodic || {};

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
      event: episodicData.event || "Unknown event",
      outcome: episodicData.outcome || "Unknown outcome",
      participants: episodicData.participants || [],
      location: episodicData.location,
      duration: episodicData.duration,
      emotions: episodicData.emotions || [],
      lessons: episodicData.lessons || [],
      success: episodicData.success || false,
    };
  }

  /**
   * Normalize event description for pattern matching
   */
  private normalizeEvent(event: string): string {
    return event
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Update or create pattern
   */
  private async updatePattern(pattern: Pattern): Promise<void> {
    // This would typically be stored in a separate patterns table
    // For now, we'll store it as a special type of memory
    try {
      await this.prisma.memory.upsert({
        where: { id: pattern.id },
        update: {
          content: pattern.description,
          metadata: {
            pattern: {
              frequency: pattern.frequency,
              confidence: pattern.confidence,
              relatedEpisodes: pattern.relatedEpisodes,
              predictiveValue: pattern.predictiveValue,
            },
          } as any,
          importance: pattern.confidence,
        },
        create: {
          id: pattern.id,
          type: "PATTERN" as any,
          content: pattern.description,
          importance: pattern.confidence,
          confidence: pattern.confidence,
          tags: ["pattern", "episodic"],
          relationships: pattern.relatedEpisodes,
          source: createDefaultSource("system", "pattern-extraction") as any,
          metadata: {
            pattern: {
              frequency: pattern.frequency,
              confidence: pattern.confidence,
              relatedEpisodes: pattern.relatedEpisodes,
              predictiveValue: pattern.predictiveValue,
            },
          } as any,
          context: {
            timestamp: new Date(),
            relevantEntities: [],
          } as any,
        },
      });
    } catch (error) {
      console.error("Error updating pattern:", error);
    }
  }
}
