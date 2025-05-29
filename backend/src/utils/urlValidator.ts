/**
 * URL Validator and Security Utils for MCP AI Workbench
 * Validates URLs, checks robots.txt, and manages domain restrictions
 */

import axios from 'axios';
import { URL } from 'url';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
}

export interface RobotsInfo {
  allowed: boolean;
  crawlDelay?: number;
  sitemap?: string[];
}

export class URLValidator {
  private static blockedDomains = new Set([
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '::1'
  ]);

  private static dangerousProtocols = new Set([
    'file:',
    'ftp:',
    'javascript:',
    'data:',
    'vbscript:'
  ]);

  private static robotsCache = new Map<string, { data: RobotsInfo; timestamp: number }>();
  private static readonly ROBOTS_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Validate URL for security and accessibility
   */
  static validateUrl(url: string): ValidationResult {
    try {
      const urlObj = new URL(url);
      const warnings: string[] = [];

      // Check protocol
      if (this.dangerousProtocols.has(urlObj.protocol)) {
        return {
          isValid: false,
          error: `Dangerous protocol not allowed: ${urlObj.protocol}`
        };
      }

      // Only allow HTTP and HTTPS
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return {
          isValid: false,
          error: `Protocol not supported: ${urlObj.protocol}`
        };
      }

      // Check for blocked domains
      if (this.blockedDomains.has(urlObj.hostname)) {
        return {
          isValid: false,
          error: `Domain not allowed: ${urlObj.hostname}`
        };
      }

      // Check for private IP ranges
      if (this.isPrivateIP(urlObj.hostname)) {
        return {
          isValid: false,
          error: `Private IP addresses not allowed: ${urlObj.hostname}`
        };
      }

      // Check for suspicious patterns
      if (this.hasSuspiciousPatterns(url)) {
        warnings.push('URL contains potentially suspicious patterns');
      }

      // Check URL length
      if (url.length > 2048) {
        warnings.push('URL is unusually long');
      }

      return {
        isValid: true,
        warnings: warnings.length > 0 ? warnings : undefined
      };
    } catch (error) {
      return {
        isValid: false,
        error: `Invalid URL format: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Check robots.txt for crawling permissions
   */
  static async checkRobotsTxt(url: string, userAgent: string = '*'): Promise<RobotsInfo> {
    try {
      const urlObj = new URL(url);
      const robotsUrl = `${urlObj.protocol}//${urlObj.host}/robots.txt`;
      const cacheKey = `${robotsUrl}:${userAgent}`;

      // Check cache first
      const cached = this.robotsCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.ROBOTS_CACHE_TTL) {
        return cached.data;
      }

      // Fetch robots.txt
      const response = await axios.get(robotsUrl, {
        timeout: 5000,
        headers: {
          'User-Agent': userAgent
        }
      });

      const robotsInfo = this.parseRobotsTxt(response.data, userAgent, urlObj.pathname);
      
      // Cache the result
      this.robotsCache.set(cacheKey, {
        data: robotsInfo,
        timestamp: Date.now()
      });

      return robotsInfo;
    } catch (error) {
      // If robots.txt doesn't exist or is inaccessible, assume allowed
      return { allowed: true };
    }
  }

  /**
   * Parse robots.txt content
   */
  private static parseRobotsTxt(content: string, userAgent: string, path: string): RobotsInfo {
    const lines = content.split('\n').map(line => line.trim());
    let currentUserAgent = '';
    let isRelevantSection = false;
    let allowed = true;
    let crawlDelay: number | undefined;
    const sitemaps: string[] = [];

    for (const line of lines) {
      if (line.startsWith('#') || line === '') {
        continue;
      }

      const [directive, ...valueParts] = line.split(':');
      const value = valueParts.join(':').trim();

      if (directive.toLowerCase() === 'user-agent') {
        currentUserAgent = value;
        isRelevantSection = value === '*' || value === userAgent;
      } else if (isRelevantSection) {
        if (directive.toLowerCase() === 'disallow') {
          if (value === '' || value === '/') {
            // Empty disallow means allow all
            if (value === '/') {
              allowed = false;
            }
          } else if (path.startsWith(value)) {
            allowed = false;
          }
        } else if (directive.toLowerCase() === 'allow') {
          if (path.startsWith(value)) {
            allowed = true;
          }
        } else if (directive.toLowerCase() === 'crawl-delay') {
          crawlDelay = parseInt(value);
        }
      } else if (directive.toLowerCase() === 'sitemap') {
        sitemaps.push(value);
      }
    }

    return {
      allowed,
      crawlDelay,
      sitemap: sitemaps.length > 0 ? sitemaps : undefined
    };
  }

  /**
   * Check if hostname is a private IP
   */
  private static isPrivateIP(hostname: string): boolean {
    // IPv4 private ranges
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const match = hostname.match(ipv4Regex);
    
    if (match) {
      const [, a, b, c, d] = match.map(Number);
      
      // 10.0.0.0/8
      if (a === 10) return true;
      
      // 172.16.0.0/12
      if (a === 172 && b >= 16 && b <= 31) return true;
      
      // 192.168.0.0/16
      if (a === 192 && b === 168) return true;
      
      // 127.0.0.0/8 (loopback)
      if (a === 127) return true;
      
      // 169.254.0.0/16 (link-local)
      if (a === 169 && b === 254) return true;
    }

    // IPv6 private ranges (simplified check)
    if (hostname.includes(':')) {
      if (hostname.startsWith('::1') || 
          hostname.startsWith('fc') || 
          hostname.startsWith('fd') ||
          hostname.startsWith('fe80')) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check for suspicious URL patterns
   */
  private static hasSuspiciousPatterns(url: string): boolean {
    const suspiciousPatterns = [
      /[<>'"]/,  // HTML/script injection
      /javascript:/i,
      /vbscript:/i,
      /data:/i,
      /\.\.\//, // Directory traversal
      /%2e%2e%2f/i, // Encoded directory traversal
      /%3c/i, // Encoded <
      /%3e/i, // Encoded >
      /\x00/, // Null bytes
    ];

    return suspiciousPatterns.some(pattern => pattern.test(url));
  }

  /**
   * Sanitize URL by removing dangerous components
   */
  static sanitizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      
      // Remove fragment (hash)
      urlObj.hash = '';
      
      // Normalize path
      urlObj.pathname = urlObj.pathname.replace(/\/+/g, '/');
      
      return urlObj.toString();
    } catch (error) {
      throw new Error(`Cannot sanitize invalid URL: ${url}`);
    }
  }

  /**
   * Extract domain from URL
   */
  static extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch (error) {
      throw new Error(`Cannot extract domain from invalid URL: ${url}`);
    }
  }

  /**
   * Check if URL is from same domain
   */
  static isSameDomain(url1: string, url2: string): boolean {
    try {
      const domain1 = this.extractDomain(url1);
      const domain2 = this.extractDomain(url2);
      return domain1 === domain2;
    } catch (error) {
      return false;
    }
  }

  /**
   * Rate limiting per domain
   */
  private static domainRequests = new Map<string, { count: number; resetTime: number }>();

  static checkRateLimit(url: string, maxRequests: number = 10, windowMs: number = 60000): boolean {
    try {
      const domain = this.extractDomain(url);
      const now = Date.now();
      const limit = this.domainRequests.get(domain);

      if (!limit) {
        this.domainRequests.set(domain, { count: 1, resetTime: now + windowMs });
        return true;
      }

      if (now > limit.resetTime) {
        this.domainRequests.set(domain, { count: 1, resetTime: now + windowMs });
        return true;
      }

      if (limit.count >= maxRequests) {
        return false;
      }

      limit.count++;
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Add domain to blocklist
   */
  static blockDomain(domain: string): void {
    this.blockedDomains.add(domain);
  }

  /**
   * Remove domain from blocklist
   */
  static unblockDomain(domain: string): void {
    this.blockedDomains.delete(domain);
  }

  /**
   * Check if domain is blocked
   */
  static isDomainBlocked(domain: string): boolean {
    return this.blockedDomains.has(domain);
  }

  /**
   * Clear robots.txt cache
   */
  static clearRobotsCache(): void {
    this.robotsCache.clear();
  }

  /**
   * Clear rate limit data
   */
  static clearRateLimits(): void {
    this.domainRequests.clear();
  }
}
