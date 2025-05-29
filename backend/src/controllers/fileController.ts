import { promises as fs } from 'fs';
import path from 'path';

export const fileController = {
  async readFile({ path: filePath, start, end }: { path: string, start?: number, end?: number }) {
    try {
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
  },

  async listFiles({ dir }: { dir: string }) {
    try {
      const files = await fs.readdir(dir);
      const fileStats = await Promise.all(
        files.map(async (file) => {
          const filePath = path.join(dir, file);
          const stats = await fs.stat(filePath);
          return {
            name: file,
            path: filePath,
            isDirectory: stats.isDirectory(),
            size: stats.size,
            modified: stats.mtime
          };
        })
      );
      
      return { files: fileStats, success: true };
    } catch (error) {
      return { 
        files: [], 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
};
