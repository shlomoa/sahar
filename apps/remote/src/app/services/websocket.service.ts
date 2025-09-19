import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
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
} from 'shared';
import { VideoNavigationService, ApplicationState, Performer } from 'shared';
import { inject } from '@angular/core';
import { WebSocketUtils } from 'shared';
import { WebSocketBaseService } from 'shared';


@Injectable({
  providedIn: 'root'
})
export class WebSocketService extends WebSocketBaseService {
  // Remove duplicate connection management - inherited from base class
  
 
  // Remote-specific properties
  private lastConnectedUrl: string | null = null;  // Remote-specific observables
  private tvState$ = new BehaviorSubject<StateSyncMessage | null>(null);
  protected override logMessagePrefix = '📱 Remote: ';
  private navigationService = inject(VideoNavigationService);
  constructor() {
    super();
    this.networkDevice.clientType = 'remote'; 
    WebSocketUtils.populateNetworkDevice(this.networkDevice);
  // Navigation service obtained via DI (inject above)
      
    this.registerCallbacks();
    
    this.debugLog('🎮 WebSocket Service initialized');
    this.debugLog(`Device ID: ${this.networkDevice.deviceId}`);
    // Get the server url
    const tmpUrl = WebSocketUtils.generateHostUrl(this.networkDevice!);
    this.connect(tmpUrl);
    this.debugLog(`WebSocket Service initialized`);
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
    this.debugLog(`📱 Remote: Received message (unhandled): ${message.msgType}`);
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

  protected override connect(url: string): boolean {
    this.debugLog(`connecting to WebSocket at ${url}`);
    return super.connect(url);
  }

  override ngOnDestroy(): void {
    super.ngOnDestroy();
  }

  // Public observables
  getConnectionState(): Observable<ConnectionState> {
    return this.connectionState$.asObservable();
  }

  getMessages(): Observable<WebSocketMessage> {
    return this.messages$.asObservable();
  }

  getTVState(): Observable<StateSyncMessage | null> {
    return this.tvState$.asObservable();
  }
  // Backward-compat shim
  getTVStatus(): Observable<StateSyncMessage | null> {
    return this.getTVState();
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

  // Utility method (current TV state snapshot)
  getCurrentTVState(): StateSyncMessage | null {
    return this.tvState$.value;
  }

  // Register inbound handlers and outbound generators
  private registerCallbacks(): void {
    // Inbound handlers
    this.registerHandlers({
      state_sync: (msg: SaharMessage) => {
        const stateMsg = msg as StateSyncMessage;
        this.tvState$.next(stateMsg);
        this.debugLog('State sync received');

        // Apply authoritative snapshot to shared navigation service so Remote UI can reflect server state
        try {
          const state = stateMsg.payload as ApplicationState;

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
              console.warn('📱 Remote: failed to apply player state', e);
            }
          }
        } catch (err) {
          console.error('📱 Remote: failed to apply state_sync', err);
        }
      },
      error: (msg: SaharMessage) => {
        const err = msg as ErrorMessage;
        this.errorCount++;
        this.lastErrorTimestamp = Date.now();
        this.debugLog('Error received', err.payload);
      },
      heartbeat: () => {
        // Respond with our own heartbeat
        this.sendByType('heartbeat', { msgType: 'heartbeat' });
      },
      ack: () => {
        this.debugLog('Ack received');
      },
    });

    // Outbound generators
    this.registerGenerators({
      register: () => ({
        msgType: 'register',
        timestamp: Date.now(),
        source: this.networkDevice.clientType,
        payload: {
          clientType: this.networkDevice.clientType,
          deviceId: this.networkDevice.deviceId,
        } as RegisterPayload,
      }),
      data: (payload?: BasePayload | null) => ({
        msgType: 'data',
        timestamp: Date.now(),
        source: this.networkDevice.clientType,
        payload: payload ?? { msgType: 'data',
                              data: {performerId: 'invalid'}} as DataPayload,
      } as SaharMessage),
      heartbeat: (payload?: BasePayload) => ({
        msgType: 'heartbeat',
        timestamp: Date.now(),
        source: this.networkDevice.clientType,
        payload: payload ?? { msgType: 'heartbeat' },
      }),
    });
  }

  private autoConnectEnabled = true;
  /*
  // ------------------------
  // Legacy discovery stubs to keep current UI compiling; no real scanning
  // ------------------------
  private discoveredDevices$ = new BehaviorSubject<NetworkDevice[]>([]);
  private scanningSubject = new BehaviorSubject<boolean>(false);


  getDiscoveredDevices(): Observable<NetworkDevice[]> {
    return this.discoveredDevices$.asObservable();
  }

  getScanningState(): Observable<boolean> {
    return this.scanningSubject.asObservable();
  }

  startDeviceDiscovery(): void {
    this.scanningSubject.next(true);
    setTimeout(() => {
      this.discoveredDevices$.next([
        {
          deviceId: 'server-local',
          deviceName: 'Local Server',
          clientType: 'tv',
          ip: 'localhost',
          port: WEBSOCKET_CONFIG.SERVER_DEFAULT_PORT,
          lastSeen: Date.now(),
          capabilities: ['navigation', 'control', 'state']
        }
      ]);
      this.scanningSubject.next(false);
    }, 500);
  }
  */
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
