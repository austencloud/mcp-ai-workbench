import { PrismaClient } from '@prisma/client';
import { promises as fs } from 'fs';
import path from 'path';

const prisma = new PrismaClient();

export const workspaceFileController = {
  async getWorkspaceFiles({ workspaceId }: { workspaceId: number }) {
    try {
      const files = await prisma.workspaceFile.findMany({
        where: { workspaceId },
        orderBy: { createdAt: 'desc' }
      });
      
      return { files, success: true };
    } catch (error) {
      return { 
        files: [], 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  },

  async addFileToWorkspace({ 
    workspaceId, 
    filePath, 
    fileName 
  }: { 
    workspaceId: number, 
    filePath: string, 
    fileName: string 
  }) {
    try {
      // Get file size
      let fileSize = 0;
      try {
        const stats = await fs.stat(filePath);
        fileSize = stats.size;
      } catch (error) {
        // File might not exist, continue anyway
      }

      const file = await prisma.workspaceFile.upsert({
        where: {
          workspaceId_filePath: {
            workspaceId,
            filePath
          }
        },
        update: {
          fileName,
          fileSize,
          updatedAt: new Date()
        },
        create: {
          workspaceId,
          filePath,
          fileName,
          fileSize
        }
      });
      
      return { file, success: true };
    } catch (error) {
      return { 
        file: null, 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  },

  async removeFileFromWorkspace({ 
    workspaceId, 
    filePath 
  }: { 
    workspaceId: number, 
    filePath: string 
  }) {
    try {
      await prisma.workspaceFile.delete({
        where: {
          workspaceId_filePath: {
            workspaceId,
            filePath
          }
        }
      });
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  },

  async getWorkspaceFileContent({ 
    workspaceId, 
    filePath,
    start,
    end 
  }: { 
    workspaceId: number, 
    filePath: string,
    start?: number,
    end?: number 
  }) {
    try {
      // Verify file belongs to workspace
      const workspaceFile = await prisma.workspaceFile.findUnique({
        where: {
          workspaceId_filePath: {
            workspaceId,
            filePath
          }
        }
      });

      if (!workspaceFile) {
        return {
          text: '',
          success: false,
          error: 'File not found in workspace'
        };
      }

      // Read file content
      let text = await fs.readFile(filePath, 'utf-8');
      
      if (start != null || end != null) {
        const lines = text.split('\n');
        const startLine = start ?? 0;
        const endLine = end ?? lines.length;
        text = lines.slice(startLine, endLine).join('\n');
      }
      
      return { text, success: true };
    } catch (error) {
      return { 
        text: '', 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
};
