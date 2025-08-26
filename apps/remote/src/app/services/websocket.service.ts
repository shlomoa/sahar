import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import {
  ErrorMessage,
  DataPayload,
  WebSocketMessage,
  WEBSOCKET_CONFIG,
  StateSyncMessage,
  ControlCommandPayload,
  BasePayload,
} from '../../shared/websocket/websocket-protocol';
import { Performer, Video, LikedScene } from '../../shared/models/video-navigation';
import { WebSocketUtils } from '../../shared/utils/websocket-utils';
import { WebSocketBaseService } from '../../shared/services/websocket-base.service';
import { getYoutubeVideoId, getYoutubeThumbnailUrl } from '../../shared/utils/youtube-helpers';

// Local helper type for discovered devices (protocol-agnostic)
interface NetworkDevice { deviceId: string; deviceName: string; deviceType: 'tv' | 'remote'; ip: string; port: number; lastSeen: number; capabilities?: string[] }

// Connection states
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService extends WebSocketBaseService {
  // Remove duplicate connection management - inherited from base class
  
  // --- Debugging and Monitoring ---
  private debugLogBuffer: string[] = [];
  private maxDebugLogEntries = 200;
  private sentMessageCount = 0;
  private receivedMessageCount = 0;
  private errorCount = 0;
  private lastMessageTimestamp: number | null = null;
  private lastErrorTimestamp: number | null = null;
  private messageTimings: number[] = [];
  
  // Default server URL
  private readonly defaultUrl = `ws://localhost:${WEBSOCKET_CONFIG.SERVER_PORT}${WEBSOCKET_CONFIG.WS_PATH}`;
  
  /**
   * Add a debug log entry to the buffer and console
   */
  private debugLog(entry: string, ...args: unknown[]): void {
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
  getDebugLog(): string[] {
    return [...this.debugLogBuffer];
  }
  
  /**
   * Get current message and error counters
   */
  getDebugStats() {
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
  // Remote-specific properties
  private lastConnectedUrl: string | null = null;  // Remote-specific observables
  private tvState$ = new BehaviorSubject<StateSyncMessage | null>(null);

  constructor() {
    super();
    this.deviceId = WebSocketUtils.generateDeviceId('remote');
    this.deviceName = 'iPad Remote Control';
    this.deviceType = 'remote';
    
    this.registerCallbacks();
    
    console.log('🎮 Remote WebSocket Service initialized');
    console.log(`📱 Device ID: ${this.deviceId}`);
    // Connect to default server
    this.connect(this.defaultUrl);
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
    this.debugLog(`Received message (unhandled): ${message.type}`);
  }

  protected override onConnected(): void {
    console.log('✅ Remote WebSocket connected - sending registration');
    // Register with the server using the shared protocol
    this.sendByType('register', {
      clientType: 'remote',
      deviceId: this.deviceId,
      deviceName: this.deviceName,
    });
    
    // Optionally seed data on first connect
    console.log('📤 Seeding initial data to server/TV');
    this.sendDataToTV();
  }

  protected override onDisconnected(): void {
    this.debugLog('Remote WebSocket disconnected');
  }

  protected override onReconnect(): void {
    this.debugLog('Remote WebSocket reconnecting...');
    const url = this.lastConnectedUrl ?? this.defaultUrl;
    this.connect(url);
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
    action: 'navigate_to_performer' | 'navigate_to_video' | 'navigate_to_scene' | 'navigate_back' | 'navigate_home',
    targetId?: string,
    _targetType?: 'performer' | 'video' | 'scene' // backward-compat param
  ): void {
    // no-op usage to satisfy lint for legacy param
    void _targetType;
    this.sendByType('navigation_command', { action, targetId });
  }

  // Accept either canonical payload or a simple action (shim some legacy actions)
  sendControlCommand(payload: ControlCommandPayload | 'back' | 'resume' | 'stop' | 'play' | 'pause' | 'mute' | 'unmute'): void {
    if (typeof payload === 'string') {
      const action = payload === 'resume' ? 'play'
                   : payload === 'stop' ? 'pause'
                   : payload === 'back' ? 'seek'
                   : (payload as ControlCommandPayload['action']);
      const control: ControlCommandPayload = action === 'seek' ? { action: 'seek', seekTime: -5 } : { action };
      this.sendByType('control_command', control);
      return;
    }
    this.sendByType('control_command', payload);
  }

  // Send data to TV when connection is established
  sendDataToTV(): void {
    // Import the actual performers data
    import('../../../../../server/src/mock-data').then(({ performersData }) => {
      // Convert the Remote app data format to the shared protocol format
      const dataPayload: DataPayload = {
        performers: performersData.map((performer: Performer) => ({
          id: performer.id.toString(),
          name: performer.name,
          thumbnail: performer.thumbnail,
          videos: performer.videos.map((video: Video) => ({
            id: video.id.toString(),
            title: video.title,
            youtubeId: getYoutubeVideoId(video.url) ?? 'unknown',
            thumbnail: (() => {
              const vid = getYoutubeVideoId(video.url);
              return vid ? getYoutubeThumbnailUrl(vid, 'hqdefault') : 'https://via.placeholder.com/320x180?text=No+Thumbnail';
            })(),
            scenes: video.likedScenes.map((scene: LikedScene) => ({
              id: scene.id.toString(),
              title: scene.title,
              startTime: scene.startTime,
              endTime: scene.endTime || (scene.startTime + 60)
            }))
          }))
        })),
        dataVersion: '1.0',
        checksum: 'abc123def456', // Simple checksum for now
        totalSize: performersData.length
      };

  console.log('📤 Remote sending ACTUAL data to TV');
  this.sendByType('data', dataPayload);
    }).catch(error => {
      console.error('❌ Failed to load performers data:', error);
    });
  }

  protected override sendMessage(message: WebSocketMessage): void {
    if (this.isConnected) {
      this.sentMessageCount++;
      this.debugLog(`Sending message: ${message.type}`);
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
      state_sync: (msg) => {
        const state = msg as StateSyncMessage;
        this.tvState$.next(state);
        this.debugLog('State sync received');
      },
      error: (msg) => {
        const err = msg as ErrorMessage;
        this.errorCount++;
        this.lastErrorTimestamp = Date.now();
        this.debugLog('Error received', err.payload);
      },
      heartbeat: () => {
        // Respond with our own heartbeat
        this.sendByType('heartbeat', { deviceId: this.deviceId, status: 'alive' });
      },
      ack: () => {
        this.debugLog('Ack received');
      },
    });

    // Outbound generators
    this.registerGenerators({
      register: () => ({
        type: 'register',
        timestamp: Date.now(),
        source: 'remote',
        payload: {
          clientType: 'remote',
          deviceId: this.deviceId,
          deviceName: this.deviceName,
        },
      }),
      data: (payload?: DataPayload) => ({
        type: 'data',
        timestamp: Date.now(),
        source: 'remote',
        payload: (payload ?? {}) as DataPayload,
      }),
      heartbeat: (payload?: BasePayload) => ({
        type: 'heartbeat',
        timestamp: Date.now(),
        source: 'remote',
        payload: payload ?? { deviceId: this.deviceId, status: 'alive' },
      }),
    });
  }

  // ------------------------
  // Legacy discovery stubs to keep current UI compiling; no real scanning
  // ------------------------
  private discoveredDevices$ = new BehaviorSubject<NetworkDevice[]>([]);
  private scanningSubject = new BehaviorSubject<boolean>(false);
  private autoConnectEnabled = true;

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
          deviceType: 'tv',
          ip: 'localhost',
          port: WEBSOCKET_CONFIG.SERVER_PORT,
          lastSeen: Date.now(),
          capabilities: ['navigation', 'control', 'state']
        }
      ]);
      this.scanningSubject.next(false);
    }, 500);
  }

  connectToDevice(device: { ip: string; port: number }): void {
    this.lastConnectedUrl = `ws://${device.ip}:${device.port}${WEBSOCKET_CONFIG.WS_PATH}`;
    this.connect(this.lastConnectedUrl);
  }

  protected override connect(url: string): boolean {
    this.lastConnectedUrl = url;
    return super.connect(url);
  }

  enableAutoConnect(): void { this.autoConnectEnabled = true; }
  disableAutoConnect(): void { this.autoConnectEnabled = false; }
  isAutoConnectEnabled(): boolean { return this.autoConnectEnabled; }
}
