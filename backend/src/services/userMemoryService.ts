// User Memory Service
// Personal preferences, patterns, and user-specific memory

import { PrismaClient } from "@prisma/client";
import {
  UserPreference,
  PersonalityProfile,
  UserInteraction,
  UserPattern,
  MemoryType,
} from "../types/memory";
import { TextProcessor } from "../utils/textProcessor";
import { generateMemoryId } from "../utils/memoryUtils";

export class UserMemoryService {
  private prisma: PrismaClient;
  private textProcessor: TextProcessor;
  private userProfiles: Map<string, PersonalityProfile> = new Map();

  constructor() {
    this.prisma = new PrismaClient();
    this.textProcessor = new TextProcessor();
  }

  /**
   * Learn a user preference
   */
  async learnPreference(
    userId: string,
    category: string,
    preference: string,
    strength: number
  ): Promise<void> {
    try {
      await this.prisma.userPreference.upsert({
        where: {
          userId_category_preference: {
            userId,
            category,
            preference,
          },
        },
        update: {
          strength: Math.max(0, Math.min(1, strength)),
          updatedAt: new Date(),
        },
        create: {
          userId,
          category,
          preference,
          strength: Math.max(0, Math.min(1, strength)),
          source: "interaction_learning",
        },
      });

      // Update user profile
      await this.updateUserProfile(userId);
    } catch (error) {
      console.error("Error learning preference:", error);
      throw error;
    }
  }

  /**
   * Get user preferences
   */
  async getUserPreferences(
    userId: string,
    category?: string
  ): Promise<UserPreference[]> {
    try {
      const whereClause: any = { userId };
      if (category) {
        whereClause.category = category;
      }

      const preferences = await this.prisma.userPreference.findMany({
        where: whereClause,
        orderBy: { strength: "desc" },
      });

      return preferences.map((pref) => ({
        category: pref.category,
        preference: pref.preference,
        strength: pref.strength,
        source: pref.source,
        createdAt: pref.createdAt,
      }));
    } catch (error) {
      console.error("Error getting user preferences:", error);
      return [];
    }
  }

  /**
   * Adapt response to user preferences
   */
  async adaptToUser(userId: string, context: string): Promise<string> {
    try {
      const profile = await this.getUserPersonality(userId);
      const preferences = await this.getUserPreferences(userId);

      let adaptationSuggestions = "User adaptation suggestions:\n";

      // Communication style adaptation
      if (profile.traits.formality > 0.7) {
        adaptationSuggestions +=
          "• Use formal language and professional tone\n";
      } else if (profile.traits.formality < 0.3) {
        adaptationSuggestions += "• Use casual, friendly language\n";
      }

      // Detail level adaptation
      if (profile.traits.detail_oriented > 0.7) {
        adaptationSuggestions +=
          "• Provide comprehensive, detailed explanations\n";
      } else if (profile.traits.detail_oriented < 0.3) {
        adaptationSuggestions += "• Keep responses concise and to the point\n";
      }

      // Technical level adaptation
      const techPrefs = preferences.filter(
        (p) => p.category === "technical_level"
      );
      if (techPrefs.length > 0) {
        const avgTechLevel =
          techPrefs.reduce((sum, p) => sum + p.strength, 0) / techPrefs.length;
        if (avgTechLevel > 0.7) {
          adaptationSuggestions +=
            "• Use technical terminology and detailed explanations\n";
        } else if (avgTechLevel < 0.3) {
          adaptationSuggestions += "• Avoid jargon, use simple explanations\n";
        }
      }

      // Topic interests
      const topicPrefs = preferences.filter((p) => p.category === "topics");
      if (topicPrefs.length > 0) {
        const topTopics = topicPrefs.slice(0, 3).map((p) => p.preference);
        adaptationSuggestions += `• User is particularly interested in: ${topTopics.join(
          ", "
        )}\n`;
      }

      return adaptationSuggestions;
    } catch (error) {
      console.error("Error adapting to user:", error);
      return "Unable to provide user-specific adaptations.";
    }
  }

