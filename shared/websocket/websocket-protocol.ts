// WebSocket Communication Protocol for TV-Remote System

export interface WebSocketMessage {
  type: 'navigation' | 'control' | 'discovery' | 'discovery_response' | 'status' | 'data' | 'data_confirmation' | 'broadcast' | 'error' | 'heartbeat';
  timestamp: number;
  payload: any;
  messageId?: string; // Optional for tracking
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
  protocolVersion?: string; // Protocol v2.0 support
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

export interface DiscoveryResponseMessage extends WebSocketMessage {
  type: 'discovery_response';
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

export interface DataConfirmationMessage extends WebSocketMessage {
  type: 'data_confirmation';
  payload: {
    status: 'received' | 'error';
    dataVersion?: string;
    checksum?: string;
    itemsReceived?: {
      performers: number;
      videos: number;
      scenes: number;
    };
    error?: string;
  };
}

export interface ErrorMessage extends WebSocketMessage {
  type: 'error';
  payload: {
    errorCode: string;
    errorMessage: string;
    originalMessage?: WebSocketMessage;
    suggestions?: string[];
    retryAttempt?: number;
    nextRetryIn?: number;
  };
}

export interface HeartbeatMessage extends WebSocketMessage {
  type: 'heartbeat';
  payload: {
    deviceId: string;
    status: 'alive';
    timestamp?: number;
  };
}

export interface BroadcastMessage extends WebSocketMessage {
  type: 'broadcast';
  original: NavigationMessage | ControlMessage | DiscoveryMessage | StatusMessage | DataMessage;
}

// Union type for all possible messages
export type RemoteMessage = 
  | NavigationMessage 
  | ControlMessage 
  | DiscoveryMessage 
  | DiscoveryResponseMessage
  | StatusMessage 
  | DataMessage 
  | DataConfirmationMessage
  | ErrorMessage
  | HeartbeatMessage
  | BroadcastMessage;

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
