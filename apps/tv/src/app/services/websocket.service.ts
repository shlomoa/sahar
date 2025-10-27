import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import {
  RegisterPayload,
  ApplicationState,
  WebSocketMessage,  
  NavigationCommandMessage,
  ControlCommandMessage,
  StateSyncMessage,
  ErrorMessage,
  HeartbeatMessage,
  ActionConfirmationPayload,
  BasePayload,
  WebSocketBaseService, 
  WebSocketUtils,
  ActionConfirmationStatus,
  PlayerState,
  DEFAULT_PLAYER_STATE
} from 'shared';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService extends WebSocketBaseService {
  // TV duplicate connection management - inherited from base class

  private lastConnectedUrl: string | null = null;
  protected override logMessagePrefix = '📺 TV: ';

  constructor() {    
    super();
    this.debugLog(`WebSocket Service initializing`);
    this.networkDevice.clientType = 'tv'; 
    WebSocketUtils.populateNetworkDevice(this.networkDevice);
        
    this.registerCallbacks();
    
    this.debugLog('WebSocket Service initialized');
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
    this.debugLog('WebSocketService ngOnDestroy called, cleaning up');
    super.ngOnDestroy();
  }

  // Registration for protocol handlers and generators
  private registerCallbacks(): void {
    this.debugLog('Registering WebSocket protocol handlers and generators');
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
      register: () => this.generateRegisterMessage(),
      action_confirmation: (payload) => this.generateActionConfirmationMessage(payload as ActionConfirmationPayload),
      heartbeat: () => this.generateHeartbeatMessage(),
    });
  }

  // Handlers
  private handleNavigationCommand(message: NavigationCommandMessage): void {
    this.debugLog('Navigation command received:', message.payload);
    // TV receives navigation commands from server (originated from Remote)
    // The App component will handle these through state_sync updates
    // Just acknowledge receipt
    this.sendActionConfirmation('success');
  }

  private handleControlCommand(message: ControlCommandMessage): void {
    this.debugLog('Control command received:', message.payload);
    const { msgType, ...playerState } = message.payload;
    
    try {
      // Get current application state
      const currentState = this.applicationState$.value;
      
      if (currentState) {
        // Emit updated state with new player state via state$
        this.emitState({
          ...currentState,
          player: { ...currentState.player, ...playerState }
        });
      }
      
      this.sendActionConfirmation('success');
    } catch (e) {
      this.sendActionConfirmation('failure', e instanceof Error ? e.message : 'control failed');
    }
  }

  private handleStateSync(message: StateSyncMessage): void {
    // Apply authoritative server snapshot - just emit it for App to handle
    this.debugLog('State sync received');

    try {
      const state = message.payload as ApplicationState;
      this.debugLog(`Received state_sync v${state?.version}`);
      
      // Emit state to observable for App component to subscribe
      // This is the SINGLE source of truth for all state updates
      this.emitState(state);

      // After successfully applying the authoritative snapshot, acknowledge the version
      try {
        const version = (state as ApplicationState)?.version;
        if (typeof version === 'number' || typeof version === 'string') {
          const ackPayload = { msgType: 'ack', version } as BasePayload;
          this.sendByType('ack', ackPayload);
          this.debugLog(`sent ack for state_sync v${version}`);
        }
      } catch {
        this.debugLog('Failed to send ack for state_sync');
      }
    } catch {
      console.error(this.logMessagePrefix, 'Failed to apply state_sync');
    }
  }

  private handleAck(): void {
    this.debugLog('ack received');
  }

  private handleError(message: ErrorMessage): void {
    this.debugLog('error received:', message.payload);
  }

  private handleHeartbeat(message: HeartbeatMessage): void {
    this.debugLog('heartbeat received:', message.payload);
  }

  connectToDevice(): void {
    if (!this.lastConnectedUrl) {
      this.debugLog('No previous URL to connect to, aborting connectToDevice');
      return;
    }
    this.debugLog('Connecting to device at', this.lastConnectedUrl);
    this.connect(this.lastConnectedUrl!);
  }

  reconnectToDevice(): void {
    if (this.lastConnectedUrl) {
      this.debugLog('Device URL unchanged, reconnecting to lastConnectedUrl');
      this.reconnect(this.lastConnectedUrl);
    } else {
      this.debugLog('No previous device URL to reconnect to, connecting to specified device');
    }
  }

  public sendActionConfirmation(status: ActionConfirmationStatus, errorMessage?: string): void {
    // Include current player state in confirmation so server can update FSM
    const currentAppState = this.applicationState$.value;
    const playerState = currentAppState?.player;
    const payload: ActionConfirmationPayload = { 
      msgType: 'action_confirmation',
      status, 
      ...(errorMessage ? { errorMessage } : {}),
      ...(playerState ? { playerState: playerState } : {})
    };
    this.sendByType('action_confirmation', payload);
  }
}
