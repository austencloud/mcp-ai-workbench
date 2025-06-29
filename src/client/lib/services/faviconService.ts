/**
 * Favicon Service for MCP AI Workbench
 * Fetches and caches website favicons for search progress display
 */

export interface FaviconInfo {
  url: string;
  domain: string;
  cached: boolean;
  error?: string;
}

class FaviconService {
  private cache: Map<string, string> = new Map();
  private fallbackIcons: Map<string, string> = new Map();

  constructor() {
    // Initialize common fallback icons
    this.fallbackIcons.set('google.com', '🔍');
    this.fallbackIcons.set('wikipedia.org', '📚');
    this.fallbackIcons.set('stackoverflow.com', '💻');
    this.fallbackIcons.set('github.com', '🐙');
    this.fallbackIcons.set('reddit.com', '🤖');
    this.fallbackIcons.set('youtube.com', '📺');
    this.fallbackIcons.set('twitter.com', '🐦');
    this.fallbackIcons.set('facebook.com', '📘');
    this.fallbackIcons.set('linkedin.com', '💼');
    this.fallbackIcons.set('medium.com', '📝');
    this.fallbackIcons.set('dev.to', '👨‍💻');
    this.fallbackIcons.set('news.ycombinator.com', '🧡');
    this.fallbackIcons.set('quora.com', '❓');
    this.fallbackIcons.set('amazon.com', '📦');
    this.fallbackIcons.set('ebay.com', '🛒');
  }

  /**
   * Get favicon URL for a domain
   */
  async getFavicon(domain: string): Promise<FaviconInfo> {
    // Check cache first
    const cached = this.cache.get(domain);
    if (cached) {
      return {
        url: cached,
        domain,
        cached: true
      };
    }

    try {
      // Try multiple favicon sources
      const faviconUrls = [
        `https://${domain}/favicon.ico`,
        `https://www.${domain}/favicon.ico`,
        `https://${domain}/favicon.png`,
        `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
        `https://icons.duckduckgo.com/ip3/${domain}.ico`,
        `https://www.google.com/s2/favicons?domain=${domain}`
      ];

      for (const url of faviconUrls) {
        try {
          const response = await fetch(url, {
            method: 'HEAD',
            mode: 'no-cors',
            cache: 'force-cache'
          });
          
          // For no-cors requests, we can't check status, so assume success
          this.cache.set(domain, url);
          return {
            url,
            domain,
            cached: false
          };
        } catch (error) {
          // Continue to next URL
          continue;
        }
      }

      // If all fail, use Google's favicon service as fallback
      const fallbackUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
      this.cache.set(domain, fallbackUrl);
      
      return {
        url: fallbackUrl,
        domain,
        cached: false
      };

    } catch (error) {
      // Return fallback emoji or generic icon
      const fallbackEmoji = this.fallbackIcons.get(domain) || '🌐';
      
      return {
        url: `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><text y="24" font-size="24">${fallbackEmoji}</text></svg>`,
        domain,
        cached: false,
        error: error instanceof Error ? error.message : 'Failed to fetch favicon'
      };
    }
  }

  /**
   * Preload favicons for common domains
   */
  async preloadCommonFavicons(): Promise<void> {
    const commonDomains = [
      'google.com',
      'wikipedia.org',
      'stackoverflow.com',
      'github.com',
      'reddit.com',
      'youtube.com',
      'twitter.com',
      'facebook.com',
      'linkedin.com',
      'medium.com'
    ];

    const promises = commonDomains.map(domain => this.getFavicon(domain));
    await Promise.allSettled(promises);
  }

  /**
   * Get fallback emoji for a domain
   */
  getFallbackEmoji(domain: string): string {
    return this.fallbackIcons.get(domain) || '🌐';
  }

  /**
   * Clear favicon cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  getCacheSize(): number {
    return this.cache.size;
  }

  /**
   * Extract domain from URL
   */
  extractDomain(url: string): string {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  }

  /**
   * Create a data URL for an emoji favicon
   */
  createEmojiDataUrl(emoji: string): string {
    return `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><text y="24" font-size="24">${emoji}</text></svg>`;
  }

  /**
   * Get multiple favicons at once
   */
  async getMultipleFavicons(domains: string[]): Promise<Map<string, FaviconInfo>> {
    const results = new Map<string, FaviconInfo>();
    
    const promises = domains.map(async (domain) => {
      try {
        const favicon = await this.getFavicon(domain);
        results.set(domain, favicon);
      } catch (error) {
        results.set(domain, {
          url: this.createEmojiDataUrl(this.getFallbackEmoji(domain)),
          domain,
          cached: false,
          error: error instanceof Error ? error.message : 'Failed to fetch favicon'
        });
      }
    });

    await Promise.allSettled(promises);
    return results;
  }
}

// Export singleton instance
export const faviconService = new FaviconService();
export { FaviconService };
