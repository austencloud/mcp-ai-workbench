import { writable, type Writable } from "svelte/store";
import { browser } from "$app/environment";
import { ConnectionState, type ConnectionStatus } from "$lib/types/connection";
import { backendDiscoveryService } from "./BackendDiscoveryService";

/**
 * Connection Health Service - Real-time connection monitoring and recovery
 * Provides WebSocket heartbeat, circuit breaker pattern, and automatic recovery
 */
export class ConnectionHealthService {
  private static instance: ConnectionHealthService | null = null;

  // Configuration
  private readonly HEARTBEAT_INTERVAL = 5000; // 5 seconds
  private readonly MAX_RETRY_ATTEMPTS = 10;
  private readonly BASE_RETRY_DELAY = 100; // Start with 100ms
  private readonly MAX_RETRY_DELAY = 30000; // Max 30 seconds
  private readonly CIRCUIT_BREAKER_THRESHOLD = 5;
  private readonly CIRCUIT_BREAKER_TIMEOUT = 60000; // 1 minute

  // State
  private heartbeatInterval: number | null = null;
  private retryTimeout: number | null = null;
  private circuitBreakerState: "closed" | "open" | "half-open" = "closed";
  private circuitBreakerFailures = 0;
  private circuitBreakerLastFailure: Date | null = null;
  private currentRetryAttempt = 0;

  // Reactive stores
  public readonly connectionHealth: Writable<{
    isHealthy: boolean;
    lastHeartbeat: Date | null;
    consecutiveFailures: number;
    circuitBreakerState: string;
  }> = writable({
    isHealthy: false,
    lastHeartbeat: null,
    consecutiveFailures: 0,
    circuitBreakerState: "closed",
  });

  private constructor() {
    if (browser) {
      this.startHeartbeat();
      this.setupVisibilityHandling();
    }
  }

  public static getInstance(): ConnectionHealthService {
    if (!ConnectionHealthService.instance) {
      ConnectionHealthService.instance = new ConnectionHealthService();
    }
    return ConnectionHealthService.instance;
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(async () => {
      await this.performHeartbeat();
    }, this.HEARTBEAT_INTERVAL) as unknown as number;
  }

  /**
   * Perform a heartbeat check
   */
  private async performHeartbeat(): Promise<boolean> {
    // Skip if circuit breaker is open
    if (this.circuitBreakerState === "open") {
      await this.checkCircuitBreakerTimeout();
      return false;
    }

    try {
      const endpoint = backendDiscoveryService.getCurrentEndpoint();

      if (!endpoint) {
        // Try to discover a new endpoint
        const newEndpoint = await backendDiscoveryService.getBestEndpoint();
        if (!newEndpoint) {
          this.handleHeartbeatFailure("No backend endpoints available");
          return false;
        }
      }

      const currentEndpoint = backendDiscoveryService.getCurrentEndpoint();
      if (!currentEndpoint) {
        this.handleHeartbeatFailure("No current endpoint");
        return false;
      }

      // Perform health check
      const startTime = performance.now();
      const response = await fetch(currentEndpoint.healthUrl, {
        method: "GET",
        signal: AbortSignal.timeout(3000),
        cache: "no-cache",
      });

      if (response.ok) {
        const latency = Math.round(performance.now() - startTime);
        this.handleHeartbeatSuccess(latency);
        return true;
      } else {
        this.handleHeartbeatFailure(`Health check failed: ${response.status}`);
        return false;
      }
    } catch (error) {
      this.handleHeartbeatFailure(
        error instanceof Error ? error.message : "Unknown error"
      );
      return false;
    }
  }

  /**
   * Handle successful heartbeat
   */
  private handleHeartbeatSuccess(latency: number): void {
    this.circuitBreakerFailures = 0;
    this.circuitBreakerState = "closed";
    this.currentRetryAttempt = 0;

    // Clear any pending retry
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }

    // Update stores
    this.connectionHealth.update((health) => ({
      ...health,
      isHealthy: true,
      lastHeartbeat: new Date(),
      consecutiveFailures: 0,
      circuitBreakerState: this.circuitBreakerState,
    }));

