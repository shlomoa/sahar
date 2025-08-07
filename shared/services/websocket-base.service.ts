import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { WebSocketMessage } from '../websocket/websocket-protocol';

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

@Injectable()
export abstract class WebSocketBaseService implements OnDestroy {
  protected ws: WebSocket | null = null;
  protected destroy$ = new Subject<void>();
  protected reconnectAttempts = 0;
  protected maxReconnectAttempts = 5;
  protected heartbeatInterval = 30000; // 30 seconds
  protected heartbeatTimer: any;

  // Common observables
  protected connectionState$ = new BehaviorSubject<ConnectionState>('disconnected');
  protected messages$ = new Subject<WebSocketMessage>();
  protected errors$ = new Subject<string>();

  // Device info - to be set by subclasses
  protected deviceId = '';
  protected deviceName = '';
  protected deviceType: 'tv' | 'remote' = 'tv';

  constructor() {}

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
      this.heartbeatTimer = null;
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
      const messageWithTimestamp = {
        ...message,
        timestamp: Date.now()
      };
      
      this.ws.send(JSON.stringify(messageWithTimestamp));
      console.log(`📤 ${this.deviceType.toUpperCase()}: Sent ${message.type} message:`, messageWithTimestamp);
    } catch (error) {
      console.error(`❌ ${this.deviceType.toUpperCase()}: Failed to send message:`, error);
      this.errors$.next(`Failed to send message: ${error}`);
    }
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
        const message: WebSocketMessage = JSON.parse(event.data);
        console.log(`📥 ${this.deviceType.toUpperCase()}: Received ${message.type} message:`, message);
        this.messages$.next(message);
        this.handleMessage(message);
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
        this.heartbeatTimer = null;
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
        url ? this.connect(url) : this.onReconnect();
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
    }, this.heartbeatInterval);
  }

  protected sendHeartbeat(): void {
    this.sendMessage({
      type: 'status',
      timestamp: Date.now(),
      payload: {
        heartbeat: true,
        deviceId: this.deviceId
      }
    });
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
