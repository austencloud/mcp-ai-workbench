// Frontend Reasoning Service
// Provides interface to the reasoning system

import { mcp } from './mcp';

export interface ReasoningQuery {
  problem: string;
  context?: string;
  type?: ReasoningType;
  maxSteps?: number;
  enabledTools?: string[];
  requireExplanation?: boolean;
  confidenceThreshold?: number;
}

export interface ReasoningStep {
  stepNumber: number;
  description: string;
  toolUsed?: string;
  toolInput?: any;
  toolOutput?: any;
  reasoning: string;
  confidence: number;
  duration?: number;
  errors?: string[];
}

export interface ReasoningTrace {
  problemId: string;
  steps: ReasoningStep[];
  finalAnswer: string;
  reasoning: string;
  toolsUsed: string[];
  success: boolean;
  confidence: number;
  duration: number;
  errors?: string[];
  metadata: any;
  createdAt: Date;
}

export interface ReasoningResponse {
  trace: ReasoningTrace;
  success: boolean;
  error?: string;
  suggestions?: string[];
  relatedProblems?: any[];
}

export enum ReasoningType {
  LOGICAL = 'logical',
  CAUSAL = 'causal',
  ANALOGICAL = 'analogical',
  MATHEMATICAL = 'mathematical',
  SCIENTIFIC = 'scientific',
  COMMONSENSE = 'commonsense',
  MULTI_HOP = 'multi_hop',
  TEMPORAL = 'temporal',
  SPATIAL = 'spatial',
  ETHICAL = 'ethical',
  WEB_RESEARCH = 'web_research',
  MEMORY_RECALL = 'memory_recall'
}

