/**
 * Mathematical Computation Service for MCP AI Workbench
 * High-precision mathematical calculations with multiple computation engines
 */

import { Decimal } from "decimal.js";
import { BigNumber } from "bignumber.js";
import { evaluate, parse, format } from "mathjs";
import {
  MathQuery,
  MathResult,
  ComputationMethod,
  MathOperationType,
  MathMetadata,
  MathComputationOptions,
  WolframAlphaResult,
} from "../types/mathComputation";

export class MathComputationService {
  private defaultOptions: MathComputationOptions = {
    enableHighPrecision: true,
    maxPrecision: 50,
    enableFallback: true,
    enableVerification: false,
    timeout: 5000,
  };

  private aiService: any;

  constructor(options?: Partial<MathComputationOptions>, aiService?: any) {
    this.defaultOptions = { ...this.defaultOptions, ...options };
    this.aiService = aiService;

    // Configure Decimal.js for high precision
    Decimal.set({
      precision: this.defaultOptions.maxPrecision || 50,
      rounding: Decimal.ROUND_HALF_UP,
      toExpNeg: -7,
      toExpPos: 21,
    });

    // Configure BigNumber.js
    BigNumber.config({
      DECIMAL_PLACES: this.defaultOptions.maxPrecision || 50,
      ROUNDING_MODE: BigNumber.ROUND_HALF_UP,
    });
  }

