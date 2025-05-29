/**
 * Web Scraping Service for MCP AI Workbench
 * Intelligent content extraction with multiple strategies
 */

import axios from "axios";
import * as cheerio from "cheerio";
import NodeCache from "node-cache";
import { URL } from "url";

import {
  WebPageContent,
  WebMetadata,
  ContentStructure,
  WebLink,
  WebImage,
  WebVideo,
  Heading,
  ContentExtractionError,
} from "../types/webBrowsing";

export interface FetchOptions {
  timeout?: number;
  userAgent?: string;
  followRedirects?: boolean;
  maxContentLength?: number;
  enableJavaScript?: boolean;
}

export class WebScrapingService {
  private cache: NodeCache;
  private userAgent: string;

  constructor() {
    // Cache content for 30 minutes
    this.cache = new NodeCache({ stdTTL: 1800 });
    this.userAgent =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
  }

  /**
   * Main content fetching method with fallback strategies
   */
  async fetchPage(
    url: string,
    options: FetchOptions = {}
  ): Promise<WebPageContent> {
    const startTime = Date.now();
    console.log(`[WebScraping] Fetching page: ${url}`);

    try {
      // Validate URL
      this.validateUrl(url);

      // Check cache first
      const cacheKey = `content:${url}`;
      const cachedContent = this.cache.get<WebPageContent>(cacheKey);
      if (cachedContent) {
        console.log(`[WebScraping] Cache hit for URL: ${url}`);
        return cachedContent;
      }

      // Try primary strategy: Axios + Cheerio
      let content: WebPageContent;
      try {
        content = await this.fetchWithAxios(url, options);
      } catch (error) {
        console.log(
          `[WebScraping] Axios strategy failed, trying Puppeteer fallback`
        );
        content = await this.fetchWithPuppeteer(url, options);
      }

      // Cache successful result
      this.cache.set(cacheKey, content);

      const duration = Date.now() - startTime;
      console.log(
        `[WebScraping] Page fetched successfully in ${duration}ms, ${content.wordCount} words`
      );

      return content;
    } catch (error) {
      console.error(`[WebScraping] Failed to fetch page: ${url}`, error);
      throw new ContentExtractionError(
        `Failed to fetch page: ${url}`,
        url,
        error as Error
      );
    }
  }

  /**
   * Fetch multiple pages concurrently
   */
  async fetchMultiplePages(
    urls: string[],
    options: FetchOptions = {}
  ): Promise<WebPageContent[]> {
    console.log(`[WebScraping] Fetching ${urls.length} pages concurrently`);

    const promises = urls.map((url) =>
      this.fetchPage(url, options).catch((error) => {
        console.error(`[WebScraping] Failed to fetch ${url}:`, error);
        return null;
      })
    );

    const results = await Promise.all(promises);
    return results.filter(
      (result): result is WebPageContent => result !== null
    );
  }

  /**
   * Primary strategy: Axios + Cheerio
   */
  private async fetchWithAxios(
    url: string,
    options: FetchOptions
  ): Promise<WebPageContent> {
    const response = await axios.get(url, {
      timeout: options.timeout || 30000,
      maxContentLength: options.maxContentLength || 10 * 1024 * 1024, // 10MB
      headers: {
        "User-Agent": options.userAgent || this.userAgent,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
      },
      maxRedirects: options.followRedirects !== false ? 5 : 0,
    });

    const html = response.data;
    const $ = cheerio.load(html);

    return this.extractContentFromCheerio($, url);
  }

  /**
   * Fallback strategy: Puppeteer (for JavaScript-heavy sites)
   */
  private async fetchWithPuppeteer(
    url: string,
    options: FetchOptions
  ): Promise<WebPageContent> {
    // This would require Puppeteer integration
    // For now, throw error to indicate fallback needed
    throw new ContentExtractionError(
      "Puppeteer fallback not yet implemented",
      url
    );
  }

