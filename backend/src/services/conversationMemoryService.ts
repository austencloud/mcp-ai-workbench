// Conversation Memory Service
// Handles short-term conversation context and recent interactions

import { PrismaClient } from "@prisma/client";
import {
  ConversationMemory,
  ConversationMessage,
  ExtractedInfo,
  MemoryType,
  MemoryContext,
} from "../types/memory";
import { TextProcessor } from "../utils/textProcessor";
import { calculateImportance, generateMemoryId } from "../utils/memoryUtils";
import { memoryDefaults } from "../config/memoryConfig";

export class ConversationMemoryService {
  private prisma: PrismaClient;
  private textProcessor: TextProcessor;

  constructor() {
    this.prisma = new PrismaClient();
    this.textProcessor = new TextProcessor();
  }

  /**
   * Add a message to conversation memory
   */
  async addMessage(
    conversationId: string,
    message: Omit<ConversationMessage, "id" | "importance" | "extractedInfo">
  ): Promise<void> {
    try {
      // Analyze message content
      const extractedInfo = this.textProcessor.analyzeText(message.content);
      const importance = this.calculateMessageImportance(
        message,
        extractedInfo
      );

      // Get or create conversation memory
      let conversationMemory = await this.getConversationMemory(conversationId);

      if (!conversationMemory) {
        conversationMemory = await this.createConversationMemory(
          conversationId
        );
      }

      // Create message record
      const messageRecord: ConversationMessage = {
        id: generateMemoryId(),
        ...message,
        importance,
        extractedInfo,
      };

      // Store message in database
      await this.prisma.conversationMessage.create({
        data: {
          id: messageRecord.id,
          conversationMemoryId: conversationMemory.id,
          role: messageRecord.role,
          content: messageRecord.content,
          timestamp: messageRecord.timestamp,
          importance: messageRecord.importance,
          extractedInfo: messageRecord.extractedInfo as any,
        },
      });

      // Update conversation memory
      await this.updateConversationSummary(conversationId);
      await this.updateConversationMood(conversationId);
    } catch (error) {
      console.error("Error adding message to conversation memory:", error);
      throw error;
    }
  }

  /**
   * Get conversation context
   */
  async getConversationContext(
    conversationId: string
  ): Promise<ConversationMemory | null> {
    try {
      const conversationMemory =
        await this.prisma.conversationMemory.findUnique({
          where: { conversationId },
          include: {
            messages: {
              orderBy: { timestamp: "asc" },
            },
          },
        });

      if (!conversationMemory) return null;

      return {
        conversationId: conversationMemory.conversationId,
        messages: conversationMemory.messages.map((msg) => ({
          id: msg.id,
          role: msg.role as "user" | "assistant" | "system",
          content: msg.content,
          timestamp: msg.timestamp,
          importance: msg.importance,
          extractedInfo: msg.extractedInfo as any as ExtractedInfo,
        })),
        summary: conversationMemory.summary,
        keyTopics: conversationMemory.keyTopics as string[],
        participants: conversationMemory.participants as string[],
        mood: conversationMemory.mood || "neutral",
        outcomes: conversationMemory.outcomes as string[],
        followUpNeeded: conversationMemory.followUpNeeded,
        createdAt: conversationMemory.createdAt,
        lastUpdated: conversationMemory.lastUpdated,
      };
    } catch (error) {
      console.error("Error getting conversation context:", error);
      return null;
    }
  }

  /**
   * Summarize conversation
   */
  async summarizeConversation(conversationId: string): Promise<string> {
    try {
      const context = await this.getConversationContext(conversationId);
      if (!context || context.messages.length === 0) {
        return "No conversation to summarize";
      }

      // Extract key information from messages
      const userMessages = context.messages.filter((m) => m.role === "user");
      const assistantMessages = context.messages.filter(
        (m) => m.role === "assistant"
      );

      const topics = new Set<string>();
      const facts = new Set<string>();
      const requests = new Set<string>();

      context.messages.forEach((message) => {
        message.extractedInfo.facts.forEach((fact) => facts.add(fact));
        message.extractedInfo.requests.forEach((request) =>
          requests.add(request)
        );
        // Add topics from keywords and entities
        message.extractedInfo.entities.forEach((entity) =>
          topics.add(entity.text)
        );
      });

      // Generate summary
      let summary = `Conversation with ${userMessages.length} user messages and ${assistantMessages.length} assistant responses. `;

      if (topics.size > 0) {
        summary += `Main topics: ${Array.from(topics)
          .slice(0, 5)
          .join(", ")}. `;
      }

      if (facts.size > 0) {
        summary += `Key facts discussed: ${Array.from(facts)
          .slice(0, 3)
          .join("; ")}. `;
      }

      if (requests.size > 0) {
        summary += `User requests: ${Array.from(requests)
          .slice(0, 3)
          .join("; ")}.`;
      }

      return summary;
    } catch (error) {
      console.error("Error summarizing conversation:", error);
      return "Error generating summary";
    }
  }

  /**
   * Extract important messages from conversation
   */
  async extractImportantMessages(
    conversationId: string
  ): Promise<ConversationMessage[]> {
    try {
      const context = await this.getConversationContext(conversationId);
      if (!context) return [];

      // Sort by importance and return top messages
      return context.messages
        .filter((message) => message.importance > 0.6)
        .sort((a, b) => b.importance - a.importance)
        .slice(0, 10);
    } catch (error) {
      console.error("Error extracting important messages:", error);
      return [];
    }
  }

