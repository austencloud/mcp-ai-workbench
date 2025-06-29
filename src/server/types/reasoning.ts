// Reasoning System Type Definitions
// Core types for reasoning model training and execution

export interface ReasoningProblem {
  id: string;
  type: ReasoningType;
  difficulty: number; // 1-10 scale
  context: string;
  question: string;
  requiredTools: string[];
  expectedSteps: ReasoningStep[];
  groundTruth: string;
  metadata: ReasoningMetadata;
  createdAt: Date;
  updatedAt: Date;
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
  metadata: ReasoningTraceMetadata;
  createdAt: Date;
}

export interface ReasoningTraceMetadata {
  userId?: string;
  conversationId?: string;
  workspaceId?: string;
  modelUsed: string;
  providerUsed: string;
  totalTokens?: number;
  cost?: number;
}

export interface TrainingExample {
  id: string;
  input: string;
  output: string;
  reasoning: ReasoningTrace;
  quality: number; // 0-1 score
  verified: boolean;
  source: 'synthetic' | 'human' | 'tool_generated' | 'web_generated';
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ReasoningModel {
  id: string;
  name: string;
  baseModel: string;
  capabilities: ReasoningType[];
  trainingData: TrainingStats;
  performance: PerformanceMetrics;
  lastTrained: Date;
  version: string;
  isActive: boolean;
  config: ModelConfig;
}

export interface TrainingStats {
  totalExamples: number;
  examplesByType: Record<ReasoningType, number>;
  averageQuality: number;
  trainingDuration: number;
  epochs: number;
  lastTrainingDate: Date;
}

export interface PerformanceMetrics {
  overallAccuracy: number;
  accuracyByType: Record<ReasoningType, number>;
  averageSteps: number;
  toolUsageEfficiency: number;
  reasoningQuality: number;
  averageResponseTime: number;
  successRate: number;
}

export interface ModelConfig {
  maxSteps: number;
  confidenceThreshold: number;
  enabledTools: string[];
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
}

export interface ReasoningMetadata {
  difficulty: number;
  estimatedTime: number;
  requiredKnowledge: string[];
  tags: string[];
  source: string;
  verified: boolean;
}

export interface ReasoningQuery {
  problem: string;
  context?: string;
  type?: ReasoningType;
  maxSteps?: number;
  enabledTools?: string[];
  requireExplanation?: boolean;
  confidenceThreshold?: number;
}

export interface ReasoningResponse {
  trace: ReasoningTrace;
  success: boolean;
  error?: string;
  suggestions?: string[];
  relatedProblems?: ReasoningProblem[];
}

export interface TrainingProgress {
  epoch: number;
  accuracy: number;
  reasoningQuality: number;
  toolUsageScore: number;
  improvementRate: number;
  weakAreas: ReasoningType[];
  trainingLoss: number;
  validationLoss: number;
  timestamp: Date;
}

export interface SyntheticDataConfig {
  maxProblemsPerType: number;
  difficultyRange: [number, number];
  enableWebGeneration: boolean;
  enableMemoryGeneration: boolean;
  qualityThreshold: number;
  verificationRequired: boolean;
}

export interface ReasoningStrategy {
  name: string;
  type: ReasoningType;
  steps: string[];
  tools: string[];
  confidence: number;
  applicableContexts: string[];
}

// Tool integration interfaces
export interface ToolCall {
  tool: string;
  input: any;
  output: any;
  success: boolean;
  duration: number;
  error?: string;
}

export interface ReasoningContext {
  conversationHistory?: any[];
  webSearchResults?: any[];
  memoryRecalls?: any[];
  previousSteps?: ReasoningStep[];
  userPreferences?: any;
  workspaceContext?: any;
}
