import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  ErrorMessage,
  DataPayload,
  WebSocketMessage,
  StateSyncMessage,
  ControlCommandPayload,
  BasePayload,
  RegisterPayload,
  NavigationAction,
  NavigationCommandPayload,
  ControlAction,
  SaharMessage,  
  ConnectionState,
  HeartbeatMessage,
  ActionConfirmationPayload,
  VideoNavigationService, 
  ApplicationState, 
  Performer,
  WebSocketUtils, 
  WebSocketBaseService
} from 'shared';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService extends WebSocketBaseService {
  // Remove duplicate connection management - inherited from base class
  
 
  // Remote-specific properties
  private lastConnectedUrl: string | null = null;  // Remote-specific observables
  protected override logMessagePrefix = '📱 Remote: ';
  private navigationService = inject(VideoNavigationService);
  constructor() {
    super();
    this.networkDevice.clientType = 'remote'; 
    WebSocketUtils.populateNetworkDevice(this.networkDevice);

    // Navigation service obtained via DI (inject above)
    
    this.registerCallbacks();
    
    this.debugLog('WebSocket Service initialized');
    this.debugLog(`Device ID: ${this.networkDevice.deviceId}`);
    // Get the server url
    const tmpUrl = WebSocketUtils.generateHostUrl(this.networkDevice!);
    this.connect(tmpUrl);
    this.debugLog(`WebSocket Service initialization completed`);
  }

  // Abstract method implementations
  protected override handleMessage(message: WebSocketMessage): void {
    // Fallback handler if no specific handler is registered
    this.receivedMessageCount++;
    const now = Date.now();
    if (this.lastMessageTimestamp) {
      this.messageTimings.push(now - this.lastMessageTimestamp);
      if (this.messageTimings.length > 100) this.messageTimings.shift();
    }
    this.lastMessageTimestamp = now;
    this.debugLog(`Received message (unhandled): ${message.msgType}`);
  }

  protected override onConnected(): void {
    this.debugLog(' ✅ WebSocket connected - sending registration');
    // Register with the server using the shared protocol
    this.sendByType('register', {
      clientType: this.networkDevice.clientType,
      deviceId: this.networkDevice.deviceId,
    } as RegisterPayload);
    
    // Optionally seed data on first connect
    // console.log('📤 Seeding initial data to server/TV');
    // this.sendDataToTV();
  }

  protected override onDisconnected(): void {
    this.debugLog('WebSocket disconnected');
  }

  protected override onReconnect(): void {
    this.debugLog('WebSocket reconnecting...');
    if (!this.lastConnectedUrl) {
      this.debugLog('No previous URL to reconnect to, aborting reconnect');
      return;
    }
    this.reconnect(this.lastConnectedUrl);
  }

  // Connect to WebSocket server
  protected override connect(url: string): boolean {
    this.debugLog(`connecting to WebSocket at ${url}`);
    return super.connect(url);
  }

  override ngOnDestroy(): void {
    super.ngOnDestroy();
  }

    // Register inbound handlers and outbound generators
  private registerCallbacks(): void {
    // Inbound handlers
    this.registerHandlers({
      state_sync: (msg) => this.handleStateSync(msg as StateSyncMessage),
      error: (msg) => this.handleError(msg as ErrorMessage),
      heartbeat: (msg) => this.handleHeartbeat(msg as HeartbeatMessage),
      ack: () => this.handleAck(),
    });

    // Outbound generators
    this.registerGenerators({
      register: () => this.generateRegisterMessage(),
      action_confirmation: (payload) => this.generateActionConfirmationMessage(payload as ActionConfirmationPayload),
      heartbeat: () => this.generateHeartbeatMessage(),
      data: (payload?: BasePayload | null) => ({
        msgType: 'data',
        timestamp: Date.now(),
        source: this.networkDevice.clientType,
        payload: payload ?? { msgType: 'data',
                              data: {performerId: 'invalid'}} as DataPayload,
      } as SaharMessage),
    });
  }

  // Public observables
  getConnectionState(): Observable<ConnectionState> {
    return this.connectionState$.asObservable();
  }

  getMessages(): Observable<WebSocketMessage> {
    return this.messages$.asObservable();
  }

  // Public methods for sending commands (protocol-aligned)
  sendNavigationCommand(
    action: NavigationAction,
    targetId?: string,
    _targetType?: 'performer' | 'video' | 'scene' // backward-compat param
  ): void {
    // no-op usage to satisfy lint for legacy param
    void _targetType;
    this.sendByType('navigation_command', { action, targetId } as NavigationCommandPayload);
  }

  // Accept either canonical payload or a simple action (shim some legacy actions)
  sendControlCommand(payload: ControlCommandPayload | 'back' | 'resume' | 'stop' | 'play' | 'pause' | 'mute' | 'unmute'): void {
    if (typeof payload === 'string') {
      const action = payload === 'resume' ? 'play'
                   : payload === 'stop' ? 'pause'
                   : payload === 'back' ? 'seek'
                   : (payload as ControlAction);
      const control: ControlCommandPayload = action === 'seek' ? { action: 'seek', seekTime: -5 }  as ControlCommandPayload: { action }  as ControlCommandPayload;
      this.sendByType('control_command', control);
      return;
    }
    this.sendByType('control_command', payload);
  }

  protected override sendMessage(message: WebSocketMessage): void {
    if (this.isConnected) {
      this.sentMessageCount++;
      this.debugLog(`Sending message: ${message.msgType}`);
      super.sendMessage(message);
    } else {
      this.debugLog('Remote WebSocket not connected, message not sent:', message);
    }
  }

  // Handlers
 
  private handleStateSync(message: StateSyncMessage): void {

    // Apply authoritative server snapshot to the remote navigation view-model.
    this.debugLog('State sync received');

    // Apply authoritative snapshot to shared navigation service so Remote UI can reflect server state
    try {
      const state = message.payload as ApplicationState;

      // Apply seeded performers if present
      const dataUnknown: unknown = (state as unknown as { data?: unknown }).data;
      if (dataUnknown && typeof dataUnknown === 'object' && 'performers' in (dataUnknown as Record<string, unknown>)) {
        const maybePerformers = (dataUnknown as Record<string, unknown>)['performers'];
        if (Array.isArray(maybePerformers) && maybePerformers.length > 0 && maybePerformers.every(p => typeof p === 'object')) {
          this.navigationService.setPerformersData(maybePerformers as Performer[]);
        }
      }

      // Reconcile navigation
      const nav = state.navigation;
      if (nav) {
        switch (nav.currentLevel) {
          case 'performers':
            this.navigationService.goHome();
            break;
          case 'videos':
            if (nav.performerId) this.navigationService.navigateToPerformer(nav.performerId);
            break;
          case 'scenes':
            if (nav.performerId) this.navigationService.navigateToPerformer(nav.performerId);
            if (nav.videoId) this.navigationService.navigateToVideo(nav.videoId);
            if (nav.sceneId) this.navigationService.playScene(nav.sceneId);
            break;
        }
      }
      // Apply authoritative player state if present
      if (state.player && typeof state.player === 'object') {
        try {
          interface PlayerState { playingSceneId?: string; isPlaying?: boolean }
          // Assert that navigationService may implement setPlayerState
          const navWithPlayer = this.navigationService as unknown as { setPlayerState?: (p: PlayerState) => void };
          if (typeof navWithPlayer.setPlayerState === 'function') {
            navWithPlayer.setPlayerState(state.player as PlayerState);
          } else {
            this.debugLog('setPlayerState not available on VideoNavigationService (skipping)');
          }
        } catch (e) {
          console.warn(this.logMessagePrefix, 'failed to apply player state', e);
        }
      }
    } catch (err) {
      console.error(this.logMessagePrefix, 'failed to apply state_sync', err);
    }
      
  }

  private handleAck(): void {
    this.debugLog('ack received');
  }
  
  private handleError(message: ErrorMessage): void {
    this.errorCount++;
    this.lastErrorTimestamp = Date.now();
    this.debugLog('Error received', message.payload);
    console.error(this.logMessagePrefix, 'error received:', message.payload);
  }

  private handleHeartbeat(message: HeartbeatMessage): void {
    this.debugLog('heartbeat received:', message.payload);
    // Respond with our own heartbeat
    this.sendByType('heartbeat', { msgType: 'heartbeat' });      
  }
  private autoConnectEnabled = true;
  
  connectToDevice(): void {
    if (!this.lastConnectedUrl) {
      this.debugLog('No previous URL to connect to, aborting connectToDevice');
      return;
    }
    this.debugLog('Connecting to device at', this.lastConnectedUrl);
    this.connectionState$.next('connecting');
    this.connect(this.lastConnectedUrl!);
  }

  reconnectToDevice(): void {
    if (this.lastConnectedUrl) {      

      this.debugLog('Device URL unchanged, reconnecting to lastConnectedUrl');
      this.connectionState$.next('connecting');
      this.reconnect(this.lastConnectedUrl);
    } else {
      this.debugLog('No previous device URL to reconnect to, connecting to specified device');
    }
  }

  enableAutoConnect(): void { this.autoConnectEnabled = true; }
  disableAutoConnect(): void { this.autoConnectEnabled = false; }
  isAutoConnectEnabled(): boolean { return this.autoConnectEnabled; }
}
