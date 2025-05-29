/**
 * Web Interaction Service for MCP AI Workbench
 * Browser automation with Puppeteer for interactive browsing
 */

import puppeteer, { Browser, Page } from "puppeteer";
import { v4 as uuidv4 } from "uuid";
import {
  BrowserAction,
  BrowserSession,
  ScreenshotOptions,
  WebPageContent,
  BrowserAutomationError,
} from "../types/webBrowsing";

export class WebInteractionService {
  private browser: Browser | null = null;
  private sessions: Map<string, { page: Page; session: BrowserSession }> =
    new Map();
  private maxSessions: number;
  private sessionTimeout: number;

  constructor() {
    this.maxSessions = parseInt(process.env.MAX_CONCURRENT_BROWSERS || "3");
    this.sessionTimeout = parseInt(process.env.BROWSER_TIMEOUT || "300000"); // 5 minutes
  }

  /**
   * Initialize browser instance
   */
  private async initializeBrowser(): Promise<Browser> {
    if (!this.browser) {
      console.log("[WebInteraction] Initializing browser...");

      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--no-first-run",
          "--no-zygote",
          "--disable-gpu",
          "--disable-background-timer-throttling",
          "--disable-backgrounding-occluded-windows",
          "--disable-renderer-backgrounding",
        ],
        defaultViewport: {
          width: 1920,
          height: 1080,
        },
      });

      // Handle browser disconnect
      this.browser.on("disconnected", () => {
        console.log("[WebInteraction] Browser disconnected");
        this.browser = null;
        this.sessions.clear();
      });
    }

    return this.browser;
  }

  /**
   * Create new browsing session
   */
  async createSession(): Promise<string> {
    try {
      // Check session limit
      if (this.sessions.size >= this.maxSessions) {
        await this.cleanupOldestSession();
      }

      const browser = await this.initializeBrowser();
      const page = await browser.newPage();

      // Set realistic user agent and headers
      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      );

      await page.setExtraHTTPHeaders({
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
      });

      // Set viewport
      await page.setViewport({ width: 1920, height: 1080 });

      const sessionId = uuidv4();
      const session: BrowserSession = {
        id: sessionId,
        url: "about:blank",
        title: "New Session",
        isActive: true,
        createdAt: new Date(),
        lastActivity: new Date(),
      };

      this.sessions.set(sessionId, { page, session });

      // Set up session timeout
      setTimeout(() => {
        this.closeSession(sessionId).catch(console.error);
      }, this.sessionTimeout);

      console.log(`[WebInteraction] Created session: ${sessionId}`);
      return sessionId;
    } catch (error) {
      console.error("[WebInteraction] Failed to create session:", error);
      throw new BrowserAutomationError(
        "Failed to create browser session",
        undefined,
        error as Error
      );
    }
  }

  /**
   * Execute browser action
   */
  async executeAction(sessionId: string, action: BrowserAction): Promise<any> {
    try {
      const sessionData = this.sessions.get(sessionId);
      if (!sessionData) {
        throw new BrowserAutomationError("Session not found", sessionId);
      }

      const { page, session } = sessionData;
      session.lastActivity = new Date();

      console.log(
        `[WebInteraction] Executing action: ${action.type} in session ${sessionId}`
      );

      switch (action.type) {
        case "navigate":
          return await this.navigate(page, action.target!, session);

        case "click":
          return await this.click(page, action.target!, action.options);

        case "type":
          return await this.type(
            page,
            action.target!,
            action.value!,
            action.options
          );

        case "scroll":
          return await this.scroll(
            page,
            action.target,
            action.value,
            action.options
          );

        case "wait":
          return await this.wait(
            page,
            action.target,
            action.value,
            action.options
          );

        case "screenshot":
          return await this.takeScreenshot(sessionId, action.options);

        case "extract":
          return await this.extractPageContent(sessionId);

        default:
          throw new BrowserAutomationError(
            `Unknown action type: ${action.type}`,
            sessionId
          );
      }
    } catch (error) {
      console.error(`[WebInteraction] Action failed:`, error);
      throw new BrowserAutomationError(
        `Action ${action.type} failed`,
        sessionId,
        error as Error
      );
    }
  }

  /**
   * Take screenshot
   */
  async takeScreenshot(
    sessionId: string,
    options: ScreenshotOptions = {}
  ): Promise<Buffer> {
    const page = await this.getSessionPage(sessionId);

    const screenshotOptions: any = {
      fullPage: options.fullPage || false,
      type:
        ((options.format === "jpg" ? "jpeg" : options.format) as
          | "png"
          | "jpeg"
          | "webp") || "png",
      clip:
        options.width && options.height
          ? {
              x: 0,
              y: 0,
              width: options.width,
              height: options.height,
            }
          : undefined,
    };

    // Only set quality for JPEG format
    if (screenshotOptions.type === "jpeg") {
      screenshotOptions.quality = options.quality || 90;
    }

    const screenshotBuffer = await page.screenshot(screenshotOptions);

    return Buffer.from(screenshotBuffer);
  }

  /**
   * Get current URL
   */
  async getCurrentUrl(sessionId: string): Promise<string> {
    const page = await this.getSessionPage(sessionId);
    return page.url();
  }

  /**
   * Get current title
   */
  async getCurrentTitle(sessionId: string): Promise<string> {
    const page = await this.getSessionPage(sessionId);
    return await page.title();
  }

  /**
   * Extract page content
   */
  async extractPageContent(sessionId: string): Promise<WebPageContent> {
    const page = await this.getSessionPage(sessionId);

    // Get page content
    const content = await page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        html: document.documentElement.outerHTML,
        text: document.body.innerText,
        links: Array.from(document.querySelectorAll("a[href]")).map((a) => ({
          url: (a as HTMLAnchorElement).href,
          text: a.textContent?.trim() || "",
        })),
        images: Array.from(document.querySelectorAll("img[src]")).map(
          (img) => ({
            url: (img as HTMLImageElement).src,
            alt: (img as HTMLImageElement).alt || "",
          })
        ),
      };
    });

    // Create WebPageContent object
    const wordCount = content.text.split(/\s+/).length;

    return {
      url: content.url,
      title: content.title,
      content: content.html,
      cleanText: content.text,
      summary: content.text.substring(0, 500) + "...",
      wordCount,
      readingTime: Math.ceil(wordCount / 200),
      links: content.links.map((link, index) => ({
        url: link.url,
        text: link.text,
        type:
          new URL(link.url).hostname === new URL(content.url).hostname
            ? "internal"
            : "external",
      })),
      images: content.images.map((img) => ({
        url: img.url,
        alt: img.alt,
      })),
      videos: [],
      metadata: {
        description: content.title,
      },
      structure: {
        headings: [],
        paragraphs: 0,
        lists: 0,
        tables: 0,
        codeBlocks: 0,
      },
    };
  }

  /**
   * Close session
   */
  async closeSession(sessionId: string): Promise<void> {
    try {
      const sessionData = this.sessions.get(sessionId);
      if (sessionData) {
        await sessionData.page.close();
        this.sessions.delete(sessionId);
        console.log(`[WebInteraction] Closed session: ${sessionId}`);
      }
    } catch (error) {
      console.error(
        `[WebInteraction] Failed to close session ${sessionId}:`,
        error
      );
    }
  }

  /**
   * Get session page
   */
  private async getSessionPage(sessionId: string): Promise<Page> {
    const sessionData = this.sessions.get(sessionId);
    if (!sessionData) {
      throw new BrowserAutomationError("Session not found", sessionId);
    }
    return sessionData.page;
  }

  /**
   * Navigate to URL
   */
  private async navigate(
    page: Page,
    url: string,
    session: BrowserSession
  ): Promise<void> {
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
    session.url = url;
    session.title = await page.title();
  }

  /**
   * Click element
   */
  private async click(
    page: Page,
    selector: string,
    options: any = {}
  ): Promise<void> {
    await page.waitForSelector(selector, { timeout: 10000 });
    await page.click(selector, options);
  }

  /**
   * Type text
   */
  private async type(
    page: Page,
    selector: string,
    text: string,
    options: any = {}
  ): Promise<void> {
    await page.waitForSelector(selector, { timeout: 10000 });
    await page.type(selector, text, { delay: options.delay || 50 });
  }

  /**
   * Scroll page
   */
  private async scroll(
    page: Page,
    target?: string,
    value?: string,
    options: any = {}
  ): Promise<void> {
    if (target) {
      await page.waitForSelector(target, { timeout: 10000 });
      await page.evaluate((selector) => {
        const element = document.querySelector(selector);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      }, target);
    } else if (value) {
      const pixels = parseInt(value);
      await page.evaluate((px) => {
        window.scrollBy(0, px);
      }, pixels);
    } else {
      // Scroll to bottom
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
    }
  }

  /**
   * Wait for condition
   */
  private async wait(
    page: Page,
    target?: string,
    value?: string,
    options: any = {}
  ): Promise<void> {
    if (target) {
      if (target.startsWith("selector:")) {
        await page.waitForSelector(target.replace("selector:", ""), {
          timeout: 30000,
        });
      } else if (target === "navigation") {
        await page.waitForNavigation({
          waitUntil: "networkidle2",
          timeout: 30000,
        });
      }
    } else if (value) {
      const ms = parseInt(value);
      await new Promise((resolve) => setTimeout(resolve, ms));
    }
  }

  /**
   * Cleanup oldest session when limit reached
   */
  private async cleanupOldestSession(): Promise<void> {
    let oldestSession: string | null = null;
    let oldestTime = Date.now();

    for (const [sessionId, { session }] of this.sessions) {
      if (session.lastActivity.getTime() < oldestTime) {
        oldestTime = session.lastActivity.getTime();
        oldestSession = sessionId;
      }
    }

    if (oldestSession) {
      await this.closeSession(oldestSession);
    }
  }

  /**
   * Cleanup all sessions and close browser
   */
  async cleanup(): Promise<void> {
    console.log("[WebInteraction] Cleaning up all sessions...");

    for (const sessionId of this.sessions.keys()) {
      await this.closeSession(sessionId);
    }

    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
