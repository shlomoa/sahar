import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import {  
  WebSocketMessage,
  MessageType,
  BasePayload,
  SaharMessage,
} from '../models/messages';
import { NetworkDevice } from '../models/websocket-protocol';
import { ConnectionState } from '../models';

@Injectable()
export abstract class WebSocketBaseService implements OnDestroy {
  protected ws: WebSocket | null = null;
  protected destroy$ = new Subject<void>();
  protected reconnectAttempts = 0;
  protected maxReconnectAttempts = 5;
  protected heartbeatInterval = 30000; // 30 seconds
  protected heartbeatTimer: number | undefined = undefined;
  protected debugLogBuffer: string[] = [];
  protected maxDebugLogEntries = 200;
  protected sentMessageCount = 0;
  protected errorCount = 0;
  protected lastErrorTimestamp: number | null = null;
  protected receivedMessageCount = 0;
  protected lastMessageTimestamp: number | null = null;
  protected messageTimings: number[] = [];

    /**
   * Add a debug log entry to the buffer and console
   */
  protected debugLog(entry: string, ...args: unknown[]): void {
    const timestamp = new Date().toISOString();
    const formatted = `[${timestamp}] ${entry}`;
    this.debugLogBuffer.push(formatted + (args.length ? ' ' + JSON.stringify(args) : ''));
    if (this.debugLogBuffer.length > this.maxDebugLogEntries) {
      this.debugLogBuffer.shift();
    }
    // Also print to console for real-time feedback
    // Use a special emoji for debug logs
    console.log('🐞', formatted, ...args);
  }

    /**
   * Get the current debug log buffer (for UI or export)
   */
  protected getDebugLog(): string[] {
    return [...this.debugLogBuffer];
  }
  
  /**
   * Get current message and error counters
   */
  protected getDebugStats() {
    return {
      sent: this.sentMessageCount,
      received: this.receivedMessageCount,
      errors: this.errorCount,
      lastMessageTimestamp: this.lastMessageTimestamp,
      lastErrorTimestamp: this.lastErrorTimestamp,
      avgMessageInterval: this.messageTimings.length > 1 ?
        (this.messageTimings.reduce((a, b) => a + b, 0) / (this.messageTimings.length - 1)).toFixed(2) : 'N/A',
      logBufferSize: this.debugLogBuffer.length
    };
  }

  // Protocol-driven extensibility maps
  private generators = new Map<
    MessageType,
    (payload?: BasePayload) => SaharMessage
  >();
  private handlers = new Map<
    MessageType,
    (message: SaharMessage) => void
  >();

  // Common observables
  protected connectionState$ = new BehaviorSubject<ConnectionState>('disconnected');
  protected messages$ = new Subject<WebSocketMessage>();
  protected errors$ = new Subject<string>();

  // Device - to be set by subclasses
  protected networkDevice: NetworkDevice = {} as NetworkDevice;
  
  // Public getters for observables
  get connected$() {
    return this.connectionState$.asObservable();
  }

  get messages() {
    return this.messages$.asObservable();
  }

  get errors() {
    return this.errors$.asObservable();
  }

  get isConnected(): boolean {
    return this.connectionState$.value === 'connected';
  }

  get deviceInfo(): NetworkDevice {
    return this.networkDevice;
  }

  // Registration APIs for apps
  registerGenerator<T extends MessageType>(
    msgType: T,
    generator: (payload?: BasePayload) => Extract<SaharMessage, { msgType: T }>
  ): void {
    this.generators.set(msgType, generator as unknown as (payload?: BasePayload) => SaharMessage);
  }

  registerGenerators(entries: Partial<Record<MessageType, (payload?: BasePayload) => SaharMessage>>): void {
    Object.entries(entries).forEach(([msgType, gen]) => {
      if (gen) this.registerGenerator(msgType as MessageType, gen as any);
    });
  }

  unregisterGenerator(msgType: MessageType): void {
    this.generators.delete(msgType);
  }

  registerHandler<T extends MessageType>(
    msgType: T,
    handler: (message: Extract<SaharMessage, { msgType: T }>) => void
  ): void {
    this.handlers.set(msgType, handler as unknown as (message: SaharMessage) => void);
  }

  registerHandlers(entries: Partial<Record<MessageType, (message: SaharMessage) => void>>): void {
    Object.entries(entries).forEach(([msgType, handler]) => {
      if (handler) this.registerHandler(msgType as MessageType, handler as any);
    });
  }

  unregisterHandler(msgType: MessageType): void {
    this.handlers.delete(msgType);
  }

