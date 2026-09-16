import type {
  BroadcastMessage,
  FireCuePayload,
  ParticleEngineConfig,
  ShowJSON,
  ProjectorConnectionState,
} from '../types';

export const DEFAULT_BROADCAST_CHANNEL_NAME = 'pyrosync_projection_bus';

export type BusRole = 'studio' | 'projector' | 'peer';
export type MessageHandler<T extends BroadcastMessage = BroadcastMessage> = (message: T) => void;
export type ConnectionChangeHandler = (connected: boolean, latencyMs: number | null) => void;

/**
 * BroadcastBus: Zero-latency inter-window IPC manager backed by the native BroadcastChannel API.
 * Synchronizes playback, cues, panic blackout, calibration, and state between Operator Studio and Projector windows.
 */
export class BroadcastBus {
  public readonly channelName: string;
  public readonly role: BusRole;

  private channel: BroadcastChannel | null = null;
  private messageListeners: Map<string, Set<MessageHandler<any>>> = new Map();
  private wildcardListeners: Set<MessageHandler<BroadcastMessage>> = new Set();
  private connectionListeners: Set<ConnectionChangeHandler> = new Set();

  private _isConnected: boolean = false;
  private _latencyMs: number | null = null;
  private _lastHeartbeatSentTime: number = 0;
  private _lastPongReceivedTime: number = 0;

  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private timeoutCheckTimer: ReturnType<typeof setInterval> | null = null;
  private isDestroyed: boolean = false;

