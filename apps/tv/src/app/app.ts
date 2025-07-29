import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { VideoNavigationService } from './services/video-navigation.service';
import { WebSocketService } from './services/websocket.service';
import { NavigationState, VideoItem } from './models/video-navigation';
import { Observable, Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    CommonModule,
    MatToolbarModule,
    MatGridListModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit, OnDestroy {
  protected title = 'Sahar TV';
  navigation$: Observable<NavigationState>;
  private subscriptions: Subscription[] = [];

  constructor(
    private navigationService: VideoNavigationService,
    private webSocketService: WebSocketService,
    private snackBar: MatSnackBar
  ) {
    this.navigation$ = this.navigationService.navigation$;
  }

  ngOnInit(): void {
    // Navigation service automatically initializes to home
    this.navigation$.subscribe(nav => {
      console.log('Navigation state updated:', nav);
      console.log('Current level items:', nav.currentLevel.map(item => ({
        title: item.title,
        thumbnail: item.thumbnail,
        type: item.type
      })));
    });

    // Initialize WebSocket connection
    this.initializeWebSocket();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.webSocketService.disconnect();
  }

  private initializeWebSocket(): void {
    // Subscribe to WebSocket connection status
    const connectionSub = this.webSocketService.connected$.subscribe(connected => {
      if (connected) {
        this.snackBar.open('Remote connected', 'Close', { duration: 3000 });
      } else {
        const snackBarRef = this.snackBar.open('Remote disconnected', 'Retry', { 
          duration: 5000
        });
        snackBarRef.onAction().subscribe(() => {
          this.webSocketService.connect();
        });
      }
    });

    // Subscribe to WebSocket errors
    const errorSub = this.webSocketService.errors$.subscribe(error => {
      console.error('WebSocket error:', error);
      this.snackBar.open(`Connection error: ${error.message}`, 'Close', { duration: 5000 });
    });

    // Subscribe to discovered devices
    const devicesSub = this.webSocketService.devices$.subscribe(devices => {
      console.log('Discovered devices:', devices);
      if (devices.length > 0) {
        const remoteDevices = devices.filter(d => d.deviceType === 'remote');
        if (remoteDevices.length > 0) {
          const snackBarRef = this.snackBar.open(`Found ${remoteDevices.length} remote(s)`, 'Connect', {
            duration: 10000
          });
          snackBarRef.onAction().subscribe(() => {
            // Connect to the first available remote
            this.webSocketService.connectToDevice(remoteDevices[0]);
          });
        }
      }
    });

    this.subscriptions.push(connectionSub, errorSub, devicesSub);

    // Start the WebSocket connection
    this.webSocketService.connect();
    this.webSocketService.startDiscovery();
  }

  onItemClick(item: VideoItem): void {
    console.log('Clicked item:', item); // Debug log
    switch (item.type) {
      case 'performer':
        this.navigationService.navigateToPerformer(item.id);
        break;
      case 'video':
        this.navigationService.navigateToVideo(item.id);
        break;
      case 'segment':
        this.navigationService.playScene(item.id);
        break;
    }
  }

  onImageError(event: Event): void {
    console.log('Image failed to load:', (event.target as HTMLImageElement).src);
    const img = event.target as HTMLImageElement;
    img.src = 'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg?auto=compress&cs=tinysrgb&w=300';
  }

  onBackClick(): void {
    this.navigationService.goBack();
  }

  onHomeClick(): void {
    this.navigationService.goHome();
  }
}
