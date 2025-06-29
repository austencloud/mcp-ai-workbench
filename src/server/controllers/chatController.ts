import { PrismaClient } from "@prisma/client";
import {
  AIProviderService,
  type ChatMessage,
} from "../services/aiProviderService";
import { ReasoningEngine } from "../reasoning/reasoningEngine";
import { memoryControllerMethods } from "./memoryController";
import { isMemoryEnabled } from "../config/memoryConfig";

const prisma = new PrismaClient();
const aiService = new AIProviderService();
const reasoningEngine = new ReasoningEngine();

interface ChatParams {
  messages: ChatMessage[];
  workspace?: number;
  conversationId?: number;
  provider?: string;
  model?: string;
  stream?: boolean;
  enableWebSearch?: boolean;
  reasoningMode?: boolean;
}

export const chatController = {
  async chat({
    messages,
    workspace,
    conversationId,
    provider,
    model,
    stream = false,
    enableWebSearch = true,
    reasoningMode = false,
  }: ChatParams) {
    const chatStartTime = performance.now();
    console.log(
      `🚀 [CHAT] Starting chat request - Provider: ${
        provider || "default"
      }, Model: ${model || "default"}`
    );

    try {
      // Check if reasoning mode is enabled
      if (reasoningMode) {
        console.log("🧠 Reasoning mode enabled for chat");

        const lastMessage = messages[messages.length - 1];
        if (lastMessage.role === "user") {
          const reasoningStartTime = performance.now();
          const reasoningResponse = await reasoningEngine.reason({
            problem: lastMessage.content,
            context: workspace ? `Workspace ${workspace}` : undefined,
            requireExplanation: true,
          });
          const reasoningDuration = performance.now() - reasoningStartTime;
          console.log(
            `🧠 [CHAT] Reasoning completed in ${reasoningDuration.toFixed(2)}ms`
          );

          return {
            message: {
              role: "assistant",
              content: reasoningResponse.trace.finalAnswer,
            },
            success: reasoningResponse.success,
            reasoning: reasoningResponse.trace,
            provider: "reasoning-engine",
            model: "reasoning-v1",
          };
        }
      }

      // Add system context if workspace is provided
      const contextualMessages = [...messages];
      let memoryContext = "";

      // MEMORY INTEGRATION - BEFORE AI call
      if (isMemoryEnabled() && conversationId) {
        const userMessage = messages[messages.length - 1];

        try {
          // 1. Store user message in conversation memory
          await memoryControllerMethods.addConversationMessage({
            conversationId: conversationId.toString(),
            role: userMessage.role,
            content: userMessage.content,
            timestamp: new Date(),
          });

          // 2. Retrieve relevant memories for context
          const memoryResult = await memoryControllerMethods.recall({
            query: userMessage.content,
            context: {
              conversationId: conversationId.toString(),
              workspaceId: workspace?.toString(),
              timestamp: new Date(),
              relevantEntities: [],
            },
            maxResults: 5,
          });

          if (memoryResult.success && memoryResult.data?.memories?.length > 0) {
            memoryContext = `\n\nRelevant memories:\n${memoryResult.data.memories
              .map(
                (m: any) =>
                  `- ${m.type}: ${m.content} (importance: ${m.importance})`
              )
              .join("\n")}`;
          }
        } catch (memoryError) {
          console.warn("Memory retrieval failed:", memoryError);
        }
      }

      if (workspace) {
        contextualMessages.unshift({
          role: "system",
          content: `You are an AI assistant helping with workspace ${workspace}. Be helpful, concise, and professional.${memoryContext}`,
        });
      }

      // Call AI service with provider selection and performance monitoring
      const aiStartTime = performance.now();
      const aiResponse = await aiService.chat(contextualMessages, {
        provider,
        model,
        conversationId,
        enableWebSearch,
      });
      const aiDuration = performance.now() - aiStartTime;
      console.log(
        `🤖 [CHAT] AI service completed in ${aiDuration.toFixed(2)}ms`
      );

      if (!aiResponse.success) {
        return aiResponse;
      }

      // Save conversation if conversationId is provided (async to not block response)
      if (conversationId) {
        // Use setImmediate to defer database operations and not block the response
        setImmediate(async () => {
          try {
            const dbStartTime = performance.now();

            // Save user message
            const userMessage = messages[messages.length - 1];
            if (userMessage && userMessage.role === "user") {
              await prisma.message.create({
                data: {
                  conversationId,
                  role: userMessage.role,
                  content: userMessage.content,
                },
              });
            }

            // Save assistant response
            await prisma.message.create({
              data: {
                conversationId,
                role: aiResponse.message.role,
                content: aiResponse.message.content,
              },
            });

            // MEMORY INTEGRATION - AFTER AI response
            if (isMemoryEnabled()) {
              try {
                // Store AI response in conversation memory
                await memoryControllerMethods.addConversationMessage({
                  conversationId: conversationId.toString(),
                  role: aiResponse.message.role,
                  content: aiResponse.message.content,
                  timestamp: new Date(),
                });

                // Extract and store important information as long-term memories
                await extractAndStoreMemories(
                  aiResponse.message.content,
                  conversationId.toString(),
                  workspace?.toString()
                );
              } catch (memoryError) {
                console.warn("Memory storage failed:", memoryError);
              }
            }

            // Update conversation timestamp
            await prisma.conversation.update({
              where: { id: conversationId },
              data: { updatedAt: new Date() },
            });

            const dbDuration = performance.now() - dbStartTime;
            console.log(
              `💾 [CHAT] Database storage completed in ${dbDuration.toFixed(
                2
              )}ms (async)`
            );
          } catch (dbError) {
            console.error("Failed to save conversation:", dbError);
            // Continue anyway, don't fail the chat
          }
        });
      }

      const totalDuration = performance.now() - chatStartTime;
      console.log(
        `✅ [CHAT] Total request completed in ${totalDuration.toFixed(2)}ms`
      );

      return {
        ...aiResponse,
        success: true,
      };
    } catch (error) {
      const totalDuration = performance.now() - chatStartTime;
      console.error(
        `❌ [CHAT] Chat failed after ${totalDuration.toFixed(2)}ms:`,
        error
      );

      return {
        message: {
          role: "assistant",
          content:
            "❌ I encountered an error while processing your request. Please try again in a moment.",
        },
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },

  async getAvailableProviders() {
    try {
      const providers = await aiService.getAvailableProviders();
      return { providers, success: true };
    } catch (error) {
      return {
        providers: [],
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },

  async refreshOllamaModels() {
    try {
      await aiService.refreshOllamaModels();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },

  async getSavedPreferences() {
    try {
      const preferences = aiService.getSavedPreferences();
      return { preferences, success: true };
    } catch (error) {
      return {
        preferences: { provider: null, model: null },
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },

  async saveProviderPreference(params: { provider: string; model?: string }) {
    try {
      const aiServiceInstance = aiService as any;
      aiServiceInstance.saveProviderPreference(params.provider, params.model);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },

  async streamChat({ messages, workspace }: ChatParams) {
    // TODO: Implement streaming chat for real-time responses
    // This will be implemented in Phase 2
    return this.chat({ messages, workspace, stream: false });
  },
};

// Memory extraction function for AI responses
async function extractAndStoreMemories(
  content: string,
  conversationId: string,
  workspaceId?: string
) {
  // Simple keyword-based memory extraction
  const memoryTriggers = [
    { pattern: /I (like|prefer|enjoy|love|hate|dislike)/i, type: "PREFERENCE" },
    { pattern: /My name is (\w+)/i, type: "FACT" },
    { pattern: /I work (at|for) (.+)/i, type: "FACT" },
    { pattern: /I am (a|an) (.+)/i, type: "FACT" },
    { pattern: /Remember that (.+)/i, type: "FACT" },
    { pattern: /Important: (.+)/i, type: "FACT" },
    { pattern: /Note: (.+)/i, type: "OBSERVATION" },
    { pattern: /Let me save this: (.+)/i, type: "KNOWLEDGE" },
  ];

  for (const trigger of memoryTriggers) {
    const match = content.match(trigger.pattern);
    if (match) {
      try {
        await memoryControllerMethods.remember({
          input: match[0],
          type: trigger.type as any,
          context: {
            conversationId,
            workspaceId,
            timestamp: new Date(),
            relevantEntities: [],
            trigger: "ai_response_extraction",
          },
          importance: 0.7,
        });
      } catch (error) {
        console.warn("Failed to store extracted memory:", error);
      }
    }
  }
}
