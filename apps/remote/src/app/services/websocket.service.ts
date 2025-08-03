import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject, interval, of } from 'rxjs';
import { takeUntil, retry, delay, startWith, switchMap, catchError, filter, map } from 'rxjs/operators';
import { 
  RemoteMessage, 
  NavigationMessage, 
  ControlMessage, 
  DiscoveryMessage, 
  StatusMessage,
  DataMessage,
  DataPayload,
  WEBSOCKET_CONFIG 
} from '../../../shared/websocket/websocket-protocol';

// Connection states
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

// Device discovery
export interface DiscoveredDevice {
  id: string;
  name: string;
  type: 'tv' | 'server';
  ip: string;
  port: number;
  capabilities: string[];
  lastSeen: number;
}

@Injectable({
  providedIn: 'root'
})
export class WebSocketService implements OnDestroy {
  private ws: WebSocket | null = null;
  private destroy$ = new Subject<void>();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private heartbeatInterval = 30000; // 30 seconds
  private heartbeatTimer: any;

  // Observables
  private connectionState$ = new BehaviorSubject<ConnectionState>('disconnected');
  private messages$ = new Subject<RemoteMessage>();
  private tvStatus$ = new BehaviorSubject<StatusMessage | null>(null);
  private discoveredDevices$ = new BehaviorSubject<DiscoveredDevice[]>([]);

