import { PrismaClient } from "@prisma/client";
import {
  AIProviderService,
  type ChatMessage,
} from "../services/aiProviderService";

const prisma = new PrismaClient();
const aiService = new AIProviderService();

interface ChatParams {
  messages: ChatMessage[];
  workspace?: number;
  conversationId?: number;
  provider?: string;
  model?: string;
  stream?: boolean;
  enableWebSearch?: boolean;
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
  }: ChatParams) {
    try {
      // Add system context if workspace is provided
      const contextualMessages = [...messages];
      if (workspace) {
        contextualMessages.unshift({
          role: "system",
          content: `You are an AI assistant helping with workspace ${workspace}. Be helpful, concise, and professional.`,
        });
      }

      // Call AI service with provider selection
      const aiResponse = await aiService.chat(contextualMessages, {
        provider,
        model,
        conversationId,
        enableWebSearch,
      });

      if (!aiResponse.success) {
        return aiResponse;
      }

      // Save conversation if conversationId is provided
      if (conversationId) {
        try {
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

          // Update conversation timestamp
          await prisma.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() },
          });
        } catch (dbError) {
          console.error("Failed to save conversation:", dbError);
          // Continue anyway, don't fail the chat
        }
      }

      return {
        ...aiResponse,
        success: true,
      };
    } catch (error) {
      console.error("Chat error:", error);

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

  async streamChat({ messages, workspace }: ChatParams) {
    // TODO: Implement streaming chat for real-time responses
    // This will be implemented in Phase 2
    return this.chat({ messages, workspace, stream: false });
  },
};
