import { Injectable, inject } from '@angular/core';
import { RegisterPayload, VideoNavigationService } from 'shared';
import { WebSocketBaseService } from 'shared';
import { WebSocketUtils } from 'shared';
import {
  WebSocketMessage,
  WEBSOCKET_CONFIG,
  NavigationCommandMessage,
  ControlCommandMessage,
  StateSyncMessage,
  ErrorMessage,
  HeartbeatMessage,
  ActionConfirmationMessage,
  ActionConfirmationPayload,
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

  constructor() {
    super();
    this.deviceId = WebSocketUtils.generateDeviceId('tv');
    this.clientType = 'tv';
    this.registerCallbacks();
    this.connect();
  }

  // Abstract method implementations
  protected override handleMessage(message: WebSocketMessage): void {
    // Fallback when no specific handler is registered
    console.warn('📺 TV: Unhandled message type (no registered handler):', message.msgType);
  }

  protected override onConnected(): void {
    console.log('📺 TV WebSocket connected - registering with server');
    this.sendByType('register', {
      clientType: 'tv',
      deviceId: this.deviceId,
    } as RegisterPayload);
  }

  protected override onDisconnected(): void {
    console.log('📺 TV WebSocket disconnected');
  }

  protected override onReconnect(): void {
    this.connect();
  }

  // Connect to WebSocket server (for testing with localhost:8000)
  public override connect(url = `ws://localhost:${WEBSOCKET_CONFIG.SERVER_DEFAULT_PORT}`): boolean {
    console.log(`📺 TV connecting to WebSocket at ${url}`);
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
        source: 'tv',
        payload: {
          clientType: 'tv',
          deviceId: this.deviceId,
        } as RegisterPayload,
      }),
      action_confirmation: (payload) => ({
        msgType: 'action_confirmation',
        timestamp: Date.now(),
        source: 'tv',
        payload: (payload as ActionConfirmationPayload) ?? { status: 'success' },
      } as ActionConfirmationMessage),
      heartbeat: () => ({
        msgType: 'heartbeat',
        timestamp: Date.now(),
        source: 'tv',
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
    console.log('📺 TV state sync:', message.payload);
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