  constructor(
    role: BusRole = 'peer',
    channelName: string = DEFAULT_BROADCAST_CHANNEL_NAME
  ) {
    this.role = role;
    this.channelName = channelName;

    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.channel = new BroadcastChannel(this.channelName);
        this.channel.onmessage = this.handleIncomingMessage.bind(this);
      } catch (err) {
        console.warn(`[BroadcastBus] Failed to initialize BroadcastChannel '${channelName}':`, err);
      }
    }
  }

  /**
   * Whether the secondary projector window is currently connected and responsive.
   */
  public get isConnected(): boolean {
    return this._isConnected;
  }

  /**
   * Latest roundtrip latency in milliseconds, or null if offline.
   */
  public get latencyMs(): number | null {
    return this._latencyMs;
  }

  /**
   * Get complete connection state snapshot.
   */
  public getConnectionState(): ProjectorConnectionState {
    return {
      isConnected: this._isConnected,
      latencyMs: this._latencyMs,
      lastHeartbeatTime: this._lastPongReceivedTime > 0 ? this._lastPongReceivedTime : null,
    };
  }

  /**
   * Subscribe to a specific message type. Returns an unsubscribe function.
   */
  public on<T extends BroadcastMessage['type']>(
    type: T,
    handler: (message: Extract<BroadcastMessage, { type: T }>) => void
  ): () => void {
    if (!this.messageListeners.has(type)) {
      this.messageListeners.set(type, new Set());
    }
    const handlers = this.messageListeners.get(type)!;
    handlers.add(handler);

    return () => {
      handlers.delete(handler);
    };
  }

  /**
   * Subscribe to all incoming messages. Returns an unsubscribe function.
   */
  public onMessage(handler: MessageHandler<BroadcastMessage>): () => void {
    this.wildcardListeners.add(handler);
    return () => {
      this.wildcardListeners.delete(handler);
    };
  }

  /**
   * Subscribe to connection status / latency changes. Returns an unsubscribe function.
   */
  public onConnectionChange(handler: ConnectionChangeHandler): () => void {
    this.connectionListeners.add(handler);
    // Emit immediate current state
    handler(this._isConnected, this._latencyMs);
    return () => {
      this.connectionListeners.delete(handler);
    };
  }

  /**
   * Core transmission: Sends a strongly typed message over the BroadcastChannel bus.
   */
  public postMessage(message: BroadcastMessage): void {
    if (this.isDestroyed || !this.channel) return;
    try {
      this.channel.postMessage(message);
    } catch (err) {
      console.warn('[BroadcastBus] Error posting message:', err);
    }
  }

  /**
   * Alias for postMessage.
   */
  public send(message: BroadcastMessage): void {
    this.postMessage(message);
  }

  // =========================================================================
  // HIGH-LEVEL PROTOCOL DISPATCH METHODS
  // =========================================================================

  /**
   * Projector requests full state sync from Studio.
   */
  public requestStateSync(): void {
    this.postMessage({ type: 'STATE_SYNC_REQUEST' });
  }

  /**
   * Studio responds with current time, transport state, show ID, and calibration.
   */
  public sendStateSyncResponse(payload: {
    time: number;
    isPlaying: boolean;
    showId: string;
    calibration: ParticleEngineConfig;
  }): void {
    this.postMessage({
      type: 'STATE_SYNC_RESPONSE',
      payload,
    });
  }

  /**
   * Transmit playback start at exact timecode.
   */
  public play(time: number): void {
    this.postMessage({ type: 'TRANSPORT_PLAY', time });
  }

  /**
   * Transmit playback pause at exact timecode.
   */
  public pause(time: number): void {
    this.postMessage({ type: 'TRANSPORT_PAUSE', time });
  }

  /**
   * Transmit playhead scrub/seek.
   */
  public seek(time: number): void {
    this.postMessage({ type: 'TRANSPORT_SEEK', time });
  }

  /**
   * Transmit real-time pyrotechnic cue launch.
   */
  public fireCue(cue: FireCuePayload): void {
    this.postMessage({ type: 'FIRE_CUE', cue });
  }

  /**
   * Emergency instant zero-latency panic blackout. Clears all active particles.
   */
  public panicBlackout(): void {
    this.postMessage({ type: 'PANIC_BLACKOUT' });
  }

  /**
   * Transmit live projector calibration updates (gain, black cutoff, bloom, aspect mask).
   */
  public updateCalibration(calibration: Partial<ParticleEngineConfig>): void {
    this.postMessage({ type: 'CALIBRATION_UPDATE', calibration });
  }

  /**
   * Transmit complete Show JSON definition.
   */
  public loadShow(show: ShowJSON): void {
    this.postMessage({ type: 'LOAD_SHOW', show });
  }

  /**
   * Send heartbeat ping to measure roundtrip latency.
   */
  public ping(): void {
    const timestamp = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this._lastHeartbeatSentTime = timestamp;
    this.postMessage({ type: 'PYRO_HELLO', timestamp });
  }

  // =========================================================================
  // HEARTBEAT & CONNECTION LIFECYCLE
  // =========================================================================

  /**
   * Start periodic heartbeat monitoring (typically invoked in Studio).
   */
  public startHeartbeat(intervalMs: number = 1500, timeoutMs: number = 4500): void {
    this.stopHeartbeat();

    // Immediate first ping
    this.ping();

    this.heartbeatTimer = setInterval(() => {
      this.ping();
    }, intervalMs);

    this.timeoutCheckTimer = setInterval(() => {
      if (this._isConnected) {
        const now = Date.now();
        if (this._lastPongReceivedTime > 0 && now - this._lastPongReceivedTime > timeoutMs) {
          this.setConnectionState(false, null);
        }
      }
    }, timeoutMs / 2);
  }

  /**
   * Stop heartbeat monitoring.
   */
  public stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.timeoutCheckTimer) {
      clearInterval(this.timeoutCheckTimer);
      this.timeoutCheckTimer = null;
    }
  }

  /**
   * Clean up and close the BroadcastChannel connection.
   */
  public close(): void {
    this.destroy();
  }

  public destroy(): void {
    if (this.isDestroyed) return;
    this.isDestroyed = true;

    this.stopHeartbeat();

    if (this.channel) {
      try {
        this.channel.close();
      } catch {}
      this.channel = null;
    }

    this.messageListeners.clear();
    this.wildcardListeners.clear();
    this.connectionListeners.clear();
    this._isConnected = false;
    this._latencyMs = null;
  }

  // =========================================================================
  // INTERNAL MESSAGE HANDLING & PROTOCOL LOGIC
  // =========================================================================

  private handleIncomingMessage(event: MessageEvent<BroadcastMessage>): void {
    const msg = event.data;
    if (!msg || typeof msg !== 'object' || !msg.type) return;

    // Handle connection heartbeat messages automatically
    if (msg.type === 'PYRO_HELLO') {
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      this.postMessage({
        type: 'PYRO_PONG',
        timestamp: now,
        sendTimestamp: msg.timestamp,
      });

      if (this.role === 'projector' && !this._isConnected) {
        this.setConnectionState(true, this._latencyMs);
      }
    } else if (msg.type === 'PYRO_PONG') {
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const sendTime = msg.sendTimestamp ?? (this._lastHeartbeatSentTime > 0 ? this._lastHeartbeatSentTime : msg.timestamp);
      const rtt = Math.max(0, Math.round(now - sendTime));
      this._lastPongReceivedTime = Date.now();
      this.setConnectionState(true, rtt);
    } else if (msg.type === 'STATE_SYNC_REQUEST') {
      // If Studio receives sync request, projector is definitively active
      this._lastPongReceivedTime = Date.now();
      if (!this._isConnected) {
        this.setConnectionState(true, this._latencyMs ?? 1);
      }
    }

    // Dispatch to registered type handlers
    const handlers = this.messageListeners.get(msg.type);
    if (handlers && handlers.size > 0) {
      handlers.forEach((handler) => {
        try {
          handler(msg);
        } catch (err) {
          console.error(`[BroadcastBus] Error in message handler for '${msg.type}':`, err);
        }
      });
    }

    // Dispatch to wildcard listeners
    if (this.wildcardListeners.size > 0) {
      this.wildcardListeners.forEach((handler) => {
        try {
          handler(msg);
        } catch (err) {
          console.error('[BroadcastBus] Error in wildcard message handler:', err);
        }
      });
    }
  }

  private setConnectionState(connected: boolean, latencyMs: number | null): void {
    const changed = this._isConnected !== connected || this._latencyMs !== latencyMs;
    this._isConnected = connected;
    this._latencyMs = latencyMs;

    if (changed) {
      this.connectionListeners.forEach((handler) => {
        try {
          handler(connected, latencyMs);
        } catch (err) {
          console.error('[BroadcastBus] Error in connection listener:', err);
        }
      });
    }
  }
}
