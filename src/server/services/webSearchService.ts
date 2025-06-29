/**
 * Web Search Service for MCP AI Workbench
 * Implements multi-provider search with fallback logic
 */

import axios from "axios";
import NodeCache from "node-cache";
import {
  WebSearchQuery,
  WebSearchResult,
  SearchProviderError,
  SearchProviderConfig,
} from "../types/webBrowsing.js";

export class WebSearchService {
  private cache: NodeCache;
  private providers: SearchProviderConfig[];
  private rateLimits: Map<string, { count: number; resetTime: number }>;

  constructor() {
    // Cache search results for 1 hour
    this.cache = new NodeCache({ stdTTL: 3600 });
    this.rateLimits = new Map();

    this.providers = [
      {
        name: "google",
        enabled: !!process.env.GOOGLE_SEARCH_API_KEY,
        apiKey: process.env.GOOGLE_SEARCH_API_KEY,
        priority: 1,
        rateLimit: 100, // requests per day
      },
      {
        name: "duckduckgo",
        enabled: true,
        priority: 2,
        rateLimit: 1000, // requests per day
      },
      {
        name: "bing",
        enabled: !!process.env.BING_SEARCH_API_KEY,
        apiKey: process.env.BING_SEARCH_API_KEY,
        priority: 3,
        rateLimit: 1000, // requests per day
      },
    ]
      .filter((p) => p.enabled)
      .sort((a, b) => a.priority - b.priority);
  }

