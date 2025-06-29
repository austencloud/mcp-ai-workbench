/**
 * Connection-related types and enums for the MCP AI Workbench
 * Separated to avoid circular import issues
 */

// Connection State Types
export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error'
}

export interface ConnectionStatus {
  state: ConnectionState;
  port: number | null;
  lastConnected: Date | null;
  retryCount: number;
  error: string | null;
  latency: number | null;
}

export interface BackendEndpoint {
  port: number;
  baseUrl: string;
  rpcUrl: string;
  healthUrl: string;
  lastChecked: Date;
  isHealthy: boolean;
  latency: number;
}
