/**
 * Web Controller for MCP AI Workbench
 * HTTP endpoints for web browsing functionality
 */

import { WebBrowsingService } from '../services/webBrowsingService';
import { WebInteractionService } from '../services/webInteractionService';
import {
  WebSearchParams,
  WebFetchParams,
  WebBrowseParams,
  WebScreenshotParams,
  WebExtractParams,
  WebResearchParams,
  WebVerifyParams,
  WebSearchResponse,
  WebFetchResponse,
  WebBrowseResponse,
  WebScreenshotResponse,
  WebExtractResponse,
  WebResearchResponse,
  WebVerifyResponse,
  BrowserAction
} from '../types/webBrowsing';

export class WebController {
  private webBrowsingService: WebBrowsingService;
  private interactionService: WebInteractionService;

  constructor(aiService?: any) {
    this.webBrowsingService = new WebBrowsingService(aiService);
    this.interactionService = new WebInteractionService();
  }

  /**
   * Search the web
   */
  async webSearch(params: WebSearchParams): Promise<WebSearchResponse> {
    const startTime = Date.now();
    console.log(`[WebController] Web search request: "${params.query}"`);

    try {
      const searchQuery = {
        query: params.query,
        maxResults: params.maxResults || 10,
        dateRange: params.dateRange as any,
        language: params.language,
        region: params.region,
        safeSearch: params.safeSearch
      };

      const results = await this.webBrowsingService.searchAndAnalyze(
        params.query,
        params.maxResults || 10
      );

      const searchTime = Date.now() - startTime;

      return {
        success: true,
        results: results.results,
        totalResults: results.results.length,
        searchTime,
        analysis: results.analysis
      } as any;
    } catch (error) {
      console.error('[WebController] Web search failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Web search failed'
      };
    }
  }

  /**
   * Fetch and analyze webpage
   */
  async webFetch(params: WebFetchParams): Promise<WebFetchResponse> {
    console.log(`[WebController] Web fetch request: ${params.url}`);

    try {
      const content = await this.webBrowsingService.browsePage(params.url);

      // Generate summary if requested
      if (params.generateSummary) {
        // Summary is already generated in the browsePage method
      }

      return {
        success: true,
        content
      };
    } catch (error) {
      console.error('[WebController] Web fetch failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Web fetch failed'
      };
    }
  }

  /**
   * Interactive browsing session
   */
  async webBrowse(params: WebBrowseParams): Promise<WebBrowseResponse> {
    console.log(`[WebController] Web browse request`);

    try {
      let sessionId = params.sessionId;

      // Create new session if not provided
      if (!sessionId) {
        sessionId = await this.interactionService.createSession();
      }

      // Navigate to URL if provided
      if (params.url) {
        await this.interactionService.executeAction(sessionId, {
          type: 'navigate',
          target: params.url
        });
      }

      // Execute actions if provided
      if (params.actions && params.actions.length > 0) {
        for (const action of params.actions) {
          await this.interactionService.executeAction(sessionId, action);
        }
      }

      // Get current state
      const currentUrl = await this.interactionService.getCurrentUrl(sessionId);
      const title = await this.interactionService.getCurrentTitle(sessionId);

      return {
        success: true,
        sessionId,
        currentUrl,
        title
      };
    } catch (error) {
      console.error('[WebController] Web browse failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Web browse failed'
      };
    }
  }

  /**
   * Take screenshot
   */
  async webScreenshot(params: WebScreenshotParams): Promise<WebScreenshotResponse> {
    console.log(`[WebController] Screenshot request for session: ${params.sessionId}`);

    try {
      const screenshot = await this.interactionService.takeScreenshot(
        params.sessionId,
        params.options
      );

      // Convert buffer to base64
      const base64Screenshot = screenshot.toString('base64');

      return {
        success: true,
        screenshot: base64Screenshot
      };
    } catch (error) {
      console.error('[WebController] Screenshot failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Screenshot failed'
      };
    }
  }

