import { writable, type Writable } from "svelte/store";
import { browser } from "$app/environment";
import {
  ConnectionState,
  type BackendEndpoint,
  type ConnectionStatus,
} from "$lib/types/connection";

/**
 * Backend Discovery Service - Intelligent port discovery and connection management
 * Provides automatic backend detection, health monitoring, and failover capabilities
 */
export class BackendDiscoveryService {
  private static instance: BackendDiscoveryService | null = null;

  // Configuration
  private readonly DEFAULT_PORTS = [
    4000, 4001, 4002, 4003, 4004, 4005, 4006, 4007, 4008, 4009, 4010,
  ];
  private readonly HEALTH_CHECK_TIMEOUT = 2000;
  private readonly DISCOVERY_TIMEOUT = 5000;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly STORAGE_KEY = "mcp-backend-endpoints";

  // State
  private discoveredEndpoints: Map<number, BackendEndpoint> = new Map();
  private currentEndpoint: BackendEndpoint | null = null;
  private isDiscovering = false;

  // Reactive stores
  public readonly connectionStatus: Writable<ConnectionStatus> = writable({
    state: "disconnected" as ConnectionState,
    port: null,
    lastConnected: null,
    retryCount: 0,
    error: null,
    latency: null,
  });

  public readonly availableEndpoints: Writable<BackendEndpoint[]> = writable(
    []
  );
  public readonly isDiscoveringStore: Writable<boolean> = writable(false);

  private constructor() {
    if (browser) {
      this.loadCachedEndpoints();
      this.startPeriodicHealthChecks();
    }
  }

  public static getInstance(): BackendDiscoveryService {
    if (!BackendDiscoveryService.instance) {
      BackendDiscoveryService.instance = new BackendDiscoveryService();
    }
    return BackendDiscoveryService.instance;
  }

  /**
   * Discover available backend endpoints
   */
  public async discoverEndpoints(
    forceRefresh = false
  ): Promise<BackendEndpoint[]> {
    if (this.isDiscovering && !forceRefresh) {
      return Array.from(this.discoveredEndpoints.values());
    }

    this.isDiscovering = true;
    this.isDiscoveringStore.set(true);

    try {
      console.log("🔍 Starting backend discovery...");

      const discoveryPromises = this.DEFAULT_PORTS.map((port) =>
        this.checkEndpoint(port)
      );
      const results = await Promise.allSettled(discoveryPromises);

      // Clear old endpoints
      this.discoveredEndpoints.clear();

      // Process results
      results.forEach((result, index) => {
        if (result.status === "fulfilled" && result.value) {
          this.discoveredEndpoints.set(this.DEFAULT_PORTS[index], result.value);
        }
      });

      const endpoints = Array.from(this.discoveredEndpoints.values());
      this.availableEndpoints.set(endpoints);

      // Cache results
      this.cacheEndpoints();

      console.log(
        `✅ Discovery complete: Found ${endpoints.length} healthy endpoints`
      );
      return endpoints;
    } finally {
      this.isDiscovering = false;
      this.isDiscoveringStore.set(false);
    }
  }

  /**
   * Get the best available endpoint
   */
  public async getBestEndpoint(): Promise<BackendEndpoint | null> {
    // Return current if still healthy
    if (
      this.currentEndpoint &&
      (await this.isEndpointHealthy(this.currentEndpoint))
    ) {
      return this.currentEndpoint;
    }

    // Discover endpoints if needed
    const endpoints = await this.discoverEndpoints();

    if (endpoints.length === 0) {
      return null;
    }

    // Sort by latency (ascending) and prefer previously connected ports
    const sortedEndpoints = endpoints
      .filter((ep) => ep.isHealthy)
      .sort((a, b) => {
        // Prefer current endpoint if healthy
        if (this.currentEndpoint?.port === a.port) return -1;
        if (this.currentEndpoint?.port === b.port) return 1;

        // Then sort by latency
        return a.latency - b.latency;
      });

    const bestEndpoint = sortedEndpoints[0] || null;

    if (bestEndpoint && bestEndpoint !== this.currentEndpoint) {
      this.setCurrentEndpoint(bestEndpoint);
    }

    return bestEndpoint;
  }