export interface TrainingExample {
  id: string;
  input: string;
  output: string;
  reasoning: ReasoningTrace;
  quality: number;
  verified: boolean;
  source: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export class ReasoningService {
  
  /**
   * Perform reasoning on a given problem
   */
  async reason(query: ReasoningQuery): Promise<ReasoningResponse> {
    try {
      const response = await mcp.call('reasoning.reason', query);
      return response;
    } catch (error) {
      console.error('Reasoning failed:', error);
      throw error;
    }
  }

  /**
   * Get available reasoning types
   */
  async getReasoningTypes(): Promise<ReasoningType[]> {
    try {
      const response = await mcp.call('reasoning.getTypes');
      return response.types || [];
    } catch (error) {
      console.error('Failed to get reasoning types:', error);
      return [];
    }
  }

  /**
   * Generate training data for reasoning models
   */
  async generateTrainingData(params: {
    count: number;
    types?: ReasoningType[];
    config?: any;
  }): Promise<TrainingExample[]> {
    try {
      const response = await mcp.call('reasoning.generateTrainingData', params);
      return response.examples || [];
    } catch (error) {
      console.error('Failed to generate training data:', error);
      return [];
    }
  }

  /**
   * Validate a reasoning trace
   */
  async validateTrace(params: {
    traceId: string;
    expectedAnswer?: string;
    humanFeedback?: string;
  }): Promise<{ valid: boolean; score: number; feedback: string }> {
    try {
      const response = await mcp.call('reasoning.validateTrace', params);
      return {
        valid: response.valid || false,
        score: response.score || 0,
        feedback: response.feedback || 'No feedback available'
      };
    } catch (error) {
      console.error('Failed to validate trace:', error);
      return { valid: false, score: 0, feedback: 'Validation failed' };
    }
  }

  /**
   * Get reasoning statistics
   */
  async getStats(): Promise<{
    totalQueries: number;
    averageConfidence: number;
    successRate: number;
    popularTools: string[];
    commonTypes: ReasoningType[];
  }> {
    try {
      const response = await mcp.call('reasoning.getStats');
      return {
        totalQueries: response.totalQueries || 0,
        averageConfidence: response.averageConfidence || 0,
        successRate: response.successRate || 0,
        popularTools: response.popularTools || [],
        commonTypes: response.commonTypes || []
      };
    } catch (error) {
      console.error('Failed to get reasoning stats:', error);
      return {
        totalQueries: 0,
        averageConfidence: 0,
        successRate: 0,
        popularTools: [],
        commonTypes: []
      };
    }
  }

  /**
   * Start a training session
   */
  async startTraining(params: {
    modelName: string;
    trainingExamples: TrainingExample[];
    config?: any;
  }): Promise<{ sessionId: string; status: string }> {
    try {
      const response = await mcp.call('reasoning.startTraining', params);
      return {
        sessionId: response.sessionId || '',
        status: response.status || 'unknown'
      };
    } catch (error) {
      console.error('Failed to start training:', error);
      return { sessionId: '', status: 'failed' };
    }
  }

  /**
   * Get training status
   */
  async getTrainingStatus(sessionId: string): Promise<{
    status: string;
    progress: number;
    currentEpoch?: number;
    totalEpochs?: number;
    metrics?: any;
  }> {
    try {
      const response = await mcp.call('reasoning.getTrainingStatus', { sessionId });
      return {
        status: response.status || 'unknown',
        progress: response.progress || 0,
        currentEpoch: response.currentEpoch,
        totalEpochs: response.totalEpochs,
        metrics: response.metrics
      };
    } catch (error) {
      console.error('Failed to get training status:', error);
      return { status: 'error', progress: 0 };
    }
  }

  /**
   * Export training data
   */
  async exportTrainingData(params: {
    format: 'json' | 'jsonl' | 'csv';
    types?: ReasoningType[];
    minQuality?: number;
  }): Promise<{ data: string; filename: string }> {
    try {
      const response = await mcp.call('reasoning.exportTrainingData', params);
      return {
        data: response.data || '',
        filename: response.filename || 'export.json'
      };
    } catch (error) {
      console.error('Failed to export training data:', error);
      return { data: '', filename: 'export.json' };
    }
  }

  /**
   * Chat with reasoning mode enabled
   */
  async chatWithReasoning(message: string, context?: string): Promise<{
    response: string;
    reasoning?: ReasoningTrace;
    success: boolean;
  }> {
    try {
      const response = await mcp.call('chat', {
        messages: [{ role: 'user', content: message }],
        reasoningMode: true,
        enableWebSearch: true
      });

      return {
        response: response.message?.content || 'No response',
        reasoning: response.reasoning,
        success: response.success || false
      };
    } catch (error) {
      console.error('Reasoning chat failed:', error);
      return {
        response: 'Failed to process reasoning request',
        success: false
      };
    }
  }

  /**
   * Analyze reasoning quality
   */
  analyzeReasoningQuality(trace: ReasoningTrace): {
    score: number;
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
  } {
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const suggestions: string[] = [];

    // Analyze confidence
    if (trace.confidence > 0.8) {
      strengths.push('High confidence in reasoning');
    } else if (trace.confidence < 0.5) {
      weaknesses.push('Low confidence in reasoning');
      suggestions.push('Consider gathering more information or using additional tools');
    }

    // Analyze tool usage
    if (trace.toolsUsed.length > 0) {
      strengths.push(`Effectively used ${trace.toolsUsed.length} tools`);
    } else {
      weaknesses.push('No tools were used');
      suggestions.push('Consider using web search or memory recall for better results');
    }

    // Analyze step count
    if (trace.steps.length >= 3) {
      strengths.push('Thorough step-by-step reasoning');
    } else {
      weaknesses.push('Limited reasoning steps');
      suggestions.push('Break down the problem into more detailed steps');
    }

    // Analyze errors
    const hasErrors = trace.steps.some(step => step.errors && step.errors.length > 0);
    if (hasErrors) {
      weaknesses.push('Some reasoning steps encountered errors');
      suggestions.push('Review and retry failed reasoning steps');
    }

    // Calculate overall score
    let score = trace.confidence;
    if (trace.toolsUsed.length > 0) score += 0.1;
    if (trace.steps.length >= 3) score += 0.1;
    if (!hasErrors) score += 0.1;
    score = Math.min(1.0, score);

    return { score, strengths, weaknesses, suggestions };
  }

  /**
   * Format reasoning trace for display
   */
  formatReasoningTrace(trace: ReasoningTrace): string {
    let formatted = `🧠 Reasoning Trace (${trace.problemId})\n\n`;
    formatted += `📊 Confidence: ${(trace.confidence * 100).toFixed(1)}%\n`;
    formatted += `⏱️ Duration: ${trace.duration}ms\n`;
    formatted += `🔧 Tools Used: ${trace.toolsUsed.join(', ') || 'None'}\n\n`;

    formatted += `📝 Steps:\n`;
    trace.steps.forEach(step => {
      formatted += `${step.stepNumber}. ${step.description}\n`;
      if (step.toolUsed) {
        formatted += `   🔧 Tool: ${step.toolUsed}\n`;
      }
      formatted += `   💭 Reasoning: ${step.reasoning}\n`;
      formatted += `   📊 Confidence: ${(step.confidence * 100).toFixed(1)}%\n`;
      if (step.errors && step.errors.length > 0) {
        formatted += `   ❌ Errors: ${step.errors.join(', ')}\n`;
      }
      formatted += '\n';
    });

    formatted += `🎯 Final Answer:\n${trace.finalAnswer}\n`;

    return formatted;
  }
}

// Export singleton instance
export const reasoningService = new ReasoningService();
