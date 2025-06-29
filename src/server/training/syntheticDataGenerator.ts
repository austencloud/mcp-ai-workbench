// Synthetic Data Generator for Reasoning Training
// Generates reasoning problems using web browsing and memory tools

import {
  ReasoningProblem,
  ReasoningType,
  TrainingExample,
  SyntheticDataConfig,
  ReasoningMetadata,
} from "../../shared/types/reasoning";
import { AIProviderService } from "../services/aiProviderService";
import { WebBrowsingService } from "../services/webBrowsingService";
import { MemoryRetrievalService } from "../services/memoryRetrievalService";
import { ReasoningEngine } from "../reasoning/reasoningEngine";

export class SyntheticDataGenerator {
  private aiService: AIProviderService;
  private webService: WebBrowsingService;
  private memoryService: MemoryRetrievalService;
  private reasoningEngine: ReasoningEngine;
  private config: SyntheticDataConfig;

  constructor(config?: Partial<SyntheticDataConfig>) {
    this.aiService = new AIProviderService();
    this.webService = new WebBrowsingService(this.aiService);
    this.memoryService = new MemoryRetrievalService();
    this.reasoningEngine = new ReasoningEngine();

    this.config = {
      maxProblemsPerType: 50,
      difficultyRange: [1, 8],
      enableWebGeneration: true,
      enableMemoryGeneration: true,
      qualityThreshold: 0.7,
      verificationRequired: true,
      ...config,
    };
  }

  async generateReasoningDataset(
    count: number,
    types: ReasoningType[]
  ): Promise<TrainingExample[]> {
    console.log(
      `🧠 Generating ${count} reasoning examples across ${types.length} types...`
    );

    const examples: TrainingExample[] = [];
    const problemsPerType = Math.ceil(count / types.length);

    for (const type of types) {
      console.log(`📝 Generating ${problemsPerType} examples for ${type}...`);

      try {
        const typeExamples = await this.generateExamplesForType(
          type,
          problemsPerType
        );
        examples.push(...typeExamples);

        console.log(`✅ Generated ${typeExamples.length} examples for ${type}`);
      } catch (error) {
        console.error(`❌ Failed to generate examples for ${type}:`, error);
      }
    }

    console.log(`🎯 Generated ${examples.length} total training examples`);
    return examples;
  }

  private async generateExamplesForType(
    type: ReasoningType,
    count: number
  ): Promise<TrainingExample[]> {
    const examples: TrainingExample[] = [];

    for (let i = 0; i < count; i++) {
      try {
        const problem = await this.generateProblemForType(type);
        const example = await this.createTrainingExample(problem);

        if (example.quality >= this.config.qualityThreshold) {
          examples.push(example);
        }
      } catch (error) {
        console.error(
          `Failed to generate example ${i + 1} for ${type}:`,
          error
        );
      }
    }

    return examples;
  }

  private async generateProblemForType(
    type: ReasoningType
  ): Promise<ReasoningProblem> {
    switch (type) {
      case ReasoningType.WEB_RESEARCH:
        return this.generateWebResearchProblem();
      case ReasoningType.MEMORY_RECALL:
        return this.generateMemoryRecallProblem();
      case ReasoningType.LOGICAL:
        return this.generateLogicalProblem();
      case ReasoningType.CAUSAL:
        return this.generateCausalProblem();
      case ReasoningType.MATHEMATICAL:
        return this.generateMathematicalProblem();
      case ReasoningType.SCIENTIFIC:
        return this.generateScientificProblem();
      case ReasoningType.MULTI_HOP:
        return this.generateMultiHopProblem();
      default:
        return this.generateGeneralProblem(type);
    }
  }