  /**
   * Predict user needs based on context
   */
  async predictUserNeed(userId: string, context: string): Promise<string[]> {
    try {
      const patterns = await this.analyzeUserPatterns(userId);
      const preferences = await this.getUserPreferences(userId);
      const predictions: string[] = [];

      // Analyze context for keywords
      const keywords = this.textProcessor.extractKeywords(context);
      const entities = this.textProcessor.extractEntities(context);

      // Look for patterns that match current context
      for (const pattern of patterns) {
        const patternKeywords = this.textProcessor.extractKeywords(
          pattern.pattern
        );
        const overlap = keywords.filter((k) => patternKeywords.includes(k));

        if (overlap.length > 0 && pattern.confidence > 0.6) {
          predictions.push(`Based on past behavior: ${pattern.pattern}`);
        }
      }

      // Check preferences for relevant suggestions
      for (const entity of entities) {
        const relatedPrefs = preferences.filter(
          (p) =>
            p.preference.toLowerCase().includes(entity.text.toLowerCase()) ||
            entity.text.toLowerCase().includes(p.preference.toLowerCase())
        );

        for (const pref of relatedPrefs) {
          if (pref.strength > 0.6) {
            predictions.push(
              `User preference: ${pref.preference} (${pref.category})`
            );
          }
        }
      }

      // Time-based predictions
      const hour = new Date().getHours();
      if (hour >= 9 && hour <= 17) {
        const workPrefs = preferences.filter(
          (p) => p.category === "work_style"
        );
        if (workPrefs.length > 0) {
          predictions.push(
            "During work hours - consider work-related preferences"
          );
        }
      }

      return predictions.slice(0, 5);
    } catch (error) {
      console.error("Error predicting user needs:", error);
      return [];
    }
  }

  /**
   * Get user personality profile
   */
  async getUserPersonality(userId: string): Promise<PersonalityProfile> {
    try {
      let profile = this.userProfiles.get(userId);

      if (!profile) {
        profile = await this.buildPersonalityProfile(userId);
        this.userProfiles.set(userId, profile);
      }

      return profile;
    } catch (error) {
      console.error("Error getting user personality:", error);
      return this.getDefaultPersonalityProfile(userId);
    }
  }

  /**
   * Update user model based on interaction
   */
  async updateUserModel(
    userId: string,
    interaction: UserInteraction
  ): Promise<void> {
    try {
      // Extract preferences from interaction
      await this.extractPreferencesFromInteraction(userId, interaction);

      // Update personality traits
      await this.updatePersonalityTraits(userId, interaction);

      // Record interaction pattern
      await this.recordInteractionPattern(userId, interaction);

      // Refresh user profile
      await this.updateUserProfile(userId);
    } catch (error) {
      console.error("Error updating user model:", error);
    }
  }

