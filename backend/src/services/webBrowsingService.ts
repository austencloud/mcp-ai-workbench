/**
 * Main Web Browsing Service for MCP AI Workbench
 * Orchestrates all web browsing capabilities
 */

import { WebSearchService } from './webSearchService';
import { WebScrapingService } from './webScrapingService';
import { WebInteractionService } from './webInteractionService';
import { WebAnalysisService } from './webAnalysisService';
import {
  WebSearchQuery,
  WebSearchResult,
  WebPageContent,
  BrowserAction,
  WebSearchResponse,
  WebFetchResponse,
  WebBrowseResponse,
  WebResearchResponse,
  WebVerifyResponse
} from '../types/webBrowsing';

export class WebBrowsingService {
  private searchService: WebSearchService;
  private scrapingService: WebScrapingService;
  private interactionService: WebInteractionService;
  private analysisService: WebAnalysisService;
  private aiService: any; // Will be injected

  constructor(aiService?: any) {
    this.searchService = new WebSearchService();
    this.scrapingService = new WebScrapingService();
    this.interactionService = new WebInteractionService();
    this.analysisService = new WebAnalysisService(aiService);
    this.aiService = aiService;
  }

  /**
   * Search and analyze - comprehensive search with content analysis
   */
  async searchAndAnalyze(query: string, maxResults: number = 5): Promise<{
    results: WebSearchResult[];
    topContent: WebPageContent[];
    analysis: string;
  }> {
    const startTime = Date.now();
    console.log(`[WebBrowsing] Starting search and analysis for: "${query}"`);

    try {
      // Step 1: Search the web
      const searchQuery: WebSearchQuery = { query, maxResults };
      const results = await this.searchService.search(searchQuery);

      if (results.length === 0) {
        return {
          results: [],
          topContent: [],
          analysis: 'No search results found for the given query.'
        };
      }

      // Step 2: Fetch content from top results
      const topUrls = results.slice(0, Math.min(3, results.length)).map(r => r.url);
      const topContent = await this.scrapingService.fetchMultiplePages(topUrls);

      // Step 3: Analyze and rank content by relevance
      const analyzedContent = await Promise.all(
        topContent.map(async (content) => {
          const relevance = await this.analysisService.analyzeRelevance(content, query);
          return { content, relevance };
        })
      );

      // Sort by relevance
      analyzedContent.sort((a, b) => b.relevance - a.relevance);
      const sortedContent = analyzedContent.map(item => item.content);

      // Step 4: Generate comprehensive analysis
      const analysis = await this.generateSearchAnalysis(query, results, sortedContent);

      const duration = Date.now() - startTime;
      console.log(`[WebBrowsing] Search and analysis completed in ${duration}ms`);

      return {
        results,
        topContent: sortedContent,
        analysis
      };
    } catch (error) {
      console.error('[WebBrowsing] Search and analysis failed:', error);
      throw error;
    }
  }

  /**
   * Research topic comprehensively
   */
  async researchTopic(topic: string, depth: 'basic' | 'detailed' | 'comprehensive' = 'detailed'): Promise<string> {
    console.log(`[WebBrowsing] Researching topic: "${topic}" (${depth})`);

    try {
      const maxResults = depth === 'basic' ? 3 : depth === 'detailed' ? 5 : 8;
      
      // Search for general information
      const generalSearch = await this.searchAndAnalyze(topic, maxResults);
      
      // Search for recent news/updates
      const newsResults = await this.searchService.searchNews(topic);
      const recentContent = await this.scrapingService.fetchMultiplePages(
        newsResults.slice(0, 2).map(r => r.url)
      );

      // Generate comprehensive research report
      const research = await this.generateResearchReport(
        topic,
        generalSearch.topContent,
        recentContent,
        depth
      );

      return research;
    } catch (error) {
      console.error('[WebBrowsing] Topic research failed:', error);
      throw error;
    }
  }

