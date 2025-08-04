import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { 
  RemoteMessage, 
  NavigationMessage, 
  ControlMessage, 
  StatusMessage,
  DiscoveryMessage,
  DiscoveryResponseMessage,
  DiscoveryPayload,
  DataMessage,
  DataConfirmationMessage,
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
    this.subscribeToNavigationChanges();
    this.connectToLocalServer();
  }

  // TV connects to local WebSocket server (Protocol v2.0)
  private connectToLocalServer(): void {
    // TV app connects to localhost WebSocket server on ports 5544-5547
    this.connectToFirstAvailablePort();
  }

  // Protocol v2.0: TV connects to first available localhost port (5544-5547)
  private async connectToFirstAvailablePort(): Promise<void> {
    const ports = [5544, 5545, 5546, 5547, 8000]; // Include 8000 for development fallback
    
    for (const port of ports) {
      try {
        console.log(`📺 TV trying to connect to localhost:${port}`);
        await this.tryConnectToPort(port);
        console.log(`✅ TV connected to localhost:${port}`);
        return; // Successfully connected
      } catch (error) {
        console.log(`❌ TV failed to connect to localhost:${port}:`, error);
        continue; // Try next port
      }
    }
    
    // If all ports failed, retry after delay
    console.log('🔄 TV retrying connection in 5 seconds...');
    setTimeout(() => {
      this.connectToFirstAvailablePort();
    }, 5000);
  }

  private tryConnectToPort(port: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = `ws://localhost:${port}`;
      const testWs = new WebSocket(url);
      
      const timeout = setTimeout(() => {
        testWs.close();
        reject(new Error(`Connection timeout for port ${port}`));
      }, 2000);
      
      testWs.onopen = () => {
        clearTimeout(timeout);
        testWs.close(); // Close test connection
        this.connect(url); // Establish real connection
        resolve();
      };
      
      testWs.onerror = () => {
        clearTimeout(timeout);
        reject(new Error(`Connection failed for port ${port}`));
      };
    });
  }

  // TV connects to localhost WebSocket server (Protocol v2.0)
  public connect(url: string = `ws://localhost:${WEBSOCKET_CONFIG.DEFAULT_PORT}`): void {
    try {
      this.ws = new WebSocket(url);
      
      this.ws.onopen = () => {
        console.log('📺 TV WebSocket connected to local server:', url);
        this.connectedSubject.next(true);
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        
        // Send TV discovery/identification to local server
        this.sendTVIdentification();
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
        console.log('📺 TV WebSocket disconnected from local server');
        this.connectedSubject.next(false);
        this.stopHeartbeat();
        this.attemptReconnectToLocalServer();
      };

      this.ws.onerror = (error) => {
        console.error('📺 TV WebSocket error:', error);
        this.emitError(ERROR_CODES.CONNECTION_FAILED, 'TV WebSocket connection failed');
      };

    } catch (error) {
      console.error('❌ TV failed to create WebSocket connection:', error);
      this.emitError(ERROR_CODES.CONNECTION_FAILED, 'Failed to create TV WebSocket connection');
    }
  }

  // Send TV identification to local server
  private sendTVIdentification(): void {
    const identificationMsg: DiscoveryMessage = {
      type: 'discovery',
      timestamp: Date.now(),
      payload: {
        deviceType: 'tv',
        deviceId: this.deviceId,
        deviceName: this.deviceName,
        capabilities: ['display', 'video', 'audio', 'navigation'],
        networkInfo: {
          ip: 'localhost',
          port: 4203 // TV app development port
        }
      }
    };
    
    this.sendMessage(identificationMsg);
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
      
      case 'discovery_response':
        // Handle discovery response from other TVs (not typically needed)
        console.log('📺 TV received discovery response:', message);
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
    const message: DataConfirmationMessage = {
      type: 'data_confirmation',
      timestamp: Date.now(),
      payload: {
        status: 'received',
        dataVersion: '1.0',
        itemsReceived: {
          performers: this.navigationService.getPerformersCount(),
          videos: this.navigationService.getVideosCount(),
          scenes: this.navigationService.getScenesCount()
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

  private attemptReconnectToLocalServer(): void {
    if (this.reconnectAttempts < WEBSOCKET_CONFIG.MAX_RECONNECT_ATTEMPTS) {
      this.reconnectAttempts++;
      console.log(`🔄 TV attempting to reconnect to local server (${this.reconnectAttempts}/${WEBSOCKET_CONFIG.MAX_RECONNECT_ATTEMPTS})`);
      
      // Exponential backoff for reconnection
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000);
      this.reconnectTimer = setTimeout(() => {
        this.connectToFirstAvailablePort();
      }, delay);
    } else {
      console.error('❌ TV max reconnection attempts reached');
      this.emitError(ERROR_CODES.CONNECTION_FAILED, 'TV failed to reconnect to local server after maximum attempts');
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
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.connectedSubject.next(false);
  }

  // Public method to manually reconnect to local server
  public reconnectToLocalServer(): void {
    this.disconnect();
    this.connectToFirstAvailablePort();
  }

  public getDeviceInfo() {
    return {
      deviceId: this.deviceId,
      deviceName: this.deviceName,
      deviceType: 'tv' as const
    };
  }
}
