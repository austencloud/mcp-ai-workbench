# Complete Web Browsing Implementation Plan for MCP AI Workbench

## 🎯 OVERVIEW

Add comprehensive web browsing capabilities to your MCP AI Workbench that matches frontier model capabilities including web search, page fetching, content analysis, screenshot capture, and interactive browsing.

## 📦 DEPENDENCIES TO INSTALL

### Backend Dependencies

```bash
cd backend
npm install cheerio puppeteer duckduckgo-search google-search-results-nodejs readability mercury-parser url-parse robots-parser sitemap-parser user-agents random-useragent playwright-extra puppeteer-extra-plugin-stealth
```

### Development Dependencies

```bash
npm install --save-dev @types/cheerio @types/user-agents
```

## 🗂️ FILE STRUCTURE TO CREATE

```
backend/src/
├── services/
│   ├── webBrowsingService.ts          (Main web browsing orchestrator)
│   ├── webSearchService.ts            (Search providers)
│   ├── webScrapingService.ts          (Content extraction)
│   ├── webInteractionService.ts       (Browser automation)
│   └── webAnalysisService.ts          (Content analysis & summarization)
├── controllers/
│   └── webController.ts               (HTTP endpoints)
├── utils/
│   ├── contentExtractor.ts            (Text extraction utilities)
│   ├── urlValidator.ts                (URL validation & sanitization)
│   └── browserManager.ts              (Browser instance management)
└── types/
    └── webBrowsing.ts                 (TypeScript interfaces)
```

## 🏗️ DETAILED IMPLEMENTATION SPECIFICATIONS

### 1. Type Definitions File (types/webBrowsing.ts)

Create comprehensive TypeScript interfaces:

```typescript
// Define these exact interfaces:

export interface WebSearchQuery {
  query: string;
  maxResults?: number;
  dateRange?: "day" | "week" | "month" | "year" | "all";
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
  type: "internal" | "external";
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
  type:
    | "navigate"
    | "click"
    | "scroll"
    | "type"
    | "wait"
    | "screenshot"
    | "extract";
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
  format?: "png" | "jpg" | "webp";
}
```

### 2. Web Search Service (services/webSearchService.ts)

Implement multiple search providers with fallback logic:

**Class Structure:**

- WebSearchService class with constructor taking config options
- Private methods for each search provider
- Public method search() that tries providers in order
- Rate limiting and caching mechanisms

**Search Providers to Implement:**

1. **Google Custom Search API (primary)**

   - Use Google Custom Search JSON API
   - Handle API key validation
   - Parse results into WebSearchResult[]

2. **DuckDuckGo Instant Answer API (secondary)**

   - Use duckduckgo-search npm package
   - Handle both instant answers and web results

3. **Bing Search API (tertiary)**
   - Implement if API key provided
   - Use Bing Web Search API v7

**Key Methods:**

- `async search(query: WebSearchQuery): Promise<WebSearchResult[]>`
- `async searchNews(query: string): Promise<WebSearchResult[]>`
- `async searchImages(query: string): Promise<WebSearchResult[]>`
- `private async googleSearch()`, `private async duckDuckGoSearch()`, etc.
- `private validateApiKeys(): boolean`
- `private formatResults(rawResults: any[]): WebSearchResult[]`

**Error Handling:**

- Retry logic with exponential backoff
- Provider fallback when one fails
- Rate limit handling
- Invalid query validation

### 3. Web Scraping Service (services/webScrapingService.ts)

Handle content extraction from web pages:

**Class Structure:**

- WebScrapingService class with browser management
- Methods for different extraction strategies
- Content cleaning and formatting

**Key Methods:**

- `async fetchPage(url: string, options?: FetchOptions): Promise<WebPageContent>`
- `async fetchMultiplePages(urls: string[]): Promise<WebPageContent[]>`
- `private async fetchWithAxios(url: string): Promise<WebPageContent>`
- `private async fetchWithPuppeteer(url: string): Promise<WebPageContent>`
- `private extractMetadata(html: string, url: string): WebMetadata`
- `private extractContent(html: string): string`
- `private analyzeStructure(html: string): ContentStructure`
- `private generateSummary(content: string): string`

**Content Extraction Logic:**

- **Primary Strategy:** Use readability algorithms (mercury-parser or similar)
- **Fallback Strategy:** Cheerio with smart selectors
- **Last Resort:** Full text extraction with cleaning

**Content Cleaning Pipeline:**

- Remove scripts, styles, navigation, ads
- Extract main content using heuristics
- Clean whitespace and formatting
- Generate reading time estimate
- Create content summary using AI or extractive methods

### 4. Web Interaction Service (services/webInteractionService.ts)

Browser automation for interactive browsing:

**Class Structure:**

- WebInteractionService class managing browser sessions
- Session persistence and cleanup
- Action execution with error handling

**Browser Management:**

- Initialize Puppeteer with stealth plugin
- Manage multiple browser contexts/sessions
- Handle browser cleanup and resource management
- Set realistic user agents and headers

