// Core Reasoning Engine
// Orchestrates reasoning processes using available tools

import {
  ReasoningQuery,
  ReasoningResponse,
  ReasoningTrace,
  ReasoningStep,
  ReasoningType,
  ReasoningContext,
  ToolCall,
  ModelConfig,
} from "../../shared/types/reasoning";
import { AIProviderService } from "../services/aiProviderService";
import { WebBrowsingService } from "../services/webBrowsingService";
import { MemoryRetrievalService } from "../services/memoryRetrievalService";
import { MathComputationService } from "../services/mathComputationService";

export class ReasoningEngine {
  private aiService: AIProviderService;
  private webService: WebBrowsingService;
  private memoryService: MemoryRetrievalService;
  private mathService: MathComputationService;
  private config: ModelConfig;

  constructor() {
    this.aiService = new AIProviderService();
    this.webService = new WebBrowsingService(this.aiService);
    this.memoryService = new MemoryRetrievalService();
    this.mathService = new MathComputationService({}, this.aiService);

    this.config = {
      maxSteps: 10,
      confidenceThreshold: 0.7,
      enabledTools: ["web", "memory", "math", "analysis"],
      temperature: 0.3,
      maxTokens: 2000,
      timeoutMs: 60000,
    };
  }

  async reason(query: ReasoningQuery): Promise<ReasoningResponse> {
    const startTime = Date.now();
    const trace: ReasoningTrace = {
      problemId: this.generateProblemId(),
      steps: [],
      finalAnswer: "",
      reasoning: "",
      toolsUsed: [],
      success: false,
      confidence: 0,
      duration: 0,
      metadata: {
        modelUsed: "reasoning-engine-v1",
        providerUsed: "multi-tool",
      },
      createdAt: new Date(),
    };

    try {
      // Step 1: Analyze the problem
      const analysisStep = await this.analyzeQuery(query);
      trace.steps.push(analysisStep);

      // Step 2: Plan reasoning strategy
      const strategyStep = await this.planStrategy(query, analysisStep);
      trace.steps.push(strategyStep);

      // Step 3: Execute reasoning steps
      const executionSteps = await this.executeReasoningPlan(
        query,
        strategyStep
      );
      trace.steps.push(...executionSteps);

      // Step 4: Synthesize final answer
      const synthesisStep = await this.synthesizeAnswer(query, trace.steps);
      trace.steps.push(synthesisStep);

      // Update trace with results
      trace.finalAnswer =
        synthesisStep.toolOutput?.answer || "Unable to determine answer";
      trace.reasoning = this.generateReasoningExplanation(trace.steps);
      trace.toolsUsed = [
        ...new Set(
          trace.steps.filter((s) => s.toolUsed).map((s) => s.toolUsed!)
        ),
      ];
      trace.success =
        synthesisStep.confidence > this.config.confidenceThreshold;
      trace.confidence = this.calculateOverallConfidence(trace.steps);
      trace.duration = Date.now() - startTime;

      return {
        trace,
        success: trace.success,
        suggestions: await this.generateSuggestions(query, trace),
      };
    } catch (error) {
      trace.errors = [error instanceof Error ? error.message : "Unknown error"];
      trace.duration = Date.now() - startTime;

      return {
        trace,
        success: false,
        error: error instanceof Error ? error.message : "Reasoning failed",
      };
    }
  }

