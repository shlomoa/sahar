import { Injectable, inject } from '@angular/core';
import { RegisterPayload, VideoNavigationService, ApplicationState, Performer } from 'shared';
import { WebSocketBaseService } from 'shared';
import { WebSocketUtils } from 'shared';
import {
  WebSocketMessage,  
  NavigationCommandMessage,
  ControlCommandMessage,
  StateSyncMessage,
  ErrorMessage,
  HeartbeatMessage,
  ActionConfirmationMessage,
  ActionConfirmationPayload
} from 'shared';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService extends WebSocketBaseService {

  // Lightweight playback state used for action confirmations
  private playerState = {
    isPlaying: false,
    currentTime: 0,
    volume: 100,
    muted: false,
  };

  private navigationService = inject(VideoNavigationService);
  protected override logMessagePrefix = '📺 TV: ';
  
  constructor() {    
    super();
    this.debugLog(`WebSocket Service initializing`);
    this.networkDevice.clientType = 'tv'; 
    WebSocketUtils.populateNetworkDevice(this.networkDevice);
        
    this.registerCallbacks();
    
    this.debugLog(`Device ID: ${this.networkDevice.deviceId}`);
    // Get the server url
    const tmpUrl = WebSocketUtils.generateHostUrl(this.networkDevice);
    this.debugLog(`Connecting to WebSocket server at ${tmpUrl}`);
    this.connect(tmpUrl);
    this.debugLog('WebSocket Service initialized');    
  }

  // Abstract method implementations
  protected override handleMessage(message: WebSocketMessage): void {
    // Fallback when no specific handler is registered
    this.receivedMessageCount++;
    const now = Date.now();
    if (this.lastMessageTimestamp) {
      this.messageTimings.push(now - this.lastMessageTimestamp);
      if (this.messageTimings.length > 100) this.messageTimings.shift();
    }
    this.lastMessageTimestamp = now;
    console.warn('📺 TV: Unhandled message type (no registered handler):', message.msgType);
  }

  protected override onConnected(): void {
    this.debugLog('WebSocket connected - registering with server');
    this.sendByType('register', {
      clientType: this.networkDevice.clientType,
      deviceId: this.networkDevice.deviceId,
    } as RegisterPayload);
  }

  protected override onDisconnected(): void {
    this.debugLog('WebSocket disconnected');
  }

  protected override onReconnect(): void {
    this.debugLog('WebSocket reconnect');
  }

  // Connect to WebSocket server (for testing with localhost:8000)
  protected override connect(url: string): boolean {
    this.debugLog(`connecting to WebSocket at ${url}`);
    return super.connect(url);
  }  

  // Registration for protocol handlers and generators
  private registerCallbacks(): void {
    // Handlers for inbound messages
    this.registerHandlers({
      navigation_command: (msg) => this.handleNavigationCommand(msg as NavigationCommandMessage),
      control_command: (msg) => this.handleControlCommand(msg as ControlCommandMessage),
      state_sync: (msg) => this.handleStateSync(msg as StateSyncMessage),
      ack: () => this.handleAck(),
      error: (msg) => this.handleError(msg as ErrorMessage),
      heartbeat: (msg) => this.handleHeartbeat(msg as HeartbeatMessage),
    });

    // Generators for outbound messages
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
      action_confirmation: (payload) => ({
        msgType: 'action_confirmation',
        timestamp: Date.now(),
        source: this.networkDevice.clientType,
        payload: (payload as ActionConfirmationPayload) ?? { status: 'success' },
      } as ActionConfirmationMessage),
      heartbeat: () => ({
        msgType: 'heartbeat',
        timestamp: Date.now(),
        source: this.networkDevice.clientType,
        payload: { msgType: 'heartbeat' }}),
    });
  }

  // Handlers
  private handleNavigationCommand(message: NavigationCommandMessage): void {
    const { action, targetId } = message.payload;
    try {
      switch (action) {
        case 'navigate_to_performer':
          if (targetId) this.navigationService.navigateToPerformer(targetId);
          break;
        case 'navigate_to_video':
          if (targetId) this.navigationService.navigateToVideo(targetId);
          break;
        case 'navigate_to_scene':
          if (targetId) this.navigationService.playScene(targetId);
          break;
        case 'navigate_back':
          this.navigationService.goBack();
          break;
        case 'navigate_home':
          this.navigationService.goHome();
          break;
      }
      this.sendActionConfirmation('success');
    } catch (e) {
      this.sendActionConfirmation('failure', e instanceof Error ? e.message : 'navigation failed');
    }
  }

  private handleControlCommand(message: ControlCommandMessage): void {
    const { action } = message.payload;
    try {
      switch (action) {
        case 'play':
          this.playerState.isPlaying = true;
          break;
        case 'pause':
          this.playerState.isPlaying = false;
          break;
        case 'seek':
          this.playerState.currentTime = message.payload.seekTime ?? this.playerState.currentTime;
          break;
        case 'set_volume':
          if (typeof message.payload.volume === 'number') this.playerState.volume = message.payload.volume;
          break;
        case 'mute':
          this.playerState.muted = true;
          break;
        case 'unmute':
          this.playerState.muted = false;
          break;
      }
      this.sendActionConfirmation('success');
    } catch (e) {
      this.sendActionConfirmation('failure', e instanceof Error ? e.message : 'control failed');
    }
  }

  private handleStateSync(message: StateSyncMessage): void {
    // Apply authoritative server snapshot to the TV navigation view-model.
    try {
      const state = message.payload as ApplicationState;
      this.debugLog?.(`Received state_sync v${state.version}`);

      // If server provided performers (seeded data), apply it to the navigation service.
      // Shape is flexible in Milestone 1 so check defensively.
      const dataUnknown: unknown = (state as unknown as { data?: unknown }).data;
      if (dataUnknown && typeof dataUnknown === 'object' && 'performers' in (dataUnknown as Record<string, unknown>)) {
        const maybePerformers = (dataUnknown as Record<string, unknown>)['performers'];
        if (Array.isArray(maybePerformers) && maybePerformers.length > 0 && maybePerformers.every(p => typeof p === 'object')) {
          // Treat runtime-checked array elements as `Performer` for the navigation service.
          this.navigationService.setPerformersData(maybePerformers as Performer[]);
        }
      }

      // Reconcile navigation level from authoritative state
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
            // Ensure we navigate into performer and video before playing the scene
            if (nav.performerId) this.navigationService.navigateToPerformer(nav.performerId);
            if (nav.videoId) this.navigationService.navigateToVideo(nav.videoId);
            if (nav.sceneId) this.navigationService.playScene(nav.sceneId);
            break;
        }
      }
      // Apply authoritative player snapshot if present
      if (state.player && typeof state.player === 'object') {
        try {
          interface PlayerState { playingSceneId?: string; isPlaying?: boolean }
          const navWithPlayer = this.navigationService as unknown as { setPlayerState?: (p: PlayerState) => void };
          if (typeof navWithPlayer.setPlayerState === 'function') {
            navWithPlayer.setPlayerState(state.player as PlayerState);
          } else {
            // No setPlayerState available; we keep breadcrumb-only behavior (no change here)
            this.debugLog('setPlayerState not available on VideoNavigationService (skipping)');
          }
        } catch (e) {
          console.warn('📺 Failed to apply player state from state_sync', e);
        }
      }
    } catch (err) {
      console.error('📺 Failed to apply state_sync:', err);
    }
  }

  private handleAck(): void {
    console.log('📺 TV ack received');
  }

  private handleError(message: ErrorMessage): void {
    console.error('📺 TV error received:', message.payload);
  }

  private handleHeartbeat(message: HeartbeatMessage): void {
    console.log('📺 TV heartbeat received:', message.payload);
  }

  private sendActionConfirmation(status: 'success' | 'failure', errorMessage?: string): void {
    this.sendByType('action_confirmation', { status, ...(errorMessage ? { errorMessage } : {}) } as ActionConfirmationPayload);
  }
}
