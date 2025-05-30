// Memory Controller
// HTTP endpoints for memory functionality

import { ConversationMemoryService } from "../services/conversationMemoryService";
import { LongTermMemoryService } from "../services/longTermMemoryService";
import { VectorMemoryService } from "../services/vectorMemoryService";
import { EpisodicMemoryService } from "../services/episodicMemoryService";
import { SemanticMemoryService } from "../services/semanticMemoryService";
import { UserMemoryService } from "../services/userMemoryService";
import { MemoryRetrievalService } from "../services/memoryRetrievalService";
import { MemoryCompressionService } from "../services/memoryCompressionService";
import {
  RememberParams,
  RecallParams,
  MemoryResponse,
  MemoryQuery,
  MemoryType,
  MemoryContext,
  MemorySource,
} from "../types/memory";
import { createDefaultSource, generateMemoryId } from "../utils/memoryUtils";
import { isMemoryEnabled } from "../config/memoryConfig";

export class MemoryController {
  private conversationMemory: ConversationMemoryService;
  private longTermMemory: LongTermMemoryService;
  private vectorMemory: VectorMemoryService;
  private episodicMemory: EpisodicMemoryService;
  private semanticMemory: SemanticMemoryService;
  private userMemory: UserMemoryService;
  private memoryRetrieval: MemoryRetrievalService;
  private memoryCompression: MemoryCompressionService;

  constructor() {
    this.conversationMemory = new ConversationMemoryService();
    this.longTermMemory = new LongTermMemoryService();
    this.vectorMemory = new VectorMemoryService();
    this.episodicMemory = new EpisodicMemoryService();
    this.semanticMemory = new SemanticMemoryService();
    this.userMemory = new UserMemoryService();
    this.memoryRetrieval = new MemoryRetrievalService();
    this.memoryCompression = new MemoryCompressionService();
  }