  private async generateWebResearchProblem(): Promise<ReasoningProblem> {
    const topics = [
      "recent technological breakthroughs",
      "current climate change developments",
      "latest space exploration missions",
      "emerging AI technologies",
      "recent medical discoveries",
      "current economic trends",
    ];

    const topic = topics[Math.floor(Math.random() * topics.length)];

    const prompt = `Generate a research question about ${topic} that requires web search to answer. 
    The question should be specific, current, and require gathering information from multiple sources.`;

    const response = await this.aiService.chat([
      {
        role: "system",
        content:
          "You are an expert at creating research questions that require web investigation.",
      },
      { role: "user", content: prompt },
    ]);

    return {
      id: this.generateId(),
      type: ReasoningType.WEB_RESEARCH,
      difficulty: this.randomDifficulty(),
      context: `Research question about ${topic}`,
      question: response.message.content,
      requiredTools: ["web", "analysis"],
      expectedSteps: [],
      groundTruth: "", // Will be filled by solving
      metadata: this.createMetadata(ReasoningType.WEB_RESEARCH, topic),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private async generateMemoryRecallProblem(): Promise<ReasoningProblem> {
    // First, get some memories to base the problem on
    const memories = await this.memoryService.searchMemories({
      query: "facts knowledge experiences",
      maxResults: 10,
    });

    if (memories.length === 0) {
      // Generate a generic memory-based problem
      return this.generateGenericMemoryProblem();
    }

    const memory = memories[Math.floor(Math.random() * memories.length)];

    const prompt = `Based on this memory: "${memory.memory.content}", create a question that would require
    recalling this or related information. The question should test memory retrieval and connection-making.`;

    const response = await this.aiService.chat([
      {
        role: "system",
        content:
          "You are an expert at creating memory-based reasoning questions.",
      },
      { role: "user", content: prompt },
    ]);

    return {
      id: this.generateId(),
      type: ReasoningType.MEMORY_RECALL,
      difficulty: this.randomDifficulty(),
      context: "Question based on stored memories and experiences",
      question: response.message.content,
      requiredTools: ["memory", "analysis"],
      expectedSteps: [],
      groundTruth: "",
      metadata: this.createMetadata(
        ReasoningType.MEMORY_RECALL,
        "memory-based"
      ),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private async generateLogicalProblem(): Promise<ReasoningProblem> {
    const logicalPatterns = [
      "syllogism",
      "conditional reasoning",
      "logical deduction",
      "proof by contradiction",
      "logical equivalence",
    ];

    const pattern =
      logicalPatterns[Math.floor(Math.random() * logicalPatterns.length)];

    const prompt = `Create a ${pattern} problem that requires step-by-step logical reasoning. 
    Include premises and ask for a logical conclusion.`;

    const response = await this.aiService.chat([
      {
        role: "system",
        content: "You are an expert at creating logical reasoning problems.",
      },
      { role: "user", content: prompt },
    ]);

    return {
      id: this.generateId(),
      type: ReasoningType.LOGICAL,
      difficulty: this.randomDifficulty(),
      context: `Logical reasoning problem using ${pattern}`,
      question: response.message.content,
      requiredTools: ["analysis"],
      expectedSteps: [],
      groundTruth: "",
      metadata: this.createMetadata(ReasoningType.LOGICAL, pattern),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private async generateCausalProblem(): Promise<ReasoningProblem> {
    const scenarios = [
      "environmental cause and effect",
      "economic cause and effect",
      "social cause and effect",
      "technological cause and effect",
      "health cause and effect",
    ];

    const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];

    const prompt = `Create a causal reasoning problem about ${scenario}. 
    Present a situation and ask to identify causes, effects, or causal chains.`;

    const response = await this.aiService.chat([
      {
        role: "system",
        content: "You are an expert at creating causal reasoning problems.",
      },
      { role: "user", content: prompt },
    ]);

    return {
      id: this.generateId(),
      type: ReasoningType.CAUSAL,
      difficulty: this.randomDifficulty(),
      context: `Causal reasoning about ${scenario}`,
      question: response.message.content,
      requiredTools: ["analysis", "web"],
      expectedSteps: [],
      groundTruth: "",
      metadata: this.createMetadata(ReasoningType.CAUSAL, scenario),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private async generateMathematicalProblem(): Promise<ReasoningProblem> {
    const mathTypes = [
      "algebra word problem",
      "geometry problem",
      "probability calculation",
      "statistics analysis",
      "calculus application",
    ];

    const mathType = mathTypes[Math.floor(Math.random() * mathTypes.length)];

    const prompt = `Create a ${mathType} that requires multiple steps to solve. 
    Include real-world context and require mathematical reasoning.`;

    const response = await this.aiService.chat([
      {
        role: "system",
        content:
          "You are an expert at creating mathematical reasoning problems.",
      },
      { role: "user", content: prompt },
    ]);

    return {
      id: this.generateId(),
      type: ReasoningType.MATHEMATICAL,
      difficulty: this.randomDifficulty(),
      context: `Mathematical reasoning: ${mathType}`,
      question: response.message.content,
      requiredTools: ["math", "analysis"],
      expectedSteps: [],
      groundTruth: "",
      metadata: this.createMetadata(ReasoningType.MATHEMATICAL, mathType),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private async generateScientificProblem(): Promise<ReasoningProblem> {
    const sciences = [
      "physics principles",
      "chemistry reactions",
      "biology processes",
      "earth science phenomena",
      "astronomy observations",
    ];

    const science = sciences[Math.floor(Math.random() * sciences.length)];

    const prompt = `Create a scientific reasoning problem about ${science}. 
    Require hypothesis formation, evidence evaluation, or scientific method application.`;

    const response = await this.aiService.chat([
      {
        role: "system",
        content: "You are an expert at creating scientific reasoning problems.",
      },
      { role: "user", content: prompt },
    ]);

    return {
      id: this.generateId(),
      type: ReasoningType.SCIENTIFIC,
      difficulty: this.randomDifficulty(),
      context: `Scientific reasoning about ${science}`,
      question: response.message.content,
      requiredTools: ["analysis", "web"],
      expectedSteps: [],
      groundTruth: "",
      metadata: this.createMetadata(ReasoningType.SCIENTIFIC, science),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private async generateMultiHopProblem(): Promise<ReasoningProblem> {
    const prompt = `Create a multi-hop reasoning problem that requires:
    1. Gathering information from multiple sources
    2. Making connections between different pieces of information
    3. Drawing conclusions that require several logical steps
    
    The problem should be complex enough to require at least 3-4 reasoning steps.`;

    const response = await this.aiService.chat([
      {
        role: "system",
        content:
          "You are an expert at creating complex multi-step reasoning problems.",
      },
      { role: "user", content: prompt },
    ]);

    return {
      id: this.generateId(),
      type: ReasoningType.MULTI_HOP,
      difficulty: Math.max(5, this.randomDifficulty()), // Multi-hop problems are inherently harder
      context: "Complex multi-step reasoning problem",
      question: response.message.content,
      requiredTools: ["web", "memory", "analysis"],
      expectedSteps: [],
      groundTruth: "",
      metadata: this.createMetadata(ReasoningType.MULTI_HOP, "multi-step"),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private async generateGeneralProblem(
    type: ReasoningType
  ): Promise<ReasoningProblem> {
    const prompt = `Create a ${type} reasoning problem that tests this specific type of reasoning. 
    Make it challenging but solvable with the right approach.`;

    const response = await this.aiService.chat([
      {
        role: "system",
        content: `You are an expert at creating ${type} reasoning problems.`,
      },
      { role: "user", content: prompt },
    ]);

    return {
      id: this.generateId(),
      type,
      difficulty: this.randomDifficulty(),
      context: `${type} reasoning problem`,
      question: response.message.content,
      requiredTools: ["analysis"],
      expectedSteps: [],
      groundTruth: "",
      metadata: this.createMetadata(type, "general"),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private async generateGenericMemoryProblem(): Promise<ReasoningProblem> {
    const prompt = `Create a question that would test someone's ability to recall and connect 
    information from past conversations or experiences. The question should require memory retrieval 
    and reasoning about stored information.`;

    const response = await this.aiService.chat([
      {
        role: "system",
        content:
          "You are an expert at creating memory-based reasoning questions.",
      },
      { role: "user", content: prompt },
    ]);

    return {
      id: this.generateId(),
      type: ReasoningType.MEMORY_RECALL,
      difficulty: this.randomDifficulty(),
      context: "Generic memory recall problem",
      question: response.message.content,
      requiredTools: ["memory", "analysis"],
      expectedSteps: [],
      groundTruth: "",
      metadata: this.createMetadata(ReasoningType.MEMORY_RECALL, "generic"),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private async createTrainingExample(
    problem: ReasoningProblem
  ): Promise<TrainingExample> {
    // Solve the problem to create the training example
    const reasoningResponse = await this.reasoningEngine.reason({
      problem: problem.question,
      context: problem.context,
      type: problem.type,
    });

    // Calculate quality score based on success and confidence
    const quality = reasoningResponse.success
      ? Math.min(1.0, reasoningResponse.trace.confidence + 0.1)
      : Math.max(0.1, reasoningResponse.trace.confidence);

    return {
      id: this.generateId(),
      input: problem.question,
      output: reasoningResponse.trace.finalAnswer,
      reasoning: reasoningResponse.trace,
      quality,
      verified: this.config.verificationRequired ? false : true,
      source: "synthetic",
      tags: [problem.type, ...problem.metadata.tags],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private createMetadata(
    type: ReasoningType,
    topic: string
  ): ReasoningMetadata {
    return {
      difficulty: this.randomDifficulty(),
      estimatedTime: this.estimateTime(type),
      requiredKnowledge: this.getRequiredKnowledge(type),
      tags: [type, topic, "synthetic"],
      source: "synthetic_generator",
      verified: false,
    };
  }

  private randomDifficulty(): number {
    const [min, max] = this.config.difficultyRange;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private estimateTime(type: ReasoningType): number {
    const timeMap: Record<ReasoningType, number> = {
      [ReasoningType.LOGICAL]: 120,
      [ReasoningType.CAUSAL]: 180,
      [ReasoningType.ANALOGICAL]: 150,
      [ReasoningType.MATHEMATICAL]: 240,
      [ReasoningType.SCIENTIFIC]: 300,
      [ReasoningType.COMMONSENSE]: 90,
      [ReasoningType.MULTI_HOP]: 360,
      [ReasoningType.TEMPORAL]: 120,
      [ReasoningType.SPATIAL]: 150,
      [ReasoningType.ETHICAL]: 200,
      [ReasoningType.WEB_RESEARCH]: 300,
      [ReasoningType.MEMORY_RECALL]: 60,
    };

    return timeMap[type] || 180;
  }

  private getRequiredKnowledge(type: ReasoningType): string[] {
    const knowledgeMap: Record<ReasoningType, string[]> = {
      [ReasoningType.LOGICAL]: ["logic", "deduction", "inference"],
      [ReasoningType.CAUSAL]: ["causality", "systems thinking"],
      [ReasoningType.ANALOGICAL]: ["pattern recognition", "similarity"],
      [ReasoningType.MATHEMATICAL]: ["mathematics", "computation"],
      [ReasoningType.SCIENTIFIC]: ["scientific method", "evidence evaluation"],
      [ReasoningType.COMMONSENSE]: ["general knowledge", "common sense"],
      [ReasoningType.MULTI_HOP]: ["complex reasoning", "information synthesis"],
      [ReasoningType.TEMPORAL]: ["time reasoning", "sequence understanding"],
      [ReasoningType.SPATIAL]: ["spatial reasoning", "geometry"],
      [ReasoningType.ETHICAL]: ["ethics", "moral reasoning"],
      [ReasoningType.WEB_RESEARCH]: [
        "research skills",
        "information evaluation",
      ],
      [ReasoningType.MEMORY_RECALL]: ["memory", "information retrieval"],
    };

    return knowledgeMap[type] || ["general reasoning"];
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