  /**
   * Verify information across multiple sources
   */
  async verifyInformation(claim: string, sources: number = 3): Promise<{
    verified: boolean;
    confidence: number;
    sources: WebSearchResult[];
    evidence: string;
  }> {
    console.log(`[WebBrowsing] Verifying claim: "${claim}"`);

    try {
      // Search for information about the claim
      const searchQuery: WebSearchQuery = { 
        query: `"${claim}" fact check verify`,
        maxResults: sources * 2
      };
      const results = await this.searchService.search(searchQuery);

      // Fetch content from multiple sources
      const urls = results.slice(0, sources).map(r => r.url);
      const content = await this.scrapingService.fetchMultiplePages(urls);

      // Analyze each source for verification
      const verificationResults = await Promise.all(
        content.map(async (pageContent) => {
          const answer = await this.analysisService.answerFromContent(
            pageContent,
            `Is this claim true or false: "${claim}"? Provide evidence.`
          );
          return { pageContent, answer };
        })
      );

      // Generate verification report
      const verification = await this.generateVerificationReport(
        claim,
        verificationResults,
        results.slice(0, sources)
      );

      return verification;
    } catch (error) {
      console.error('[WebBrowsing] Information verification failed:', error);
      throw error;
    }
  }

  /**
   * Compare products or services
   */
  async compareProducts(products: string[]): Promise<string> {
    console.log(`[WebBrowsing] Comparing products: ${products.join(', ')}`);

    try {
      const comparisons: WebPageContent[][] = [];

      // Search for each product
      for (const product of products) {
        const searchQuery: WebSearchQuery = { 
          query: `${product} review comparison features`,
          maxResults: 3
        };
        const results = await this.searchService.search(searchQuery);
        const content = await this.scrapingService.fetchMultiplePages(
          results.slice(0, 2).map(r => r.url)
        );
        comparisons.push(content);
      }

      // Generate comparison report
      const allContent = comparisons.flat();
      const comparison = await this.analysisService.comparePages(allContent);

      return comparison;
    } catch (error) {
      console.error('[WebBrowsing] Product comparison failed:', error);
      throw error;
    }
  }

  /**
   * Get recent news about a topic
   */
  async getRecentNews(topic: string, maxResults: number = 5): Promise<WebSearchResult[]> {
    console.log(`[WebBrowsing] Getting recent news for: "${topic}"`);

    try {
      return await this.searchService.searchNews(topic);
    } catch (error) {
      console.error('[WebBrowsing] News search failed:', error);
      throw error;
    }
  }

  /**
   * Browse a specific page
   */
  async browsePage(url: string): Promise<WebPageContent> {
    console.log(`[WebBrowsing] Browsing page: ${url}`);

    try {
      return await this.scrapingService.fetchPage(url);
    } catch (error) {
      console.error('[WebBrowsing] Page browsing failed:', error);
      throw error;
    }
  }

  /**
   * Interactive browsing with instructions
   */
  async interactiveBrowse(sessionId: string, instructions: string): Promise<string> {
    console.log(`[WebBrowsing] Interactive browsing: ${instructions}`);

    try {
      // Parse instructions into actions (simplified)
      const actions = this.parseInstructions(instructions);
      
      let results = '';
      for (const action of actions) {
        const result = await this.interactionService.executeAction(sessionId, action);
        results += `Action: ${action.type} - Result: ${JSON.stringify(result)}\n`;
      }

      return results;
    } catch (error) {
      console.error('[WebBrowsing] Interactive browsing failed:', error);
      throw error;
    }
  }

