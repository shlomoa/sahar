// WebSocket Communication Protocol for the Unified Appliance Model

// =================================================================================================
// CORE FSM STATE
// Imported single-source ApplicationState / ClientInfo from shared models to avoid duplication.
// =================================================================================================
import { ApplicationState, ClientInfo } from '@shared/models/application-state.js';

// =================================================================================================
// MESSAGE STRUCTURE
// Base interface for all messages exchanged between server and clients.
// =================================================================================================

export interface WebSocketMessage {
  type: MessageType;
  timestamp: number;
  source: 'tv' | 'remote' | 'server';
  payload: any;
}

export type MessageType =
  // Client -> Server
  | 'register'
  | 'data'              // Remote seeds initial domain data (one-shot best‑effort)
  | 'navigation_command'
  | 'control_command'
  | 'action_confirmation' // TV confirms action is done
  // Server -> Client
  | 'ack'                 // Server acknowledges command
  | 'state_sync'          // Server sends full FSM state
  | 'error';

// =================================================================================================
// CLIENT -> SERVER MESSAGES
// =================================================================================================

// For clients to identify themselves upon connection
export interface RegisterPayload {
  clientType: 'tv' | 'remote';
  deviceId: string;
  deviceName: string;
}
// Canonical client device type used across server FSM and handlers
export type ClientType = RegisterPayload['clientType'];
export interface RegisterMessage extends WebSocketMessage {
  type: 'register';
  payload: RegisterPayload;
}

// For the Remote to request a navigation change
export interface NavigationCommandPayload {
  action: 'navigate_to_performer' | 'navigate_to_video' | 'navigate_to_scene' | 'navigate_back' | 'navigate_home';
  targetId?: string;
}
export interface NavigationCommandMessage extends WebSocketMessage {
  type: 'navigation_command';
  payload: NavigationCommandPayload;
}

// For the Remote to request a player or system state change
export interface ControlCommandPayload {
  action: 'play' | 'pause' | 'seek' | 'set_volume' | 'mute' | 'unmute';
  // For 'play'
  youtubeId?: string;
  startTime?: number;
  // For 'seek'
  seekTime?: number;
  // For 'set_volume'
  volume?: number;
}
export interface ControlCommandMessage extends WebSocketMessage {
  type: 'control_command';
  payload: ControlCommandPayload;
}

// For the TV to confirm it has completed a requested action
export interface ActionConfirmationPayload {
  status: 'success' | 'failure';
  errorMessage?: string;
}
export interface ActionConfirmationMessage extends WebSocketMessage {
  type: 'action_confirmation';
  payload: ActionConfirmationPayload;
}

// Remote -> Server one-shot (best effort) domain data seeding
export interface DataPayload { [key: string]: any; }
export interface DataMessage extends WebSocketMessage {
  type: 'data';
  payload: DataPayload; // Accept any JSON object for Milestone 1
}


// =================================================================================================
// SERVER -> CLIENT MESSAGES
// =================================================================================================

// For the server to acknowledge receipt of a message.
// This is a simple acknowledgement and does not carry a payload.
export interface AckMessage extends WebSocketMessage {
  type: 'ack';
  payload: {}; // Explicitly empty
}

// For the server to broadcast the FSM state to all clients
export interface StateSyncMessage extends WebSocketMessage {
  type: 'state_sync';
  payload: ApplicationState;
}

// For the server to report errors
export interface ErrorPayload {
  code: string;
  message: string;
}
export interface ErrorMessage extends WebSocketMessage {
  type: 'error';
  payload: ErrorPayload;
}

// =================================================================================================
// TYPE GUARDS & CONFIG
// =================================================================================================

// Union type for all possible messages
export type SaharMessage =
  | RegisterMessage
  | DataMessage
  | NavigationCommandMessage
  | ControlCommandMessage
  | ActionConfirmationMessage
  | AckMessage
  | StateSyncMessage
  | ErrorMessage;

// Protocol Configuration
export const WEBSOCKET_CONFIG = {
  TV_DEV_PORT: 4203,
  REMOTE_DEV_PORT: 4202,
  SERVER_PORT: 8080,
  ACK_TIMEOUT: 5000, // ms
  WS_PATH: '/ws',
} as const; // Validation config moved to validation/config/validation-config.ts

// Error Codes
export const ERROR_CODES = {
  // Connection & Registration
  INVALID_REGISTRATION: 'INVALID_REGISTRATION',
  CLIENT_TYPE_MISMATCH: 'CLIENT_TYPE_MISMATCH', // e.g., a second TV tries to connect

  // FSM & Command Errors
  INVALID_COMMAND: 'INVALID_COMMAND',
  INVALID_STATE_TRANSITION: 'INVALID_STATE_TRANSITION',
  COMMAND_FAILED: 'COMMAND_FAILED', // General failure reported by actuator
  
  // Protocol Errors
  INVALID_MESSAGE_FORMAT: 'INVALID_MESSAGE_FORMAT',
  ACK_TIMEOUT: 'ACK_TIMEOUT', // Receiver did not acknowledge in time
} as const;

// =================================================================================================
// ACTION SETS (Authoritative Lists)
// Centralized canonical sets for quick membership validation in the server.
// These MUST mirror the string literal unions declared in NavigationCommandPayload.action
// and ControlCommandPayload.action above. Any change here requires updating those unions.
// =================================================================================================

export const NAVIGATION_ACTION_SET: ReadonlySet<NavigationCommandPayload['action']> = new Set([
  'navigate_to_performer',
  'navigate_to_video',
  'navigate_to_scene',
  'navigate_back',
  'navigate_home'
]);

export const CONTROL_ACTION_SET: ReadonlySet<ControlCommandPayload['action']> = new Set([
  'play',
  'pause',
  'seek',
  'set_volume',
  'mute',
  'unmute'
]);
