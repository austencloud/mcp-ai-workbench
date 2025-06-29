// Memory Service for Frontend
// Handles all memory-related API calls and state management

import { mcp } from "./mcpClient";
import type {
  MemoryService as IMemoryService,
  MemoryResponse,
  RememberParams,
  RecallParams,
  MemoryQuery,
  MemorySearchResult,
  EpisodicMemory,
  UserPreference,
  PersonalityProfile,
  MemoryStats,
  MemoryItem,
  KnowledgeNode,
  MemoryType,
  createMemoryContext,
} from "$lib/types/memory";

// Svelte 5 reactive state - using objects to allow reassignment
export const memoryState = $state({
  memoryStore: [] as MemoryItem[],
  searchResults: [] as MemorySearchResult[],
  userInsights: [] as string[],
  userPreferences: [] as UserPreference[],
  episodicTimeline: [] as EpisodicMemory[],
  memoryStats: null as MemoryStats | null,
  isMemoryLoading: false,
});

// Export functions that return derived values for Svelte 5 compatibility
export const getMemoryStore = () => memoryState.memoryStore;
export const getSearchResults = () => memoryState.searchResults;
export const getUserInsights = () => memoryState.userInsights;
export const getUserPreferences = () => memoryState.userPreferences;
export const getEpisodicTimeline = () => memoryState.episodicTimeline;
export const getMemoryStats = () => memoryState.memoryStats;
export const getIsMemoryLoading = () => memoryState.isMemoryLoading;

// Derived reactive values
export const getMemoryByType = () => {
  return memoryState.memoryStore.reduce((acc, memory) => {
    if (!acc[memory.type]) acc[memory.type] = [];
    acc[memory.type].push(memory);
    return acc;
  }, {} as Record<MemoryType, MemoryItem[]>);
};

export const getRecentMemories = () => {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return memoryState.memoryStore.filter(
    (memory) => new Date(memory.createdAt) > sevenDaysAgo
  );
};

export const getImportantMemories = () => {
  return memoryState.memoryStore.filter((memory) => memory.importance > 0.7);
};

class MemoryService implements IMemoryService {
  private currentUserId: string = "default-user";
  private currentWorkspaceId: string | null = null;
  private currentConversationId: string | null = null;

  // Configuration
  setCurrentUser(userId: string) {
    this.currentUserId = userId;
  }

  setCurrentWorkspace(workspaceId: string) {
    this.currentWorkspaceId = workspaceId;
  }

  setCurrentConversation(conversationId: string) {
    this.currentConversationId = conversationId;
  }

