import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';

export interface WebSocketMessage {
  type: string;
  data: any;
}

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private socket: WebSocket | null = null;
  private messageSubject = new Subject<WebSocketMessage>();
  private connectionSubject = new Subject<boolean>();
  
  private tvIpAddress = '192.168.1.100'; // Default TV IP - should be configurable
  private tvPort = 8080; // Default WebSocket port

  constructor() {}

  connect(ipAddress?: string, port?: number): void {
    if (ipAddress) this.tvIpAddress = ipAddress;
    if (port) this.tvPort = port;
    
    try {
      this.socket = new WebSocket(`ws://${this.tvIpAddress}:${this.tvPort}`);
      
      this.socket.onopen = () => {
        console.log('WebSocket connected to TV');
        this.connectionSubject.next(true);
      };
      
      this.socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.messageSubject.next(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      this.socket.onclose = () => {
        console.log('WebSocket disconnected from TV');
        this.connectionSubject.next(false);
      };
      
      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.connectionSubject.next(false);
      };
    } catch (error) {
      console.error('Failed to connect to TV:', error);
      this.connectionSubject.next(false);
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  sendMessage(message: WebSocketMessage): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    } else {
      console.error('WebSocket not connected');
    }
  }

  getMessages(): Observable<WebSocketMessage> {
    return this.messageSubject.asObservable();
  }

  getConnectionStatus(): Observable<boolean> {
    return this.connectionSubject.asObservable();
  }

  isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }
}