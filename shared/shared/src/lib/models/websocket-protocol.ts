// WebSocket Communication Protocol for the Unified Appliance Model
// =================================================================================================

export type ClientType = 'tv' | 'remote';

// Protocol Configuration
export const WEBSOCKET_CONFIG = {
  SERVER_DEFAULT_PORT: 8080,
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

export type NetworkDevice = { deviceId: string; clientType: ClientType; ip: string | null; port: string; lastSeen: number; capabilities?: string[] };

// Local lightweight error shape used by legacy helpers (not part of protocol types)
export interface WebSocketClientError {
  code: string;
  message: string;
  timestamp: number;
  deviceId?: string;
}