  /**
   * Update conversation mood based on recent messages
   */
  async updateConversationMood(conversationId: string): Promise<void> {
    try {
      const context = await this.getConversationContext(conversationId);
      if (!context) return;

      // Analyze sentiment of recent messages
      const recentMessages = context.messages.slice(-10);
      let totalSentiment = 0;
      let messageCount = 0;

      recentMessages.forEach((message) => {
        const sentiment = this.textProcessor.analyzeSentiment(message.content);
        totalSentiment += sentiment;
        messageCount++;
      });

      const averageSentiment =
        messageCount > 0 ? totalSentiment / messageCount : 0;

      let mood = "neutral";
      if (averageSentiment > 0.3) mood = "positive";
      else if (averageSentiment < -0.3) mood = "negative";

      // Update in database
      await this.prisma.conversationMemory.update({
        where: { conversationId },
        data: { mood },
      });
    } catch (error) {
      console.error("Error updating conversation mood:", error);
    }
  }

  /**
   * Identify follow-up actions needed
   */
  async identifyFollowUpActions(conversationId: string): Promise<string[]> {
    try {
      const context = await this.getConversationContext(conversationId);
      if (!context) return [];

      const followUpActions: string[] = [];

      // Look for unresolved questions
      const questions = context.messages
        .flatMap((m) => m.extractedInfo.questions)
        .filter((q) => q.length > 0);

      if (questions.length > 0) {
        followUpActions.push(
          `Answer pending questions: ${questions.slice(0, 2).join(", ")}`
        );
      }

      // Look for incomplete requests
      const requests = context.messages
        .flatMap((m) => m.extractedInfo.requests)
        .filter((r) => r.length > 0);

      if (requests.length > 0) {
        followUpActions.push(
          `Complete requests: ${requests.slice(0, 2).join(", ")}`
        );
      }

      // Check for negative sentiment requiring attention
      if (context.mood === "negative") {
        followUpActions.push("Address user concerns or frustrations");
      }

      return followUpActions;
    } catch (error) {
      console.error("Error identifying follow-up actions:", error);
      return [];
    }
  }

  /**
   * Calculate message importance
   */
  private calculateMessageImportance(
    message: Omit<ConversationMessage, "id" | "importance" | "extractedInfo">,
    extractedInfo: ExtractedInfo
  ): number {
    let importance = memoryDefaults.importance;

    // User messages are generally more important than assistant messages
    if (message.role === "user") {
      importance += 0.2;
    }

    // Messages with facts are more important
    if (extractedInfo.facts.length > 0) {
      importance += 0.1 * Math.min(extractedInfo.facts.length, 3);
    }

    // Messages with preferences are very important
    if (extractedInfo.preferences.length > 0) {
      importance += 0.3;
    }

    // Messages with questions need attention
    if (extractedInfo.questions.length > 0) {
      importance += 0.15;
    }

    // Messages with requests are important
    if (extractedInfo.requests.length > 0) {
      importance += 0.2;
    }

    // Messages with strong emotions are important
    if (extractedInfo.emotions.length > 0) {
      importance += 0.1 * extractedInfo.emotions.length;
    }

    // Longer messages tend to be more important
    const lengthBonus = Math.min(0.1, message.content.length / 1000);
    importance += lengthBonus;

    return Math.max(0, Math.min(1, importance));
  }

  /**
   * Create new conversation memory
   */
  private async createConversationMemory(
    conversationId: string
  ): Promise<{ id: string }> {
    const conversationMemory = await this.prisma.conversationMemory.create({
      data: {
        conversationId,
        summary: "New conversation started",
        keyTopics: [],
        participants: [],
        outcomes: [],
        followUpNeeded: false,
        messagesCount: 0,
        importance: memoryDefaults.importance,
      },
    });

    return { id: conversationMemory.id };
  }

  /**
   * Get existing conversation memory
   */
  private async getConversationMemory(
    conversationId: string
  ): Promise<{ id: string } | null> {
    const conversationMemory = await this.prisma.conversationMemory.findUnique({
      where: { conversationId },
      select: { id: true },
    });

    return conversationMemory;
  }

  /**
   * Update conversation summary
   */
  private async updateConversationSummary(
    conversationId: string
  ): Promise<void> {
    try {
      const summary = await this.summarizeConversation(conversationId);
      const context = await this.getConversationContext(conversationId);

      if (!context) return;

      // Extract key topics from all messages
      const allTopics = new Set<string>();
      context.messages.forEach((message) => {
        message.extractedInfo.entities.forEach((entity) => {
          if (entity.confidence > 0.7) {
            allTopics.add(entity.text);
          }
        });
      });

      const keyTopics = Array.from(allTopics).slice(0, 10);

      await this.prisma.conversationMemory.update({
        where: { conversationId },
        data: {
          summary,
          keyTopics,
          messagesCount: context.messages.length,
          lastUpdated: new Date(),
        },
      });
    } catch (error) {
      console.error("Error updating conversation summary:", error);
    }
  }
}