  /**
   * Extract content using Cheerio
   */
  private extractContentFromCheerio(
    $: cheerio.CheerioAPI,
    url: string
  ): WebPageContent {
    // Extract basic page info
    const title = this.extractTitle($);
    const metadata = this.extractMetadata($, url);

    // Remove unwanted elements
    this.cleanDocument($);

    // Extract main content
    const content = this.extractMainContent($);
    const cleanText = this.extractCleanText($);

    // Extract structured data
    const links = this.extractLinks($, url);
    const images = this.extractImages($, url);
    const videos = this.extractVideos($, url);
    const structure = this.analyzeStructure($);

    // Calculate metrics
    const wordCount = this.calculateWordCount(cleanText);
    const readingTime = this.calculateReadingTime(wordCount);

    // Generate summary
    const summary = this.generateSummary(cleanText);

    return {
      url,
      title,
      content,
      cleanText,
      summary,
      wordCount,
      readingTime,
      links,
      images,
      videos,
      metadata,
      structure,
    };
  }

  /**
   * Extract page title
   */
  private extractTitle($: cheerio.CheerioAPI): string {
    return (
      $("title").first().text().trim() ||
      $("h1").first().text().trim() ||
      $('meta[property="og:title"]').attr("content") ||
      "Untitled"
    );
  }

  /**
   * Extract metadata
   */
  private extractMetadata($: cheerio.CheerioAPI, url: string): WebMetadata {
    return {
      description:
        $('meta[name="description"]').attr("content") ||
        $('meta[property="og:description"]').attr("content"),
      keywords: $('meta[name="keywords"]')
        .attr("content")
        ?.split(",")
        .map((k) => k.trim()),
      author:
        $('meta[name="author"]').attr("content") ||
        $('meta[property="article:author"]').attr("content"),
      publishedDate:
        $('meta[property="article:published_time"]').attr("content") ||
        $('meta[name="date"]').attr("content"),
      modifiedDate: $('meta[property="article:modified_time"]').attr("content"),
      canonicalUrl: $('link[rel="canonical"]').attr("href"),
      ogTitle: $('meta[property="og:title"]').attr("content"),
      ogDescription: $('meta[property="og:description"]').attr("content"),
      ogImage: $('meta[property="og:image"]').attr("content"),
      twitterCard: $('meta[name="twitter:card"]').attr("content"),
      lang:
        $("html").attr("lang") ||
        $('meta[http-equiv="content-language"]').attr("content"),
    };
  }

  /**
   * Clean document by removing unwanted elements
   */
  private cleanDocument($: cheerio.CheerioAPI): void {
    // Remove scripts, styles, and other non-content elements
    $("script, style, noscript, iframe, object, embed").remove();

    // Remove navigation, ads, and other common non-content elements
    $("nav, .nav, #nav, .navigation, .navbar").remove();
    $("header, .header, #header").remove();
    $("footer, .footer, #footer").remove();
    $("aside, .sidebar, .side-bar, #sidebar").remove();
    $(".ad, .ads, .advertisement, .banner, .popup").remove();
    $(".social, .share, .sharing, .comments, .comment").remove();

    // Remove elements with common ad/tracking attributes
    $(
      '[class*="ad-"], [id*="ad-"], [class*="google"], [class*="facebook"]'
    ).remove();
  }

  /**
   * Extract main content using readability heuristics
   */
  private extractMainContent($: cheerio.CheerioAPI): string {
    // Try to find main content container
    const contentSelectors = [
      "main",
      '[role="main"]',
      ".main-content",
      ".content",
      ".post-content",
      ".entry-content",
      ".article-content",
      "article",
      ".article",
    ];

    for (const selector of contentSelectors) {
      const element = $(selector).first();
      if (element.length && element.text().trim().length > 100) {
        return element.html() || "";
      }
    }

    // Fallback: find the element with most text content
    let maxLength = 0;
    let bestElement = $("body");

    $("div, section, article").each((_, element) => {
      const $el = $(element);
      const textLength = $el.text().trim().length;
      if (textLength > maxLength) {
        maxLength = textLength;
        bestElement = $el;
      }
    });

    return bestElement.html() || "";
  }

