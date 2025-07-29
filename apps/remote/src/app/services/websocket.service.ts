import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject, interval, of } from 'rxjs';
import { takeUntil, retry, delay, startWith, switchMap, catchError } from 'rxjs/operators';

// WebSocket Protocol Types
export type MessageType = 'navigation' | 'control' | 'discovery' | 'status' | 'error' | 'heartbeat';

export interface BaseMessage {
  type: MessageType;
  timestamp: number;
}

export interface NavigationCommand extends BaseMessage {
  type: 'navigation';
  payload: {
    action: 'go_to_performers' | 'go_to_videos' | 'go_to_scenes' | 'select_performer' | 'select_video' | 'select_scene' | 'go_back';
    performerId?: number;
    videoId?: number;
    sceneId?: number;
  };
}

export interface ControlCommand extends BaseMessage {
  type: 'control';
  payload: {
    action: 'play' | 'pause' | 'stop' | 'seek' | 'volume_up' | 'volume_down' | 'mute' | 'unmute' | 'fullscreen' | 'exit_fullscreen';
    value?: number; // For seek position or volume level
  };
}

export interface DiscoveryMessage extends BaseMessage {
  type: 'discovery';
  payload: {
    deviceType: 'tv' | 'remote' | 'server';
    deviceId: string;
    deviceName: string;
    capabilities: string[];
    networkInfo?: {
      ip: string;
      port: number;
    };
  };
}

export interface StatusUpdate extends BaseMessage {
  type: 'status';
  payload: {
    message?: string;
    currentState?: {
      level: 'performers' | 'videos' | 'scenes';
      breadcrumb: string[];
      canGoBack: boolean;
      selectedPerformerId?: number;
      selectedVideoId?: number;
      selectedSceneId?: number;
    };
    playerState?: {
      isPlaying: boolean;
      currentTime: number;
      duration: number;
      volume: number;
      selectedVideoId?: number;
      selectedSceneId?: number;
    };
    deviceInfo?: {
      deviceType: string;
      deviceName: string;
      capabilities: string[];
    };
  };
}

export interface ErrorMessage extends BaseMessage {
  type: 'error';
  payload: {
    error: string;
    code?: string;
    details?: any;
  };
}

export interface HeartbeatMessage extends BaseMessage {
  type: 'heartbeat';
  payload: {
    timestamp: number;
    deviceId: string;
  };
}

export type RemoteMessage = NavigationCommand | ControlCommand | DiscoveryMessage | StatusUpdate | ErrorMessage | HeartbeatMessage;

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
  private tvStatus$ = new BehaviorSubject<StatusUpdate | null>(null);
  private discoveredDevices$ = new BehaviorSubject<DiscoveredDevice[]>([]);

  // Device info
  private deviceId = `remote-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  private deviceName = 'iPad Remote Control';

  constructor() {
    console.log('🎮 Remote WebSocket Service initialized');
    console.log(`📱 Device ID: ${this.deviceId}`);
    
    // Auto-discover devices when service starts
    this.startDeviceDiscovery();
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

  getTVStatus(): Observable<StatusUpdate | null> {
    return this.tvStatus$.asObservable();
  }

  getDiscoveredDevices(): Observable<DiscoveredDevice[]> {
    return this.discoveredDevices$.asObservable();
  }

  // Connection management
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
  private startDeviceDiscovery(): void {
    console.log('🔍 Starting device discovery...');
    
    // Try common TV/server addresses
    const commonAddresses = [
      'ws://localhost:8000',
      'ws://192.168.1.100:8000',
      'ws://192.168.1.101:8000',
      'ws://192.168.1.102:8000'
    ];

    // Test each address
    commonAddresses.forEach(url => {
      this.testConnection(url);
    });

    // Scan local network range (simplified)
    this.scanLocalNetwork();
  }

  private testConnection(url: string): void {
    const testWs = new WebSocket(url);
    
    testWs.onopen = () => {
      console.log(`✅ Device found at: ${url}`);
      
      const urlParts = url.replace('ws://', '').split(':');
      const ip = urlParts[0];
      const port = parseInt(urlParts[1]);
      
      const device: DiscoveredDevice = {
        id: `device-${ip}-${port}`,
        name: `TV Device (${ip})`,
        type: 'tv',
        ip,
        port,
        capabilities: ['navigation', 'control', 'status'],
        lastSeen: Date.now()
      };

      // Add to discovered devices
      const current = this.discoveredDevices$.value;
      const exists = current.find(d => d.id === device.id);
      if (!exists) {
        this.discoveredDevices$.next([...current, device]);
      }

      // Send discovery message
      const discoveryMsg: DiscoveryMessage = {
        type: 'discovery',
        timestamp: Date.now(),
        payload: {
          deviceType: 'remote',
          deviceId: this.deviceId,
          deviceName: this.deviceName,
          capabilities: ['navigation', 'control']
        }
      };
      
      testWs.send(JSON.stringify(discoveryMsg));
      testWs.close();
    };

    testWs.onerror = () => {
      // Silently fail for discovery
      testWs.close();
    };

    testWs.onclose = () => {
      // Clean up
    };
  }

  private scanLocalNetwork(): void {
    // Get local IP range (simplified for demo)
    // In a real app, you'd use more sophisticated network detection
    const baseIP = '192.168.1.';
    
    for (let i = 1; i <= 254; i++) {
      const ip = baseIP + i;
      const url = `ws://${ip}:8000`;
      
      // Test with a timeout to avoid blocking
      setTimeout(() => {
        this.testConnection(url);
      }, i * 10); // Stagger requests
    }
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
      
      // Start heartbeat
      this.startHeartbeat();
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

      // Auto-reconnect if not intentional disconnect
      if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        console.log(`🔄 Reconnecting... Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
        
        setTimeout(() => {
          if (this.ws && this.ws.url) {
            this.connect(this.ws.url);
          }
        }, 2000 * this.reconnectAttempts);
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
        this.tvStatus$.next(message as StatusUpdate);
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
      
      case 'error':
        const error = message as ErrorMessage;
        console.error('🚨 TV Error:', error.payload.error);
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
        capabilities: ['navigation', 'control']
      }
    };
    
    this.sendMessage(discovery);
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      const heartbeat: HeartbeatMessage = {
        type: 'heartbeat',
        timestamp: Date.now(),
        payload: {
          timestamp: Date.now(),
          deviceId: this.deviceId
        }
      };
      
      this.sendMessage(heartbeat);
    }, this.heartbeatInterval);
  }

  // Public methods for sending commands
  sendNavigationCommand(action: NavigationCommand['payload']['action'], performerId?: number, videoId?: number, sceneId?: number): void {
    const command: NavigationCommand = {
      type: 'navigation',
      timestamp: Date.now(),
      payload: {
        action,
        performerId,
        videoId,
        sceneId
      }
    };
    
    this.sendMessage(command);
  }

  sendControlCommand(action: ControlCommand['payload']['action'], value?: number): void {
    const command: ControlCommand = {
      type: 'control',
      timestamp: Date.now(),
      payload: {
        action,
        value
      }
    };
    
    this.sendMessage(command);
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
  connectToDevice(device: DiscoveredDevice): void {
    const url = `ws://${device.ip}:${device.port}`;
    this.connect(url);
  }

  getCurrentTVState(): StatusUpdate | null {
    return this.tvStatus$.value;
  }

  isConnected(): boolean {
    return this.connectionState$.value === 'connected';
  }
}
