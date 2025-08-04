// WebSocket Communication Protocol for TV-Remote System

export interface WebSocketMessage {
  type: 'navigation' | 'control' | 'discovery' | 'status' | 'data' | 'broadcast';
  timestamp: number;
  payload: any;
  original?: WebSocketMessage; // For broadcast messages containing original message
}

// Navigation Commands - for moving through the data model
export interface NavigationCommand {
  action: 'navigate_to_performer' | 'navigate_to_video' | 'navigate_to_scene';
  targetId: string;
  targetType: 'performer' | 'video' | 'segment';
}

// General Control Commands - for player and navigation control
export interface ControlCommand {
  action: 'back' | 'home' | 'stop' | 'resume' | 'play' | 'pause';
  targetId?: string; // Optional, for play commands
}

// Discovery Protocol - for TV/Remote to find each other
export interface DiscoveryPayload {
  deviceType: 'tv' | 'remote';
  deviceId: string;
  deviceName: string;
  capabilities: string[];
  networkInfo: {
    ip: string;
    port: number;
  };
}

// Data Transfer - for sending performer/video data from Remote to TV
export interface DataPayload {
  performers: Array<{
    id: string;
    name: string;
    thumbnail: string;
    description?: string;
    videos: Array<{
      id: string;
      title: string;
      thumbnail: string;
      duration: string;
      description?: string;
      scenes: Array<{
        id: string;
        title: string;
        timestamp: number;
        duration: number;
        thumbnail: string;
        description?: string;
      }>;
    }>;
  }>;
}

// Status Updates - for keeping devices in sync
export interface StatusUpdate {
  currentState: {
    level: 'performers' | 'videos' | 'scenes';
    performerId?: string;
    videoId?: string;
    sceneId?: string;
    breadcrumb: string[];
    canGoBack: boolean;
  };
  playerState?: {
    isPlaying: boolean;
    currentTime?: number;
    duration?: number;
    volume?: number;
  };
}

// Complete message types
export interface NavigationMessage extends WebSocketMessage {
  type: 'navigation';
  payload: NavigationCommand;
}

export interface ControlMessage extends WebSocketMessage {
  type: 'control';
  payload: ControlCommand;
}

export interface DiscoveryMessage extends WebSocketMessage {
  type: 'discovery';
  payload: DiscoveryPayload;
}

export interface StatusMessage extends WebSocketMessage {
  type: 'status';
  payload: StatusUpdate;
}

export interface DataMessage extends WebSocketMessage {
  type: 'data';
  payload: DataPayload;
}

export interface BroadcastMessage extends WebSocketMessage {
  type: 'broadcast';
  original: NavigationMessage | ControlMessage | DiscoveryMessage | StatusMessage | DataMessage;
}

// Union type for all possible messages
export type RemoteMessage = NavigationMessage | ControlMessage | DiscoveryMessage | StatusMessage | DataMessage | BroadcastMessage;

// Protocol Configuration
export const WEBSOCKET_CONFIG = {
  DEFAULT_PORT: 5544, // TV listens on ports 5544-5547, start with first available
  DISCOVERY_PORT: 8001,
  DISCOVERY_INTERVAL: 5000, // 5 seconds
  HEARTBEAT_INTERVAL: 30000, // 30 seconds
  RECONNECT_INTERVAL: 3000, // 3 seconds
  MAX_RECONNECT_ATTEMPTS: 10,
  BROADCAST_ADDRESS: '255.255.255.255',
  MULTICAST_GROUP: '239.255.255.250' // UPnP multicast group
};

// Device Discovery using UDP broadcast
export interface NetworkDevice {
  deviceType: 'tv' | 'remote';
  deviceId: string;
  deviceName: string;
  ip: string;
  port: number;
  lastSeen: number;
  capabilities: string[];
}

// Error handling
export interface WebSocketError {
  code: string;
  message: string;
  timestamp: number;
  deviceId?: string;
}

export const ERROR_CODES = {
  CONNECTION_FAILED: 'CONNECTION_FAILED',
  INVALID_MESSAGE: 'INVALID_MESSAGE',
  DEVICE_NOT_FOUND: 'DEVICE_NOT_FOUND',
  PROTOCOL_MISMATCH: 'PROTOCOL_MISMATCH',
  AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED'
} as const;