  /**
   * Analyze user patterns
   */
  private async analyzeUserPatterns(userId: string): Promise<UserPattern[]> {
    try {
      // Get user's conversation history and interactions
      const conversations = await this.prisma.conversationMemory.findMany({
        where: { userId },
        include: { messages: true },
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      const patterns: Map<string, UserPattern> = new Map();

      for (const conversation of conversations) {
        for (const message of conversation.messages) {
          if (message.role === "user") {
            // Extract patterns from user messages
            const keywords = this.textProcessor.extractKeywords(
              message.content
            );
            const entities = this.textProcessor.extractEntities(
              message.content
            );

            // Look for recurring themes
            for (const keyword of keywords) {
              const patternKey = `keyword_${keyword}`;
              const existing = patterns.get(patternKey);

              if (existing) {
                existing.frequency++;
                existing.contexts.push(conversation.conversationId);
              } else {
                patterns.set(patternKey, {
                  pattern: `Frequently mentions: ${keyword}`,
                  frequency: 1,
                  contexts: [conversation.conversationId],
                  confidence: 0.5,
                });
              }
            }

            // Time-based patterns
            const hour = message.timestamp.getHours();
            const timePattern = `time_${Math.floor(hour / 4) * 4}h`;
            const existing = patterns.get(timePattern);

            if (existing) {
              existing.frequency++;
            } else {
              patterns.set(timePattern, {
                pattern: `Active during ${hour}:00-${hour + 4}:00`,
                frequency: 1,
                contexts: [conversation.conversationId],
                confidence: 0.3,
              });
            }
          }
        }
      }

      // Calculate confidence based on frequency
      const patternArray = Array.from(patterns.values());
      for (const pattern of patternArray) {
        pattern.confidence = Math.min(0.9, pattern.frequency * 0.1);
      }

      return patternArray
        .filter((p) => p.frequency >= 2)
        .sort((a, b) => b.confidence - a.confidence);
    } catch (error) {
      console.error("Error analyzing user patterns:", error);
      return [];
    }
  }

  /**
   * Build personality profile for user
   */
  private async buildPersonalityProfile(
    userId: string
  ): Promise<PersonalityProfile> {
    try {
      const preferences = await this.getUserPreferences(userId);
      const patterns = await this.analyzeUserPatterns(userId);

      const traits: Record<string, number> = {
        formality: 0.5,
        detail_oriented: 0.5,
        technical_aptitude: 0.5,
        patience: 0.5,
        creativity: 0.5,
      };

      // Analyze preferences to infer traits
      for (const pref of preferences) {
        switch (pref.category) {
          case "communication_style":
            if (pref.preference.includes("formal")) {
              traits.formality = Math.max(traits.formality, pref.strength);
            } else if (pref.preference.includes("casual")) {
              traits.formality = Math.min(traits.formality, 1 - pref.strength);
            }
            break;
          case "detail_level":
            if (pref.preference.includes("detailed")) {
              traits.detail_oriented = Math.max(
                traits.detail_oriented,
                pref.strength
              );
            }
            break;
          case "technical_level":
            traits.technical_aptitude = Math.max(
              traits.technical_aptitude,
              pref.strength
            );
            break;
        }
      }

      // Extract interests and expertise from patterns
      const interests = patterns
        .filter((p) => p.pattern.includes("mentions"))
        .map((p) => p.pattern.replace("Frequently mentions: ", ""))
        .slice(0, 10);

      const expertise: Record<string, number> = {};
      for (const interest of interests) {
        const relatedPrefs = preferences.filter((p) =>
          p.preference.toLowerCase().includes(interest.toLowerCase())
        );
        if (relatedPrefs.length > 0) {
          expertise[interest] =
            relatedPrefs.reduce((sum, p) => sum + p.strength, 0) /
            relatedPrefs.length;
        }
      }

      return {
        userId,
        traits,
        communicationStyle: traits.formality > 0.6 ? "formal" : "casual",
        interests,
        expertise,
        workingPatterns: patterns
          .filter((p) => p.pattern.includes("Active"))
          .map((p) => p.pattern),
        goals: [], // Would be extracted from conversation analysis
        motivations: [], // Would be inferred from behavior patterns
        lastUpdated: new Date(),
      };
    } catch (error) {
      console.error("Error building personality profile:", error);
      return this.getDefaultPersonalityProfile(userId);
    }
  }

  /**
   * Get default personality profile
   */
  private getDefaultPersonalityProfile(userId: string): PersonalityProfile {
    return {
      userId,
      traits: {
        formality: 0.5,
        detail_oriented: 0.5,
        technical_aptitude: 0.5,
        patience: 0.5,
        creativity: 0.5,
      },
      communicationStyle: "neutral",
      interests: [],
      expertise: {},
      workingPatterns: [],
      goals: [],
      motivations: [],
      lastUpdated: new Date(),
    };
  }

  /**
   * Update user profile
   */
  private async updateUserProfile(userId: string): Promise<void> {
    try {
      const profile = await this.buildPersonalityProfile(userId);
      this.userProfiles.set(userId, profile);
    } catch (error) {
      console.error("Error updating user profile:", error);
    }
  }

  /**
   * Extract preferences from interaction
   */
  private async extractPreferencesFromInteraction(
    userId: string,
    interaction: UserInteraction
  ): Promise<void> {
    try {
      const sentiment = this.textProcessor.analyzeSentiment(
        interaction.content
      );
      const keywords = this.textProcessor.extractKeywords(interaction.content);
      const entities = this.textProcessor.extractEntities(interaction.content);

      // Extract communication style preferences
      if (
        interaction.content.includes("please") ||
        interaction.content.includes("thank you")
      ) {
        await this.learnPreference(
          userId,
          "communication_style",
          "polite",
          0.7
        );
      }

      if (interaction.content.length > 200) {
        await this.learnPreference(userId, "detail_level", "detailed", 0.6);
      } else if (interaction.content.length < 50) {
        await this.learnPreference(userId, "detail_level", "concise", 0.6);
      }

      // Extract topic preferences based on positive sentiment
      if (sentiment > 0.3) {
        for (const entity of entities) {
          if (entity.confidence > 0.7) {
            await this.learnPreference(
              userId,
              "topics",
              entity.text,
              sentiment
            );
          }
        }
      }

      // Extract technical level preferences
      const technicalTerms = keywords.filter((k) =>
        [
          "api",
          "database",
          "algorithm",
          "function",
          "variable",
          "class",
          "method",
        ].includes(k.toLowerCase())
      );

      if (technicalTerms.length > 0) {
        const techLevel = Math.min(0.9, technicalTerms.length * 0.2);
        await this.learnPreference(
          userId,
          "technical_level",
          "high",
          techLevel
        );
      }

      // Extract time preferences
      const hour = new Date().getHours();
      const timeCategory =
        hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
      await this.learnPreference(userId, "active_time", timeCategory, 0.3);
    } catch (error) {
      console.error("Error extracting preferences from interaction:", error);
    }
  }

  /**
   * Update personality traits based on interaction
   */
  private async updatePersonalityTraits(
    userId: string,
    interaction: UserInteraction
  ): Promise<void> {
    try {
      const profile = await this.getUserPersonality(userId);
      const sentiment = this.textProcessor.analyzeSentiment(
        interaction.content
      );

      // Update traits based on interaction characteristics
      if (interaction.content.length > 300) {
        profile.traits.detail_oriented = Math.min(
          1,
          profile.traits.detail_oriented + 0.1
        );
      }

      if (interaction.content.includes("?")) {
        profile.traits.curiosity = Math.min(
          1,
          (profile.traits.curiosity || 0.5) + 0.05
        );
      }

      if (sentiment < -0.3) {
        profile.traits.patience = Math.max(0, profile.traits.patience - 0.05);
      } else if (sentiment > 0.3) {
        profile.traits.patience = Math.min(1, profile.traits.patience + 0.02);
      }

      // Update communication style
      const formalWords = ["please", "thank you", "kindly", "appreciate"];
      const casualWords = ["hey", "cool", "awesome", "yeah"];

      const formalCount = formalWords.filter((word) =>
        interaction.content.toLowerCase().includes(word)
      ).length;

      const casualCount = casualWords.filter((word) =>
        interaction.content.toLowerCase().includes(word)
      ).length;

      if (formalCount > casualCount) {
        profile.traits.formality = Math.min(1, profile.traits.formality + 0.05);
      } else if (casualCount > formalCount) {
        profile.traits.formality = Math.max(0, profile.traits.formality - 0.05);
      }

      profile.lastUpdated = new Date();
      this.userProfiles.set(userId, profile);
    } catch (error) {
      console.error("Error updating personality traits:", error);
    }
  }

  /**
   * Record interaction pattern
   */
  private async recordInteractionPattern(
    userId: string,
    interaction: UserInteraction
  ): Promise<void> {
    try {
      // This could be stored in a separate patterns table
      // For now, we'll store it as a memory item
      const patternId = generateMemoryId();

      await this.prisma.memory.create({
        data: {
          id: patternId,
          type: "PATTERN" as any,
          content: `User interaction pattern: ${interaction.type}`,
          importance: 0.3,
          confidence: 0.8,
          tags: ["user_pattern", interaction.type],
          relationships: [],
          source: {
            type: "system",
            identifier: "user_modeling",
            reliability: 0.8,
          } as any,
          metadata: {
            interaction: {
              type: interaction.type,
              timestamp: interaction.timestamp,
              context: interaction.context,
              outcome: interaction.outcome,
            },
            pattern: true,
          } as any,
          context: {
            userId,
            timestamp: interaction.timestamp,
            relevantEntities: [],
          } as any,
          userId,
        },
      });
    } catch (error) {
      console.error("Error recording interaction pattern:", error);
    }
  }

  /**
   * Generate user insights
   */
  private async generateUserInsights(userId: string): Promise<string[]> {
    try {
      const profile = await this.getUserPersonality(userId);
      const preferences = await this.getUserPreferences(userId);
      const patterns = await this.analyzeUserPatterns(userId);
      const insights: string[] = [];

      // Communication insights
      if (profile.traits.formality > 0.7) {
        insights.push("User prefers formal, professional communication");
      } else if (profile.traits.formality < 0.3) {
        insights.push("User prefers casual, friendly communication");
      }

      // Learning style insights
      if (profile.traits.detail_oriented > 0.7) {
        insights.push("User appreciates comprehensive, detailed explanations");
      } else if (profile.traits.detail_oriented < 0.3) {
        insights.push("User prefers concise, to-the-point responses");
      }

      // Technical insights
      if (profile.traits.technical_aptitude > 0.7) {
        insights.push(
          "User has high technical aptitude and can handle complex concepts"
        );
      } else if (profile.traits.technical_aptitude < 0.3) {
        insights.push(
          "User prefers simple explanations without technical jargon"
        );
      }

      // Interest insights
      const topInterests = Object.entries(profile.expertise)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([interest]) => interest);

      if (topInterests.length > 0) {
        insights.push(`User's main interests: ${topInterests.join(", ")}`);
      }

      // Behavioral insights
      const activeTimePatterns = patterns.filter((p) =>
        p.pattern.includes("Active")
      );
      if (activeTimePatterns.length > 0) {
        const mostActiveTime = activeTimePatterns.sort(
          (a, b) => b.frequency - a.frequency
        )[0];
        insights.push(`Most active: ${mostActiveTime.pattern}`);
      }

      return insights;
    } catch (error) {
      console.error("Error generating user insights:", error);
      return [];
    }
  }

  /**
   * Get user insights
   */
  async getUserInsights(userId: string): Promise<string[]> {
    return this.generateUserInsights(userId);
  }

  /**
   * Clear user data (for privacy compliance)
   */
  async clearUserData(userId: string): Promise<void> {
    try {
      // Remove user preferences
      await this.prisma.userPreference.deleteMany({
        where: { userId },
      });

      // Remove user-specific memories
      await this.prisma.memory.deleteMany({
        where: { userId },
      });

      // Remove from in-memory cache
      this.userProfiles.delete(userId);

      console.log(`Cleared all data for user: ${userId}`);
    } catch (error) {
      console.error("Error clearing user data:", error);
      throw error;
    }
  }
}