  // Common WebSocket connection logic
  protected connect(url: string): boolean {    
    if (this.ws) {
      this.disconnect();
    }

    console.log(`🔌 ${this.networkDevice.clientType.toUpperCase()}: Connecting to ${url}`);
    this.connectionState$.next('connecting');

    try {
      this.ws = new WebSocket(url);      
      this.setupWebSocketHandlers();
      console.log(`🔌 completed setting up WebSocket handlers`);
    } catch (error) {
      console.error(`❌ ${this.networkDevice.clientType.toUpperCase()}: Failed to create WebSocket:`, error);
      this.connectionState$.next('error');
      this.scheduleReconnect(url);
      return false
    }
    return true;
  }

  protected disconnect(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.connectionState$.next('disconnected');
    this.reconnectAttempts = 0;
  }

  protected reconnect(url: string): void {
    this.scheduleReconnect(url);
  }

  protected sendMessage(message: WebSocketMessage): void {
    if (!this.isConnected || !this.ws) {
      console.warn(`⚠️ ${this.networkDevice.clientType.toUpperCase()}: Cannot send message - not connected`);
      return;
    }

    try {
      const messageWithTimestamp: WebSocketMessage = {
        ...message,
        // Ensure timestamp/source are always present
        timestamp: (message as any).timestamp ?? Date.now(),
        source: (message as any).source ?? this.networkDevice.clientType,
      } as WebSocketMessage;
      
      this.ws.send(JSON.stringify(messageWithTimestamp));
      console.log(`📤 ${this.networkDevice.clientType.toUpperCase()}: Sent ${message.msgType} message:`, messageWithTimestamp);
    } catch (error) {
      console.error(`❌ ${this.networkDevice.clientType.toUpperCase()}: Failed to send message:`, error);
      this.errors$.next(`Failed to send message: ${error}`);
    }
  }

  // High-level send using a registered generator; falls back to a minimal wrapper
  public sendByType(msgType: MessageType, payload?: BasePayload): void {
    const gen = this.generators.get(msgType);
    const built = gen
      ? gen(payload)
      : ({ msgType, payload: payload ?? {}, timestamp: Date.now(), source: this.networkDevice.clientType } as WebSocketMessage);
    this.sendMessage(built as WebSocketMessage);
  }

  private setupWebSocketHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log(`✅ ${this.networkDevice.clientType.toUpperCase()}: WebSocket connected`);
      this.connectionState$.next('connected');
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      this.onConnected();
    };

    this.ws.onmessage = (event) => {
      try {
        const message: SaharMessage = JSON.parse(event.data);
        console.log(`📥 ${this.networkDevice.clientType.toUpperCase()}: Received ${message.msgType} message:`, message);
        this.messages$.next(message as WebSocketMessage);
        const handler = this.handlers.get(message.msgType);
        if (handler) {
          handler(message);
        } else {
          this.handleMessage(message as WebSocketMessage);
        }
      } catch (error) {
        console.error(`❌ ${this.networkDevice.clientType.toUpperCase()}: Failed to parse message:`, error);
        this.errors$.next(`Invalid message received: ${error}`);
      }
    };

    this.ws.onclose = (event) => {
      console.log(`🔌 ${this.networkDevice.clientType.toUpperCase()}: WebSocket closed:`, event.code, event.reason);
      this.connectionState$.next('disconnected');
      
      if (this.heartbeatTimer) {
        clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = undefined;
      }

      this.onDisconnected();

      // Auto-reconnect if not a clean close
      if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (error) => {
      console.error(`❌ ${this.networkDevice.clientType.toUpperCase()}: WebSocket error:`, error);
      this.connectionState$.next('error');
      this.errors$.next('WebSocket connection error');
    };
  }

  private scheduleReconnect(url?: string): void {
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 10000);
    
    console.log(`🔄 ${this.networkDevice.clientType.toUpperCase()}: Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    
    setTimeout(() => {
      if (this.reconnectAttempts <= this.maxReconnectAttempts) {
        if (url) {
          this.connect(url);
        } else {
          this.onReconnect();
        }
      }
    }, delay);
  }

  private startHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected) {
        this.sendHeartbeat();
      }
    }, this.heartbeatInterval) as unknown as number;
  }

  protected sendHeartbeat(): void {
    // Use generator if registered; else send minimal payload
    if (this.generators.get('heartbeat')) {
      this.sendByType('heartbeat');
      return;
    }
    this.sendByType('heartbeat', {msgType: 'heartbeat'});
  }

  // Abstract methods for subclasses to implement
  protected abstract handleMessage(message: WebSocketMessage): void;
  protected abstract onConnected(): void;
  protected abstract onDisconnected(): void;
  protected abstract onReconnect(): void;

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.disconnect();
  }
}