  private async analyzeQuery(query: ReasoningQuery): Promise<ReasoningStep> {
    const startTime = Date.now();

    try {
      const analysisPrompt = `Analyze this reasoning query and determine:
1. What type of reasoning is required?
2. What information do we need to gather?
3. What tools might be helpful?
4. What are the key challenges?

Query: ${query.problem}
Context: ${query.context || "None provided"}`;

      let response;
      let providerUsed = "";
      let modelUsed = "";

      try {
        console.log(
          "🤖 [REASONING] Attempting to use LOCAL Ollama model for analysis..."
        );
        response = await this.aiService.chat(
          [
            {
              role: "system",
              content:
                "You are an expert reasoning analyst. Provide structured analysis.",
            },
            { role: "user", content: analysisPrompt },
          ],
          { provider: "ollama", model: "llama3:latest" }
        );
        providerUsed = "ollama";
        modelUsed = "llama3:latest";
        console.log("✅ [REASONING] Successfully using LOCAL Ollama model!");
      } catch (error) {
        console.log(
          "❌ [REASONING] Ollama failed for analysis, trying DeepSeek..."
        );
        try {
          response = await this.aiService.chat(
            [
              {
                role: "system",
                content:
                  "You are an expert reasoning analyst. Provide structured analysis.",
              },
              { role: "user", content: analysisPrompt },
            ],
            { provider: "deepseek", model: "deepseek-chat" }
          );
          providerUsed = "deepseek";
          modelUsed = "deepseek-chat";
          console.log("⚠️ [REASONING] Using CLOUD DeepSeek model as fallback");
        } catch (error2) {
          console.log("❌ [REASONING] DeepSeek failed, trying Google...");
          try {
            response = await this.aiService.chat(
              [
                {
                  role: "system",
                  content:
                    "You are an expert reasoning analyst. Provide structured analysis.",
                },
                { role: "user", content: analysisPrompt },
              ],
              { provider: "google", model: "gemini-2.0-flash-exp" }
            );
            providerUsed = "google";
            modelUsed = "gemini-2.0-flash-exp";
            console.log("⚠️ [REASONING] Using CLOUD Google model as fallback");
          } catch (error3) {
            console.log("❌ [REASONING] Google failed, trying OpenAI...");
            response = await this.aiService.chat(
              [
                {
                  role: "system",
                  content:
                    "You are an expert reasoning analyst. Provide structured analysis.",
                },
                { role: "user", content: analysisPrompt },
              ],
              { provider: "openai", model: "gpt-4o" }
            );
            providerUsed = "openai";
            modelUsed = "gpt-4o";
            console.log(
              "⚠️ [REASONING] Using CLOUD OpenAI model as final fallback"
            );
          }
        }
      }

      return {
        stepNumber: 1,
        description: "Analyze the reasoning query",
        toolUsed: "analysis",
        toolInput: { query: query.problem, context: query.context },
        toolOutput: {
          analysis: response.message.content,
          providerUsed,
          modelUsed,
          isLocal: providerUsed === "ollama",
        },
        reasoning: `Understanding the problem structure and requirements using ${providerUsed}:${modelUsed}`,
        confidence: 0.9,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        stepNumber: 1,
        description: "Analyze the reasoning query",
        reasoning: "Failed to analyze query - no AI providers available",
        confidence: 0.1,
        duration: Date.now() - startTime,
        errors: [error instanceof Error ? error.message : "Analysis failed"],
      };
    }
  }

