import { io, Socket, SocketOptions } from 'socket.io-client';

let socket: Socket | null = null;

/**
 * Default reconnection configuration with exponential backoff and jitter
 */
export interface ReconnectionConfig {
  /** Initial delay in ms (default: 1000) */
  initialDelay?: number;
  /** Maximum delay in ms (default: 30000) */
  maxDelay?: number;
  /** Multiplier for exponential backoff (default: 2) */
  factor?: number;
  /** Jitter factor 0-1 (default: 0.25 = ±25%) */
  jitter?: number;
  /** Maximum number of reconnection attempts (default: 10) */
  maxRetries?: number;
}

const DEFAULT_RECONNECTION_CONFIG: Required<ReconnectionConfig> = {
  initialDelay: 1000,
  maxDelay: 30000,
  factor: 2,
  jitter: 0.25,
  maxRetries: 10,
};

/**
 * Calculate delay with exponential backoff and jitter
 * @param attempt - Current attempt number (0-indexed)
 * @param config - Reconnection configuration
 * @returns Delay in milliseconds
 */
function calculateReconnectionDelay(
  attempt: number,
  config: Required<ReconnectionConfig>
): number {
  const exponentialDelay = config.initialDelay * Math.pow(config.factor, attempt);
  const cappedDelay = Math.min(exponentialDelay, config.maxDelay);
  const jitterRange = cappedDelay * config.jitter;
  const jitter = (Math.random() * 2 - 1) * jitterRange; // ±jitter%
  return Math.max(0, Math.floor(cappedDelay + jitter));
}

export function getSocket(options?: SocketOptions & { reconnectionConfig?: ReconnectionConfig }): Socket {
  if (!socket) {
    const { reconnectionConfig, ...socketOptions } = options || {};
    const mergedConfig = { ...DEFAULT_RECONNECTION_CONFIG, ...reconnectionConfig };

    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || '', {
      path: '/api/socket',
      autoConnect: false,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: mergedConfig.maxRetries,
      reconnectionDelay: mergedConfig.initialDelay,
      reconnectionDelayMax: mergedConfig.maxDelay,
      randomizationFactor: mergedConfig.jitter,
      ...socketOptions,
    });
  }
  return socket;
}

export function connectSocket(): Socket {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
  return s;
}

export function disconnectSocket(): void {
  if (socket?.connected) {
    socket.disconnect();
  }
}

export function destroySocket(): void {
  if (socket) {
    socket.disconnect();
    socket.removeAllListeners();
    socket = null;
  }
}

export { Socket };
export { DEFAULT_RECONNECTION_CONFIG, calculateReconnectionDelay };