/**
 * Web Analysis Service for MCP AI Workbench
 * AI-powered content analysis and summarization
 */

import { WebPageContent } from "../types/webBrowsing";

export class WebAnalysisService {
  private aiService: any; // Will be injected

  constructor(aiService?: any) {
    this.aiService = aiService;
  }

  /**
   * Summarize web page content using AI
   */
  async summarizeContent(content: WebPageContent): Promise<string> {
    try {
      console.log(`[WebAnalysis] Summarizing content from: ${content.url}`);

      if (!this.aiService) {
        return this.extractiveSummary(content.cleanText);
      }

      const prompt = this.createSummarizationPrompt(content);
      const summary = await this.aiService.generateResponse([
        {
          role: "system",
          content:
            "You are a helpful assistant that creates concise, informative summaries of web content.",
        },
        { role: "user", content: prompt },
      ]);

      return summary || this.extractiveSummary(content.cleanText);
    } catch (error) {
      console.error("[WebAnalysis] Summarization failed:", error);
      return this.extractiveSummary(content.cleanText);
    }
  }

  /**
   * Analyze content relevance to a query
   */
  async analyzeRelevance(
    content: WebPageContent,
    query: string
  ): Promise<number> {
    try {
      console.log(`[WebAnalysis] Analyzing relevance for query: "${query}"`);

      if (!this.aiService) {
        return this.calculateKeywordRelevance(content.cleanText, query);
      }

      const prompt = `
        Analyze how relevant this web page content is to the query: "${query}"
        
        Page Title: ${content.title}
        Page Content: ${content.cleanText.substring(0, 2000)}...
        
        Rate the relevance on a scale of 0.0 to 1.0, where:
        - 1.0 = Highly relevant, directly answers the query
        - 0.7-0.9 = Very relevant, contains substantial related information
        - 0.4-0.6 = Moderately relevant, some related information
        - 0.1-0.3 = Slightly relevant, minimal related information
        - 0.0 = Not relevant at all
        
        Respond with only the numerical score (e.g., 0.8).
      `;

      const response = await this.aiService.generateResponse([
        {
          role: "system",
          content:
            "You are an expert at analyzing content relevance. Respond only with a numerical score between 0.0 and 1.0.",
        },
        { role: "user", content: prompt },
      ]);

      const score = parseFloat(response);
      return isNaN(score)
        ? this.calculateKeywordRelevance(content.cleanText, query)
        : Math.max(0, Math.min(1, score));
    } catch (error) {
      console.error("[WebAnalysis] Relevance analysis failed:", error);
      return this.calculateKeywordRelevance(content.cleanText, query);
    }
  }

  /**
   * Extract key points from content
   */
  async extractKeyPoints(content: WebPageContent): Promise<string[]> {
    try {
      console.log(`[WebAnalysis] Extracting key points from: ${content.url}`);

      if (!this.aiService) {
        return this.extractKeyPointsHeuristic(content);
      }

      const prompt = `
        Extract the key points from this web page content:
        
        Title: ${content.title}
        Content: ${content.cleanText.substring(0, 3000)}...
        
        Provide 3-7 key points as a bullet list. Each point should be:
        - Concise (1-2 sentences)
        - Informative and specific
        - Capture the main ideas or facts
        
        Format as a simple list, one point per line, without bullet symbols.
      `;

      const response = await this.aiService.generateResponse([
        {
          role: "system",
          content:
            "You are an expert at extracting key information from text. Provide clear, concise key points.",
        },
        { role: "user", content: prompt },
      ]);

      const keyPoints = response
        .split("\n")
        .map((point: string) => point.trim())
        .filter((point: string) => point.length > 10)
        .slice(0, 7);

      return keyPoints.length > 0
        ? keyPoints
        : this.extractKeyPointsHeuristic(content);
    } catch (error) {
      console.error("[WebAnalysis] Key point extraction failed:", error);
      return this.extractKeyPointsHeuristic(content);
    }
  }

  /**
   * Answer questions based on content
   */
  async answerFromContent(
    content: WebPageContent,
    question: string
  ): Promise<string> {
    try {
      console.log(`[WebAnalysis] Answering question: "${question}"`);

      if (!this.aiService) {
        return this.simpleAnswerExtraction(content.cleanText, question);
      }

      const prompt = `
        Based on the following web page content, answer this question: "${question}"
        
        Page Title: ${content.title}
        Page URL: ${content.url}
        Content: ${content.cleanText.substring(0, 4000)}...
        
        Instructions:
        - Provide a direct, accurate answer based only on the content provided
        - If the content doesn't contain enough information to answer, say so
        - Include relevant details and context
        - Cite specific information from the content when possible
      `;

      const answer = await this.aiService.generateResponse([
        {
          role: "system",
          content:
            "You are a helpful assistant that answers questions based strictly on provided content. Be accurate and cite the source material.",
        },
        { role: "user", content: prompt },
      ]);

      return answer || this.simpleAnswerExtraction(content.cleanText, question);
    } catch (error) {
      console.error("[WebAnalysis] Question answering failed:", error);
      return this.simpleAnswerExtraction(content.cleanText, question);
    }
  }

