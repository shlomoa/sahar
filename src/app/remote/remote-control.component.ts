import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { WebSocketService } from '../services/websocket.service';
import { VideoNavigationService, VideoItem, NavigationState } from '../services/video-navigation.service';

@Component({
    selector: 'ns-remote-control',
    templateUrl: './remote-control.component.html',
    styleUrls: ['./remote-control.component.css'],
    standalone: false
})
export class RemoteControlComponent implements OnInit, OnDestroy {
  isConnected = false;
  connectionStatus = 'Disconnected';
  connectionStatusClass = 'status-disconnected';
  
  currentItems: VideoItem[] = [];
  breadcrumbText = '';
  canGoBack = false;
  
  tvIpAddress = '192.168.1.100';
  
  private subscriptions: Subscription[] = [];

  constructor(
    private webSocketService: WebSocketService,
    private videoNavService: VideoNavigationService
  ) {}

  ngOnInit(): void {
    // Subscribe to connection status
    this.subscriptions.push(
      this.webSocketService.getConnectionStatus().subscribe(status => {
        this.isConnected = status;
        this.connectionStatus = status ? 'Connected' : 'Disconnected';
        this.connectionStatusClass = status ? 'status-connected' : 'status-disconnected';
      })
    );

    // Subscribe to navigation state
    this.subscriptions.push(
      this.videoNavService.getNavigationState().subscribe(state => {
        this.updateNavigationState(state);
      })
    );

    // Subscribe to WebSocket messages
    this.subscriptions.push(
      this.webSocketService.getMessages().subscribe(message => {
        this.handleWebSocketMessage(message);
      })
    );

    // Auto-connect on startup
    this.connectToTV();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.webSocketService.disconnect();
  }

  connectToTV(): void {
    this.webSocketService.connect(this.tvIpAddress, 8080);
  }

  onButtonTap(item: VideoItem): void {
    console.log('Button tapped:', item.title);
    
    if (item.type === 'video') {
      // Send play video command to TV
      this.sendCommand('play-video', { url: item.url, title: item.title });
    } else if (item.type === 'category') {
      // Navigate to category
      this.videoNavService.navigateToItem(item);
    }
  }

  sendCommand(command: string, data?: any): void {
    const message = {
      type: 'command',
      data: {
        command,
        ...data
      }
    };
    
    this.webSocketService.sendMessage(message);
    console.log('Sent command:', command, data);
  }

  goBack(): void {
    this.videoNavService.goBack();
  }

  goHome(): void {
    this.videoNavService.goHome();
  }

  private updateNavigationState(state: NavigationState): void {
    this.currentItems = this.padItemsToTwelve(state.currentLevel);
    this.breadcrumbText = state.breadcrumb.join(' > ');
    this.canGoBack = state.canGoBack;
  }

  private padItemsToTwelve(items: VideoItem[]): VideoItem[] {
    const paddedItems = [...items];
    
    // Add empty placeholder items to fill the grid
    while (paddedItems.length < 12) {
      paddedItems.push({
        id: `empty-${paddedItems.length}`,
        title: '',
        thumbnail: 'https://images.pexels.com/photos/326055/pexels-photo-326055.jpeg?auto=compress&cs=tinysrgb&w=300',
        type: 'category'
      });
    }
    
    return paddedItems.slice(0, 12);
  }

  private handleWebSocketMessage(message: any): void {
    console.log('Received message from TV:', message);
    
    switch (message.type) {
      case 'status':
        // Handle TV status updates
        break;
      case 'error':
        console.error('TV Error:', message.data);
        break;
      default:
        console.log('Unknown message type:', message.type);
    }
  }
}