  private async planStrategy(
    query: ReasoningQuery,
    analysisStep: ReasoningStep
  ): Promise<ReasoningStep> {
    const startTime = Date.now();

    try {
      const planningPrompt = `Based on this analysis, create a step-by-step reasoning plan:

Analysis: ${analysisStep.toolOutput?.analysis}
Query: ${query.problem}

Create a numbered plan with specific actions and tools to use.`;

      let response;
      let providerUsed = "";
      let modelUsed = "";

      try {
        console.log(
          "🤖 [REASONING] Attempting to use LOCAL Ollama model for planning..."
        );
        response = await this.aiService.chat(
          [
            {
              role: "system",
              content:
                "You are a reasoning strategist. Create clear, actionable plans.",
            },
            { role: "user", content: planningPrompt },
          ],
          { provider: "ollama", model: "llama3:latest" }
        );
        providerUsed = "ollama";
        modelUsed = "llama3:latest";
        console.log(
          "✅ [REASONING] Successfully using LOCAL Ollama model for planning!"
        );
      } catch (error) {
        console.log(
          "❌ [REASONING] Ollama failed for planning, trying DeepSeek..."
        );
        try {
          response = await this.aiService.chat(
            [
              {
                role: "system",
                content:
                  "You are a reasoning strategist. Create clear, actionable plans.",
              },
              { role: "user", content: planningPrompt },
            ],
            { provider: "deepseek", model: "deepseek-chat" }
          );
          providerUsed = "deepseek";
          modelUsed = "deepseek-chat";
          console.log(
            "⚠️ [REASONING] Using CLOUD DeepSeek model as fallback for planning"
          );
        } catch (error2) {
          console.log(
            "❌ [REASONING] DeepSeek failed for planning, trying Google..."
          );
          try {
            response = await this.aiService.chat(
              [
                {
                  role: "system",
                  content:
                    "You are a reasoning strategist. Create clear, actionable plans.",
                },
                { role: "user", content: planningPrompt },
              ],
              { provider: "google", model: "gemini-2.0-flash-exp" }
            );
            providerUsed = "google";
            modelUsed = "gemini-2.0-flash-exp";
            console.log(
              "⚠️ [REASONING] Using CLOUD Google model as fallback for planning"
            );
          } catch (error3) {
            console.log(
              "❌ [REASONING] Google failed for planning, trying OpenAI..."
            );
            response = await this.aiService.chat(
              [
                {
                  role: "system",
                  content:
                    "You are a reasoning strategist. Create clear, actionable plans.",
                },
                { role: "user", content: planningPrompt },
              ],
              { provider: "openai", model: "gpt-4o" }
            );
            providerUsed = "openai";
            modelUsed = "gpt-4o";
            console.log(
              "⚠️ [REASONING] Using CLOUD OpenAI model as final fallback for planning"
            );
          }
        }
      }

      return {
        stepNumber: 2,
        description: "Plan reasoning strategy",
        toolUsed: "planning",
        toolInput: { analysis: analysisStep.toolOutput?.analysis },
        toolOutput: {
          plan: response.message.content,
          providerUsed,
          modelUsed,
          isLocal: providerUsed === "ollama",
        },
        reasoning: `Creating a structured approach to solve the problem using ${providerUsed}:${modelUsed}`,
        confidence: 0.85,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        stepNumber: 2,
        description: "Plan reasoning strategy",
        reasoning:
          "Failed to create reasoning plan - no AI providers available",
        confidence: 0.1,
        duration: Date.now() - startTime,
        errors: [error instanceof Error ? error.message : "Planning failed"],
      };
    }
  }

  private async executeReasoningPlan(
    query: ReasoningQuery,
    strategyStep: ReasoningStep
  ): Promise<ReasoningStep[]> {
    const steps: ReasoningStep[] = [];
    let stepNumber = 3;

    // Determine if we need web search
    if (this.needsWebSearch(query, strategyStep)) {
      const webStep = await this.performWebSearch(query, stepNumber++);
      steps.push(webStep);
    }

    // Determine if we need memory recall
    if (this.needsMemoryRecall(query, strategyStep)) {
      const memoryStep = await this.performMemoryRecall(query, stepNumber++);
      steps.push(memoryStep);
    }

    // Determine if we need mathematical computation
    if (this.needsMathComputation(query, strategyStep)) {
      const mathStep = await this.performMathComputation(query, stepNumber++);
      steps.push(mathStep);
    }

    return steps;
  }

  private needsWebSearch(
    query: ReasoningQuery,
    strategyStep: ReasoningStep
  ): boolean {
    const indicators = [
      "current",
      "recent",
      "latest",
      "news",
      "today",
      "now",
      "what is",
      "who is",
      "when did",
      "where is",
      "research",
      "facts",
      "information",
    ];

    const text = (
      query.problem +
      " " +
      (strategyStep.toolOutput?.plan || "")
    ).toLowerCase();
    return indicators.some((indicator) => text.includes(indicator));
  }