**Key Methods:**

- `async createSession(): Promise<string>` (returns session ID)
- `async executeAction(sessionId: string, action: BrowserAction): Promise<any>`
- `async takeScreenshot(sessionId: string, options?: ScreenshotOptions): Promise<Buffer>`
- `async getCurrentUrl(sessionId: string): Promise<string>`
- `async getCurrentTitle(sessionId: string): Promise<string>`
- `async extractPageContent(sessionId: string): Promise<WebPageContent>`
- `async closeSession(sessionId: string): Promise<void>`
- `private async getSessionPage(sessionId: string): Promise<Page>`

**Supported Actions:**

- Navigate to URL
- Click elements (by selector, text, coordinates)
- Type text into inputs
- Scroll (to element, by pixels, to bottom)
- Wait for elements/time/network
- Extract specific elements
- Take screenshots

### 5. Web Analysis Service (services/webAnalysisService.ts)

AI-powered content analysis and summarization:

**Integration Points:**

- Use existing AIProviderService for content analysis
- Provide specialized prompts for web content
- Handle large content chunking for AI processing

**Key Methods:**

- `async summarizeContent(content: WebPageContent): Promise<string>`
- `async analyzeRelevance(content: WebPageContent, query: string): Promise<number>`
- `async extractKeyPoints(content: WebPageContent): Promise<string[]>`
- `async answerFromContent(content: WebPageContent, question: string): Promise<string>`
- `async comparePages(pages: WebPageContent[]): Promise<string>`

**Analysis Features:**

- Automatic content summarization
- Key point extraction
- Relevance scoring against search queries
- Question answering from page content
- Content comparison across multiple pages

### 6. Main Web Browsing Service (services/webBrowsingService.ts)

Orchestrate all web browsing capabilities:

**Class Structure:**

- Main service class that coordinates other services
- High-level methods for common browsing tasks
- Integration with existing chat system

**Dependencies:**

```typescript
private searchService: WebSearchService;
private scrapingService: WebScrapingService;
private interactionService: WebInteractionService;
private analysisService: WebAnalysisService;
private aiService: AIProviderService;
```

**Key Methods:**

- `async searchAndAnalyze(query: string): Promise<{results: WebSearchResult[], topContent: WebPageContent[]}>`
- `async researchTopic(topic: string): Promise<string>` (comprehensive research)
- `async verifyInformation(claim: string): Promise<{verified: boolean, sources: WebSearchResult[], evidence: string}>`
- `async compareProducts(products: string[]): Promise<string>`
- `async getRecentNews(topic: string): Promise<WebSearchResult[]>`
- `async browsePage(url: string): Promise<WebPageContent>`
- `async interactiveBrowse(sessionId: string, instructions: string): Promise<string>`

### 7. Web Controller (controllers/webController.ts)

HTTP endpoints for web browsing functionality:

**JSON-RPC Methods to Add:**

- `webSearch`: Search the web
- `webFetch`: Fetch and analyze webpage
- `webBrowse`: Interactive browsing session
- `webScreenshot`: Take screenshot
- `webExtract`: Extract specific content
- `webResearch`: Comprehensive topic research
- `webVerify`: Verify information across sources

**Integration with Existing Controller Pattern:**
Follow the same pattern as chatController.ts:

```typescript
export const webController = {
  async webSearch(params: WebSearchParams): Promise<any> {
    // Implementation
  },
  // ... other methods
};
```

### 8. Utility Files

**Content Extractor (utils/contentExtractor.ts)**

- Smart content extraction algorithms
- Reading time calculation
- Text cleaning utilities
- Metadata extraction helpers

**URL Validator (utils/urlValidator.ts)**

- URL validation and sanitization
- Robots.txt checking
- Domain blacklist management
- Rate limiting per domain

**Browser Manager (utils/browserManager.ts)**

- Browser instance pooling
- Resource cleanup
- Performance monitoring
- Session management

## 🔧 ENVIRONMENT VARIABLES TO ADD

Add to .env file:

```env
# Web Browsing Configuration
GOOGLE_SEARCH_API_KEY=your_google_api_key
GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id
BING_SEARCH_API_KEY=your_bing_api_key
WEB_BROWSING_ENABLED=true
MAX_CONCURRENT_BROWSERS=3
BROWSER_TIMEOUT=30000
CONTENT_CACHE_TTL=3600
USER_AGENT=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36
```

## 🔗 INTEGRATION WITH EXISTING CHAT SYSTEM

### Modify AIProviderService (services/aiProviderService.ts)

Add web browsing context to chat messages:

**Add Web Context Method:**

```typescript
async addWebContext(messages: ChatMessage[], query: string): Promise<ChatMessage[]> {
  // Search web for relevant information
  // Add context as system message
  // Return enhanced message array
}
```

**Modify Chat Method:**
Detect when web browsing is needed based on message content and automatically include web context.

### Update Chat Controller (controllers/chatController.ts)