  /**
   * Store new memory
   */
  async remember(params: RememberParams): Promise<MemoryResponse> {
    try {
      if (!isMemoryEnabled()) {
        return {
          success: false,
          error: "Memory system is disabled",
        };
      }

      const {
        input,
        context,
        type = MemoryType.OBSERVATION,
        importance,
      } = params;

      if (!input || input.trim().length === 0) {
        return {
          success: false,
          error: "Input content is required",
        };
      }

      // Create memory source
      const source: MemorySource = createDefaultSource(
        "user_input",
        context.sessionId || "unknown"
      );

      // Store in long-term memory
      const memoryId = await this.longTermMemory.storeMemory({
        type,
        content: input,
        context,
        importance,
        source,
      });

      return {
        success: true,
        memoryId,
        data: { message: "Memory stored successfully" },
      };
    } catch (error) {
      console.error("Error in remember:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Retrieve relevant memories
   */
  async recall(params: RecallParams): Promise<MemoryResponse> {
    try {
      if (!isMemoryEnabled()) {
        return {
          success: false,
          error: "Memory system is disabled",
        };
      }

      const { query, context, maxResults = 10, includeContext = true } = params;

      if (!query || query.trim().length === 0) {
        return {
          success: false,
          error: "Query is required",
        };
      }

      // Build memory query
      const memoryQuery: MemoryQuery = {
        query,
        context,
        maxResults,
        includeEmbeddings: false,
      };

      // Retrieve memories
      const results = await this.longTermMemory.retrieveMemories(memoryQuery);

      // Include conversation context if requested
      let conversationContext = null;
      if (includeContext && context?.conversationId) {
        conversationContext =
          await this.conversationMemory.getConversationContext(
            context.conversationId
          );
      }

      return {
        success: true,
        data: {
          memories: results,
          conversationContext,
          totalResults: results.length,
        },
      };
    } catch (error) {
      console.error("Error in recall:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get conversation memory context
   */
  async getMemoryContext(params: {
    conversationId: string;
  }): Promise<MemoryResponse> {
    try {
      if (!isMemoryEnabled()) {
        return {
          success: false,
          error: "Memory system is disabled",
        };
      }

      const { conversationId } = params;

      if (!conversationId) {
        return {
          success: false,
          error: "Conversation ID is required",
        };
      }

      const context = await this.conversationMemory.getConversationContext(
        conversationId
      );

      return {
        success: true,
        data: { context },
      };
    } catch (error) {
      console.error("Error getting memory context:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Search memories with advanced filters
   */
  async searchMemories(params: {
    query: string;
    type?: MemoryType[];
    userId?: string;
    workspaceId?: string;
    conversationId?: string;
    minImportance?: number;
    maxResults?: number;
    timeRange?: { start?: Date; end?: Date };
  }): Promise<MemoryResponse> {
    try {
      if (!isMemoryEnabled()) {
        return {
          success: false,
          error: "Memory system is disabled",
        };
      }

      const {
        query,
        type,
        userId,
        workspaceId,
        conversationId,
        minImportance,
        maxResults = 20,
        timeRange,
      } = params;

      if (!query || query.trim().length === 0) {
        return {
          success: false,
          error: "Search query is required",
        };
      }

      // Build context for search
      const context: Partial<MemoryContext> = {};
      if (userId) context.userId = userId;
      if (workspaceId) context.workspaceId = workspaceId;
      if (conversationId) context.conversationId = conversationId;

      const memoryQuery: MemoryQuery = {
        query,
        type,
        context,
        minImportance,
        maxResults,
        timeRange,
      };

      const results = await this.longTermMemory.retrieveMemories(memoryQuery);

      return {
        success: true,
        data: {
          results,
          totalResults: results.length,
          query: memoryQuery,
        },
      };
    } catch (error) {
      console.error("Error searching memories:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get memory statistics
   */
  async getMemoryStats(params: { userId?: string }): Promise<MemoryResponse> {
    try {
      if (!isMemoryEnabled()) {
        return {
          success: false,
          error: "Memory system is disabled",
        };
      }

      // Get vector statistics
      const vectorStats = await this.vectorMemory.getVectorStats();

      // TODO: Implement comprehensive memory statistics
      const stats = {
        vectorStats,
        // Add more statistics here
        totalMemories: vectorStats.totalVectors,
        systemStatus: "operational",
      };

      return {
        success: true,
        data: { stats },
      };
    } catch (error) {
      console.error("Error getting memory stats:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Optimize memory system
   */
  async optimizeMemory(): Promise<MemoryResponse> {
    try {
      if (!isMemoryEnabled()) {
        return {
          success: false,
          error: "Memory system is disabled",
        };
      }

      // Consolidate similar memories
      await this.longTermMemory.consolidateMemories();

      // Rebuild vector index
      await this.vectorMemory.rebuildVectorIndex();

      // Clear caches
      this.vectorMemory.clearCache();

      return {
        success: true,
        data: { message: "Memory optimization completed" },
      };
    } catch (error) {
      console.error("Error optimizing memory:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Add message to conversation memory
   */
  async addConversationMessage(params: {
    conversationId: string;
    role: "user" | "assistant" | "system";
    content: string;
    timestamp?: Date;
  }): Promise<MemoryResponse> {
    try {
      if (!isMemoryEnabled()) {
        return {
          success: false,
          error: "Memory system is disabled",
        };
      }

      const { conversationId, role, content, timestamp = new Date() } = params;

      if (!conversationId || !role || !content) {
        return {
          success: false,
          error: "Conversation ID, role, and content are required",
        };
      }

      await this.conversationMemory.addMessage(conversationId, {
        role,
        content,
        timestamp,
      });

      return {
        success: true,
        data: { message: "Message added to conversation memory" },
      };
    } catch (error) {
      console.error("Error adding conversation message:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get conversation summary
   */
  async getConversationSummary(params: {
    conversationId: string;
  }): Promise<MemoryResponse> {
    try {
      if (!isMemoryEnabled()) {
        return {
          success: false,
          error: "Memory system is disabled",
        };
      }

      const { conversationId } = params;

      if (!conversationId) {
        return {
          success: false,
          error: "Conversation ID is required",
        };
      }

      const summary = await this.conversationMemory.summarizeConversation(
        conversationId
      );
      const importantMessages =
        await this.conversationMemory.extractImportantMessages(conversationId);
      const followUpActions =
        await this.conversationMemory.identifyFollowUpActions(conversationId);

      return {
        success: true,
        data: {
          summary,
          importantMessages,
          followUpActions,
        },
      };
    } catch (error) {
      console.error("Error getting conversation summary:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Find similar memories
   */
  async findSimilarMemories(params: {
    content: string;
    threshold?: number;
    limit?: number;
  }): Promise<MemoryResponse> {
    try {
      if (!isMemoryEnabled()) {
        return {
          success: false,
          error: "Memory system is disabled",
        };
      }

      const { content, threshold = 0.7, limit = 10 } = params;

      if (!content || content.trim().length === 0) {
        return {
          success: false,
          error: "Content is required",
        };
      }

      // Generate embedding for the content
      const embedding = await this.vectorMemory.generateEmbedding(content);

      // Find similar memories
      const similar = await this.vectorMemory.findSimilarByVector(
        embedding,
        threshold,
        limit
      );

      return {
        success: true,
        data: {
          similarMemories: similar,
          totalResults: similar.length,
        },
      };
    } catch (error) {
      console.error("Error finding similar memories:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Record an episodic memory (experience)
   */
  async recordEpisode(params: {
    event: string;
    outcome: string;
    participants?: string[];
    location?: string;
    duration?: number;
    emotions?: string[];
    success?: boolean;
    context: MemoryContext;
  }): Promise<MemoryResponse> {
    try {
      if (!isMemoryEnabled()) {
        return {
          success: false,
          error: "Memory system is disabled",
        };
      }

      const episodeId = await this.episodicMemory.recordEpisode(params);

      return {
        success: true,
        memoryId: episodeId,
        data: { message: "Episode recorded successfully" },
      };
    } catch (error) {
      console.error("Error recording episode:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get user's episodic timeline
   */
  async getEpisodicTimeline(params: {
    userId: string;
    timeRange?: { start: Date; end: Date };
  }): Promise<MemoryResponse> {
    try {
      if (!isMemoryEnabled()) {
        return {
          success: false,
          error: "Memory system is disabled",
        };
      }

      const timeline = await this.episodicMemory.getTimeline(
        params.userId,
        params.timeRange
      );

      return {
        success: true,
        data: { timeline },
      };
    } catch (error) {
      console.error("Error getting episodic timeline:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Predict outcome based on similar experiences
   */
  async predictOutcome(params: { scenario: string }): Promise<MemoryResponse> {
    try {
      if (!isMemoryEnabled()) {
        return {
          success: false,
          error: "Memory system is disabled",
        };
      }

      const prediction = await this.episodicMemory.predictOutcome(
        params.scenario
      );

      return {
        success: true,
        data: { prediction },
      };
    } catch (error) {
      console.error("Error predicting outcome:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Add concept to knowledge graph
   */
  async addConcept(params: {
    concept: string;
    description: string;
  }): Promise<MemoryResponse> {
    try {
      if (!isMemoryEnabled()) {
        return {
          success: false,
          error: "Memory system is disabled",
        };
      }

      const conceptId = await this.semanticMemory.addConcept(
        params.concept,
        params.description
      );

      return {
        success: true,
        memoryId: conceptId,
        data: { message: "Concept added successfully" },
      };
    } catch (error) {
      console.error("Error adding concept:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Find related concepts
   */
  async findRelatedConcepts(params: {
    concept: string;
    maxDepth?: number;
  }): Promise<MemoryResponse> {
    try {
      if (!isMemoryEnabled()) {
        return {
          success: false,
          error: "Memory system is disabled",
        };
      }

      const related = await this.semanticMemory.findRelatedConcepts(
        params.concept,
        params.maxDepth || 2
      );

      return {
        success: true,
        data: { relatedConcepts: related },
      };
    } catch (error) {
      console.error("Error finding related concepts:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Verify a fact against knowledge graph
   */
  async verifyFact(params: { statement: string }): Promise<MemoryResponse> {
    try {
      if (!isMemoryEnabled()) {
        return {
          success: false,
          error: "Memory system is disabled",
        };
      }

      const verification = await this.semanticMemory.verifyFact(
        params.statement
      );

      return {
        success: true,
        data: { verification },
      };
    } catch (error) {
      console.error("Error verifying fact:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get user preferences
   */
  async getUserPreferences(params: {
    userId: string;
    category?: string;
  }): Promise<MemoryResponse> {
    try {
      if (!isMemoryEnabled()) {
        return {
          success: false,
          error: "Memory system is disabled",
        };
      }

      const preferences = await this.userMemory.getUserPreferences(
        params.userId,
        params.category
      );

      return {
        success: true,
        data: { preferences },
      };
    } catch (error) {
      console.error("Error getting user preferences:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Adapt response to user
   */
  async adaptToUser(params: {
    userId: string;
    context: string;
  }): Promise<MemoryResponse> {
    try {
      if (!isMemoryEnabled()) {
        return {
          success: false,
          error: "Memory system is disabled",
        };
      }

      const adaptation = await this.userMemory.adaptToUser(
        params.userId,
        params.context
      );

      return {
        success: true,
        data: { adaptation },
      };
    } catch (error) {
      console.error("Error adapting to user:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get user insights
   */
  async getUserInsights(params: { userId: string }): Promise<MemoryResponse> {
    try {
      if (!isMemoryEnabled()) {
        return {
          success: false,
          error: "Memory system is disabled",
        };
      }

      const insights = await this.userMemory.getUserInsights(params.userId);

      return {
        success: true,
        data: { insights },
      };
    } catch (error) {
      console.error("Error getting user insights:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

// Create controller instance
const memoryController = new MemoryController();

// Export controller methods for use in routes
export const memoryControllerMethods = {
  async remember(params: RememberParams): Promise<MemoryResponse> {
    return await memoryController.remember(params);
  },

  async recall(params: RecallParams): Promise<MemoryResponse> {
    return await memoryController.recall(params);
  },

  async getMemoryContext(params: {
    conversationId: string;
  }): Promise<MemoryResponse> {
    return await memoryController.getMemoryContext(params);
  },

  async searchMemories(params: any): Promise<MemoryResponse> {
    return await memoryController.searchMemories(params);
  },

  async getMemoryStats(params: { userId?: string }): Promise<MemoryResponse> {
    return await memoryController.getMemoryStats(params);
  },

  async optimizeMemory(): Promise<MemoryResponse> {
    return await memoryController.optimizeMemory();
  },

  async addConversationMessage(params: any): Promise<MemoryResponse> {
    return await memoryController.addConversationMessage(params);
  },

  async getConversationSummary(params: {
    conversationId: string;
  }): Promise<MemoryResponse> {
    return await memoryController.getConversationSummary(params);
  },

  async findSimilarMemories(params: any): Promise<MemoryResponse> {
    return await memoryController.findSimilarMemories(params);
  },

  async recordEpisode(params: any): Promise<MemoryResponse> {
    return await memoryController.recordEpisode(params);
  },

  async getEpisodicTimeline(params: any): Promise<MemoryResponse> {
    return await memoryController.getEpisodicTimeline(params);
  },

  async predictOutcome(params: any): Promise<MemoryResponse> {
    return await memoryController.predictOutcome(params);
  },

  async addConcept(params: any): Promise<MemoryResponse> {
    return await memoryController.addConcept(params);
  },

  async findRelatedConcepts(params: any): Promise<MemoryResponse> {
    return await memoryController.findRelatedConcepts(params);
  },

  async verifyFact(params: any): Promise<MemoryResponse> {
    return await memoryController.verifyFact(params);
  },

  async getUserPreferences(params: any): Promise<MemoryResponse> {
    return await memoryController.getUserPreferences(params);
  },

  async adaptToUser(params: any): Promise<MemoryResponse> {
    return await memoryController.adaptToUser(params);
  },

  async getUserInsights(params: any): Promise<MemoryResponse> {
    return await memoryController.getUserInsights(params);
  },
};