  // Device info
  private deviceId = `remote-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  private deviceName = 'iPad Remote Control';

  constructor() {
    console.log('🎮 Remote WebSocket Service initialized');
    console.log(`📱 Device ID: ${this.deviceId}`);
    
    // Auto-discover devices when service starts
    this.startDeviceDiscovery();
    
    // Auto-connect to first discovered device
    this.setupAutoConnect();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.disconnect();
  }

  // Public observables
  getConnectionState(): Observable<ConnectionState> {
    return this.connectionState$.asObservable();
  }

  getMessages(): Observable<RemoteMessage> {
    return this.messages$.asObservable();
  }

  getTVStatus(): Observable<StatusMessage | null> {
    return this.tvStatus$.asObservable();
  }

  getDiscoveredDevices(): Observable<DiscoveredDevice[]> {
    return this.discoveredDevices$.asObservable();
  }

  // Enhanced connection management with proper device handling
  connectToDevice(device: DiscoveredDevice): void {
    console.log('🔌 Connecting to device:', device);
    
    // Stop scanning when attempting connection
    this.isScanning = false;
    this.scanningSubject.next(false);
    
    const url = `ws://${device.ip}:${device.port}`;
    this.connect(url);
  }

  connect(url: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('⚠️ Already connected to WebSocket');
      return;
    }

    console.log(`🔌 Connecting to: ${url}`);
    this.connectionState$.next('connecting');

    try {
      this.ws = new WebSocket(url);
      this.setupWebSocketHandlers();
    } catch (error) {
      console.error('❌ Failed to create WebSocket connection:', error);
      this.connectionState$.next('error');
    }
  }

  disconnect(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.ws) {
      console.log('🔌 Disconnecting from WebSocket');
      this.ws.close(1000, 'Remote disconnecting');
      this.ws = null;
    }

    this.connectionState$.next('disconnected');
    this.reconnectAttempts = 0;
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
      switchMap((devices: DiscoveredDevice[]) => 
        this.scanningSubject.pipe(
          filter((scanning: boolean) => !scanning), // Wait for scanning to finish
          map(() => devices)
        )
      )
    ).subscribe((devices: DiscoveredDevice[]) => {
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
    const gatewayBase = this.getGatewayBaseIP();
    const targetPorts = [5544, 5545, 5546, 5547];
    
    console.log(`🌐 Scanning ${gatewayBase}.x on ports:`, targetPorts);
    
    // Scan the gateway IP range for TV devices on specified ports
    this.scanNetworkForTVDevices(gatewayBase, targetPorts);
    
    setTimeout(() => {
      this.isScanning = false;
      this.scanningSubject.next(false);
      
      if (this.discoveredDevices$.value.length === 0) {
        // Fallback for local testing (development convenience)
        // Uses port 8000 for immediate connectivity testing
        const testDevice: DiscoveredDevice = {
          id: 'local-test-tv',
          name: 'Local TV (Test - Port 8000)',
          type: 'tv',
          ip: 'localhost',
          port: 8000,
          capabilities: ['navigation', 'control', 'status'],
          lastSeen: Date.now()
        };
        this.discoveredDevices$.next([testDevice]);
        console.log('📺 Added fallback device for testing (development port 8000)');
      }
      console.log(`✅ Device discovery complete. Found ${this.discoveredDevices$.value.length} devices`);
    }, 5000);
  }

  private getGatewayBaseIP(): string {
    // In a real implementation, this would detect the actual gateway
    // For now, assume common home network range
    return '192.168.1';
  }

  private async scanNetworkForTVDevices(gatewayBase: string, ports: number[]) {
    const promises: Promise<void>[] = [];
    
    // Scan IP range 192.168.1.1 to 192.168.1.254 on specified ports
    // Primary: 5544-5547 (per user story requirements)
    // Fallback: 8000 (development convenience)
    for (let ip = 1; ip <= 254; ip++) {
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
            const device: DiscoveredDevice = {
              id: `sahar-tv-${ip}-${port}`,
              name: `SAHAR TV (${ip})`,
              type: 'tv',
              ip: ip,
              port: port,
              capabilities: ['navigation', 'control', 'status'],
              lastSeen: Date.now()
            };
            
            const current = this.discoveredDevices$.value;
            this.discoveredDevices$.next([...current, device]);
            console.log(`📺 Added TV device: ${device.name} at ${ip}:${port}`);
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

  // WebSocket handlers
  private setupWebSocketHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('✅ WebSocket connected');
      this.connectionState$.next('connected');
      this.reconnectAttempts = 0;
      
      // Send discovery message
      this.sendDiscoveryMessage();
      
      // Start heartbeat - using status messages as heartbeat
      this.startHeartbeat();
      
      // Send data to TV when connection is first established
      console.log('🎉 Connection established - sending data to TV');
      this.sendDataToTV();
      
      // Initialize navigation when connection is first established
      console.log('🎉 Connection established - initializing navigation to performers');
      this.sendNavigationCommand('navigate_to_performer', 'performer1');
    };

    this.ws.onmessage = (event) => {
      try {
        const message: RemoteMessage = JSON.parse(event.data);
        console.log('📨 Received message:', message);
        
        this.handleIncomingMessage(message);
        this.messages$.next(message);
      } catch (error) {
        console.error('❌ Failed to parse message:', error);
      }
    };

    this.ws.onclose = (event) => {
      console.log('🔌 WebSocket closed:', event.code, event.reason);
      this.connectionState$.next('disconnected');
      
      if (this.heartbeatTimer) {
        clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = null;
      }

      // Re-enable auto-connect when disconnected
      this.autoConnectEnabled = true;

      // Auto-reconnect if not intentional disconnect
      if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        console.log(`🔄 Reconnecting... Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
        
        setTimeout(() => {
          if (this.ws && this.ws.url) {
            this.connect(this.ws.url);
          } else {
            // Try auto-discovery and connect again
            console.log('🔍 Starting auto-discovery for reconnection...');
            this.startDeviceDiscovery();
          }
        }, 2000 * this.reconnectAttempts);
      } else if (event.code !== 1000) {
        // Max reconnection attempts reached, try discovery again
        console.log('🔍 Max reconnection attempts reached, starting fresh discovery...');
        setTimeout(() => {
          this.startDeviceDiscovery();
        }, 5000);
      }
    };

    this.ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      this.connectionState$.next('error');
    };
  }

  private handleIncomingMessage(message: RemoteMessage): void {
    switch (message.type) {
      case 'status':
        this.tvStatus$.next(message as StatusMessage);
        break;
      
      case 'discovery':
        const discovery = message as DiscoveryMessage;
        if (discovery.payload.deviceType === 'tv' && discovery.payload.networkInfo) {
          const device: DiscoveredDevice = {
            id: discovery.payload.deviceId,
            name: discovery.payload.deviceName,
            type: 'tv',
            ip: discovery.payload.networkInfo.ip,
            port: discovery.payload.networkInfo.port,
            capabilities: discovery.payload.capabilities,
            lastSeen: Date.now()
          };
          
          const current = this.discoveredDevices$.value;
          const index = current.findIndex(d => d.id === device.id);
          if (index >= 0) {
            current[index] = device;
          } else {
            current.push(device);
          }
          this.discoveredDevices$.next([...current]);
        }
        break;

      case 'data':
        console.log('📱 Remote received data confirmation from TV');
        break;
    }
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
        }
      }
    };
    
    this.sendMessage(discovery);
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      const statusMessage: StatusMessage = {
        type: 'status',
        timestamp: Date.now(),
        payload: {
          currentState: {
            level: 'performers',
            breadcrumb: ['Remote Control'],
            canGoBack: false
          }
        }
      };
      
      this.sendMessage(statusMessage);
    }, this.heartbeatInterval);
  }

  // Public methods for sending commands
  sendNavigationCommand(action: 'navigate_to_performer' | 'navigate_to_video' | 'navigate_to_scene', targetId: string, targetType: 'performer' | 'video' | 'segment' = 'performer'): void {
    const command: NavigationMessage = {
      type: 'navigation',
      timestamp: Date.now(),
      payload: {
        action,
        targetId,
        targetType
      }
    };
    
    this.sendMessage(command);
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

  // Send data to TV when connection is established
  sendDataToTV(): void {
    // Import the actual performers data
    import('../../../shared/models/video-navigation').then(({ performersData }) => {
      // Convert the Remote app data format to the shared protocol format
      const dataPayload: DataPayload = {
        performers: performersData.map((performer: any) => ({
          id: performer.id.toString(),
          name: performer.name,
          thumbnail: performer.thumbnail,
          description: `${performer.videos.length} videos available`,
          videos: performer.videos.map((video: any) => ({
            id: video.id.toString(),
            title: video.title,
            thumbnail: video.thumbnail,
            duration: this.formatDuration(video.duration),
            description: `${video.likedScenes.length} scenes • ${this.formatDuration(video.duration)}`,
            scenes: video.likedScenes.map((scene: any) => ({
              id: scene.id.toString(),
              title: scene.title,
              timestamp: scene.startTime,
              duration: (scene.endTime || scene.startTime + 60) - scene.startTime,
              thumbnail: scene.thumbnail,
              description: `${this.formatDuration(scene.duration)} scene`
            }))
          }))
        }))
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

  private formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  private sendMessage(message: RemoteMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const json = JSON.stringify(message);
      console.log('📤 Sending message:', message);
      this.ws.send(json);
    } else {
      console.warn('⚠️ Cannot send message: WebSocket not connected');
    }
  }

  // Utility methods
  getCurrentTVState(): StatusMessage | null {
    return this.tvStatus$.value;
  }

  isConnected(): boolean {
    return this.connectionState$.value === 'connected';
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
