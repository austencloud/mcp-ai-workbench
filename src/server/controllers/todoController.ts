import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const todoController = {
  async getTodos({ workspace }: { workspace?: string } = {}) {
    try {
      const where = workspace ? { workspace } : {};
      const todos = await prisma.todo.findMany({
        where,
        orderBy: { createdAt: 'desc' }
      });
      
      return { todos, success: true };
    } catch (error) {
      return { 
        todos: [], 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  },

  async createTodo({ text, workspace }: { text: string, workspace: string }) {
    try {
      const todo = await prisma.todo.create({
        data: { text, workspace }
      });
      
      return { todo, success: true };
    } catch (error) {
      return { 
        todo: null, 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  },

  async updateTodo({ id, done, text }: { id: number, done?: boolean, text?: string }) {
    try {
      const updateData: any = {};
      if (done !== undefined) updateData.done = done;
      if (text !== undefined) updateData.text = text;
      
      const todo = await prisma.todo.update({
        where: { id },
        data: updateData
      });
      
      return { todo, success: true };
    } catch (error) {
      return { 
        todo: null, 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  },

  async deleteTodo({ id }: { id: number }) {
    try {
      await prisma.todo.delete({
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
