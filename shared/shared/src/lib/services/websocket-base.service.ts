import { Injectable, OnDestroy, inject } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import {  
  WebSocketMessage,
  MessageType,
  BasePayload,
  SaharMessage,
  RegisterPayload,
  ActionConfirmationPayload,
  ActionConfirmationMessage,
} from '../models/messages';
import { Performer, Video, Scene, CatalogData } from '../models/video-navigation';
import { NetworkDevice } from '../models/websocket-protocol';
import { ConnectionState, ApplicationState } from '../models';
import { ContentService } from './content.service';

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
  protected logMessagePrefix: string = 'Debug 🐞';

  // Inject ContentService for catalog data access
  protected contentService = inject(ContentService);

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
    console.log(this.logMessagePrefix, formatted, ...args);
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
  protected messages$ = new Subject<WebSocketMessage>();
  protected errors$ = new Subject<string>();
  protected applicationState$ = new BehaviorSubject<ApplicationState | null>(null);

  // Device - to be set by subclasses
  protected networkDevice: NetworkDevice = {} as NetworkDevice;
  
  // Public getters for observables
  get messages() {
    return this.messages$.asObservable();
  }

  get errors() {
    return this.errors$.asObservable();
  }

  get state$() {
    return this.applicationState$.asObservable();
  }

  // Local WebSocket state check for send operations
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // Catalog data for lookups (derived from server state)
  // Phase 2: Catalog data now comes from ContentService via HTTP, not WebSocket state
  // Legacy fields kept for reference but no longer used:
  // protected performersData: Performer[] = [];
  // protected videosData: Video[] = [];
  // protected scenesData: Scene[] = [];

  // Public getters for catalog data - delegate to ContentService (Phase 2)
  getPerformersData(): Performer[] {
    return this.contentService.getPerformers();
  }

  getVideosData(): Video[] {
    return this.contentService.getVideos();
  }

  getScenesData(): Scene[] {
    return this.contentService.getScenes();
  }

  // Lookup utilities - derive display objects from state IDs using ContentService
  getCurrentPerformer(): Performer | undefined {
    const state = this.applicationState$.value;
    if (!state?.navigation?.performerId) {
      return undefined;
    }
    return this.contentService.getPerformer(state.navigation.performerId);
  }

  getCurrentVideo(): Video | undefined {
    const state = this.applicationState$.value;
    if (!state?.navigation?.videoId) {
      return undefined;
    }
    return this.contentService.getVideo(state.navigation.videoId);
  }

  getCurrentScene(): Scene | undefined {
    const state = this.applicationState$.value;
    if (!state?.navigation?.sceneId) {
      return undefined;
    }
    return this.contentService.getScene(state.navigation.sceneId);
  }

  // Helper methods for filtering by foreign keys - delegate to ContentService
  getVideosForPerformer(performerId: string): Video[] {
    return this.contentService.getVideosForPerformer(performerId);
  }

  getScenesForVideo(videoId: string): Scene[] {
    return this.contentService.getScenesForVideo(videoId);
  }

  // Phase 2: updateCatalogFromState no longer needed - catalog comes from ContentService via HTTP
  // protected updateCatalogFromState(state: ApplicationState): void {
  //   const catalogData = state?.data as CatalogData | undefined;
  //   if (catalogData) {
  //     if (catalogData.performers && Array.isArray(catalogData.performers)) {
  //       this.performersData = catalogData.performers;
  //     }
  //     if (catalogData.videos && Array.isArray(catalogData.videos)) {
  //       this.videosData = catalogData.videos;
  //     }
  //     if (catalogData.scenes && Array.isArray(catalogData.scenes)) {
  //       this.scenesData = catalogData.scenes;
  //     }
  //   }
  // }

  // Method for subclasses to emit new state
  protected emitState(state: ApplicationState): void {
    this.applicationState$.next(state);
    // Phase 2: No longer update catalog from state - catalog comes from ContentService
    // this.updateCatalogFromState(state);
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
    this.debugLog(`unregistering message generator handler for type: ${msgType}`);
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
    this.debugLog(`unregistering message type and handler ${msgType}`);
    this.handlers.delete(msgType);
  }

  // Common WebSocket connection logic
  protected connect(url: string): boolean {    
    if (this.ws) {
      this.disconnect();
    }

    console.log(`🔌 ${this.networkDevice.clientType.toUpperCase()}: Connecting to ${url}`);

    try {
      this.ws = new WebSocket(url);      
      this.setupWebSocketHandlers();
      console.log(`🔌 completed setting up WebSocket handlers`);
    } catch (error) {
      console.error(`❌ ${this.networkDevice.clientType.toUpperCase()}: Failed to create WebSocket:`, error);
      this.scheduleReconnect(url);
      return false;
    }
    return true;
  }

  protected disconnect(): void {
    console.log(`🔌 disconnecting . . .`);
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.reconnectAttempts = 0;
    console.log(`🔌 disconnected !`);
  }

  protected reconnect(url: string): void {
    this.scheduleReconnect(url);
  }

  protected sendMessage(message: WebSocketMessage): void {
    console.log(`📤 ${this.networkDevice.clientType.toUpperCase()}: Preparing to send ${message.msgType} message`);
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
    console.log(`📤 ${this.networkDevice.clientType.toUpperCase()}: Sending message of type ${msgType}`);
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
      console.error(this.logMessagePrefix, `❌ ${this.networkDevice.clientType.toUpperCase()}: WebSocket error:`, error);
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
    this.debugLog('Starting heartbeat interval');
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
    this.debugLog('sending heartbeat');
    // Use generator if registered; else send minimal payload
    if (this.generators.get('heartbeat')) {
      this.sendByType('heartbeat');
      return;
    }
    this.sendByType('heartbeat', {msgType: 'heartbeat'});
  }

  // message generators for common types
  protected generateRegisterMessage(): SaharMessage {
    return {
      msgType: 'register',
      timestamp: Date.now(),
      source: this.networkDevice.clientType,
      payload: {
        clientType: this.networkDevice.clientType,
        deviceId: this.networkDevice.deviceId,
      } as RegisterPayload,
    };
  }

  protected generateHeartbeatMessage(payload?: BasePayload | null): SaharMessage {
    return {
      msgType: 'heartbeat',
      timestamp: Date.now(),
      source: this.networkDevice.clientType,
      payload: payload ?? { msgType: 'heartbeat' },
      } as SaharMessage;
  }

  protected generateActionConfirmationMessage(payload?: BasePayload): SaharMessage {
    return {
      msgType: 'action_confirmation',
      timestamp: Date.now(),
      source: this.networkDevice.clientType,
      payload: (payload as ActionConfirmationPayload) ?? { status: 'success' },
    } as ActionConfirmationMessage;
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
