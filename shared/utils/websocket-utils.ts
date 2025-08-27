import { WEBSOCKET_CONFIG, WebSocketMessage, BasePayload } from '../models/websocket-protocol';

// Local lightweight error shape used by legacy helpers (not part of protocol types)
export interface WebSocketClientError {
  code: string;
  message: string;
  timestamp: number;
  deviceId?: string;
}

// Utility functions for WebSocket operations
export class WebSocketUtils {  
  static generateDeviceId(deviceType: 'tv' | 'remote'): string {
    return `${deviceType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  static createMessage(type: WebSocketMessage['type'], payload: BasePayload = {}, source: 'tv' | 'remote' | 'server'): WebSocketMessage {
    return {
      type,
      timestamp: Date.now(),
      source,
      payload
    };
  }

  static generateLocalHostUrls(): string[] {
    // Simplified: single configured server port
    return [`ws://localhost:${WEBSOCKET_CONFIG.SERVER_DEFAULT_PORT}${WEBSOCKET_CONFIG.WS_PATH}`];
  }

  static generateLocalNetworkIPs(): string[] {
    const ips: string[] = [];
    
    // Common local network ranges
    const ranges = [
      '192.168.1', '192.168.0', '192.168.2', '192.168.3',
      '10.0.0', '10.0.1', '172.16.0'
    ];

    ranges.forEach(base => {
      for (let i = 1; i <= 25; i++) {
        ips.push(`${base}.${i}`);
      }
    });

    return ips;
  }

  static getGatewayBaseIP(): string {
    // In a browser environment, we can't directly access network interfaces
    // This is a simplified approach - in a real app you might want to detect this differently
    return '192.168.1'; // Default to most common home network range
  }

  static async testWebSocketConnection(url: string, timeout = 5000): Promise<boolean> {
    return new Promise((resolve) => {
      let ws: WebSocket | null = null;
      const timer = setTimeout(() => {
        try { ws?.close(); } catch { /* ignore */ }
        resolve(false);
      }, timeout);

      try {
        ws = new WebSocket(url);
      } catch {
        clearTimeout(timer);
        resolve(false);
        return;
      }
      
      ws.onopen = () => {
        clearTimeout(timer);
        try { ws?.close(); } catch { /* ignore */ }
        resolve(true);
      };

      ws.onerror = () => {
        clearTimeout(timer);
        resolve(false);
      };

      ws.onclose = () => {
        clearTimeout(timer);
        resolve(false);
      };
    });
  }

  static formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  static calculateReconnectDelay(attempt: number, baseMs = 500, maxMs = 5000): number {
    return Math.min(baseMs * Math.pow(2, attempt - 1), maxMs);
  }

  static isValidWebSocketMessage(data: unknown): data is WebSocketMessage {
    const obj = data as Partial<WebSocketMessage> | null;
    return (
      !!obj &&
      typeof obj === 'object' &&
      typeof obj.type === 'string' &&
      typeof obj.timestamp === 'number' &&
      (obj as any).payload !== undefined
    );
  }

  static createErrorObject(code: string, message: string): WebSocketClientError {
    return { code, message, timestamp: Date.now() };
  }

  static logMessage(deviceType: 'tv' | 'remote', direction: 'sent' | 'received', message: WebSocketMessage): void {
    const icon = direction === 'sent' ? '📤' : '📥';
    const device = deviceType.toUpperCase();
    console.log(`${icon} ${device}: ${direction} ${message.type} message:`, message);
  }
}
