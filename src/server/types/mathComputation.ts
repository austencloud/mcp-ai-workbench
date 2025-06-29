/**
 * Mathematical Computation Type Definitions for MCP AI Workbench
 * Comprehensive interfaces for mathematical operations and results
 */

export interface MathQuery {
  expression: string;
  precision?: number;
  format?: 'decimal' | 'fraction' | 'scientific' | 'auto';
  context?: string;
}

export interface MathResult {
  query: string;
  result: string;
  approximateResult?: string;
  precision: number;
  method: ComputationMethod;
  operationType: MathOperationType;
  success: boolean;
  error?: string;
  metadata: MathMetadata;
  timestamp: Date;
}

export enum ComputationMethod {
  DECIMAL_JS = 'decimal.js',
  MATH_JS = 'math.js',
  BIGNUMBER_JS = 'bignumber.js',
  NATIVE_JS = 'native.js',
  WOLFRAM_ALPHA = 'wolfram.alpha'
}

export enum MathOperationType {
  ARITHMETIC = 'arithmetic',
  SQUARE_ROOT = 'square_root',
  POWER = 'power',
  LOGARITHM = 'logarithm',
  TRIGONOMETRY = 'trigonometry',
  ALGEBRA = 'algebra',
  CALCULUS = 'calculus',
  STATISTICS = 'statistics',
  COMPLEX = 'complex',
  MATRIX = 'matrix',
  UNKNOWN = 'unknown'
}

export interface MathMetadata {
  inputType: string;
  outputType: string;
  complexity: 'simple' | 'moderate' | 'complex';
  executionTime: number;
  memoryUsage?: number;
  fallbackUsed: boolean;
  verificationMethod?: string;
  confidence: number; // 0-1 scale
}

export interface MathComputationOptions {
  enableHighPrecision?: boolean;
  maxPrecision?: number;
  enableFallback?: boolean;
  enableVerification?: boolean;
  timeout?: number;
}

export interface MathMemoryOperation {
  messageIndex: number;
  operation: 'mathComputation';
  query: string;
  result: string;
  method: ComputationMethod;
  operationType: MathOperationType;
  precision: number;
  success: boolean;
  error?: string;
  timestamp: Date;
  executionTime: number;
}

export interface WolframAlphaResult {
  success: boolean;
  result?: string;
  error?: string;
  confidence?: number;
}
