// Canonical WebSocket message types for Sahar protocol
// This file is auto-generated to ensure all protocol messages are covered and up-to-date

import { ApplicationState, PlayerState } from '../models/application-state';
import { ClientType } from './websocket-protocol';

export type MessageSource = 'tv' | 'remote' | 'server';

export type MessageType =
  // Client -> Server
  | 'register'
  | 'data'
  | 'navigation_command'
  | 'control_command'
  | 'action_confirmation'
  // Server -> Client
  | 'ack'
  | 'state_sync'
  | 'error'
  // General message types
  | 'heartbeat';

export interface BasePayload {
  msgType: MessageType;
}

// Register
export interface RegisterPayload extends BasePayload {
  clientType: ClientType;
  deviceId: string;
}

export interface WebSocketMessage {
  msgType: MessageType;
  timestamp: number;
  source: MessageSource;
  payload: BasePayload;
}

export interface RegisterMessage {
  msgType: 'register';
  timestamp: number;
  source: MessageSource;
  payload: RegisterPayload;
}

// Navigation Command

export const NAVIGATION_ACTIONS =  [
  'navigate_to_performer',
  'navigate_to_video',
  'navigate_to_scene',
  'navigate_back',
  'navigate_home'
] as const;

export interface NavigationCommandPayload extends BasePayload {
  action: NavigationAction;
  targetId?: string;
}

export interface NavigationCommandMessage {
  msgType: 'navigation_command';
  timestamp: number;
  source: MessageSource;
  payload: NavigationCommandPayload;
}

// Control Command


export const CONTROL_ACTIONS = [
  'play',
  'pause',  
  'set_volume',
  'mute',
  'unmute',
  'enter_fullscreen',
  'exit_fullscreen'
] as const

export type ControlAction = typeof CONTROL_ACTIONS[number];

//export interface PlayerCommand extends PlayerState {
//  action: ControlAction;
//}

export interface ControlCommandPayload extends BasePayload, PlayerState { }
export interface ControlCommandMessage {
  msgType: 'control_command';
  timestamp: number;
  source: MessageSource;
  payload: ControlCommandPayload;
}

export type ActionConfirmationStatus = 'success' | 'failure';
// Action Confirmation
export interface ActionConfirmationPayload extends BasePayload {
  status: ActionConfirmationStatus;
  errorMessage?: string;
  playerState?: PlayerState;  // ✅ Actual player state after executing command
}
export interface ActionConfirmationMessage {
  msgType: 'action_confirmation';
  timestamp: number;
  source: MessageSource;
  payload: ActionConfirmationPayload;
}

// Data
export interface DataPayload extends BasePayload {
  data: Record<string, any> | null;
}
export interface DataMessage {
  msgType: 'data';
  timestamp: number;
  source: MessageSource;
  payload: DataPayload;
}

// Ack
export interface AckMessage {
  msgType: 'ack';
  timestamp: number;
  source: MessageSource;
  payload: { msgType: 'ack' };
}

// State Sync
export interface ApplicationStatePayload extends BasePayload, ApplicationState {}
export interface StateSyncMessage {
  msgType: 'state_sync';
  timestamp: number;
  source: MessageSource;
  payload: ApplicationStatePayload;
}

// Error
export interface ErrorPayload extends BasePayload {
  code: string;
  message: string;
}
export interface ErrorMessage {
  msgType: 'error';
  timestamp: number;
  source: MessageSource;
  payload: ErrorPayload;
}

// Heartbeat
export interface HeartbeatMessage {
  msgType: 'heartbeat';
  timestamp: number;
  source: MessageSource;
  payload: BasePayload;
}

// Union type for all messages
export type SaharMessage =
  | RegisterMessage
  | DataMessage
  | NavigationCommandMessage
  | ControlCommandMessage
  | ActionConfirmationMessage
  | AckMessage
  | StateSyncMessage
  | ErrorMessage
  | HeartbeatMessage;

// =================================================================================================
// ACTION SETS (Authoritative Lists)
// Centralized canonical sets for quick membership validation in the server.
// These MUST mirror the string literal unions declared in NavigationCommandPayload.action
// and ControlCommandPayload.action above. Any change here requires updating those unions.
// =================================================================================================

export type NavigationAction = typeof NAVIGATION_ACTIONS[number];
export const NAVIGATION_ACTION_SET: ReadonlySet<NavigationAction> = new Set(NAVIGATION_ACTIONS);

export const CONTROL_ACTION_SET: ReadonlySet<ControlAction> = new Set(CONTROL_ACTIONS);
