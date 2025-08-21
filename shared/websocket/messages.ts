// Canonical WebSocket message types for Sahar protocol
// This file is auto-generated to ensure all protocol messages are covered and up-to-date

import { ApplicationState } from '@shared/models/application-state';

export type MessageSource = 'tv' | 'remote' | 'server';
export type MessageType =
  | 'register'
  | 'data'
  | 'navigation_command'
  | 'control_command'
  | 'action_confirmation'
  | 'ack'
  | 'state_sync'
  | 'error'
  | 'any'
  | 'heartbeat';

export interface BasePayload {
  type: MessageType;
}

// Register
export interface RegisterPayload extends BasePayload {
  clientType: 'tv' | 'remote';
  deviceId: string;
  deviceName: string;
}
export interface RegisterMessage {
  type: 'register';
  timestamp: number;
  source: MessageSource;
  payload: RegisterPayload;
}

// Navigation Command
export interface NavigationCommandPayload extends BasePayload {
  action: 'navigate_to_performer' | 'navigate_to_video' | 'navigate_to_scene' | 'navigate_back' | 'navigate_home';
  targetId?: string;
}
export interface NavigationCommandMessage {
  type: 'navigation_command';
  timestamp: number;
  source: MessageSource;
  payload: NavigationCommandPayload;
}

// Control Command
export interface ControlCommandPayload extends BasePayload {
  action: 'play' | 'pause' | 'seek' | 'set_volume' | 'mute' | 'unmute';
  youtubeId?: string;
  startTime?: number;
  seekTime?: number;
  volume?: number;
}
export interface ControlCommandMessage {
  type: 'control_command';
  timestamp: number;
  source: MessageSource;
  payload: ControlCommandPayload;
}

// Action Confirmation
export interface ActionConfirmationPayload extends BasePayload {
  status: 'success' | 'failure';
  errorMessage?: string;
}
export interface ActionConfirmationMessage {
  type: 'action_confirmation';
  timestamp: number;
  source: MessageSource;
  payload: ActionConfirmationPayload;
}

// Data
export interface DataPayload extends BasePayload {
  [key: string]: string;
}
export interface DataMessage {
  type: 'data';
  timestamp: number;
  source: MessageSource;
  payload: DataPayload;
}

// Ack
export interface AckMessage {
  type: 'ack';
  timestamp: number;
  source: MessageSource;
  payload: { type: 'any' };
}

// State Sync
export interface ApplicationStatePayload extends BasePayload, ApplicationState {}
export interface StateSyncMessage {
  type: 'state_sync';
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
  type: 'error';
  timestamp: number;
  source: MessageSource;
  payload: ErrorPayload;
}

// Heartbeat
export interface HeartbeatMessage {
  type: 'heartbeat';
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
