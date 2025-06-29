import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const conversationController = {
  async getConversations({ workspaceId }: { workspaceId: number }) {
    try {
      const conversations = await prisma.conversation.findMany({
        where: { workspaceId },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
            take: 1, // Just get the first message for preview
          },
        },
        orderBy: { updatedAt: "desc" },
      });

      return { conversations, success: true };
    } catch (error) {
      return {
        conversations: [],
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },

  async createConversation({
    workspaceId,
    title,
  }: {
    workspaceId: number;
    title?: string;
  }) {
    try {
      const conversation = await prisma.conversation.create({
        data: {
          workspaceId,
          title: title || `Conversation ${new Date().toLocaleString()}`,
        },
        include: {
          messages: true,
        },
      });

      return { conversation, success: true };
    } catch (error) {
      return {
        conversation: null,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },

  async getConversation({ id }: { id: number }) {
    try {
      const conversation = await prisma.conversation.findUnique({
        where: { id },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
          },
        },
      });

      if (!conversation) {
        return {
          conversation: null,
          success: false,
          error: "Conversation not found",
        };
      }

      return { conversation, success: true };
    } catch (error) {
      return {
        conversation: null,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },

  async addMessage({
    conversationId,
    message,
  }: {
    conversationId: string;
    message: { role: string; content: string };
  }) {
    try {
      const messageRecord = await prisma.message.create({
        data: {
          conversationId: parseInt(conversationId),
          role: message.role,
          content: message.content,
        },
      });

      await prisma.conversation.update({
        where: { id: parseInt(conversationId) },
        data: { updatedAt: new Date() },
      });

      return { message: messageRecord, success: true };
    } catch (error) {
      return {
        message: null,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },

  async deleteConversation({ id }: { id: number }) {
    try {
      await prisma.conversation.delete({
        where: { id },
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },

  async updateConversationTitle({ id, title }: { id: number; title: string }) {
    try {
      const conversation = await prisma.conversation.update({
        where: { id },
        data: { title },
      });

      return { conversation, success: true };
    } catch (error) {
      return {
        conversation: null,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
};
