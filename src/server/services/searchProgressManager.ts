/**
 * Search Progress Manager for Real-time Web Search Feedback
 * Manages WebSocket connections and streams search progress to frontend
 */

import { EventEmitter } from 'events';

export interface SearchProgressEvent {
  type: 'search_started' | 'search_progress' | 'search_completed' | 'search_error';
  sessionId: string;
  timestamp: number;
  data: {
    query?: string;
    currentSite?: string;
    siteFavicon?: string;
    status?: string;
    progress?: number;
    totalSites?: number;
    completedSites?: number;
    results?: any[];
    error?: string;
  };
}

export interface SearchSession {
  id: string;
  query: string;
  startTime: number;
  status: 'active' | 'completed' | 'error';
  progress: number;
  sites: SearchSiteProgress[];
}

export interface SearchSiteProgress {
  domain: string;
  url: string;
  favicon?: string;
  status: 'pending' | 'searching' | 'completed' | 'error';
  startTime?: number;
  endTime?: number;
  results?: any[];
}

class SearchProgressManager extends EventEmitter {
  private sessions: Map<string, SearchSession> = new Map();
  private websocketConnections: Set<any> = new Set();

  constructor() {
    super();
    this.setMaxListeners(100); // Allow many concurrent search sessions
  }

  /**
   * Register a WebSocket connection for receiving search progress
   */
  addWebSocketConnection(ws: any): void {
    this.websocketConnections.add(ws);
    
    ws.on('close', () => {
      this.websocketConnections.delete(ws);
    });

    ws.on('error', () => {
      this.websocketConnections.delete(ws);
    });
  }

  /**
   * Start a new search session
   */
  startSearch(sessionId: string, query: string, expectedSites: string[] = []): void {
    const session: SearchSession = {
      id: sessionId,
      query,
      startTime: Date.now(),
      status: 'active',
      progress: 0,
      sites: expectedSites.map(domain => ({
        domain,
        url: '',
        status: 'pending'
      }))
    };

    this.sessions.set(sessionId, session);

    const event: SearchProgressEvent = {
      type: 'search_started',
      sessionId,
      timestamp: Date.now(),
      data: {
        query,
        totalSites: expectedSites.length,
        completedSites: 0,
        progress: 0
      }
    };

    this.emitEvent(event);
  }

  /**
   * Update progress for a specific site
   */
  updateSiteProgress(
    sessionId: string, 
    domain: string, 
    status: 'searching' | 'completed' | 'error',
    data: Partial<SearchSiteProgress> = {}
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const siteIndex = session.sites.findIndex(s => s.domain === domain);
    if (siteIndex === -1) {
      // Add new site if not found
      session.sites.push({
        domain,
        url: data.url || '',
        status,
        ...data
      });
    } else {
      // Update existing site
      session.sites[siteIndex] = {
        ...session.sites[siteIndex],
        status,
        ...data
      };
    }

    // Update overall progress
    const completedSites = session.sites.filter(s => 
      s.status === 'completed' || s.status === 'error'
    ).length;
    
    session.progress = session.sites.length > 0 
      ? (completedSites / session.sites.length) * 100 
      : 0;

    const event: SearchProgressEvent = {
      type: 'search_progress',
      sessionId,
      timestamp: Date.now(),
      data: {
        currentSite: domain,
        siteFavicon: data.favicon,
        status: this.getStatusMessage(status, domain),
        progress: session.progress,
        totalSites: session.sites.length,
        completedSites
      }
    };

    this.emitEvent(event);
  }

  /**
   * Complete a search session
   */
  completeSearch(sessionId: string, results: any[] = []): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.status = 'completed';
    session.progress = 100;

    const event: SearchProgressEvent = {
      type: 'search_completed',
      sessionId,
      timestamp: Date.now(),
      data: {
        results,
        totalSites: session.sites.length,
        completedSites: session.sites.length
      }
    };

    this.emitEvent(event);

    // Clean up session after a delay
    setTimeout(() => {
      this.sessions.delete(sessionId);
    }, 30000); // Keep for 30 seconds for any late requests
  }

  /**
   * Mark search as failed
   */
  errorSearch(sessionId: string, error: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.status = 'error';

    const event: SearchProgressEvent = {
      type: 'search_error',
      sessionId,
      timestamp: Date.now(),
      data: {
        error
      }
    };

    this.emitEvent(event);

    // Clean up session after a delay
    setTimeout(() => {
      this.sessions.delete(sessionId);
    }, 10000);
  }

  /**
   * Get current session status
   */
  getSession(sessionId: string): SearchSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): SearchSession[] {
    return Array.from(this.sessions.values()).filter(s => s.status === 'active');
  }

  /**
   * Emit event to all connected WebSocket clients
   */
  private emitEvent(event: SearchProgressEvent): void {
    const message = JSON.stringify(event);
    
    // Emit to EventEmitter listeners
    this.emit('progress', event);

    // Send to WebSocket connections
    this.websocketConnections.forEach(ws => {
      try {
        if (ws.readyState === 1) { // WebSocket.OPEN
          ws.send(message);
        }
      } catch (error) {
        console.error('Failed to send WebSocket message:', error);
        this.websocketConnections.delete(ws);
      }
    });
  }

  /**
   * Generate user-friendly status messages
   */
  private getStatusMessage(status: string, domain: string): string {
    switch (status) {
      case 'searching':
        return `Searching ${domain}...`;
      case 'completed':
        return `Analyzed ${domain}`;
      case 'error':
        return `Failed to search ${domain}`;
      default:
        return `Processing ${domain}...`;
    }
  }

  /**
   * Generate unique session ID
   */
  static generateSessionId(): string {
    return `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const searchProgressManager = new SearchProgressManager();
export { SearchProgressManager };