  /**
   * Main search method with provider fallback
   */
  async search(query: WebSearchQuery): Promise<WebSearchResult[]> {
    const startTime = Date.now();
    console.log(`[WebSearch] Starting search for: "${query.query}"`);
    console.log(
      `[WebSearch] Available providers:`,
      this.providers.map((p) => ({ name: p.name, enabled: p.enabled }))
    );

    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(query);
      const cachedResults = this.cache.get<WebSearchResult[]>(cacheKey);
      if (cachedResults) {
        console.log(`[WebSearch] Cache hit for query: "${query.query}"`);
        return cachedResults;
      }

      const allErrors: any[] = [];

      // Try providers in order of priority
      for (const provider of this.providers) {
        console.log(`[WebSearch] Trying provider: ${provider.name}`);

        if (!this.checkRateLimit(provider.name)) {
          console.log(
            `[WebSearch] Rate limit exceeded for provider: ${provider.name}`
          );
          continue;
        }

        try {
          let results: WebSearchResult[] = [];

          switch (provider.name) {
            case "google":
              console.log(`[WebSearch] Attempting Google search...`);
              console.log(
                `[WebSearch] Google API Key exists: ${!!process.env
                  .GOOGLE_SEARCH_API_KEY}`
              );
              console.log(
                `[WebSearch] Google Engine ID exists: ${!!process.env
                  .GOOGLE_SEARCH_ENGINE_ID}`
              );
              results = await this.googleSearch(query);
              break;
            case "duckduckgo":
              console.log(`[WebSearch] Attempting DuckDuckGo search...`);
              results = await this.duckDuckGoSearch(query);
              break;
            case "bing":
              console.log(`[WebSearch] Attempting Bing search...`);
              results = await this.bingSearch(query);
              break;
          }

          console.log(
            `[WebSearch] Provider ${provider.name} returned ${results.length} results`
          );

          if (results.length > 0) {
            // Cache successful results
            this.cache.set(cacheKey, results);

            const duration = Date.now() - startTime;
            console.log(
              `[WebSearch] Search completed with ${provider.name} in ${duration}ms, found ${results.length} results`
            );

            return results;
          }
        } catch (error) {
          console.error(`[WebSearch] Provider ${provider.name} failed:`, error);
          allErrors.push({
            provider: provider.name,
            error: error instanceof Error ? error.message : String(error),
          });
          // Continue to next provider
        }
      }

      console.error(`[WebSearch] All providers failed. Errors:`, allErrors);
      throw new SearchProviderError("All search providers failed", "all");
    } catch (error) {
      console.error(`[WebSearch] Search failed:`, error);
      throw error;
    }
  }

  /**
   * Search for news articles
   */
  async searchNews(query: string): Promise<WebSearchResult[]> {
    const newsQuery: WebSearchQuery = {
      query: `${query} news`,
      maxResults: 10,
      dateRange: "week",
    };
    return this.search(newsQuery);
  }

  /**
   * Search for images
   */
  async searchImages(query: string): Promise<WebSearchResult[]> {
    const imageQuery: WebSearchQuery = {
      query,
      maxResults: 20,
    };
    return this.search(imageQuery);
  }

  /**
   * Google Custom Search implementation
   */
  private async googleSearch(
    query: WebSearchQuery
  ): Promise<WebSearchResult[]> {
    if (
      !process.env.GOOGLE_SEARCH_API_KEY ||
      !process.env.GOOGLE_SEARCH_ENGINE_ID
    ) {
      throw new SearchProviderError(
        "Google Search API credentials not configured",
        "google"
      );
    }

    const params = {
      key: process.env.GOOGLE_SEARCH_API_KEY,
      cx: process.env.GOOGLE_SEARCH_ENGINE_ID,
      q: query.query,
      num: Math.min(query.maxResults || 10, 10),
      safe: query.safeSearch ? "active" : "off",
      lr: query.language ? `lang_${query.language}` : undefined,
      gl: query.region || undefined,
      dateRestrict: this.mapDateRange(query.dateRange),
    };

    const response = await axios.get(
      "https://www.googleapis.com/customsearch/v1",
      {
        params,
        timeout: 10000,
      }
    );

    if (!response.data.items) {
      return [];
    }

    return response.data.items.map((item: any, index: number) => ({
      title: item.title,
      url: item.link,
      snippet: item.snippet,
      publishedDate: item.pagemap?.metatags?.[0]?.["article:published_time"],
      source: this.extractDomain(item.link),
      favicon: item.pagemap?.cse_image?.[0]?.src,
      imageUrl: item.pagemap?.cse_thumbnail?.[0]?.src,
      rank: index + 1,
    }));
  }

  /**
   * DuckDuckGo search implementation
   */
  private async duckDuckGoSearch(
    query: WebSearchQuery
  ): Promise<WebSearchResult[]> {
    try {
      // First try the instant answer API which is more reliable
      const instantResults = await this.duckDuckGoInstantAnswer(query);
      if (instantResults.length > 0) {
        return instantResults;
      }

      // Fallback to HTML search with improved parsing
      const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(
        query.query
      )}`;

      const response = await axios.get(searchUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
          "Accept-Encoding": "gzip, deflate",
          DNT: "1",
          Connection: "keep-alive",
          "Upgrade-Insecure-Requests": "1",
        },
        timeout: 15000,
      });

      const results: WebSearchResult[] = [];
      const htmlContent = response.data;

      // Improved regex patterns for DuckDuckGo results
      const resultBlocks =
        htmlContent.match(/<div class="result[^"]*"[^>]*>[\s\S]*?<\/div>/g) ||
        [];

      for (
        let i = 0;
        i < Math.min(resultBlocks.length, query.maxResults || 10);
        i++
      ) {
        const block = resultBlocks[i];

        // Extract title and URL
        const titleMatch = block.match(
          /<a[^>]+class="result__a"[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/
        );
        if (!titleMatch) continue;

        const url = titleMatch[1];
        const title = titleMatch[2].trim();

        // Skip invalid URLs
        if (!url.startsWith("http")) continue;

        // Extract snippet
        const snippetMatch =
          block.match(/<a[^>]+class="result__snippet"[^>]*>([^<]+)<\/a>/) ||
          block.match(/<span class="result__snippet[^"]*">([^<]+)<\/span>/);
        const snippet = snippetMatch ? snippetMatch[1].trim() : title;

        results.push({
          title,
          url,
          snippet,
          source: this.extractDomain(url),
          rank: i + 1,
        });
      }

      return results;
    } catch (error) {
      console.error("[WebSearch] DuckDuckGo search failed:", error);
      throw new SearchProviderError(
        "DuckDuckGo search failed",
        "duckduckgo",
        error as Error
      );
    }
  }

  /**
   * DuckDuckGo instant answer API fallback
   */
  private async duckDuckGoInstantAnswer(
    query: WebSearchQuery
  ): Promise<WebSearchResult[]> {
    try {
      const response = await axios.get("https://api.duckduckgo.com/", {
        params: {
          q: query.query,
          format: "json",
          no_html: "1",
          skip_disambig: "1",
        },
        timeout: 10000,
      });

      const results: WebSearchResult[] = [];

      // Process related topics
      if (response.data.RelatedTopics) {
        response.data.RelatedTopics.slice(0, query.maxResults || 10).forEach(
          (topic: any, index: number) => {
            if (topic.FirstURL && topic.Text) {
              results.push({
                title:
                  topic.Text.split(" - ")[0] || topic.Text.substring(0, 60),
                url: topic.FirstURL,
                snippet: topic.Text,
                source: this.extractDomain(topic.FirstURL),
                rank: index + 1,
              });
            }
          }
        );
      }

      // Add abstract if available and no other results
      if (
        results.length === 0 &&
        response.data.Abstract &&
        response.data.AbstractURL
      ) {
        results.push({
          title: response.data.Heading || query.query,
          url: response.data.AbstractURL,
          snippet: response.data.Abstract,
          source: this.extractDomain(response.data.AbstractURL),
          rank: 1,
        });
      }

      return results;
    } catch (error) {
      throw new SearchProviderError(
        "DuckDuckGo search failed",
        "duckduckgo",
        error as Error
      );
    }
  }

  /**
   * Bing Search implementation
   */
  private async bingSearch(query: WebSearchQuery): Promise<WebSearchResult[]> {
    if (!process.env.BING_SEARCH_API_KEY) {
      throw new SearchProviderError(
        "Bing Search API key not configured",
        "bing"
      );
    }

    const params = {
      q: query.query,
      count: Math.min(query.maxResults || 10, 50),
      safeSearch: query.safeSearch ? "Strict" : "Off",
      mkt: query.region || "en-US",
      freshness: this.mapBingDateRange(query.dateRange),
    };

    const response = await axios.get(
      "https://api.bing.microsoft.com/v7.0/search",
      {
        params,
        headers: {
          "Ocp-Apim-Subscription-Key": process.env.BING_SEARCH_API_KEY,
        },
        timeout: 10000,
      }
    );

    if (!response.data.webPages?.value) {
      return [];
    }

    return response.data.webPages.value.map((item: any, index: number) => ({
      title: item.name,
      url: item.url,
      snippet: item.snippet,
      publishedDate: item.dateLastCrawled,
      source: this.extractDomain(item.url),
      rank: index + 1,
    }));
  }

  /**
   * Generate cache key for query
   */
  private generateCacheKey(query: WebSearchQuery): string {
    return `search:${JSON.stringify(query)}`;
  }

  /**
   * Check rate limit for provider
   */
  private checkRateLimit(provider: string): boolean {
    const now = Date.now();
    const limit = this.rateLimits.get(provider);

    if (!limit) {
      this.rateLimits.set(provider, {
        count: 1,
        resetTime: now + 24 * 60 * 60 * 1000,
      });
      return true;
    }

    if (now > limit.resetTime) {
      this.rateLimits.set(provider, {
        count: 1,
        resetTime: now + 24 * 60 * 60 * 1000,
      });
      return true;
    }

    const providerConfig = this.providers.find((p) => p.name === provider);
    if (limit.count >= (providerConfig?.rateLimit || 1000)) {
      return false;
    }

    limit.count++;
    return true;
  }

  /**
   * Map date range to Google format
   */
  private mapDateRange(dateRange?: string): string | undefined {
    switch (dateRange) {
      case "day":
        return "d1";
      case "week":
        return "w1";
      case "month":
        return "m1";
      case "year":
        return "y1";
      default:
        return undefined;
    }
  }

  /**
   * Map date range to Bing format
   */
  private mapBingDateRange(dateRange?: string): string | undefined {
    switch (dateRange) {
      case "day":
        return "Day";
      case "week":
        return "Week";
      case "month":
        return "Month";
      default:
        return undefined;
    }
  }

  /**
   * Extract domain from URL
   */
  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname.replace("www.", "");
    } catch {
      return "unknown";
    }
  }

  /**
   * Validate API keys
   */
  public validateApiKeys(): boolean {
    const googleValid =
      !this.providers.find((p) => p.name === "google") ||
      (!!process.env.GOOGLE_SEARCH_API_KEY &&
        !!process.env.GOOGLE_SEARCH_ENGINE_ID);
    const bingValid =
      !this.providers.find((p) => p.name === "bing") ||
      !!process.env.BING_SEARCH_API_KEY;

    return googleValid && bingValid;
  }
}