  /**
   * Compare multiple pages
   */
  async comparePages(pages: WebPageContent[]): Promise<string> {
    try {
      console.log(`[WebAnalysis] Comparing ${pages.length} pages`);

      if (!this.aiService) {
        return this.simplePageComparison(pages);
      }

      const pagesSummary = pages
        .map(
          (page, index) =>
            `Page ${index + 1}: ${page.title}\nURL: ${
              page.url
            }\nContent: ${page.cleanText.substring(0, 1000)}...\n`
        )
        .join("\n---\n");

      const prompt = `
        Compare and analyze these web pages:
        
        ${pagesSummary}
        
        Provide a comparison that includes:
        - Main similarities and differences
        - Unique insights from each page
        - Overall assessment of the information quality
        - Which sources appear most authoritative or comprehensive
      `;

      const comparison = await this.aiService.generateResponse([
        {
          role: "system",
          content:
            "You are an expert at comparing and analyzing multiple sources of information. Provide objective, insightful comparisons.",
        },
        { role: "user", content: prompt },
      ]);

      return comparison || this.simplePageComparison(pages);
    } catch (error) {
      console.error("[WebAnalysis] Page comparison failed:", error);
      return this.simplePageComparison(pages);
    }
  }

  /**
   * Create summarization prompt
   */
  private createSummarizationPrompt(content: WebPageContent): string {
    return `
      Summarize this web page content in 2-3 concise paragraphs:
      
      Title: ${content.title}
      URL: ${content.url}
      Word Count: ${content.wordCount}
      
      Content: ${content.cleanText.substring(0, 4000)}...
      
      Focus on:
      - Main topic and key information
      - Important facts, findings, or conclusions
      - Practical implications or takeaways
      
      Keep the summary informative but concise.
    `;
  }

  /**
   * Fallback: Extractive summary
   */
  private extractiveSummary(text: string): string {
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 20);
    const summaryLength = Math.min(
      5,
      Math.max(2, Math.floor(sentences.length * 0.1))
    );

    // Simple scoring: prefer sentences with common keywords
    const scored = sentences.map((sentence) => ({
      sentence: sentence.trim(),
      score: this.scoreSentence(sentence),
    }));

    scored.sort((a, b) => b.score - a.score);

    return (
      scored
        .slice(0, summaryLength)
        .map((item) => item.sentence)
        .join(". ") + "."
    );
  }

  /**
   * Score sentence for extractive summary
   */
  private scoreSentence(sentence: string): number {
    const words = sentence.toLowerCase().split(/\s+/);
    let score = 0;

    // Prefer sentences with certain keywords
    const importantWords = [
      "important",
      "key",
      "main",
      "significant",
      "major",
      "primary",
      "essential",
      "critical",
    ];
    const questionWords = ["what", "how", "why", "when", "where", "who"];

    words.forEach((word) => {
      if (importantWords.includes(word)) score += 2;
      if (questionWords.includes(word)) score += 1;
      if (word.length > 6) score += 0.5; // Prefer longer words
    });

    // Penalize very short or very long sentences
    if (words.length < 5 || words.length > 30) score *= 0.5;

    return score;
  }

  /**
   * Calculate keyword-based relevance
   */
  private calculateKeywordRelevance(text: string, query: string): number {
    const queryWords = query.toLowerCase().split(/\s+/);
    const textWords = text.toLowerCase().split(/\s+/);

    let matches = 0;
    queryWords.forEach((queryWord) => {
      if (
        textWords.some(
          (textWord) =>
            textWord.includes(queryWord) || queryWord.includes(textWord)
        )
      ) {
        matches++;
      }
    });

    return Math.min(1.0, matches / queryWords.length);
  }

  /**
   * Extract key points using heuristics
   */
  private extractKeyPointsHeuristic(content: WebPageContent): string[] {
    const points: string[] = [];

    // Use headings as key points
    content.structure.headings.forEach((heading) => {
      if (heading.level <= 3 && heading.text.length > 10) {
        points.push(heading.text);
      }
    });

    // If not enough headings, extract from first sentences of paragraphs
    if (points.length < 3) {
      const sentences = content.cleanText.split(/[.!?]+/);
      sentences.slice(0, 5).forEach((sentence) => {
        const trimmed = sentence.trim();
        if (trimmed.length > 20 && trimmed.length < 200) {
          points.push(trimmed);
        }
      });
    }

    return points.slice(0, 7);
  }

  /**
   * Simple answer extraction
   */
  private simpleAnswerExtraction(text: string, question: string): string {
    const questionWords = question.toLowerCase().split(/\s+/);
    const sentences = text.split(/[.!?]+/);

    // Find sentences that contain question keywords
    const relevantSentences = sentences.filter((sentence) => {
      const sentenceWords = sentence.toLowerCase().split(/\s+/);
      return questionWords.some((qWord) =>
        sentenceWords.some(
          (sWord) => sWord.includes(qWord) || qWord.includes(sWord)
        )
      );
    });

    if (relevantSentences.length > 0) {
      return relevantSentences.slice(0, 3).join(". ").trim() + ".";
    }

    return "The provided content does not contain sufficient information to answer this question.";
  }

  /**
   * Simple page comparison
   */
  private simplePageComparison(pages: WebPageContent[]): string {
    const comparison = pages
      .map(
        (page, index) =>
          `Page ${index + 1}: ${page.title} (${page.wordCount} words)\nURL: ${
            page.url
          }\nSummary: ${page.summary}`
      )
      .join("\n\n");

    return `Comparison of ${pages.length} pages:\n\n${comparison}`;
  }
}