Add web-aware chat processing:

- Detect queries that need web search
- Automatically search and include relevant context
- Provide citations and sources in responses

### Frontend Integration Points

Add these JSON-RPC methods to the main index.ts switch statement:

```typescript
case "webSearch":
  result = await webController.webSearch(params);
  break;
case "webFetch":
  result = await webController.webFetch(params);
  break;
// ... etc for all web methods
```

## 🧪 TESTING REQUIREMENTS

### Unit Tests (tests/ directory)

- Test each service independently
- Mock external API calls
- Test error handling scenarios
- Validate content extraction accuracy

### Integration Tests

- Test complete web browsing workflows
- Test chat integration with web context
- Test rate limiting and resource management

### Example Test Cases

- Search for "latest AI news" and verify results
- Fetch Wikipedia page and validate content extraction
- Test browser automation with form filling
- Verify content summarization accuracy

## 🔒 SECURITY CONSIDERATIONS

### URL Validation

- Validate all URLs before processing
- Block dangerous file types and protocols
- Implement domain whitelist/blacklist
- Check robots.txt compliance

### Content Sanitization

- Strip all HTML/JavaScript from extracted content
- Validate image URLs and sizes
- Rate limit requests per user/session

### Privacy Protection

- Don't store personal information from scraped pages
- Respect website privacy policies
- Clear browser data between sessions

## 🚀 IMPLEMENTATION ORDER

1. **Phase 1:** Create type definitions and basic search service
2. **Phase 2:** Implement content scraping with Cheerio
3. **Phase 3:** Add browser automation with Puppeteer
4. **Phase 4:** Integrate with AI analysis service
5. **Phase 5:** Create main orchestration service
6. **Phase 6:** Add HTTP endpoints and chat integration
7. **Phase 7:** Implement caching and optimization
8. **Phase 8:** Add comprehensive error handling and logging

## 📝 SPECIFIC IMPLEMENTATION NOTES

### Error Handling Pattern

Every method should follow this pattern:

```typescript
try {
  // Implementation
  return { success: true, data: result };
} catch (error) {
  console.error(`Service error:`, error);
  return { success: false, error: error.message };
}
```

### Logging Pattern

Add comprehensive logging:

```typescript
console.log(`[WebBrowsing] Starting ${operation} with params:`, params);
console.log(`[WebBrowsing] ${operation} completed in ${duration}ms`);
```

### Caching Strategy

- Cache search results for 1 hour
- Cache page content for 30 minutes
- Use URL as cache key
- Implement LRU cache with size limits

## 🎯 FRONTEND INTEGRATION

### New UI Components Needed

1. **Web Search Interface**

   - Search input with advanced options
   - Results display with thumbnails
   - Source credibility indicators

2. **Web Content Viewer**

   - Rendered page content
   - Extracted text view
   - Metadata display

3. **Browser Session Manager**

   - Active sessions list
   - Screenshot preview
   - Session controls

4. **Research Assistant Panel**
   - Topic research interface
   - Information verification tools
   - Source comparison view

### Chat Integration Features

1. **Automatic Web Context**

   - Detect when queries need web search
   - Show "Searching web..." indicator
   - Display sources used in response

2. **Citation System**

   - Inline source references
   - Expandable source details
   - Link to original content

3. **Fact Checking**
   - Verify claims against multiple sources
   - Show confidence levels
   - Highlight conflicting information

## 🔧 CONFIGURATION OPTIONS

### Search Provider Priority

```typescript
const searchConfig = {
  providers: ["google", "duckduckgo", "bing"],
  fallbackEnabled: true,
  maxRetries: 3,
  timeout: 10000,
};
```

### Content Extraction Settings

```typescript
const extractionConfig = {
  maxContentLength: 50000,
  includeImages: true,
  includeLinks: true,
  generateSummary: true,
  summaryLength: 500,
};
```

### Browser Automation Settings

```typescript
const browserConfig = {
  headless: true,
  viewport: { width: 1920, height: 1080 },
  userAgent: "custom-agent",
  timeout: 30000,
  maxSessions: 5,
};
```

## 📊 PERFORMANCE CONSIDERATIONS

### Optimization Strategies

- Implement connection pooling for HTTP requests
- Use browser instance pooling for Puppeteer
- Cache frequently accessed content
- Implement request deduplication
- Use streaming for large content processing

### Resource Management

- Set memory limits for browser instances
- Implement session cleanup timers
- Monitor and log resource usage
- Graceful degradation when limits reached

### Rate Limiting

- Implement per-domain rate limiting
- Respect robots.txt crawl delays
- Use exponential backoff for retries
- Queue requests to prevent overwhelming servers

---

This comprehensive plan provides complete specifications for implementing web browsing capabilities that match frontier AI models. Each component is designed to work independently while integrating seamlessly with your existing MCP architecture.

**Status:** Ready for implementation
**Priority:** High-impact feature for AI assistant capabilities
**Estimated Timeline:** 2-3 weeks for full implementation