  private needsMemoryRecall(
    query: ReasoningQuery,
    strategyStep: ReasoningStep
  ): boolean {
    const indicators = [
      "remember",
      "recall",
      "previous",
      "before",
      "earlier",
      "we discussed",
      "you mentioned",
      "last time",
    ];

    const text = (
      query.problem +
      " " +
      (strategyStep.toolOutput?.plan || "")
    ).toLowerCase();
    return indicators.some((indicator) => text.includes(indicator));
  }

  private needsMathComputation(
    query: ReasoningQuery,
    strategyStep: ReasoningStep
  ): boolean {
    const indicators = [
      "calculate",
      "compute",
      "solve",
      "equation",
      "formula",
      "math",
      "number",
      "percentage",
      "ratio",
      "statistics",
    ];

    const text = (
      query.problem +
      " " +
      (strategyStep.toolOutput?.plan || "")
    ).toLowerCase();
    return (
      indicators.some((indicator) => text.includes(indicator)) ||
      /\d+/.test(query.problem)
    );
  }

  private async performWebSearch(
    query: ReasoningQuery,
    stepNumber: number
  ): Promise<ReasoningStep> {
    const startTime = Date.now();

    try {
      const searchResults = await this.webService.searchAndAnalyze(
        query.problem,
        3
      );

      return {
        stepNumber,
        description: "Gather information from web search",
        toolUsed: "web",
        toolInput: { query: query.problem },
        toolOutput: { results: searchResults },
        reasoning: "Collecting current and relevant information from the web",
        confidence: 0.8,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        stepNumber,
        description: "Gather information from web search",
        toolUsed: "web",
        reasoning: "Failed to retrieve web information",
        confidence: 0.2,
        duration: Date.now() - startTime,
        errors: [error instanceof Error ? error.message : "Web search failed"],
      };
    }
  }

  private async performMemoryRecall(
    query: ReasoningQuery,
    stepNumber: number
  ): Promise<ReasoningStep> {
    const startTime = Date.now();

    try {
      const memories = await this.memoryService.searchMemories({
        query: query.problem,
        maxResults: 5,
      });

      return {
        stepNumber,
        description: "Recall relevant memories",
        toolUsed: "memory",
        toolInput: { query: query.problem },
        toolOutput: { memories },
        reasoning: "Retrieving relevant past experiences and knowledge",
        confidence: 0.75,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        stepNumber,
        description: "Recall relevant memories",
        toolUsed: "memory",
        reasoning: "Failed to retrieve memories",
        confidence: 0.2,
        duration: Date.now() - startTime,
        errors: [
          error instanceof Error ? error.message : "Memory recall failed",
        ],
      };
    }
  }

  private async performMathComputation(
    query: ReasoningQuery,
    stepNumber: number
  ): Promise<ReasoningStep> {
    const startTime = Date.now();

    try {
      const result = await this.mathService.compute({
        expression: query.problem,
        context: query.context || "",
      });

      return {
        stepNumber,
        description: "Perform mathematical computation",
        toolUsed: "math",
        toolInput: { query: query.problem },
        toolOutput: { result },
        reasoning: "Computing mathematical expressions and solving equations",
        confidence: result.success ? 0.9 : 0.3,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        stepNumber,
        description: "Perform mathematical computation",
        toolUsed: "math",
        reasoning: "Failed to perform computation",
        confidence: 0.2,
        duration: Date.now() - startTime,
        errors: [
          error instanceof Error ? error.message : "Math computation failed",
        ],
      };
    }
  }

