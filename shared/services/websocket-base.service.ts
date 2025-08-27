import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import {
  WebSocketMessage,
  MessageType,
  BasePayload,
  SaharMessage,
} from '../models/websocket-protocol';

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

@Injectable()
export abstract class WebSocketBaseService implements OnDestroy {
  protected ws: WebSocket | null = null;
  protected destroy$ = new Subject<void>();
  protected reconnectAttempts = 0;
  protected maxReconnectAttempts = 5;
  protected heartbeatInterval = 30000; // 30 seconds
  protected heartbeatTimer: number | undefined = undefined;

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

  // Device info - to be set by subclasses
  protected deviceId = '';
  protected deviceName = '';
  protected deviceType: 'tv' | 'remote' = 'tv';
  
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

  // Registration APIs for apps
  registerGenerator<T extends MessageType>(
    type: T,
    generator: (payload?: BasePayload) => Extract<SaharMessage, { type: T }>
  ): void {
    this.generators.set(type, generator as unknown as (payload?: BasePayload) => SaharMessage);
  }

  registerGenerators(entries: Partial<Record<MessageType, (payload?: BasePayload) => SaharMessage>>): void {
    Object.entries(entries).forEach(([type, gen]) => {
      if (gen) this.registerGenerator(type as MessageType, gen as any);
    });
  }

  unregisterGenerator(type: MessageType): void {
    this.generators.delete(type);
  }

  registerHandler<T extends MessageType>(
    type: T,
    handler: (message: Extract<SaharMessage, { type: T }>) => void
  ): void {
    this.handlers.set(type, handler as unknown as (message: SaharMessage) => void);
  }

  registerHandlers(entries: Partial<Record<MessageType, (message: SaharMessage) => void>>): void {
    Object.entries(entries).forEach(([type, handler]) => {
      if (handler) this.registerHandler(type as MessageType, handler as any);
    });
  }

  unregisterHandler(type: MessageType): void {
    this.handlers.delete(type);
  }

  // Common WebSocket connection logic
  protected connect(url: string): boolean {
    if (this.ws) {
      this.disconnect();
    }

    console.log(`🔌 ${this.deviceType.toUpperCase()}: Connecting to ${url}`);
    this.connectionState$.next('connecting');

    try {
      this.ws = new WebSocket(url);
      this.setupWebSocketHandlers();      
    } catch (error) {
      console.error(`❌ ${this.deviceType.toUpperCase()}: Failed to create WebSocket:`, error);
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

  protected sendMessage(message: WebSocketMessage): void {
    if (!this.isConnected || !this.ws) {
      console.warn(`⚠️ ${this.deviceType.toUpperCase()}: Cannot send message - not connected`);
      return;
    }

    try {
      const messageWithTimestamp: WebSocketMessage = {
        ...message,
        // Ensure timestamp/source are always present
        timestamp: (message as any).timestamp ?? Date.now(),
        source: (message as any).source ?? this.deviceType,
      } as WebSocketMessage;
      
      this.ws.send(JSON.stringify(messageWithTimestamp));
      console.log(`📤 ${this.deviceType.toUpperCase()}: Sent ${message.type} message:`, messageWithTimestamp);
    } catch (error) {
      console.error(`❌ ${this.deviceType.toUpperCase()}: Failed to send message:`, error);
      this.errors$.next(`Failed to send message: ${error}`);
    }
  }

  // High-level send using a registered generator; falls back to a minimal wrapper
  public sendByType(type: MessageType, payload?: BasePayload): void {
    const gen = this.generators.get(type);
    const built = gen
      ? gen(payload)
      : ({ type, payload: payload ?? {}, timestamp: Date.now(), source: this.deviceType } as WebSocketMessage);
    this.sendMessage(built as WebSocketMessage);
  }

  private setupWebSocketHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log(`✅ ${this.deviceType.toUpperCase()}: WebSocket connected`);
      this.connectionState$.next('connected');
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      this.onConnected();
    };

    this.ws.onmessage = (event) => {
      try {
        const message: SaharMessage = JSON.parse(event.data);
        console.log(`📥 ${this.deviceType.toUpperCase()}: Received ${message.type} message:`, message);
        this.messages$.next(message as WebSocketMessage);
        const handler = this.handlers.get(message.type);
        if (handler) {
          handler(message);
        } else {
          this.handleMessage(message as WebSocketMessage);
        }
      } catch (error) {
        console.error(`❌ ${this.deviceType.toUpperCase()}: Failed to parse message:`, error);
        this.errors$.next(`Invalid message received: ${error}`);
      }
    };

    this.ws.onclose = (event) => {
      console.log(`🔌 ${this.deviceType.toUpperCase()}: WebSocket closed:`, event.code, event.reason);
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
      console.error(`❌ ${this.deviceType.toUpperCase()}: WebSocket error:`, error);
      this.connectionState$.next('error');
      this.errors$.next('WebSocket connection error');
    };
  }

  private scheduleReconnect(url?: string): void {
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 10000);
    
    console.log(`🔄 ${this.deviceType.toUpperCase()}: Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    
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
    this.sendByType('heartbeat', { deviceId: this.deviceId, status: 'alive' });
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
