import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const workspaceController = {
  async getWorkspaces() {
    try {
      const workspaces = await prisma.workspace.findMany({
        orderBy: { createdAt: 'desc' }
      });
      
      return { workspaces, success: true };
    } catch (error) {
      return { 
        workspaces: [], 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  },

  async createWorkspace({ name }: { name: string }) {
    try {
      const workspace = await prisma.workspace.create({
        data: { name }
      });
      
      return { workspace, success: true };
    } catch (error) {
      return { 
        workspace: null, 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  },

  async updateWorkspace({ id, name }: { id: number, name: string }) {
    try {
      const workspace = await prisma.workspace.update({
        where: { id },
        data: { name }
      });
      
      return { workspace, success: true };
    } catch (error) {
      return { 
        workspace: null, 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  },

  async deleteWorkspace({ id }: { id: number }) {
    try {
      await prisma.workspace.delete({
        where: { id }
      });
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
};
