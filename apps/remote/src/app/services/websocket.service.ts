import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  ErrorMessage,
  WebSocketMessage,
  StateSyncMessage,
  ControlCommandPayload,
  BasePayload,
  RegisterPayload,
  NavigationAction,
  NavigationCommandPayload,
  HeartbeatMessage,
  ActionConfirmationPayload,
  ApplicationState, 
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
    this.debugLog('WebSocketService being destroyed, cleaning up');
    super.ngOnDestroy();
  }

    // Register inbound handlers and outbound generators
  private registerCallbacks(): void {
    this.debugLog('Registering WebSocket message handlers and generators');
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
    });
  }

  // Public observables
  // Note: connection state now available via state$.clientsConnectionState from base class
  
  getMessages(): Observable<WebSocketMessage> {
    return this.messages$.asObservable();
  }

  // Public methods for sending commands (protocol-aligned)
  sendNavigationCommand(
    action: NavigationAction,
    targetId?: string,
    _targetType?: string
  ): void {
    this.debugLog(`Sending navigation command: ${action} ${targetId ?? ''}`);
    // no-op usage to satisfy lint for legacy param
    void _targetType;
    this.sendByType('navigation_command', { action, targetId } as NavigationCommandPayload);
  }

  // Accept only ControlCommandPayload objects for full parameter support
  sendControlCommand(payload: ControlCommandPayload): void {
    this.debugLog('Sending control command:', payload);
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

    // Apply authoritative server snapshot - just emit it for App to handle
    this.debugLog('State sync received');

    try {
      const state = message.payload as ApplicationState;
      // Log incoming payload for diagnosis
      this.debugLog(`Received state_sync v${state?.version}`);
      // Intentionally omit dumping full payload to keep logs concise

      // Emit state to observable for App component to subscribe
      this.emitState(state);

      // After successfully applying the authoritative snapshot, acknowledge the version
      try {
        const version = (state as ApplicationState)?.version;
        if (typeof version === 'number' || typeof version === 'string') {
          // Construct a BasePayload-compatible wrapper and include version via unknown cast
          const ackPayload = { msgType: 'ack', version } as BasePayload;
          this.sendByType('ack', ackPayload);
          this.debugLog(`sent ack for state_sync v${version}`);
        }
      } catch {
        this.debugLog('Failed to send ack for state_sync');
      }
    } catch {
      console.error(this.logMessagePrefix, 'failed to apply state_sync');
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

  enableAutoConnect(): void { this.autoConnectEnabled = true; }
  disableAutoConnect(): void { this.autoConnectEnabled = false; }
  isAutoConnectEnabled(): boolean { return this.autoConnectEnabled; }
}
