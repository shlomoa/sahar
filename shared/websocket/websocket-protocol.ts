// WebSocket Communication Protocol for TV-Remote System

export interface WebSocketMessage {
  type: 'navigation' | 'control' | 'discovery' | 'discovery_response' | 'status' | 'data' | 'data_confirmation' | 'error' | 'heartbeat' | 'debug' | 'broadcast';
  timestamp: number;
  payload: any;
  messageId?: string;  // Optional for tracking
  original?: WebSocketMessage; // For broadcast messages containing original message
}

type MessageType = 
  | 'discovery' 
  | 'discovery_response'
  | 'data'
  | 'data_confirmation'
  | 'navigation' 
  | 'control'
  | 'status'
  | 'error'
  | 'heartbeat'
  | 'debug'
  | 'broadcast';

// Navigation Commands - for moving through the data model
export interface NavigationCommand {
  action: 'navigate_to_performer' | 'navigate_to_video' | 'navigate_to_scene' | 'navigate_back' | 'navigate_home';
  targetId: string;
  targetType: 'performer' | 'video' | 'scene';
  parentId?: string;
  navigationPath?: string[];
  sceneData?: {
    startTime: number;
    endTime: number;
    title: string;
    youtubeId: string;
  };
  currentLevel?: string;
  targetLevel?: string;
}

// General Control Commands - for player and navigation control
export interface ControlCommand {
  action: 'back' | 'home' | 'stop' | 'resume' | 'play' | 'pause' | 'play_video' | 'pause_video' | 'seek_video' | 'volume_change' | 'next_scene' | 'previous_scene';
  targetId?: string; // Optional, for play commands
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
  protocolVersion: string;
}

// Discovery Response - TV responds to Remote discovery
export interface DiscoveryResponsePayload {
  deviceType: 'tv' | 'remote';
  deviceId: string;
  deviceName: string;
  status: 'ready' | 'busy' | 'error';
  capabilities: string[];
  networkInfo: {
    ip: string;
    port: number;
  };
  protocolVersion: string;
}

// Data Transfer - for sending performer/video data from Remote to TV
export interface DataPayload {
  performers: Array<{
    id: string;
    name: string;
    thumbnail: string;
    videos: Array<{
      id: string;
      title: string;
      youtubeId: string;
      thumbnail: string;
      scenes: Array<{
        id: string;
        title: string;
        startTime: number;
        endTime: number;
      }>;
    }>;
  }>;
  dataVersion: string;
  checksum: string;
  totalSize: number;
}

// Data Confirmation - TV confirms data receipt
export interface DataConfirmationPayload {
  status: 'received' | 'error' | 'partial';
  dataVersion: string;
  checksum: string;
  itemsReceived: {
    performers: number;
    videos: number;
    scenes: number;
  };
  errorMessage?: string;
}

// Status Updates - for keeping devices in sync
export interface StatusUpdate {
  currentState: {
    level: 'performers' | 'videos' | 'scenes';
    performerId?: string;
    performerName?: string;
    videoId?: string;
    videoTitle?: string;
    sceneId?: string;
    sceneTitle?: string;
    breadcrumb: string[];
    canGoBack: boolean;
    canGoHome: boolean;
  };
  playerState?: {
    isPlaying: boolean;
    currentTime?: number;
    duration?: number;
    volume?: number;
    muted?: boolean;
    buffered?: number;
    youtubeState?: string;
  };
  connectionState?: {
    connected: boolean;
    lastHeartbeat: number;
  };
  acknowledgment?: {
    messageId: string;
    status: 'success' | 'error';
    errorMessage?: string;
  };
}

// Error Messages - for error reporting and handling
export interface ErrorPayload {
  errorCode: string;
  errorMessage: string;
  originalMessage?: WebSocketMessage;
  suggestions?: string[];
  retryAttempt?: number;
  nextRetryIn?: number;
}

// Heartbeat Messages - for connection monitoring
export interface HeartbeatPayload {
  deviceId: string;
  status: 'alive' | 'busy' | 'ready';
}

// Debug Messages - for debugging and monitoring
export interface DebugPayload {
  command: 'connection_status' | 'message_stats' | 'clear_logs';
  data?: any;
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
  payload: DiscoveryResponsePayload;
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
  payload: DataConfirmationPayload;
}

export interface ErrorMessage extends WebSocketMessage {
  type: 'error';
  payload: ErrorPayload;
}

export interface HeartbeatMessage extends WebSocketMessage {
  type: 'heartbeat';
  payload: HeartbeatPayload;
}

export interface DebugMessage extends WebSocketMessage {
  type: 'debug';
  payload: DebugPayload;
}

export interface BroadcastMessage extends WebSocketMessage {
  type: 'broadcast';
  original: NavigationMessage | ControlMessage | DiscoveryMessage | DiscoveryResponseMessage | StatusMessage | DataMessage | DataConfirmationMessage | ErrorMessage | HeartbeatMessage | DebugMessage;
}

// Union type for all possible messages
export type RemoteMessage = NavigationMessage | ControlMessage | DiscoveryMessage | DiscoveryResponseMessage | StatusMessage | DataMessage | DataConfirmationMessage | ErrorMessage | HeartbeatMessage | DebugMessage | BroadcastMessage;

// Protocol Configuration
export const WEBSOCKET_CONFIG = {
  // Server & Connection Ports
  DEFAULT_PORT: 5544,
  PORT_RANGE: [5544, 5545, 5546, 5547], // Explicitly define the port range for scanning
  DISCOVERY_PORT: 8001,

  // Timing & Intervals (in milliseconds)
  DISCOVERY_INTERVAL: 5000,
  HEARTBEAT_INTERVAL: 30000,
  
  // Reconnection Policy
  RECONNECT_INTERVAL: 3000,
  MAX_RECONNECT_ATTEMPTS: 10,
  MAX_NUMBER_OF_DEVICES: 25, // Maximum number of devices to discover
  RECONNECT_DELAY_BASE: 1000, // For exponential backoff
  RECONNECT_DELAY_MAX: 30000, // Maximum delay between retries

  // Network Addresses
  BROADCAST_ADDRESS: '255.255.255.255',
  MULTICAST_GROUP: '239.255.255.250'
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
  // Connection & Discovery Errors
  CONNECTION_FAILED: 'CONNECTION_FAILED',
  CONNECTION_LOST: 'CONNECTION_LOST',
  DEVICE_NOT_FOUND: 'DEVICE_NOT_FOUND',
  TIMEOUT: 'TIMEOUT',

  // Protocol & Message Errors
  INVALID_MESSAGE: 'INVALID_MESSAGE',
  PROTOCOL_MISMATCH: 'PROTOCOL_MISMATCH',
  AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED',

  // Data Transfer Errors
  DATA_CORRUPTION: 'DATA_CORRUPTION',

  // Navigation & State Errors
  INVALID_PERFORMER_ID: 'INVALID_PERFORMER_ID',
  INVALID_VIDEO_ID: 'INVALID_VIDEO_ID',
  INVALID_SCENE_ID: 'INVALID_SCENE_ID',
} as const;