  /**
   * Generate search analysis
   */
  private async generateSearchAnalysis(
    query: string,
    results: WebSearchResult[],
    content: WebPageContent[]
  ): Promise<string> {
    if (!this.aiService || content.length === 0) {
      return `Found ${results.length} results for "${query}". Top sources: ${results.slice(0, 3).map(r => r.source).join(', ')}.`;
    }

    const contentSummary = content.map((c, i) => 
      `Source ${i + 1}: ${c.title}\n${c.summary}`
    ).join('\n\n');

    const prompt = `
      Analyze these search results for the query: "${query}"
      
      ${contentSummary}
      
      Provide a comprehensive analysis that:
      - Synthesizes information from all sources
      - Identifies key themes and insights
      - Notes any conflicting information
      - Provides a clear, informative summary
    `;

    try {
      return await this.aiService.generateResponse([
        { role: 'system', content: 'You are an expert research analyst. Provide clear, comprehensive analysis of search results.' },
        { role: 'user', content: prompt }
      ]);
    } catch (error) {
      return `Analysis of ${results.length} search results for "${query}". Key sources include: ${results.slice(0, 3).map(r => r.source).join(', ')}.`;
    }
  }

  /**
   * Generate research report
   */
  private async generateResearchReport(
    topic: string,
    generalContent: WebPageContent[],
    recentContent: WebPageContent[],
    depth: string
  ): Promise<string> {
    const allContent = [...generalContent, ...recentContent];
    
    if (!this.aiService || allContent.length === 0) {
      return `Research on "${topic}" found ${allContent.length} sources. Please check individual sources for detailed information.`;
    }

    const contentSummary = allContent.map((c, i) => 
      `Source ${i + 1}: ${c.title}\nURL: ${c.url}\nSummary: ${c.summary}`
    ).join('\n\n');

    const prompt = `
      Create a comprehensive research report on: "${topic}"
      Depth level: ${depth}
      
      Sources:
      ${contentSummary}
      
      Structure the report with:
      - Executive Summary
      - Key Findings
      - Recent Developments (if any)
      - Detailed Analysis
      - Conclusions and Implications
      - Sources
    `;

    try {
      return await this.aiService.generateResponse([
        { role: 'system', content: 'You are an expert researcher. Create comprehensive, well-structured research reports.' },
        { role: 'user', content: prompt }
      ]);
    } catch (error) {
      return `Research report on "${topic}" based on ${allContent.length} sources. Please review individual sources for detailed information.`;
    }
  }

  /**
   * Generate verification report
   */
  private async generateVerificationReport(
    claim: string,
    verificationResults: any[],
    sources: WebSearchResult[]
  ): Promise<{
    verified: boolean;
    confidence: number;
    sources: WebSearchResult[];
    evidence: string;
  }> {
    // Simple heuristic verification (would be enhanced with AI)
    const supportingEvidence = verificationResults.filter(r => 
      r.answer.toLowerCase().includes('true') || r.answer.toLowerCase().includes('correct')
    );
    
    const contradictingEvidence = verificationResults.filter(r => 
      r.answer.toLowerCase().includes('false') || r.answer.toLowerCase().includes('incorrect')
    );

    const verified = supportingEvidence.length > contradictingEvidence.length;
    const confidence = Math.min(0.9, (Math.abs(supportingEvidence.length - contradictingEvidence.length) / verificationResults.length));

    const evidence = verificationResults.map(r => 
      `Source: ${r.pageContent.title}\nEvidence: ${r.answer}`
    ).join('\n\n');

    return {
      verified,
      confidence,
      sources,
      evidence
    };
  }

  /**
   * Parse natural language instructions into browser actions
   */
  private parseInstructions(instructions: string): BrowserAction[] {
    const actions: BrowserAction[] = [];
    const lower = instructions.toLowerCase();

    if (lower.includes('go to') || lower.includes('navigate to')) {
      const urlMatch = instructions.match(/(?:go to|navigate to)\s+([^\s]+)/i);
      if (urlMatch) {
        actions.push({ type: 'navigate', target: urlMatch[1] });
      }
    }

    if (lower.includes('click')) {
      const clickMatch = instructions.match(/click\s+(?:on\s+)?([^.]+)/i);
      if (clickMatch) {
        actions.push({ type: 'click', target: clickMatch[1].trim() });
      }
    }

    if (lower.includes('screenshot')) {
      actions.push({ type: 'screenshot' });
    }

    return actions;
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await this.interactionService.cleanup();
  }
}