  // Core Memory Operations
  async remember(params: RememberParams): Promise<MemoryResponse> {
    try {
      memoryState.isMemoryLoading = true;
      const response = await mcp.remember({
        ...params,
        context: {
          ...params.context,
          userId: this.currentUserId,
          workspaceId: this.currentWorkspaceId,
          conversationId: this.currentConversationId,
        },
      });

      if (response.success) {
        // Refresh memory store
        await this.loadRecentMemories();
      }

      return response;
    } catch (error) {
      console.error("Error remembering:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    } finally {
      memoryState.isMemoryLoading = false;
    }
  }

  async recall(params: RecallParams): Promise<MemoryResponse> {
    try {
      memoryState.isMemoryLoading = true;
      const response = await mcp.recall({
        ...params,
        context: {
          ...params.context,
          userId: this.currentUserId,
          workspaceId: this.currentWorkspaceId,
          conversationId: this.currentConversationId,
        },
      });

      return response;
    } catch (error) {
      console.error("Error recalling:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    } finally {
      memoryState.isMemoryLoading = false;
    }
  }

  async searchMemories(query: MemoryQuery): Promise<MemorySearchResult[]> {
    try {
      memoryState.isMemoryLoading = true;
      const response = await mcp.searchMemories({
        query: query.query,
        userId: this.currentUserId,
        type: Array.isArray(query.type) ? query.type[0] : query.type,
        limit: query.maxResults,
      });

      if (response.success) {
        const results = response.memories || [];
        memoryState.searchResults.length = 0;
        memoryState.searchResults.push(...results);
        return results;
      }

      return [];
    } catch (error) {
      console.error("Error searching memories:", error);
      return [];
    } finally {
      memoryState.isMemoryLoading = false;
    }
  }

  async getMemoryContext(conversationId: string): Promise<MemoryResponse> {
    try {
      return await mcp.getMemoryContext({ conversationId });
    } catch (error) {
      console.error("Error getting memory context:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async getMemoryStats(userId?: string): Promise<MemoryResponse> {
    try {
      const response = await mcp.getMemoryStats({
        userId: userId || this.currentUserId,
      });

      if (response.success) {
        memoryState.memoryStats = response.stats || null;
      }

      return response;
    } catch (error) {
      console.error("Error getting memory stats:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async optimizeMemory(): Promise<MemoryResponse> {
    try {
      memoryState.isMemoryLoading = true;
      const response = await mcp.optimizeMemory();

      if (response.success) {
        // Refresh all memory data after optimization
        await this.refreshAllMemoryData();
      }

      return response;
    } catch (error) {
      console.error("Error optimizing memory:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    } finally {
      memoryState.isMemoryLoading = false;
    }
  }

  // Episodic Memory
  async recordEpisode(
    episode: Partial<EpisodicMemory>
  ): Promise<MemoryResponse> {
    try {
      memoryState.isMemoryLoading = true;
      const response = await mcp.recordEpisode({
        event: episode.event || "",
        outcome: episode.outcome || "",
        participants: episode.participants || [],
        emotions: episode.emotions || [],
        success: episode.success || true,
        context: {
          userId: this.currentUserId,
          workspaceId: this.currentWorkspaceId,
          conversationId: this.currentConversationId,
          timestamp: new Date(),
          relevantEntities: [],
        },
      });

      if (response.success) {
        await this.loadEpisodicTimeline();
      }

      return response;
    } catch (error) {
      console.error("Error recording episode:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    } finally {
      memoryState.isMemoryLoading = false;
    }
  }

  async getEpisodicTimeline(
    userId?: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<MemoryResponse> {
    try {
      const response = await mcp.getEpisodicTimeline({
        userId: userId || this.currentUserId,
        startDate: timeRange?.start?.toISOString(),
        endDate: timeRange?.end?.toISOString(),
      });

      if (response.success) {
        memoryState.episodicTimeline.length = 0;
        memoryState.episodicTimeline.push(...(response.timeline || []));
      }

      return response;
    } catch (error) {
      console.error("Error getting episodic timeline:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async predictOutcome(scenario: string): Promise<MemoryResponse> {
    try {
      return await mcp.predictOutcome({ scenario });
    } catch (error) {
      console.error("Error predicting outcome:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Semantic Memory
  async addConcept(
    concept: string,
    description: string
  ): Promise<MemoryResponse> {
    try {
      return await mcp.addConcept({ concept, description });
    } catch (error) {
      console.error("Error adding concept:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async findRelatedConcepts(
    concept: string,
    maxDepth?: number
  ): Promise<MemoryResponse> {
    try {
      return await mcp.findRelatedConcepts({ concept, maxDepth });
    } catch (error) {
      console.error("Error finding related concepts:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async verifyFact(statement: string): Promise<MemoryResponse> {
    try {
      return await mcp.verifyFact({ statement });
    } catch (error) {
      console.error("Error verifying fact:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // User Memory
  async getUserPreferences(
    userId?: string,
    category?: string
  ): Promise<MemoryResponse> {
    try {
      const response = await mcp.getUserPreferences({
        userId: userId || this.currentUserId,
      });

      if (response.success) {
        memoryState.userPreferences.length = 0;
        memoryState.userPreferences.push(...(response.preferences || []));
      }

      return response;
    } catch (error) {
      console.error("Error getting user preferences:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async adaptToUser(
    userId?: string,
    context?: string
  ): Promise<MemoryResponse> {
    try {
      return await mcp.adaptToUser({
        userId: userId || this.currentUserId,
        context: context || "general",
      });
    } catch (error) {
      console.error("Error adapting to user:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async getUserInsights(userId?: string): Promise<MemoryResponse> {
    try {
      const response = await mcp.getUserInsights({
        userId: userId || this.currentUserId,
      });

      if (response.success) {
        memoryState.userInsights.length = 0;
        memoryState.userInsights.push(...(response.insights || []));
      }

      return response;
    } catch (error) {
      console.error("Error getting user insights:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Conversation Integration
  async addConversationMessage(
    conversationId: string,
    role: "user" | "assistant" | "system",
    content: string
  ): Promise<MemoryResponse> {
    try {
      const response = await mcp.addConversationMessage({
        conversationId,
        role,
        content,
        timestamp: new Date(),
      });
      return {
        success: response.success,
        error: response.error,
      };
    } catch (error) {
      console.error("Error adding conversation message:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async getConversationSummary(
    conversationId: string
  ): Promise<MemoryResponse> {
    try {
      return await mcp.getConversationSummary({ conversationId });
    } catch (error) {
      console.error("Error getting conversation summary:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async findSimilarMemories(
    content: string,
    threshold?: number,
    limit?: number
  ): Promise<MemoryResponse> {
    try {
      return await mcp.findSimilarMemories({
        content,
        threshold: threshold || 0.7,
        limit: limit || 10,
      });
    } catch (error) {
      console.error("Error finding similar memories:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Utility Methods
  async loadRecentMemories(): Promise<void> {
    try {
      const response = await this.searchMemories({
        query: "",
        context: { userId: this.currentUserId },
        maxResults: 50,
        timeRange: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          end: new Date(),
        },
      });

      if (response.length > 0) {
        memoryState.memoryStore.length = 0;
        memoryState.memoryStore.push(...response.map((r) => r.memory));
      }
    } catch (error) {
      console.error("Error loading recent memories:", error);
    }
  }

  async loadEpisodicTimeline(): Promise<void> {
    try {
      await this.getEpisodicTimeline(this.currentUserId, {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        end: new Date(),
      });
    } catch (error) {
      console.error("Error loading episodic timeline:", error);
    }
  }

  async refreshAllMemoryData(): Promise<void> {
    try {
      await Promise.all([
        this.loadRecentMemories(),
        this.loadEpisodicTimeline(),
        this.getUserPreferences(),
        this.getUserInsights(),
        this.getMemoryStats(),
      ]);
    } catch (error) {
      console.error("Error refreshing memory data:", error);
    }
  }

  // Memory Analytics
  async getMemoryAnalytics(): Promise<{
    totalMemories: number;
    memoryGrowth: number;
    topTopics: string[];
    activityLevel: "low" | "medium" | "high";
  }> {
    try {
      const statsResponse = await this.getMemoryStats();
      if (!statsResponse.success) {
        return {
          totalMemories: 0,
          memoryGrowth: 0,
          topTopics: [],
          activityLevel: "low",
        };
      }

      const stats = statsResponse.data.stats;
      return {
        totalMemories: stats.totalMemories || 0,
        memoryGrowth: stats.userActivity?.weeklyGrowth || 0,
        topTopics: stats.userActivity?.topTopics || [],
        activityLevel: this.calculateActivityLevel(
          stats.userActivity?.dailyInteractions || 0
        ),
      };
    } catch (error) {
      console.error("Error getting memory analytics:", error);
      return {
        totalMemories: 0,
        memoryGrowth: 0,
        topTopics: [],
        activityLevel: "low",
      };
    }
  }

  private calculateActivityLevel(
    dailyInteractions: number
  ): "low" | "medium" | "high" {
    if (dailyInteractions < 5) return "low";
    if (dailyInteractions < 20) return "medium";
    return "high";
  }
}

// Export singleton instance
export const memoryService = new MemoryService();

// Export convenience functions
export async function rememberThis(
  content: string,
  type?: MemoryType,
  importance?: number
) {
  return memoryService.remember({
    input: content,
    context: {
      userId: "default-user",
      timestamp: new Date(),
      relevantEntities: [],
    },
    type,
    importance,
  });
}

export async function searchMemory(query: string, maxResults: number = 10) {
  return memoryService.searchMemories({
    query,
    maxResults,
  });
}

export async function getRelevantContext(query: string) {
  const results = await searchMemory(query, 5);
  return results.map((r) => r.memory);
}