  private async synthesizeAnswer(
    query: ReasoningQuery,
    steps: ReasoningStep[]
  ): Promise<ReasoningStep> {
    const startTime = Date.now();

    try {
      const context = steps
        .map(
          (step) =>
            `Step ${step.stepNumber}: ${step.description}\n` +
            `Tool: ${step.toolUsed || "none"}\n` +
            `Result: ${JSON.stringify(step.toolOutput)}\n` +
            `Reasoning: ${step.reasoning}\n`
        )
        .join("\n");

      const synthesisPrompt = `Based on all the information gathered, provide a comprehensive answer to the original query.

Original Query: ${query.problem}
Context: ${query.context || "None"}

Information Gathered:
${context}

Provide a clear, well-reasoned answer that synthesizes all the information.`;

      // Prioritize local Ollama models, then fallback to cloud providers
      let response;
      try {
        response = await this.aiService.chat(
          [
            {
              role: "system",
              content:
                "You are an expert at synthesizing information and providing clear answers.",
            },
            { role: "user", content: synthesisPrompt },
          ],
          { provider: "ollama", model: "llama3:latest" }
        );
      } catch (error) {
        console.log("Ollama failed for synthesis, trying DeepSeek...");
        try {
          response = await this.aiService.chat(
            [
              {
                role: "system",
                content:
                  "You are an expert at synthesizing information and providing clear answers.",
              },
              { role: "user", content: synthesisPrompt },
            ],
            { provider: "deepseek", model: "deepseek-chat" }
          );
        } catch (error2) {
          console.log("DeepSeek failed for synthesis, trying Google...");
          try {
            response = await this.aiService.chat(
              [
                {
                  role: "system",
                  content:
                    "You are an expert at synthesizing information and providing clear answers.",
                },
                { role: "user", content: synthesisPrompt },
              ],
              { provider: "google", model: "gemini-2.0-flash-exp" }
            );
          } catch (error3) {
            response = await this.aiService.chat(
              [
                {
                  role: "system",
                  content:
                    "You are an expert at synthesizing information and providing clear answers.",
                },
                { role: "user", content: synthesisPrompt },
              ],
              { provider: "openai", model: "gpt-4o" }
            );
          }
        }
      }

      return {
        stepNumber: steps.length + 1,
        description: "Synthesize final answer",
        toolUsed: "synthesis",
        toolInput: { context, query: query.problem },
        toolOutput: { answer: response.message.content },
        reasoning: "Combining all gathered information into a coherent answer",
        confidence: 0.85,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        stepNumber: steps.length + 1,
        description: "Synthesize final answer",
        reasoning: "Failed to synthesize answer - no AI providers available",
        confidence: 0.1,
        duration: Date.now() - startTime,
        errors: [error instanceof Error ? error.message : "Synthesis failed"],
      };
    }
  }

  private generateReasoningExplanation(steps: ReasoningStep[]): string {
    return steps
      .map(
        (step) => `${step.stepNumber}. ${step.description}: ${step.reasoning}`
      )
      .join("\n");
  }

  private calculateOverallConfidence(steps: ReasoningStep[]): number {
    if (steps.length === 0) return 0;
    const totalConfidence = steps.reduce(
      (sum, step) => sum + step.confidence,
      0
    );
    return totalConfidence / steps.length;
  }

  private async generateSuggestions(
    query: ReasoningQuery,
    trace: ReasoningTrace
  ): Promise<string[]> {
    const suggestions: string[] = [];

    if (trace.confidence < 0.7) {
      suggestions.push(
        "Consider providing more context or breaking down the question"
      );
    }

    if (trace.steps.some((step) => step.errors?.length)) {
      suggestions.push(
        "Some tools encountered errors - try rephrasing the query"
      );
    }

    if (!trace.toolsUsed.includes("web") && this.mightBenefitFromWeb(query)) {
      suggestions.push(
        "This query might benefit from web search for current information"
      );
    }

    return suggestions;
  }

  private mightBenefitFromWeb(query: ReasoningQuery): boolean {
    const webIndicators = ["current", "recent", "latest", "today", "now"];
    return webIndicators.some((indicator) =>
      query.problem.toLowerCase().includes(indicator)
    );
  }

  private generateProblemId(): string {
    return `reasoning_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