  /**
   * Extract content from page
   */
  async webExtract(params: WebExtractParams): Promise<WebExtractResponse> {
    console.log(`[WebController] Extract request for session: ${params.sessionId}`);

    try {
      let data: any;

      if (params.extractType === 'text' || !params.extractType) {
        const content = await this.interactionService.extractPageContent(params.sessionId);
        data = content.cleanText;
      } else if (params.extractType === 'html') {
        const content = await this.interactionService.extractPageContent(params.sessionId);
        data = content.content;
      } else if (params.extractType === 'links') {
        const content = await this.interactionService.extractPageContent(params.sessionId);
        data = content.links;
      } else if (params.extractType === 'images') {
        const content = await this.interactionService.extractPageContent(params.sessionId);
        data = content.images;
      } else {
        // Extract specific selector
        data = await this.interactionService.executeAction(params.sessionId, {
          type: 'extract',
          target: params.selector
        });
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('[WebController] Extract failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Extract failed'
      };
    }
  }

  /**
   * Comprehensive topic research
   */
  async webResearch(params: WebResearchParams): Promise<WebResearchResponse> {
    console.log(`[WebController] Research request: "${params.topic}"`);

    try {
      const research = await this.webBrowsingService.researchTopic(
        params.topic,
        params.depth || 'detailed'
      );

      // Get sources if requested
      let sources = undefined;
      if (params.sources && params.sources > 0) {
        const searchResults = await this.webBrowsingService.searchAndAnalyze(
          params.topic,
          params.sources
        );
        sources = searchResults.results;
      }

      return {
        success: true,
        research,
        sources,
        confidence: 0.8 // Default confidence
      };
    } catch (error) {
      console.error('[WebController] Research failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Research failed'
      };
    }
  }

  /**
   * Verify information across sources
   */
  async webVerify(params: WebVerifyParams): Promise<WebVerifyResponse> {
    console.log(`[WebController] Verify request: "${params.claim}"`);

    try {
      const verification = await this.webBrowsingService.verifyInformation(
        params.claim,
        params.sources || 3
      );

      return {
        success: true,
        verified: verification.verified,
        confidence: verification.confidence,
        sources: verification.sources,
        evidence: verification.evidence
      };
    } catch (error) {
      console.error('[WebController] Verification failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Verification failed'
      };
    }
  }

  /**
   * Get recent news
   */
  async webNews(params: { topic: string; maxResults?: number }): Promise<WebSearchResponse> {
    console.log(`[WebController] News request: "${params.topic}"`);

    try {
      const results = await this.webBrowsingService.getRecentNews(
        params.topic,
        params.maxResults || 5
      );

      return {
        success: true,
        results,
        totalResults: results.length,
        searchTime: 0
      };
    } catch (error) {
      console.error('[WebController] News search failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'News search failed'
      };
    }
  }

  /**
   * Compare products/services
   */
  async webCompare(params: { products: string[] }): Promise<{ success: boolean; comparison?: string; error?: string }> {
    console.log(`[WebController] Compare request: ${params.products.join(', ')}`);

    try {
      const comparison = await this.webBrowsingService.compareProducts(params.products);

      return {
        success: true,
        comparison
      };
    } catch (error) {
      console.error('[WebController] Comparison failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Comparison failed'
      };
    }
  }

  /**
   * Close browsing session
   */
  async webCloseSession(params: { sessionId: string }): Promise<{ success: boolean; error?: string }> {
    console.log(`[WebController] Close session request: ${params.sessionId}`);

    try {
      await this.interactionService.closeSession(params.sessionId);

      return {
        success: true
      };
    } catch (error) {
      console.error('[WebController] Close session failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Close session failed'
      };
    }
  }

  /**
   * Get active sessions
   */
  async webGetSessions(): Promise<{ success: boolean; sessions?: any[]; error?: string }> {
    console.log(`[WebController] Get sessions request`);

    try {
      // This would require implementing session tracking in WebInteractionService
      return {
        success: true,
        sessions: []
      };
    } catch (error) {
      console.error('[WebController] Get sessions failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Get sessions failed'
      };
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await this.webBrowsingService.cleanup();
  }
}

// Export controller instance
export const webController = new WebController();