  /**
   * Check if a specific endpoint is healthy
   */
  private async checkEndpoint(port: number): Promise<BackendEndpoint | null> {
    const baseUrl = `http://localhost:${port}`;
    const healthUrl = `${baseUrl}/health`;
    const rpcUrl = `${baseUrl}/rpc`;

    try {
      const startTime = performance.now();

      const response = await fetch(healthUrl, {
        method: "GET",
        signal: AbortSignal.timeout(this.HEALTH_CHECK_TIMEOUT),
        cache: "no-cache",
      });

      const latency = performance.now() - startTime;

      if (response.ok) {
        return {
          port,
          baseUrl,
          rpcUrl,
          healthUrl,
          lastChecked: new Date(),
          isHealthy: true,
          latency: Math.round(latency),
        };
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if an endpoint is still healthy
   */
  private async isEndpointHealthy(endpoint: BackendEndpoint): Promise<boolean> {
    try {
      const response = await fetch(endpoint.healthUrl, {
        method: "GET",
        signal: AbortSignal.timeout(this.HEALTH_CHECK_TIMEOUT),
        cache: "no-cache",
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Set the current active endpoint
   */
  private setCurrentEndpoint(endpoint: BackendEndpoint | null): void {
    this.currentEndpoint = endpoint;

    this.connectionStatus.update((status) => ({
      ...status,
      port: endpoint?.port || null,
      state: endpoint
        ? ConnectionState.CONNECTED
        : ConnectionState.DISCONNECTED,
      lastConnected: endpoint ? new Date() : status.lastConnected,
      latency: endpoint?.latency || null,
      error: null,
    }));
  }

  /**
   * Get current endpoint
   */
  public getCurrentEndpoint(): BackendEndpoint | null {
    return this.currentEndpoint;
  }

  /**
   * Load cached endpoints from localStorage
   */
  private loadCachedEndpoints(): void {
    if (!browser) return;

    try {
      const cached = localStorage.getItem(this.STORAGE_KEY);
      if (!cached) return;

      const data = JSON.parse(cached);
      const now = Date.now();

      // Check if cache is still valid
      if (now - data.timestamp > this.CACHE_DURATION) {
        localStorage.removeItem(this.STORAGE_KEY);
        return;
      }

      // Restore endpoints
      data.endpoints.forEach((ep: any) => {
        this.discoveredEndpoints.set(ep.port, {
          ...ep,
          lastChecked: new Date(ep.lastChecked),
        });
      });

      this.availableEndpoints.set(
        Array.from(this.discoveredEndpoints.values())
      );
    } catch (error) {
      console.warn("Failed to load cached endpoints:", error);
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }

  /**
   * Cache endpoints to localStorage
   */
  private cacheEndpoints(): void {
    if (!browser) return;

    try {
      const data = {
        timestamp: Date.now(),
        endpoints: Array.from(this.discoveredEndpoints.values()),
      };

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn("Failed to cache endpoints:", error);
    }
  }

  /**
   * Start periodic health checks
   */
  private startPeriodicHealthChecks(): void {
    if (!browser) return;

    // Check every 30 seconds
    setInterval(async () => {
      if (this.currentEndpoint) {
        const isHealthy = await this.isEndpointHealthy(this.currentEndpoint);

        if (!isHealthy) {
          console.warn(
            `⚠️ Current endpoint ${this.currentEndpoint.port} became unhealthy`
          );
          this.currentEndpoint = null;

          this.connectionStatus.update((status) => ({
            ...status,
            state: ConnectionState.DISCONNECTED,
            error: "Backend connection lost",
          }));

          // Try to find a new endpoint
          await this.getBestEndpoint();
        }
      }
    }, 30000);
  }

  /**
   * Force reconnection
   */
  public async forceReconnect(): Promise<BackendEndpoint | null> {
    this.currentEndpoint = null;

    this.connectionStatus.update((status) => ({
      ...status,
      state: ConnectionState.CONNECTING,
      error: null,
    }));

    return await this.getBestEndpoint();
  }

  /**
   * Update connection status
   */
  public updateConnectionStatus(updates: Partial<ConnectionStatus>): void {
    this.connectionStatus.update((status) => ({ ...status, ...updates }));
  }
}

// Export singleton instance (browser-only)
export const backendDiscoveryService = browser
  ? BackendDiscoveryService.getInstance()
  : null;
