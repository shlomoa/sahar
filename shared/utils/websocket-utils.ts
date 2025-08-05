import { WEBSOCKET_CONFIG, WebSocketMessage, WebSocketError } from '../websocket/websocket-protocol';

// Utility functions for WebSocket operations
export class WebSocketUtils {
  static generateDeviceId(deviceType: 'tv' | 'remote'): string {
    return `${deviceType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  static createMessage(type: WebSocketMessage['type'], payload: any, deviceId?: string): WebSocketMessage {
    return {
      type,
      timestamp: Date.now(),
      payload,
      ...(deviceId && { deviceId })
    };
  }

  static generateLocalHostUrls(): string[] {
    const ips: string[] = [];
    WEBSOCKET_CONFIG.PORT_RANGE.forEach(base => {        
        ips.push(`ws://localhost:${base}`);
    });
      
    return ips;
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
      const timer = setTimeout(() => {
        ws.close();
        resolve(false);
      }, timeout);

      const ws = new WebSocket(url);
      
      ws.onopen = () => {
        clearTimeout(timer);
        ws.close();
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

  static calculateReconnectDelay(attempt: number): number {
    return Math.min(
      WEBSOCKET_CONFIG.RECONNECT_DELAY_BASE * Math.pow(2, attempt - 1),
      WEBSOCKET_CONFIG.RECONNECT_DELAY_MAX
    );
  }

  static isValidWebSocketMessage(data: any): data is WebSocketMessage {
    return (
      data &&
      typeof data === 'object' &&
      typeof data.type === 'string' &&
      typeof data.timestamp === 'number' &&
      data.payload !== undefined
    );
  }

  static createErrorObject(code: string, message: string): WebSocketError {
    return {
      code,
      message,
      timestamp: Date.now()
    };
  }

  static logMessage(deviceType: 'tv' | 'remote', direction: 'sent' | 'received', message: WebSocketMessage): void {
    const icon = direction === 'sent' ? '📤' : '📥';
    const device = deviceType.toUpperCase();
    console.log(`${icon} ${device}: ${direction} ${message.type} message:`, message);
  }
}
