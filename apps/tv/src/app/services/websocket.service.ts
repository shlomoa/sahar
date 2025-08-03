import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { 
  RemoteMessage, 
  NavigationMessage, 
  ControlMessage, 
  StatusMessage,
  DiscoveryMessage,
  DiscoveryPayload,
  DataMessage,
  BroadcastMessage,
  NetworkDevice,
  WebSocketError,
  WEBSOCKET_CONFIG,
  ERROR_CODES
} from '@shared/websocket/websocket-protocol';
import { VideoNavigationService } from './video-navigation.service';
import { NavigationState } from '@shared/models/video-navigation';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private ws: WebSocket | null = null;
  private discoverySocket: any = null; // UDP socket for discovery
  private reconnectAttempts = 0;
  private reconnectTimer: any = null;
  private heartbeatTimer: any = null;
  private discoveryTimer: any = null;

  // Connection state
  private connectedSubject = new BehaviorSubject<boolean>(false);
  public connected$ = this.connectedSubject.asObservable();

  // Discovered devices
  private devicesSubject = new BehaviorSubject<NetworkDevice[]>([]);
  public devices$ = this.devicesSubject.asObservable();

  // Incoming messages
  private messagesSubject = new Subject<RemoteMessage>();
  public messages$ = this.messagesSubject.asObservable();

  // Errors
  private errorsSubject = new Subject<WebSocketError>();
  public errors$ = this.errorsSubject.asObservable();

  private deviceId = `tv-${Date.now()}`;
  private deviceName = 'Sahar TV';

  constructor(private navigationService: VideoNavigationService) {
    this.initializeDeviceDiscovery();
    this.subscribeToNavigationChanges();
  }

  // Initialize device discovery using UDP broadcast
  private initializeDeviceDiscovery(): void {
    if (typeof window !== 'undefined' && 'navigator' in window) {
      // Browser environment - use WebRTC for discovery or fallback to known IPs
      this.startWebDiscovery();
    }
  }

  private startWebDiscovery(): void {
    // For browser environment, we'll use a polling approach to known ports
    const commonIPs = this.generateLocalNetworkIPs();
    
    this.discoveryTimer = setInterval(() => {
      this.discoverDevicesOnNetwork(commonIPs);
    }, WEBSOCKET_CONFIG.DISCOVERY_INTERVAL);
  }

  private generateLocalNetworkIPs(): string[] {
    // Generate common local network IP ranges
    const baseIPs = [];
    
    // Common local network ranges
    for (let i = 1; i < 255; i++) {
      baseIPs.push(`192.168.1.${i}`);
      baseIPs.push(`192.168.0.${i}`);
      baseIPs.push(`10.0.0.${i}`);
    }
    
    // Always include localhost for testing
    baseIPs.unshift('localhost', '127.0.0.1');
    
    return baseIPs;
  }

  private async discoverDevicesOnNetwork(ips: string[]): Promise<void> {
    const discoveryPromises = ips.map(ip => this.pingDevice(ip));
    
    // Check a batch of IPs at a time to avoid overwhelming the network
    const batchSize = 10;
    for (let i = 0; i < discoveryPromises.length; i += batchSize) {
      const batch = discoveryPromises.slice(i, i + batchSize);
      await Promise.allSettled(batch);
    }
  }

  private async pingDevice(ip: string): Promise<void> {
    try {
      // Try to establish a quick WebSocket connection to detect devices
      const testWs = new WebSocket(`ws://${ip}:${WEBSOCKET_CONFIG.DEFAULT_PORT}`);
      
      const timeout = setTimeout(() => {
        testWs.close();
      }, 1000); // 1 second timeout

      testWs.onopen = () => {
        clearTimeout(timeout);
        // Send discovery message
        const discoveryMsg: DiscoveryMessage = {
          type: 'discovery',
          timestamp: Date.now(),
          payload: {
            deviceType: 'tv',
            deviceId: this.deviceId,
            deviceName: this.deviceName,
            capabilities: ['navigation', 'playback', 'status'],
            networkInfo: {
              ip: window.location.hostname,
              port: WEBSOCKET_CONFIG.DEFAULT_PORT
            }
          }
        };
        testWs.send(JSON.stringify(discoveryMsg));
        testWs.close();
      };

      testWs.onerror = () => {
        clearTimeout(timeout);
      };

    } catch (error) {
      // Device not reachable, ignore
    }
  }

  // Connect to a specific remote device
  public connectToDevice(device: NetworkDevice): void {
    this.disconnect();
    this.connect(`ws://${device.ip}:${device.port}`);
  }

  // Connect to WebSocket server (for testing with localhost:8000)
  public connect(url: string = `ws://localhost:${WEBSOCKET_CONFIG.DEFAULT_PORT}`): void {
    try {
      this.ws = new WebSocket(url);
      
      this.ws.onopen = () => {
        console.log('WebSocket connected to:', url);
        this.connectedSubject.next(true);
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        this.sendStatusUpdate();
      };

      this.ws.onmessage = (event) => {
        try {
          const message: RemoteMessage = JSON.parse(event.data);
          this.handleIncomingMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
          this.emitError(ERROR_CODES.INVALID_MESSAGE, 'Invalid JSON message received');
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.connectedSubject.next(false);
        this.stopHeartbeat();
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.emitError(ERROR_CODES.CONNECTION_FAILED, 'WebSocket connection failed');
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.emitError(ERROR_CODES.CONNECTION_FAILED, 'Failed to create WebSocket connection');
    }
  }

  private handleIncomingMessage(message: any): void {
    console.log('📺 TV received message:', message);
    this.messagesSubject.next(message);

    switch (message.type) {
      case 'broadcast':
        // Handle broadcast messages by extracting the original message
        if (message.original) {
          console.log('📺 Processing broadcast message:', message.original);
          this.handleIncomingMessage(message.original);
        }
        break;
        
      case 'navigation':
        this.handleNavigationMessage(message as NavigationMessage);
        break;
      
      case 'control':
        this.handleControlMessage(message as ControlMessage);
        break;
      
      case 'discovery':
        this.handleDiscoveryMessage(message as DiscoveryMessage);
        break;
      
      case 'status':
        // Handle status updates from Remote (including data)
        this.handleStatusMessage(message as StatusMessage);
        break;

      case 'data':
        // Handle data transmission from Remote
        this.handleDataMessage(message as DataMessage);
        break;
    }
  }

  private handleDataMessage(message: DataMessage): void {
    console.log('📺 TV receiving data from Remote:', message);
    
    if (message.payload && message.payload.performers) {
      // Convert Remote's data format to TV's expected format
      const performersData = message.payload.performers.map((p: any) => ({
        id: p.id.toString(),
        name: p.name,
        thumbnail: p.thumbnail,
        description: p.description || '',
        videos: p.videos.map((v: any) => ({
          id: v.id.toString(),
          title: v.title,
          thumbnail: v.thumbnail,
          url: v.url, // Use the actual YouTube URL from the data
          duration: v.duration,
          description: v.description || '',
          likedScenes: v.likedScenes.map((s: any) => ({
            id: s.id.toString(),
            title: s.title,
            startTime: s.startTime,
            endTime: s.endTime || (s.startTime + 60), // Use endTime or default duration
            thumbnail: s.thumbnail,
            description: s.description || ''
          }))
        }))
      }));

      // Pass data to navigation service
      this.navigationService.setPerformersData(performersData);
      
      // Send confirmation back to Remote
      this.sendDataConfirmation();
    }
  }

  private handleStatusMessage(message: StatusMessage): void {
    // Remote is sending status updates, we can use this for synchronization
    console.log('📺 TV received status from Remote:', message.payload);
  }

  private sendDataConfirmation(): void {
    const message: StatusMessage = {
      type: 'status',
      timestamp: Date.now(),
      payload: {
        currentState: {
          level: 'performers',
          breadcrumb: ['Home'],
          canGoBack: false
        }
      }
    };
    
    this.sendMessage(message);
  }

  private handleNavigationMessage(message: NavigationMessage): void {
    const { action, targetId } = message.payload;
    console.log('📺 TV processing navigation command:', action, targetId);

    switch (action) {
      case 'navigate_to_performer':
        this.navigationService.navigateToPerformer(targetId);
        break;
      
      case 'navigate_to_video':
        this.navigationService.navigateToVideo(targetId);
        break;
      
      case 'navigate_to_scene':
        this.navigationService.playScene(targetId);
        break;
    }

    // Send updated status back to remote
    console.log('📺 TV sending status update after navigation...');
    this.sendStatusUpdate();
  }

  private handleControlMessage(message: ControlMessage): void {
    const { action, targetId } = message.payload;

    switch (action) {
      case 'back':
        this.navigationService.goBack();
        break;
      
      case 'home':
        this.navigationService.goHome();
        break;
      
      case 'stop':
        // TODO: Implement video player stop
        console.log('Stop playback');
        break;
      
      case 'resume':
      case 'play':
        // TODO: Implement video player play/resume
        console.log('Resume/Play playback');
        break;
      
      case 'pause':
        // TODO: Implement video player pause
        console.log('Pause playback');
        break;
    }

    // Send updated status back to remote
    this.sendStatusUpdate();
  }

  private handleDiscoveryMessage(message: DiscoveryMessage): void {
    const device = message.payload;
    
    if (device.deviceType === 'remote') {
      // Add discovered remote device to our list
      const networkDevice: NetworkDevice = {
        deviceType: device.deviceType,
        deviceId: device.deviceId,
        deviceName: device.deviceName,
        ip: device.networkInfo.ip,
        port: device.networkInfo.port,
        lastSeen: Date.now(),
        capabilities: device.capabilities
      };

      const currentDevices = this.devicesSubject.value;
      const existingIndex = currentDevices.findIndex(d => d.deviceId === device.deviceId);
      
      if (existingIndex >= 0) {
        currentDevices[existingIndex] = networkDevice;
      } else {
        currentDevices.push(networkDevice);
      }
      
      this.devicesSubject.next([...currentDevices]);
    }
  }

  // Send navigation/control commands to remote
  public sendNavigationCommand(action: string, targetId: string, targetType: string): void {
    const message: NavigationMessage = {
      type: 'navigation',
      timestamp: Date.now(),
      payload: {
        action: action as any,
        targetId,
        targetType: targetType as any
      }
    };
    
    this.sendMessage(message);
  }

  public sendControlCommand(action: string, targetId?: string): void {
    const message: ControlMessage = {
      type: 'control',
      timestamp: Date.now(),
      payload: {
        action: action as any,
        targetId
      }
    };
    
    this.sendMessage(message);
  }

  // Send status updates to remote
  private subscribeToNavigationChanges(): void {
    this.navigationService.navigation$.subscribe((navState: NavigationState) => {
      this.sendStatusUpdate(navState);
    });
  }

  private sendStatusUpdate(navState?: NavigationState): void {
    if (!navState) {
      navState = this.navigationService.getCurrentState();
    }

    const currentLevel = navState.breadcrumb.length === 1 ? 'performers' :
                        navState.breadcrumb.length === 2 ? 'videos' : 'scenes';

    const message: StatusMessage = {
      type: 'status',
      timestamp: Date.now(),
      payload: {
        currentState: {
          level: currentLevel as any,
          performerId: navState.currentPerformer?.id,
          videoId: navState.currentVideo?.id,
          breadcrumb: navState.breadcrumb,
          canGoBack: navState.canGoBack
        },
        playerState: {
          isPlaying: false, // TODO: Get from video player
          currentTime: 0,
          duration: 0,
          volume: 100
        }
      }
    };

    console.log('📺 TV sending status message:', message);
    this.sendMessage(message);
  }

  private sendMessage(message: RemoteMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('📺 TV WebSocket sending message:', message.type);
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('📺 TV WebSocket not connected, message not sent:', message);
      console.warn('📺 WebSocket state:', this.ws?.readyState);
    }
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.sendStatusUpdate();
    }, WEBSOCKET_CONFIG.HEARTBEAT_INTERVAL);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < WEBSOCKET_CONFIG.MAX_RECONNECT_ATTEMPTS) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${WEBSOCKET_CONFIG.MAX_RECONNECT_ATTEMPTS})`);
      
      this.reconnectTimer = setTimeout(() => {
        this.connect();
      }, WEBSOCKET_CONFIG.RECONNECT_INTERVAL);
    } else {
      console.error('Max reconnection attempts reached');
      this.emitError(ERROR_CODES.CONNECTION_FAILED, 'Failed to reconnect after maximum attempts');
    }
  }

  private emitError(code: string, message: string): void {
    const error: WebSocketError = {
      code,
      message,
      timestamp: Date.now(),
      deviceId: this.deviceId
    };
    
    this.errorsSubject.next(error);
  }

  public disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    this.stopHeartbeat();
    
    if (this.discoveryTimer) {
      clearInterval(this.discoveryTimer);
      this.discoveryTimer = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.connectedSubject.next(false);
  }

  // Public methods for manual device discovery
  public startDiscovery(): void {
    this.startWebDiscovery();
  }

  public stopDiscovery(): void {
    if (this.discoveryTimer) {
      clearInterval(this.discoveryTimer);
      this.discoveryTimer = null;
    }
  }

  public getDeviceInfo() {
    return {
      deviceId: this.deviceId,
      deviceName: this.deviceName,
      deviceType: 'tv' as const
    };
  }
}