  /**
   * Main computation method - detects math queries and computes results
   */
  async compute(
    query: MathQuery,
    options?: Partial<MathComputationOptions>
  ): Promise<MathResult> {
    const startTime = Date.now();
    const computeOptions = { ...this.defaultOptions, ...options };

    try {
      // Fast path for super simple expressions (e.g., "2 + 2", "10 / 5")
      const fastResult = this.tryFastComputation(query.expression);
      if (fastResult !== null) {
        const executionTime = Date.now() - startTime;
        console.log(
          `[Math] Fast computation: "${query.expression}" = ${fastResult} (${executionTime}ms)`
        );

        return {
          query: query.expression,
          result: fastResult,
          precision: this.detectPrecision(fastResult),
          method: ComputationMethod.NATIVE_JS,
          operationType: MathOperationType.ARITHMETIC,
          success: true,
          metadata: {
            inputType: "simple_arithmetic",
            outputType: this.detectOutputType(fastResult),
            complexity: "simple",
            executionTime,
            fallbackUsed: false,
            confidence: 1.0,
          },
          timestamp: new Date(),
        };
      }

      // Detect operation type
      const operationType = this.detectOperationType(query.expression);

      // Choose best computation method
      const method = this.selectComputationMethod(
        operationType,
        query.expression
      );

      // Perform computation
      let result: string;
      let approximateResult: string | undefined;
      let fallbackUsed = false;

      try {
        result = await this.performComputation(
          query.expression,
          method,
          computeOptions
        );

        // Generate approximate result if high precision
        if (
          method !== ComputationMethod.NATIVE_JS &&
          computeOptions.enableHighPrecision
        ) {
          approximateResult = this.generateApproximateResult(result);
        }
      } catch (error) {
        if (computeOptions.enableFallback) {
          console.log(
            `[Math] Primary method ${method} failed, trying fallback`
          );
          result = await this.performFallbackComputation(query.expression);
          fallbackUsed = true;
        } else {
          throw error;
        }
      }

      const executionTime = Date.now() - startTime;

      // Create metadata
      const metadata: MathMetadata = {
        inputType: this.detectInputType(query.expression),
        outputType: this.detectOutputType(result),
        complexity: this.assessComplexity(query.expression),
        executionTime,
        fallbackUsed,
        confidence: fallbackUsed ? 0.8 : 0.95,
      };

      return {
        query: query.expression,
        result,
        approximateResult,
        precision: this.detectPrecision(result),
        method,
        operationType,
        success: true,
        metadata,
        timestamp: new Date(),
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;

      return {
        query: query.expression,
        result: "",
        precision: 0,
        method: ComputationMethod.NATIVE_JS,
        operationType: MathOperationType.UNKNOWN,
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown computation error",
        metadata: {
          inputType: "unknown",
          outputType: "error",
          complexity: "unknown" as any,
          executionTime,
          fallbackUsed: false,
          confidence: 0,
        },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Try to compute very simple expressions using fast native JavaScript
   * Returns null if the expression is too complex for fast computation
   */
  private tryFastComputation(expression: string): string | null {
    try {
      // Normalize the expression quickly
      const normalized = this.normalizeExpression(expression);
      console.log(
        `[Math] Fast computation check: "${expression}" → "${normalized}"`
      );

      // Only handle very simple arithmetic: single operation with two numbers
      // Allow for spaces around operators since normalization might leave them
      const simpleArithmeticPattern =
        /^(\d+(?:\.\d+)?)\s*([\+\-\*\/])\s*(\d+(?:\.\d+)?)$/;
      const match = normalized.match(simpleArithmeticPattern);

      if (!match) {
        console.log(
          `[Math] Fast computation: pattern didn't match, falling back to complex computation`
        );
        return null; // Too complex for fast computation
      }

      const [, num1Str, operator, num2Str] = match;
      const num1 = parseFloat(num1Str);
      const num2 = parseFloat(num2Str);

      // Validate numbers
      if (!isFinite(num1) || !isFinite(num2)) {
        return null;
      }

      // Perform the operation
      let result: number;
      switch (operator) {
        case "+":
          result = num1 + num2;
          break;
        case "-":
          result = num1 - num2;
          break;
        case "*":
          result = num1 * num2;
          break;
        case "/":
          if (num2 === 0) {
            return null; // Division by zero, let complex computation handle it
          }
          result = num1 / num2;
          break;
        default:
          return null;
      }

      // Validate result
      if (!isFinite(result)) {
        return null;
      }

      // Return result as string, removing unnecessary decimals
      return result % 1 === 0 ? result.toString() : result.toString();
    } catch (error) {
      return null; // Any error means we should use complex computation
    }
  }

  /**
   * Detect if a message contains mathematical expressions
   */
  isMathQuery(message: string): boolean {
    const cleanMessage = message
      .toLowerCase()
      .replace(/what is|what's|calculate|compute|find|solve|hey|please/g, "")
      .replace(/,(\d{3})/g, "$1")
      .trim();

    const mathPatterns = [
      // Basic arithmetic
      /\b\d+\s*[\+\-\*\/\^]\s*\d+/,
      /\b\d+\s*(?:plus|minus|times|divided\s+by|to\s+the\s+power\s+of)\s*\d+/i,

      // Decimal and percentage operations
      /\b\d+\.\d+\s*[\+\-\*\/\^]\s*\d+/,
      /\b\d+\s*%\s*(?:of|×|\*)\s*\d+/,
      /\b\d+\s*percent\s+of\s+\d+/i,

      // Square roots and powers
      /\bsqrt\s*\(\s*\d+\s*\)/i,
      /\b(?:square\s+root|sqrt)\s+of\s+\d+/i,
      /\b\d+\s*\^\s*\d+/,
      /\b\d+\s*\*\*\s*\d+/,
      /\b\d+\s*squared/i,
      /\b\d+\s*cubed/i,

      // Trigonometric and logarithmic functions
      /\b(?:sin|cos|tan|asin|acos|atan|log|ln)\s*\(/i,

      // Complex expressions
      /\b\d+\s*[\+\-\*\/]\s*\d+\s*[\+\-\*\/]\s*\d+/,
      /\(\s*\d+.*\d+\s*\)/,

      // Numbers with commas and special formats
      /\b\d{1,3}(?:,\d{3})*\s*[\+\-\*\/]\s*\d+/,
      /\b\d+\s*divided\s+by\s*\d+/i,
      /\b\d+\s*over\s*\d+/i,

      // Fractions and ratios
      /\b\d+\/\d+/,
      /\b\d+\s*:\s*\d+/,

      // Scientific notation
      /\b\d+(?:\.\d+)?e[+-]?\d+/i,

      // Advanced operations
      /\b(?:factorial|abs|absolute\s+value|ceiling|floor)\s*(?:of\s*)?\d+/i,
      /\b\d+\s*!/,

      // Word problems indicators
      /\bhow\s+much\s+is\s+\d+/i,
      /\bwhat\s+(?:is|equals)\s+\d+/i,
    ];

    const hasNumbers = /\d/.test(cleanMessage);
    const hasOperators =
      /[\+\-\*\/\^=]|plus|minus|times|divided|over|of|percent|sqrt|square|power|factorial/.test(
        cleanMessage
      );

    return (
      hasNumbers &&
      (mathPatterns.some((pattern) => pattern.test(cleanMessage)) ||
        hasOperators)
    );
  }

  /**
   * Detect the type of mathematical operation
   */
  private detectOperationType(expression: string): MathOperationType {
    const expr = expression.toLowerCase();

    if (/sqrt|square\s+root/.test(expr)) return MathOperationType.SQUARE_ROOT;
    if (/\^|\*\*|power/.test(expr)) return MathOperationType.POWER;
    if (/log|ln|logarithm/.test(expr)) return MathOperationType.LOGARITHM;
    if (/sin|cos|tan|asin|acos|atan/.test(expr))
      return MathOperationType.TRIGONOMETRY;
    if (/[\+\-\*\/]/.test(expr)) return MathOperationType.ARITHMETIC;

    return MathOperationType.UNKNOWN;
  }

  /**
   * Select the best computation method for the operation
   */
  private selectComputationMethod(
    operationType: MathOperationType,
    expression: string
  ): ComputationMethod {
    // For square roots and high precision needs, use Decimal.js
    if (operationType === MathOperationType.SQUARE_ROOT) {
      return ComputationMethod.DECIMAL_JS;
    }

    // For complex expressions, use Math.js
    if (
      expression.includes("(") ||
      expression.includes("sin") ||
      expression.includes("cos")
    ) {
      return ComputationMethod.MATH_JS;
    }

    // For large numbers, use BigNumber.js
    if (/\d{10,}/.test(expression)) {
      return ComputationMethod.BIGNUMBER_JS;
    }

    // Default to Decimal.js for precision
    return ComputationMethod.DECIMAL_JS;
  }

  /**
   * Perform computation using the specified method
   */
  private async performComputation(
    expression: string,
    method: ComputationMethod,
    options: MathComputationOptions
  ): Promise<string> {
    const normalizedExpr = await this.aiNormalizeExpression(expression);

    switch (method) {
      case ComputationMethod.DECIMAL_JS:
        return this.computeWithDecimal(normalizedExpr);

      case ComputationMethod.MATH_JS:
        return this.computeWithMathJS(normalizedExpr);

      case ComputationMethod.BIGNUMBER_JS:
        return this.computeWithBigNumber(normalizedExpr);

      case ComputationMethod.NATIVE_JS:
        return this.computeWithNativeJS(normalizedExpr);

      default:
        throw new Error(`Unsupported computation method: ${method}`);
    }
  }

  /**
   * AI-powered expression normalization for better parsing
   * Uses fast regex-based normalization for simple cases, AI only for complex expressions
   */
  private async aiNormalizeExpression(expression: string): Promise<string> {
    // Fast path: Use regex normalization for simple expressions
    const regexNormalized = this.normalizeExpression(expression);

    // Check if the expression is simple enough that regex normalization is sufficient
    const isSimpleExpression = this.isSimpleExpression(expression);

    if (isSimpleExpression || !this.aiService) {
      console.log(
        `[Math] Using fast regex normalization: "${expression}" → "${regexNormalized}"`
      );
      return regexNormalized;
    }

    // Only use AI for complex expressions that regex might not handle well
    try {
      console.log(
        `[Math] Using AI normalization for complex expression: "${expression}"`
      );

      const prompt = `Convert this natural language math expression to a clean mathematical expression that can be evaluated by JavaScript or Math.js.

Rules:
- Remove commas from numbers (10,000 → 10000)
- Convert words to operators (divided by → /, times → *, plus → +, minus → -)
- Convert "square root of X" to "sqrt(X)"
- Remove question words like "what's", "what is", "calculate"
- Keep parentheses for proper order of operations
- Return ONLY the mathematical expression, no explanation

Examples:
"What's 10,000 / 5" → "10000/5"
"Square root of 144" → "sqrt(144)"
"2 times 3 plus 4" → "2*3+4"
"(5 + 3) divided by 2" → "(5+3)/2"

Expression: "${expression}"
Normalized:`;

      const response = await this.aiService.generateResponse([
        { role: "user", content: prompt },
      ]);

      const normalized = response.trim().replace(/^["']|["']$/g, "");

      if (normalized && normalized.length > 0 && normalized !== expression) {
        console.log(`[Math] AI normalized "${expression}" → "${normalized}"`);
        return normalized;
      }
    } catch (error) {
      console.log(
        `[Math] AI normalization failed, using regex fallback: ${error}`
      );
    }

    return regexNormalized;
  }

  /**
   * Check if an expression is simple enough for regex-only normalization
   */
  private isSimpleExpression(expression: string): boolean {
    const cleaned = expression.toLowerCase().trim();

    // Simple patterns that regex can handle well
    const simplePatterns = [
      /^(what\s+is\s+|what's\s+)?[\d\s\+\-\*\/\(\)\.]+\??$/, // "what is 2 + 2?"
      /^(calculate\s+|compute\s+)?[\d\s\+\-\*\/\(\)\.]+\??$/, // "calculate 5 * 3"
      /^[\d\s\+\-\*\/\(\)\.]+\??$/, // "2 + 2"
      /^(what\s+is\s+|what's\s+)?\d+\s*[\+\-\*\/]\s*\d+\??$/, // "what is 10 / 5?"
    ];

    // Check if it matches any simple pattern
    const isSimple = simplePatterns.some((pattern) => pattern.test(cleaned));

    // Additional check: avoid AI for expressions with only basic operators and numbers
    const hasOnlyBasicElements = /^[what\s\+\-\*\/\(\)\d\.\?'s]+$/i.test(
      cleaned
    );
    const hasComplexWords =
      /\b(square\s+root|sqrt|factorial|percent|times|divided\s+by|plus|minus)\b/i.test(
        cleaned
      );

    return isSimple || (hasOnlyBasicElements && !hasComplexWords);
  }

  /**
   * AI-enhanced math query detection
   */
  async isMathQueryAI(message: string): Promise<boolean> {
    if (!this.aiService) {
      return this.isMathQuery(message);
    }

    try {
      const prompt = `Determine if this message contains a mathematical calculation request.

Answer with only "YES" or "NO".

Examples:
"What's 10,000 divided by 5" → YES
"Hello how are you" → NO
"Calculate the square root of 144" → YES
"I like math" → NO
"What is 2 + 2" → YES
"How much is 15% of 200" → YES

Message: "${message}"
Answer:`;

      const response = await this.aiService.generateResponse([
        { role: "user", content: prompt },
      ]);

      return response.trim().toUpperCase() === "YES";
    } catch (error) {
      console.log(`[Math] AI detection failed, using regex fallback: ${error}`);
      return this.isMathQuery(message);
    }
  }

  /**
   * Generate response using AI service for expression parsing
   */
  async generateResponse(
    messages: { role: string; content: string }[]
  ): Promise<string> {
    if (!this.aiService) {
      throw new Error("AI service not available for response generation");
    }
    return this.aiService.generateResponse(messages);
  }

  /**
   * Normalize mathematical expressions for computation
   */
  private normalizeExpression(expression: string): string {
    return expression
      .toLowerCase()
      .replace(/,(\d{3})/g, "$1")
      .replace(/square\s+root\s+of\s+(\d+(?:\.\d+)?)/g, "sqrt($1)")
      .replace(/sqrt\s+(\d+(?:\.\d+)?)/g, "sqrt($1)")
      .replace(/(\d+)\s*squared/g, "($1)^2")
      .replace(/(\d+)\s*cubed/g, "($1)^3")
      .replace(/(\d+)\s*percent\s+of\s+(\d+(?:\.\d+)?)/g, "($1/100)*$2")
      .replace(/(\d+)\s*%\s*of\s*(\d+(?:\.\d+)?)/g, "($1/100)*$2")
      .replace(/(\d+)\s*divided\s+by\s+(\d+(?:\.\d+)?)/g, "$1/$2")
      .replace(/(\d+)\s*over\s+(\d+(?:\.\d+)?)/g, "$1/$2")
      .replace(/(\d+)\s*times\s+(\d+(?:\.\d+)?)/g, "$1*$2")
      .replace(/(\d+)\s*plus\s+(\d+(?:\.\d+)?)/g, "$1+$2")
      .replace(/(\d+)\s*minus\s+(\d+(?:\.\d+)?)/g, "$1-$2")
      .replace(
        /what's|what\s+is|calculate|compute|find|solve|hey|please|\?/g,
        ""
      )
      .replace(/\s+/g, "")
      .replace(/×/g, "*")
      .replace(/÷/g, "/")
      .replace(/\^/g, "**")
      .replace(/(\d+)!/g, "factorial($1)")
      .trim();
  }

  private computeWithDecimal(expression: string): string {
    // Handle factorial
    if (expression.includes("factorial")) {
      const factorialMatch = expression.match(/factorial\((\d+)\)/);
      if (factorialMatch) {
        const n = parseInt(factorialMatch[1]);
        if (n < 0) throw new Error("Factorial of negative number");
        if (n > 170) throw new Error("Factorial too large");
        let result = new Decimal(1);
        for (let i = 2; i <= n; i++) {
          result = result.mul(i);
        }
        return result.toString();
      }
    }

    // Handle square root specifically
    const sqrtMatch = expression.match(/sqrt\(([^)]+)\)/);
    if (sqrtMatch) {
      const innerExpr = sqrtMatch[1];
      let number: Decimal;

      if (/[\+\-\*\/]/.test(innerExpr)) {
        const evaluated = evaluate(innerExpr);
        number = new Decimal(evaluated.toString());
      } else {
        number = new Decimal(innerExpr);
      }

      if (number.isNegative()) {
        throw new Error("Square root of negative number");
      }
      return number.sqrt().toString();
    }

    // Handle division by zero check
    if (/\/\s*0(?!\d)/.test(expression)) {
      throw new Error("Division by zero");
    }

    try {
      const result = evaluate(expression);
      if (!isFinite(result)) {
        throw new Error("Result is infinite or NaN");
      }
      return new Decimal(result.toString()).toString();
    } catch (error) {
      throw new Error(`Decimal computation failed: ${error}`);
    }
  }

  private computeWithMathJS(expression: string): string {
    try {
      // Add safety checks
      if (/\/\s*0(?!\d)/.test(expression)) {
        throw new Error("Division by zero");
      }

      const result = evaluate(expression);

      if (!isFinite(result)) {
        throw new Error("Result is infinite or NaN");
      }

      return result.toString();
    } catch (error) {
      throw new Error(`Math.js computation failed: ${error}`);
    }
  }

  private computeWithBigNumber(expression: string): string {
    // Handle factorial
    if (expression.includes("factorial")) {
      const factorialMatch = expression.match(/factorial\((\d+)\)/);
      if (factorialMatch) {
        const n = parseInt(factorialMatch[1]);
        if (n < 0) throw new Error("Factorial of negative number");
        if (n > 1000) throw new Error("Factorial too large for computation");
        let result = new BigNumber(1);
        for (let i = 2; i <= n; i++) {
          result = result.multipliedBy(i);
        }
        return result.toString();
      }
    }

    // Handle square root specifically
    const sqrtMatch = expression.match(/sqrt\(([^)]+)\)/);
    if (sqrtMatch) {
      const innerExpr = sqrtMatch[1];
      let number: BigNumber;

      if (/[\+\-\*\/]/.test(innerExpr)) {
        const evaluated = evaluate(innerExpr);
        number = new BigNumber(evaluated.toString());
      } else {
        number = new BigNumber(innerExpr);
      }

      if (number.isNegative()) {
        throw new Error("Square root of negative number");
      }
      return number.sqrt().toString();
    }

    // Handle division by zero
    if (/\/\s*0(?!\d)/.test(expression)) {
      throw new Error("Division by zero");
    }

    try {
      const result = evaluate(expression);
      if (!isFinite(result)) {
        throw new Error("Result is infinite or NaN");
      }
      return new BigNumber(result.toString()).toString();
    } catch (error) {
      throw new Error(`BigNumber computation failed: ${error}`);
    }
  }

  private computeWithNativeJS(expression: string): string {
    try {
      // Handle factorial
      if (expression.includes("factorial")) {
        const factorialMatch = expression.match(/factorial\((\d+)\)/);
        if (factorialMatch) {
          const n = parseInt(factorialMatch[1]);
          if (n < 0) throw new Error("Factorial of negative number");
          if (n > 170) throw new Error("Factorial too large");
          let result = 1;
          for (let i = 2; i <= n; i++) {
            result *= i;
          }
          return result.toString();
        }
      }

      // Replace sqrt with Math.sqrt and add safety
      let jsExpression = expression.replace(
        /sqrt\(([^)]+)\)/g,
        (match, inner) => {
          if (/[\+\-\*\/]/.test(inner)) {
            return `Math.sqrt(${inner})`;
          }
          const num = parseFloat(inner);
          if (num < 0) throw new Error("Square root of negative number");
          return `Math.sqrt(${inner})`;
        }
      );

      // Check for division by zero
      if (/\/\s*0(?!\d)/.test(jsExpression)) {
        throw new Error("Division by zero");
      }

      const result = eval(jsExpression);

      if (!isFinite(result)) {
        throw new Error("Result is infinite or NaN");
      }

      return result.toString();
    } catch (error) {
      throw new Error(`Native JS computation failed: ${error}`);
    }
  }

  /**
   * Fallback computation method
   */
  private async performFallbackComputation(
    expression: string
  ): Promise<string> {
    try {
      return this.computeWithMathJS(expression);
    } catch (error1) {
      try {
        return this.computeWithNativeJS(expression);
      } catch (error2) {
        throw new Error(
          `All computation methods failed. Last error: ${error2}`
        );
      }
    }
  }

  /**
   * Generate approximate result for display
   */
  private generateApproximateResult(preciseResult: string): string {
    try {
      const num = parseFloat(preciseResult);
      if (isNaN(num)) return preciseResult;

      // Round to 6 decimal places for approximate display
      return num.toFixed(6).replace(/\.?0+$/, "");
    } catch (error) {
      return preciseResult;
    }
  }

  /**
   * Detect input type
   */
  private detectInputType(expression: string): string {
    if (/sqrt/.test(expression)) return "square_root";
    if (/[\+\-\*\/]/.test(expression)) return "arithmetic";
    if (/\^|\*\*/.test(expression)) return "power";
    return "expression";
  }

  /**
   * Detect output type
   */
  private detectOutputType(result: string): string {
    if (/\./.test(result)) return "decimal";
    if (/e[\+\-]\d+/i.test(result)) return "scientific";
    return "integer";
  }

  /**
   * Assess complexity of expression
   */
  private assessComplexity(
    expression: string
  ): "simple" | "moderate" | "complex" {
    const operatorCount = (expression.match(/[\+\-\*\/\^\(\)]/g) || []).length;
    if (operatorCount <= 2) return "simple";
    if (operatorCount <= 5) return "moderate";
    return "complex";
  }

  /**
   * Detect precision of result
   */
  private detectPrecision(result: string): number {
    const decimalMatch = result.match(/\.(\d+)/);
    return decimalMatch ? decimalMatch[1].length : 0;
  }
}
