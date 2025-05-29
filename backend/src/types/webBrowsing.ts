/**
 * Web Browsing Type Definitions for MCP AI Workbench
 * Comprehensive interfaces for web search, scraping, and browser automation
 */

export interface WebSearchQuery {
  query: string;
  maxResults?: number;
  dateRange?: 'day' | 'week' | 'month' | 'year' | 'all';
  language?: string;
  region?: string;
  safeSearch?: boolean;
}

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  publishedDate?: string;
  source: string;
  favicon?: string;
  imageUrl?: string;
  rank: number;
}

export interface WebPageContent {
  url: string;
  title: string;
  content: string;
  cleanText: string;
  summary: string;
  wordCount: number;
  readingTime: number;
  links: WebLink[];
  images: WebImage[];
  videos: WebVideo[];
  metadata: WebMetadata;
  structure: ContentStructure;
}

export interface WebLink {
  url: string;
  text: string;
  type: 'internal' | 'external';
}

export interface WebImage {
  url: string;
  alt: string;
  width?: number;
  height?: number;
}

export interface WebVideo {
  url: string;
  title: string;
  thumbnail?: string;
}

export interface WebMetadata {
  description?: string;
  keywords?: string[];
  author?: string;
  publishedDate?: string;
  modifiedDate?: string;
  canonicalUrl?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  twitterCard?: string;
  lang?: string;
}

export interface ContentStructure {
  headings: Heading[];
  paragraphs: number;
  lists: number;
  tables: number;
  codeBlocks: number;
}

export interface Heading {
  level: number;
  text: string;
  id?: string;
}

export interface BrowserAction {
  type: 'navigate' | 'click' | 'scroll' | 'type' | 'wait' | 'screenshot' | 'extract';
  target?: string;
  value?: string;
  options?: Record<string, any>;
}

export interface BrowserSession {
  id: string;
  url: string;
  title: string;
  isActive: boolean;
  createdAt: Date;
  lastActivity: Date;
}

export interface ScreenshotOptions {
  fullPage?: boolean;
  width?: number;
  height?: number;
  quality?: number;
  format?: 'png' | 'jpg' | 'webp';
}

export interface WebSearchParams {
  query: string;
  maxResults?: number;
  dateRange?: string;
  language?: string;
  region?: string;
  safeSearch?: boolean;
}

export interface WebFetchParams {
  url: string;
  extractContent?: boolean;
  generateSummary?: boolean;
  includeMetadata?: boolean;
}

export interface WebBrowseParams {
  sessionId?: string;
  url?: string;
  actions?: BrowserAction[];
}

export interface WebScreenshotParams {
  sessionId: string;
  options?: ScreenshotOptions;
}

export interface WebExtractParams {
  sessionId: string;
  selector?: string;
  extractType?: 'text' | 'html' | 'links' | 'images';
}

export interface WebResearchParams {
  topic: string;
  depth?: 'basic' | 'detailed' | 'comprehensive';
  sources?: number;
  includeNews?: boolean;
}

export interface WebVerifyParams {
  claim: string;
  sources?: number;
  confidenceThreshold?: number;
}

// Response interfaces
export interface WebSearchResponse {
  success: boolean;
  results?: WebSearchResult[];
  totalResults?: number;
  searchTime?: number;
  error?: string;
}

export interface WebFetchResponse {
  success: boolean;
  content?: WebPageContent;
  error?: string;
}

export interface WebBrowseResponse {
  success: boolean;
  sessionId?: string;
  currentUrl?: string;
  title?: string;
  content?: any;
  error?: string;
}

export interface WebScreenshotResponse {
  success: boolean;
  screenshot?: string; // base64 encoded
  error?: string;
}

export interface WebExtractResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export interface WebResearchResponse {
  success: boolean;
  research?: string;
  sources?: WebSearchResult[];
  confidence?: number;
  error?: string;
}

export interface WebVerifyResponse {
  success: boolean;
  verified?: boolean;
  confidence?: number;
  sources?: WebSearchResult[];
  evidence?: string;
  error?: string;
}

// Configuration interfaces
export interface SearchProviderConfig {
  name: string;
  enabled: boolean;
  apiKey?: string;
  priority: number;
  rateLimit?: number;
}

export interface WebBrowsingConfig {
  searchProviders: SearchProviderConfig[];
  maxConcurrentBrowsers: number;
  browserTimeout: number;
  contentCacheTTL: number;
  userAgent: string;
  maxContentLength: number;
  enableJavaScript: boolean;
  respectRobotsTxt: boolean;
}

// Cache interfaces
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface SearchCache {
  [key: string]: CacheEntry<WebSearchResult[]>;
}

export interface ContentCache {
  [url: string]: CacheEntry<WebPageContent>;
}

// Error types
export class WebBrowsingError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'WebBrowsingError';
  }
}

export class SearchProviderError extends WebBrowsingError {
  constructor(message: string, public provider: string, originalError?: Error) {
    super(message, 'SEARCH_PROVIDER_ERROR', undefined, originalError);
  }
}

export class ContentExtractionError extends WebBrowsingError {
  constructor(message: string, public url: string, originalError?: Error) {
    super(message, 'CONTENT_EXTRACTION_ERROR', undefined, originalError);
  }
}

export class BrowserAutomationError extends WebBrowsingError {
  constructor(message: string, public sessionId?: string, originalError?: Error) {
    super(message, 'BROWSER_AUTOMATION_ERROR', undefined, originalError);
  }
}
