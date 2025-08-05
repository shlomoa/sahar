import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject, interval, of } from 'rxjs';
import { takeUntil, retry, delay, startWith, switchMap, catchError, filter, map } from 'rxjs/operators';
import {
  RemoteMessage,
  NavigationMessage,
  ControlMessage,
  DiscoveryMessage,
  DiscoveryResponseMessage,
  StatusMessage,
  DataMessage,
  DataConfirmationMessage,
  ErrorMessage,
  HeartbeatMessage,
  DataPayload,
  WebSocketMessage,
  WebSocketError,
  NetworkDevice,
  WEBSOCKET_CONFIG
} from '@shared/websocket/websocket-protocol';
import {  
  WebSocketUtils    
} from '@shared/utils/websocket-utils';
import { WebSocketBaseService } from '@shared/services/websocket-base.service';

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
  
  /**
   * Add a debug log entry to the buffer and console
   */
  private debugLog(entry: string, ...args: any[]): void {
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
  private tvStatus$ = new BehaviorSubject<StatusMessage | null>(null);
  private discoveredDevices$ = new BehaviorSubject<NetworkDevice[]>([]);

  // Remote-specific errors
  private errorsSubject = new Subject<WebSocketError>();
  public remoteErrors$ = this.errorsSubject.asObservable();

  constructor() {
    super();
    this.deviceId = WebSocketUtils.generateDeviceId('remote');
    this.deviceName = 'iPad Remote Control';
    this.deviceType = 'remote';
    
    console.log('🎮 Remote WebSocket Service initialized');
    console.log(`📱 Device ID: ${this.deviceId}`);

    // Auto-discover devices when service starts
    this.startDeviceDiscovery();

    // Auto-connect to first discovered device
    this.setupAutoConnect();
  }

  // Abstract method implementations
  protected override handleMessage(message: WebSocketMessage): void {
    // Debug: count and time received messages
    this.receivedMessageCount++;
    const now = Date.now();
    if (this.lastMessageTimestamp) {
      this.messageTimings.push(now - this.lastMessageTimestamp);
      if (this.messageTimings.length > 100) this.messageTimings.shift();
    }
    this.lastMessageTimestamp = now;
    this.debugLog(`Received message: ${message.type}`);
    this.handleIncomingMessage(message as RemoteMessage);
  }

  protected override onConnected(): void {
    console.log('✅ Remote WebSocket connected - sending discovery and data');
    
    // Send discovery message
    this.sendDiscoveryMessage();
    
    // Send data to TV when connection is first established
    console.log('🎉 Connection established - sending data to TV');
    this.sendDataToTV();
    
    // Initialize navigation when connection is first established
    console.log('🎉 Connection established - initializing navigation to performers');
    this.sendNavigationCommand('navigate_to_performer', 'performer1');
  }

  protected override onDisconnected(): void {
    this.debugLog('Remote WebSocket disconnected');
    // Re-enable auto-connect when disconnected
    this.autoConnectEnabled = true;
  }

  protected override onReconnect(): void {
    this.debugLog('Remote WebSocket reconnecting...');
    if (this.lastConnectedUrl) {
      this.connect(this.lastConnectedUrl);
    } else {
      // Try auto-discovery and connect again
      this.debugLog('Starting auto-discovery for reconnection...');
      this.startDeviceDiscovery();
    }
  }

  override ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.disconnect();
  }

  // Public observables
  getConnectionState(): Observable<ConnectionState> {
    return this.connectionState$.asObservable();
  }

  getMessages(): Observable<WebSocketMessage> {
    return this.messages$.asObservable();
  }

  getTVStatus(): Observable<StatusMessage | null> {
    return this.tvStatus$.asObservable();
  }

  getDiscoveredDevices(): Observable<NetworkDevice[]> {
    return this.discoveredDevices$.asObservable();
  }

  // Enhanced connection management with proper device handling
  connectToDevice(device: NetworkDevice): void {
    console.log('🔌 Connecting to device:', device);
    
    // Stop scanning when attempting connection
    this.isScanning = false;
    this.scanningSubject.next(false);
    
    const url = `ws://${device.ip}:${device.port}`;
    this.connect(url);
  }

  override connect(url: string): void {
    this.lastConnectedUrl = url;
    super.connect(url);
  }

  // Device discovery
  private isScanning = false;
  private scanningSubject = new BehaviorSubject<boolean>(false);
  private autoConnectEnabled = true; // Enable automatic connection to first discovered device

  getScanningState(): Observable<boolean> {
    return this.scanningSubject.asObservable();
  }

  // Setup automatic connection to first discovered device
  private setupAutoConnect(): void {
    this.discoveredDevices$.pipe(
      // Wait for scanning to complete
      switchMap((devices: NetworkDevice[]) =>
        this.scanningSubject.pipe(
          filter((scanning: boolean) => !scanning), // Wait for scanning to finish
          map(() => devices)
        )
      )
    ).subscribe((devices: NetworkDevice[]) => {
      if (this.autoConnectEnabled &&
          devices.length > 0 &&
          this.connectionState$.value === 'disconnected') {

        console.log('🔄 Auto-connecting to first discovered device after scan complete:', devices[0]);
        this.autoConnectEnabled = false; // Prevent multiple auto-connect attempts

        // Small delay to ensure discovery scan is fully complete
        setTimeout(() => {
          this.connectToDevice(devices[0]);
        }, 1000);
      }
    });
  }

  startDeviceDiscovery(): void {
    if (this.isScanning) {
      console.log('🔍 Device discovery already in progress...');
      return;
    }

    this.isScanning = true;
    this.scanningSubject.next(true);
    this.discoveredDevices$.next([]); // Clear previous devices

    console.log('🔍 Starting device discovery...');

    // Get the local network gateway IP range
    const gatewayBase = WebSocketUtils.getGatewayBaseIP();
    const targetPorts = [5544, 5545, 5546, 5547];

    console.log(`🌐 Scanning ${gatewayBase}.x on ports:`, targetPorts);

    // Scan the gateway IP range for TV devices on specified ports
    this.scanNetworkForTVDevices(gatewayBase, targetPorts);

    setTimeout(() => {
      this.isScanning = false;
      this.scanningSubject.next(false);

      if (this.discoveredDevices$.value.length === 0) {
        // Fallback for local testing (development convenience)
        // Uses port 5544 for immediate connectivity testing
        const testDevice: NetworkDevice = {
          deviceId: 'local-test-tv',
          deviceName: 'Local TV (Test - Port 5544)',
          deviceType: 'tv',
          ip: 'localhost',
          port: 5544,
          capabilities: ['navigation', 'control', 'status'],
          lastSeen: Date.now()
        };
        this.discoveredDevices$.next([testDevice]);
        console.log('📺 Added fallback device for testing (development port 5544)');
      }
      console.log(`✅ Device discovery complete. Found ${this.discoveredDevices$.value.length} devices`);
    }, 5000);
  }

  private async scanNetworkForTVDevices(gatewayBase: string, ports: number[]) {
    const promises: Promise<void>[] = [];

    // Scan IP range 192.168.1.1 to 192.168.1.25 on specified ports
    // Primary: 5544-5547 (per user story requirements)
    // Fallback: 8000 (development convenience)
    for (let ip = 1; ip <= WEBSOCKET_CONFIG.MAX_NUMBER_OF_DEVICES; ip++) {
      const targetIP = `${gatewayBase}.${ip}`;

      for (const port of ports) {
        promises.push(this.checkTVDevice(targetIP, port));
      }
    }

    // Wait for all scans to complete (but don't block the UI)
    Promise.allSettled(promises).then(results => {
      const successful = results.filter(r => r.status === 'fulfilled').length;
      console.log(`🔍 Network scan completed: ${successful}/${results.length} checks successful`);
    });
  }

  private async checkTVDevice(ip: string, port: number): Promise<void> {
    return new Promise((resolve) => {
      const testUrl = `ws://${ip}:${port}`;

      try {
        // Real WebSocket connection test with timeout
        const testWs = new WebSocket(testUrl);
        const timeout = setTimeout(() => {
          testWs.close();
          resolve(); // Silently fail for discovery
        }, 2000); // 2 second timeout

        testWs.onopen = () => {
          clearTimeout(timeout);
          console.log(`✅ Found TV device at: ${testUrl}`);

          // Add device to discovered list
          if (!this.discoveredDevices$.value.find(d => d.ip === ip && d.port === port)) {
            const device: NetworkDevice = {
              deviceId: `sahar-tv-${ip}-${port}`,
              deviceName: `SAHAR TV (${ip})`,
              deviceType: 'tv',
              ip: ip,
              port: port,
              capabilities: ['navigation', 'control', 'status'],
              lastSeen: Date.now()
            };

            const current = this.discoveredDevices$.value;
            this.discoveredDevices$.next([...current, device]);
            console.log(`📺 Added TV device: ${device.deviceName} at ${ip}:${port}`);
          }

          testWs.close();
          resolve();
        };

        testWs.onerror = () => {
          clearTimeout(timeout);
          testWs.close();
          resolve(); // Silently fail for discovery
        };

        testWs.onclose = () => {
          clearTimeout(timeout);
          resolve();
        };

      } catch (error) {
        resolve(); // Silently fail for discovery
      }
    });
  }

  private handleIncomingMessage(message: RemoteMessage): void {
    switch (message.type) {
      case 'status':
        // Phase 3 Step 2: Enhanced status message handling
        this.handleEnhancedStatusMessage(message as StatusMessage);
        break;
      
      case 'discovery':
        const discovery = message as DiscoveryMessage;
        if (discovery.payload.deviceType === 'tv' && discovery.payload.networkInfo) {
          const device: NetworkDevice = {
            deviceId: discovery.payload.deviceId,
            deviceName: discovery.payload.deviceName,
            deviceType: 'tv',
            ip: discovery.payload.networkInfo.ip,
            port: discovery.payload.networkInfo.port,
            capabilities: discovery.payload.capabilities,
            lastSeen: Date.now()
          };
          
          const current = this.discoveredDevices$.value;
          const index = current.findIndex(d => d.deviceId === device.deviceId);
          if (index >= 0) {
            current[index] = device;
          } else {
            current.push(device);
          }
          this.discoveredDevices$.next([...current]);
        }
        break;

      case 'discovery_response':
        this.handleDiscoveryResponseMessage(message as DiscoveryResponseMessage);
        break;

      case 'data':
        console.log('📱 Remote received data message from TV');
        break;

      case 'data_confirmation':
        this.handleDataConfirmationMessage(message as DataConfirmationMessage);
        break;

      case 'error':
        this.handleErrorMessage(message as ErrorMessage);
        break;

      case 'heartbeat':
        this.handleHeartbeatMessage(message as HeartbeatMessage);
        break;
    }
  }

  private handleDiscoveryResponseMessage(message: DiscoveryResponseMessage): void {
    console.log('📱 Remote received discovery response from TV:', message.payload);
    
    if (message.payload.status === 'ready') {
      console.log('✅ TV is ready for connection');
      // Connection is already established if we're receiving this message
      // Could trigger immediate data sending here if needed
    } else if (message.payload.status === 'busy') {
      console.log('⏳ TV is busy, may need to retry later');
    } else if (message.payload.status === 'error') {
      console.log('❌ TV reported error in discovery response');
    }
  }

  private handleDataConfirmationMessage(message: DataConfirmationMessage): void {
    console.log('📱 Remote received data confirmation from TV:', message.payload);
    
    if (message.payload.status === 'received') {
      console.log('✅ TV confirmed data receipt:', message.payload.itemsReceived);
      console.log('📊 Data stats:', 
        `${message.payload.itemsReceived.performers} performers, ` +
        `${message.payload.itemsReceived.videos} videos, ` +
        `${message.payload.itemsReceived.scenes} scenes`
      );
    } else if (message.payload.status === 'error') {
      console.error('❌ TV reported data error:', message.payload.errorMessage);
      // Could trigger data retransmission here
      console.log('🔄 Retrying data transmission...');
      setTimeout(() => this.sendDataToTV(), 2000);
    } else if (message.payload.status === 'partial') {
      console.warn('⚠️ TV received partial data, retransmitting...');
      setTimeout(() => this.sendDataToTV(), 1000);
    }
  }

  private handleErrorMessage(message: ErrorMessage): void {
    this.errorCount++;
    this.lastErrorTimestamp = Date.now();
    this.debugLog('Remote received error from TV:', message.payload);
    const error: WebSocketError = {
      code: message.payload.errorCode,
      message: message.payload.errorMessage,
      timestamp: Date.now(),
      deviceId: this.deviceId
    };
    this.errorsSubject.next(error);
    // Handle specific error types
    switch (message.payload.errorCode) {
      case 'INVALID_SCENE_ID':
      case 'INVALID_VIDEO_ID':
      case 'INVALID_PERFORMER_ID':
        this.debugLog('Navigation error - updating navigation state');
        // Could trigger navigation correction here
        break;
      case 'DATA_CORRUPTION':
        this.debugLog('Data corruption error - retransmitting data');
        this.sendDataToTV();
        break;
    }
  }

  private handleHeartbeatMessage(message: HeartbeatMessage): void {
    console.log('📱 Remote received heartbeat from TV:', message.payload.deviceId);
    
    // Respond with our own heartbeat
    const response: HeartbeatMessage = {
      type: 'heartbeat',
      timestamp: Date.now(),
      payload: {
        deviceId: this.deviceId,
        status: 'alive'
      }
    };
    
    this.sendMessage(response);
  }

  // Phase 3 Step 2: Enhanced status message handling with comprehensive logging
  private handleEnhancedStatusMessage(message: StatusMessage): void {
    console.log('📱 Phase 3 Step 2: Remote received enhanced status from TV');
    
    const { currentState, playerState, connectionState } = message.payload;
    
    // Log navigation state
    if (currentState) {
      console.log('📍 Navigation State:', {
        level: currentState.level,
        performer: currentState.performerName,
        video: currentState.videoTitle,
        scene: currentState.sceneTitle,
        breadcrumb: currentState.breadcrumb
      });
    }
    
    // Phase 3 Step 2: Log comprehensive player state
    if (playerState) {
      console.log('🎬 Player State:', {
        isPlaying: playerState.isPlaying,
        currentTime: playerState.currentTime,
        duration: playerState.duration,
        volume: playerState.volume,
        muted: playerState.muted,
        buffered: playerState.buffered,
        youtubeState: playerState.youtubeState
      });
      
      // Show progress if video is playing
      if (playerState.isPlaying && playerState.duration && playerState.currentTime) {
        const progress = Math.round((playerState.currentTime / playerState.duration) * 100);
        console.log(`🎵 Progress: ${playerState.currentTime}s / ${playerState.duration}s (${progress}%)`);
      }
    }
    
    // Phase 3 Step 2: Log connection quality
    if (connectionState) {
      console.log('🔗 Connection State:', {
        connected: connectionState.connected,
        lastHeartbeat: new Date(connectionState.lastHeartbeat).toLocaleTimeString()
      });
    }
    
    // Update the status subject for other components
    this.tvStatus$.next(message);
  }

  private sendDiscoveryMessage(): void {
    const discovery: DiscoveryMessage = {
      type: 'discovery',
      timestamp: Date.now(),
      payload: {
        deviceType: 'remote',
        deviceId: this.deviceId,
        deviceName: this.deviceName,
        capabilities: ['navigation', 'control'],
        networkInfo: {
          ip: 'localhost', // Will be updated by actual network detection
          port: 4202 // Remote app port
        },
        protocolVersion: '2.0'
      }
    };
    
    this.sendMessage(discovery);
  }

  // Public methods for sending commands
  
  // Acknowledgment tracking for reliable message delivery
  private pendingAcknowledgments = new Map<string, {
    messageId: string;
    timestamp: number;
    timeout: any;
    resolve: () => void;
    reject: (error: Error) => void;
  }>();

  private waitForAcknowledgment(messageId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingAcknowledgments.delete(messageId);
        reject(new Error(`Navigation command acknowledgment timeout for message ${messageId}`));
      }, 5000); // 5 second timeout

      this.pendingAcknowledgments.set(messageId, {
        messageId,
        timestamp: Date.now(),
        timeout,
        resolve,
        reject
      });

      console.log(`📱 Remote waiting for acknowledgment of message: ${messageId}`);
    });
  }

  private handleAcknowledgment(messageId: string): void {
    const pending = this.pendingAcknowledgments.get(messageId);
    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingAcknowledgments.delete(messageId);
      pending.resolve();
      console.log(`✅ Remote received acknowledgment for message: ${messageId}`);
    }
  }

  sendNavigationCommand(
    action: 'navigate_to_performer' | 'navigate_to_video' | 'navigate_to_scene' | 'navigate_back' | 'navigate_home', 
    targetId: string, 
    targetType: 'performer' | 'video' | 'scene' = 'performer',
    parentId?: string,
    navigationPath?: string[],
    sceneData?: {
      startTime: number;
      endTime: number;
      title: string;
      youtubeId: string;
    }
  ): void {
    const command: NavigationMessage = {
      type: 'navigation',
      timestamp: Date.now(),
      messageId: `nav-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Unique message ID for tracking
      payload: {
        action,
        targetId,
        targetType,
        parentId,
        navigationPath,
        sceneData
      }
    };
    
    console.log('📱 Remote sending enhanced navigation command:', command);
    this.sendMessage(command);
    
    // Start waiting for acknowledgment
    this.waitForAcknowledgment(command.messageId!);
  }

  sendControlCommand(action: 'play' | 'pause' | 'stop' | 'back' | 'home' | 'resume', targetId?: string): void {
    const command: ControlMessage = {
      type: 'control',
      timestamp: Date.now(),
      payload: {
        action,
        targetId
      }
    };
    
    this.sendMessage(command);
  }

  // Phase 3 Step 1: Enhanced Video Control Commands
  sendVideoControlCommand(
    action: 'play_video' | 'pause_video' | 'seek_video' | 'volume_change' | 'next_scene' | 'previous_scene',
    options: {
      sceneId?: string;
      youtubeId?: string;
      startTime?: number;
      autoplay?: boolean;
      seekType?: 'absolute' | 'relative';
      time?: number;
      volume?: number;
      muted?: boolean;
      currentSceneId?: string;
      nextSceneId?: string;
      previousSceneId?: string;
      sceneData?: {
        startTime: number;
        endTime: number;
        title: string;
      };
    } = {}
  ): void {
    console.log(`🎮 Phase 3: Sending enhanced video control command: ${action}`);
    
    const command: ControlMessage = {
      type: 'control',
      timestamp: Date.now(),
      messageId: this.generateMessageId(),
      payload: {
        action,
        ...options
      }
    };
    
    console.log('🎮 Enhanced control command:', command);
    this.sendMessage(command);
  }

  // Convenient methods for specific video controls
  playVideo(sceneId: string, youtubeId: string, startTime: number = 0, autoplay: boolean = true): void {
    this.sendVideoControlCommand('play_video', {
      sceneId,
      youtubeId,
      startTime,
      autoplay
    });
  }

  pauseVideo(): void {
    this.sendVideoControlCommand('pause_video');
  }

  seekVideo(time: number, seekType: 'absolute' | 'relative' = 'absolute'): void {
    this.sendVideoControlCommand('seek_video', {
      time,
      seekType
    });
  }

  changeVolume(volume: number, muted: boolean = false): void {
    this.sendVideoControlCommand('volume_change', {
      volume,
      muted
    });
  }

  nextScene(currentSceneId: string, nextSceneId: string, sceneData: { startTime: number; endTime: number; title: string }): void {
    this.sendVideoControlCommand('next_scene', {
      currentSceneId,
      nextSceneId,
      sceneData
    });
  }

  previousScene(currentSceneId: string, previousSceneId: string, sceneData: { startTime: number; endTime: number; title: string }): void {
    this.sendVideoControlCommand('previous_scene', {
      currentSceneId,
      previousSceneId,
      sceneData
    });
  }

  // Send data to TV when connection is established
  sendDataToTV(): void {
    // Import the actual performers data
    import('../models/mock-data').then(({ performersData }) => {
      // Convert the Remote app data format to the shared protocol format
      const dataPayload: DataPayload = {
        performers: performersData.map((performer: any) => ({
          id: performer.id.toString(),
          name: performer.name,
          thumbnail: performer.thumbnail,
          videos: performer.videos.map((video: any) => ({
            id: video.id.toString(),
            title: video.title,
            youtubeId: video.url ? video.url.split('v=')[1]?.split('&')[0] || 'unknown' : 'unknown', // Extract YouTube ID
            thumbnail: video.thumbnail,
            scenes: video.likedScenes.map((scene: any) => ({
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

      const dataMessage: DataMessage = {
        type: 'data',
        timestamp: Date.now(),
        payload: dataPayload
      };

      console.log('📤 Remote sending ACTUAL data to TV:', dataMessage);
      this.sendMessage(dataMessage);
    }).catch(error => {
      console.error('❌ Failed to load performers data:', error);
    });
  }

  protected override sendMessage(message: RemoteMessage): void {
    if (this.isConnected) {
      this.sentMessageCount++;
      this.debugLog(`Sending message: ${message.type}`);
      super.sendMessage(message);
    } else {
      this.debugLog('Remote WebSocket not connected, message not sent:', message);
    }
  }

  // Helper method for generating unique message IDs
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Utility methods
  getCurrentTVState(): StatusMessage | null {
    return this.tvStatus$.value;
  }

  // Auto-connect control methods
  enableAutoConnect(): void {
    this.autoConnectEnabled = true;
    console.log('✅ Auto-connect enabled');
  }

  disableAutoConnect(): void {
    this.autoConnectEnabled = false;
    console.log('❌ Auto-connect disabled');
  }

  isAutoConnectEnabled(): boolean {
    return this.autoConnectEnabled;
  }
}
