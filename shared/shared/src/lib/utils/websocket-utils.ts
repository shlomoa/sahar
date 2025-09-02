import { ClientType, NetworkDevice, WEBSOCKET_CONFIG, WebSocketClientError } from '../models/websocket-protocol';
import { WebSocketMessage, BasePayload, MessageSource, MessageType } from '../models/messages';

// Utility functions for WebSocket operations
export class WebSocketUtils {  
  static generateDeviceId(clientType: ClientType): string {
    return `${clientType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  static createMessage(msgType: MessageType, payload: BasePayload = {msgType: msgType}, source: MessageSource): WebSocketMessage {
    return {
      msgType,
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
      for (let i = 1; i <= 255; i++) {
        ips.push(`${base}.${i}`);
      }
    });

    return ips;
  }

  static populateNetworkDevice(networkDevice: NetworkDevice) {
    if (!networkDevice.deviceId || networkDevice.deviceId.trim() === '') {
      networkDevice.deviceId = this.generateDeviceId(networkDevice.clientType);
    }
    networkDevice.ip = window.location.hostname;
    networkDevice.port = window.location.port;
    return networkDevice;
  }   

  static generateHostUrl(networkDevice: NetworkDevice): string {
    // Simplified: single configured server port
    return `ws://${networkDevice.ip}:${networkDevice.port}${WEBSOCKET_CONFIG.WS_PATH}`;
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
      typeof obj.msgType === 'string' &&
      typeof obj.timestamp === 'number' &&
      (obj as any).payload !== undefined
    );
  }

  static createErrorObject(code: string, message: string): WebSocketClientError {
    return { code, message, timestamp: Date.now() };
  }

  static logMessage(clientType: ClientType, direction: 'sent' | 'received', message: WebSocketMessage): void {
    const icon = direction === 'sent' ? '📤' : '📥';
    const device = clientType.toUpperCase();
    console.log(`${icon} ${device}: ${direction} ${message.msgType} message:`, message);
  }
}
