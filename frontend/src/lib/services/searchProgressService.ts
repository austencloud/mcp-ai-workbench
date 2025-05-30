/**
 * Search Progress Service for MCP AI Workbench Frontend
 * Connects to backend SSE stream and manages search progress state
 */

import { writable, type Writable } from "svelte/store";
import { browser } from "$app/environment";
import { faviconService } from "./faviconService";

export interface SearchProgressEvent {
  type:
    | "search_started"
    | "search_progress"
    | "search_completed"
    | "search_error"
    | "connected";
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

export interface SearchSiteProgress {
  domain: string;
  url: string;
  favicon?: string;
  status: "pending" | "searching" | "completed" | "error";
  startTime?: number;
  endTime?: number;
  results?: any[];
}

export interface SearchSession {
  id: string;
  query: string;
  startTime: number;
  status: "active" | "completed" | "error";
  progress: number;
  sites: SearchSiteProgress[];
  visible: boolean;
}

class SearchProgressService {
  private eventSource: EventSource | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  // Reactive stores
  public activeSessions: Writable<Map<string, SearchSession>> = writable(
    new Map()
  );
  public isConnected: Writable<boolean> = writable(false);
  public connectionError: Writable<string | null> = writable(null);

  constructor() {
    // Only connect if we're in a browser environment
    if (browser) {
      this.connect();
    }
  }

  /**
   * Connect to the backend SSE stream
   */
  private async connect(): Promise<void> {
    // Guard against server-side execution
    if (!browser || typeof EventSource === "undefined") {
      console.warn("🚫 EventSource not available (server-side rendering)");
      return;
    }

    try {
      // Discover backend port
      const baseUrl = await this.discoverBackendUrl();
      const sseUrl = `${baseUrl.replace("/rpc", "")}/search-progress`;

      console.log("🔌 Connecting to search progress stream:", sseUrl);

      this.eventSource = new EventSource(sseUrl);

      this.eventSource.onopen = () => {
        console.log("✅ Search progress stream connected");
        this.isConnected.set(true);
        this.connectionError.set(null);
        this.reconnectAttempts = 0;
      };

      this.eventSource.onmessage = (event) => {
        try {
          const progressEvent: SearchProgressEvent = JSON.parse(event.data);
          this.handleProgressEvent(progressEvent);
        } catch (error) {
          console.error("❌ Failed to parse search progress event:", error);
        }
      };

      this.eventSource.onerror = (error) => {
        console.error("❌ Search progress stream error:", error);
        this.isConnected.set(false);
        this.connectionError.set("Connection lost");

        // Attempt to reconnect
        this.attemptReconnect();
      };
    } catch (error) {
      console.error("❌ Failed to connect to search progress stream:", error);
      this.connectionError.set(
        error instanceof Error ? error.message : "Connection failed"
      );
      this.attemptReconnect();
    }
  }

  /**
   * Discover backend URL (reuse logic from mcpClient)
   */
  private async discoverBackendUrl(): Promise<string> {
    const portsToTry = [4000, 4001, 4002, 4003, 4004, 4005];

    for (const port of portsToTry) {
      try {
        const testUrl = `http://localhost:${port}/health`;
        const response = await fetch(testUrl, {
          method: "GET",
          signal: AbortSignal.timeout(2000),
        });

        if (response.ok) {
          return `http://localhost:${port}/rpc`;
        }
      } catch (error) {
        continue;
      }
    }

    return "http://localhost:4000/rpc";
  }

  /**
   * Handle incoming progress events
   */
  private async handleProgressEvent(event: SearchProgressEvent): Promise<void> {
    console.log("📨 Search progress event:", event);

    this.activeSessions.update((sessions) => {
      const session =
        sessions.get(event.sessionId) || this.createNewSession(event);

      switch (event.type) {
        case "search_started":
          session.query = event.data.query || "";
          session.status = "active";
          session.progress = 0;
          session.visible = true;
          break;

        case "search_progress":
          this.updateSessionProgress(session, event);
          break;

        case "search_completed":
          session.status = "completed";
          session.progress = 100;
          // Hide after a delay
          setTimeout(() => {
            this.activeSessions.update((sessions) => {
              const s = sessions.get(event.sessionId);
              if (s) {
                s.visible = false;
              }
              return sessions;
            });
          }, 3000);
          break;

        case "search_error":
          session.status = "error";
          session.visible = true;
          break;
      }

      sessions.set(event.sessionId, session);
      return sessions;
    });
  }

  /**
   * Create a new search session
   */
  private createNewSession(event: SearchProgressEvent): SearchSession {
    return {
      id: event.sessionId,
      query: event.data?.query || "Unknown Query",
      startTime: event.timestamp,
      status: "active",
      progress: 0,
      sites: [],
      visible: true,
    };
  }

  /**
   * Update session progress
   */
  private async updateSessionProgress(
    session: SearchSession,
    event: SearchProgressEvent
  ): Promise<void> {
    // Ensure event.data exists
    if (!event.data) {
      console.warn("Search progress event missing data:", event);
      return;
    }

    if (event.data.currentSite) {
      const domain = event.data.currentSite;

      // Find or create site progress
      let siteProgress = session.sites.find((s) => s.domain === domain);
      if (!siteProgress) {
        siteProgress = {
          domain,
          url: "",
          status: "pending",
        };
        session.sites.push(siteProgress);
      }

      // Update site status
      if (event.data.status?.includes("Searching")) {
        siteProgress.status = "searching";
        siteProgress.startTime = event.timestamp;
      } else if (
        event.data.status?.includes("Analyzed") ||
        event.data.status?.includes("completed")
      ) {
        siteProgress.status = "completed";
        siteProgress.endTime = event.timestamp;
      }

      // Get favicon if not already set
      if (!siteProgress.favicon) {
        try {
          const faviconInfo = await faviconService.getFavicon(domain);
          siteProgress.favicon = faviconInfo.url;
        } catch (error) {
          siteProgress.favicon = faviconService.createEmojiDataUrl(
            faviconService.getFallbackEmoji(domain)
          );
        }
      }
    }

    // Update overall progress
    if (typeof event.data.progress === "number") {
      session.progress = event.data.progress;
    }
  }

  /**
   * Attempt to reconnect
   */
  private attemptReconnect(): void {
    if (!browser) return;

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("❌ Max reconnection attempts reached");
      this.connectionError.set("Failed to reconnect after multiple attempts");
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(
      `🔄 Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
    );

    setTimeout(() => {
      this.disconnect();
      this.connect();
    }, delay);
  }

  /**
   * Disconnect from the stream
   */
  public disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.isConnected.set(false);
  }

  /**
   * Manually reconnect
   */
  public reconnect(): void {
    if (!browser) return;

    this.disconnect();
    this.reconnectAttempts = 0;
    this.connect();
  }

  /**
   * Clear all sessions
   */
  public clearSessions(): void {
    this.activeSessions.set(new Map());
  }

  /**
   * Hide a specific session
   */
  public hideSession(sessionId: string): void {
    this.activeSessions.update((sessions) => {
      const session = sessions.get(sessionId);
      if (session) {
        session.visible = false;
      }
      return sessions;
    });
  }
}

// Export singleton instance
export const searchProgressService = new SearchProgressService();
export { SearchProgressService };