  /**
   * Extract clean text content
   */
  private extractCleanText($: cheerio.CheerioAPI): string {
    return $("body")
      .text()
      .replace(/\s+/g, " ")
      .replace(/\n\s*\n/g, "\n")
      .trim();
  }

  /**
   * Extract links
   */
  private extractLinks($: cheerio.CheerioAPI, baseUrl: string): WebLink[] {
    const links: WebLink[] = [];
    const baseUrlObj = new URL(baseUrl);

    $("a[href]").each((_, element) => {
      const $link = $(element);
      const href = $link.attr("href");
      const text = $link.text().trim();

      if (href && text) {
        try {
          const absoluteUrl = new URL(href, baseUrl).toString();
          const isInternal =
            new URL(absoluteUrl).hostname === baseUrlObj.hostname;

          links.push({
            url: absoluteUrl,
            text,
            type: isInternal ? "internal" : "external",
          });
        } catch {
          // Skip invalid URLs
        }
      }
    });

    return links;
  }

  /**
   * Extract images
   */
  private extractImages($: cheerio.CheerioAPI, baseUrl: string): WebImage[] {
    const images: WebImage[] = [];

    $("img[src]").each((_, element) => {
      const $img = $(element);
      const src = $img.attr("src");
      const alt = $img.attr("alt") || "";

      if (src) {
        try {
          const absoluteUrl = new URL(src, baseUrl).toString();
          images.push({
            url: absoluteUrl,
            alt,
            width: parseInt($img.attr("width") || "0") || undefined,
            height: parseInt($img.attr("height") || "0") || undefined,
          });
        } catch {
          // Skip invalid URLs
        }
      }
    });

    return images;
  }

  /**
   * Extract videos
   */
  private extractVideos($: cheerio.CheerioAPI, baseUrl: string): WebVideo[] {
    const videos: WebVideo[] = [];

    $('video[src], iframe[src*="youtube"], iframe[src*="vimeo"]').each(
      (_, element) => {
        const $video = $(element);
        const src = $video.attr("src");
        const title = $video.attr("title") || $video.attr("alt") || "";

        if (src) {
          try {
            const absoluteUrl = new URL(src, baseUrl).toString();
            videos.push({
              url: absoluteUrl,
              title,
            });
          } catch {
            // Skip invalid URLs
          }
        }
      }
    );

    return videos;
  }

  /**
   * Analyze content structure
   */
  private analyzeStructure($: cheerio.CheerioAPI): ContentStructure {
    const headings: Heading[] = [];

    $("h1, h2, h3, h4, h5, h6").each((_, element) => {
      const $heading = $(element);
      const level = parseInt(element.tagName.charAt(1));
      const text = $heading.text().trim();
      const id = $heading.attr("id");

      if (text) {
        headings.push({ level, text, id });
      }
    });

    return {
      headings,
      paragraphs: $("p").length,
      lists: $("ul, ol").length,
      tables: $("table").length,
      codeBlocks: $("pre, code").length,
    };
  }

  /**
   * Calculate word count
   */
  private calculateWordCount(text: string): number {
    return text.split(/\s+/).filter((word) => word.length > 0).length;
  }

  /**
   * Calculate reading time (average 200 words per minute)
   */
  private calculateReadingTime(wordCount: number): number {
    return Math.ceil(wordCount / 200);
  }

  /**
   * Generate content summary
   */
  private generateSummary(text: string): string {
    // Simple extractive summary - take first few sentences
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 20);
    const summaryLength = Math.min(3, sentences.length);
    return sentences.slice(0, summaryLength).join(". ").trim() + ".";
  }

  /**
   * Validate URL
   */
  private validateUrl(url: string): void {
    try {
      const urlObj = new URL(url);
      if (!["http:", "https:"].includes(urlObj.protocol)) {
        throw new Error("Invalid protocol");
      }
    } catch (error) {
      throw new ContentExtractionError(
        `Invalid URL: ${url}`,
        url,
        error as Error
      );
    }
  }
}