    backendDiscoveryService.updateConnectionStatus({
      state: ConnectionState.CONNECTED,
      latency,
      error: null,
    });
  }

  /**
   * Handle heartbeat failure
   */
  private handleHeartbeatFailure(error: string): void {
    this.circuitBreakerFailures++;

    // Update circuit breaker state
    if (this.circuitBreakerFailures >= this.CIRCUIT_BREAKER_THRESHOLD) {
      this.circuitBreakerState = "open";
      this.circuitBreakerLastFailure = new Date();
      console.warn(
        `🔴 Circuit breaker opened after ${this.circuitBreakerFailures} failures`
      );
    }

    // Update stores
    this.connectionHealth.update((health) => ({
      ...health,
      isHealthy: false,
      consecutiveFailures: this.circuitBreakerFailures,
      circuitBreakerState: this.circuitBreakerState,
    }));

    backendDiscoveryService.updateConnectionStatus({
      state: ConnectionState.ERROR,
      error,
      retryCount: this.currentRetryAttempt,
    });

    // Schedule retry if circuit breaker is not open
    if (this.circuitBreakerState !== "open") {
      this.scheduleRetry();
    }
  }

  /**
   * Schedule connection retry with exponential backoff
   */
  private scheduleRetry(): void {
    if (
      this.retryTimeout ||
      this.currentRetryAttempt >= this.MAX_RETRY_ATTEMPTS
    ) {
      return;
    }

    this.currentRetryAttempt++;

    // Calculate delay with exponential backoff and jitter
    const baseDelay = Math.min(
      this.BASE_RETRY_DELAY * Math.pow(2, this.currentRetryAttempt - 1),
      this.MAX_RETRY_DELAY
    );

    // Add jitter (±25%)
    const jitter = baseDelay * 0.25 * (Math.random() * 2 - 1);
    const delay = Math.max(baseDelay + jitter, this.BASE_RETRY_DELAY);

    console.log(
      `🔄 Scheduling retry ${this.currentRetryAttempt}/${
        this.MAX_RETRY_ATTEMPTS
      } in ${Math.round(delay)}ms`
    );

    backendDiscoveryService.updateConnectionStatus({
      state: ConnectionState.RECONNECTING,
      retryCount: this.currentRetryAttempt,
    });

    this.retryTimeout = setTimeout(async () => {
      this.retryTimeout = null;

      // Force endpoint rediscovery
      await backendDiscoveryService.forceReconnect();

      // Perform immediate heartbeat
      await this.performHeartbeat();
    }, delay) as unknown as number;
  }

  /**
   * Check if circuit breaker timeout has expired
   */
  private async checkCircuitBreakerTimeout(): Promise<void> {
    if (
      this.circuitBreakerState !== "open" ||
      !this.circuitBreakerLastFailure
    ) {
      return;
    }

    const timeSinceLastFailure =
      Date.now() - this.circuitBreakerLastFailure.getTime();

    if (timeSinceLastFailure >= this.CIRCUIT_BREAKER_TIMEOUT) {
      console.log("🟡 Circuit breaker entering half-open state");
      this.circuitBreakerState = "half-open";

      // Try a single request
      const success = await this.performHeartbeat();

      if (success) {
        console.log("✅ Circuit breaker closed - connection restored");
        this.circuitBreakerState = "closed";
        this.circuitBreakerFailures = 0;
      } else {
        console.log("🔴 Circuit breaker reopened - connection still failing");
        this.circuitBreakerState = "open";
        this.circuitBreakerLastFailure = new Date();
      }
    }
  }

  /**
   * Setup page visibility handling
   */
  private setupVisibilityHandling(): void {
    if (!browser || typeof document === "undefined") return;

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        // Page became visible - perform immediate health check
        console.log("📱 Page became visible - checking connection health");
        this.performHeartbeat();
      }
    });

    // Handle online/offline events
    window.addEventListener("online", () => {
      console.log("🌐 Network came online - checking connection health");
      this.performHeartbeat();
    });

    window.addEventListener("offline", () => {
      console.log("📴 Network went offline");
      this.connectionHealth.update((health) => ({
        ...health,
        isHealthy: false,
      }));

      backendDiscoveryService.updateConnectionStatus({
        state: ConnectionState.ERROR,
        error: "Network offline",
      });
    });
  }

  /**
   * Force immediate health check
   */
  public async checkHealth(): Promise<boolean> {
    return await this.performHeartbeat();
  }

  /**
   * Reset circuit breaker
   */
  public resetCircuitBreaker(): void {
    this.circuitBreakerState = "closed";
    this.circuitBreakerFailures = 0;
    this.circuitBreakerLastFailure = null;
    this.currentRetryAttempt = 0;

    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }

    this.connectionHealth.update((health) => ({
      ...health,
      consecutiveFailures: 0,
      circuitBreakerState: "closed",
    }));

    console.log("🔄 Circuit breaker reset");
  }

  /**
   * Get current health status
   */
  public getHealthStatus(): {
    isHealthy: boolean;
    circuitBreakerState: string;
    consecutiveFailures: number;
    retryAttempt: number;
  } {
    return {
      isHealthy:
        this.circuitBreakerState === "closed" &&
        this.circuitBreakerFailures === 0,
      circuitBreakerState: this.circuitBreakerState,
      consecutiveFailures: this.circuitBreakerFailures,
      retryAttempt: this.currentRetryAttempt,
    };
  }

  /**
   * Cleanup
   */
  public destroy(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
  }
}

// Export singleton instance (browser-only)
export const connectionHealthService = browser
  ? ConnectionHealthService.getInstance()
  : null;
