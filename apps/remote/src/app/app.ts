import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatListModule } from '@angular/material/list';

import { WebSocketService } from './services/websocket.service';
import { performersData, Performer, Video, LikedScene } from './models/video-navigation';

interface NavigationState {
  level: 'performers' | 'videos' | 'scenes' | 'scene-selected';
  performerId?: string;
  videoId?: string;
  sceneTimestamp?: string;
}

interface DiscoveredDevice {
  name: string;
  address: string;
  port: number;
  type: string;
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatListModule
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit, OnDestroy {
  title = 'remote';

  // Data
  performers: Performer[] = performersData;
  
  // Navigation state (synced with TV)
  currentNavigation: NavigationState = { level: 'performers' };
  
  // Connection management
  connectionStatus: ConnectionStatus = 'disconnected';
  discoveredDevices: DiscoveredDevice[] = [];
  isScanning = false;
  
  // Video control states
  isPlaying = false;
  isMuted = false;
  volumeLevel = 50;

  constructor(private websocketService: WebSocketService) {}

  ngOnInit() {
    this.setupWebSocketListeners();
    this.startDeviceDiscovery();
  }

  ngOnDestroy() {
    this.websocketService.disconnect();
  }

  private setupWebSocketListeners() {
    this.websocketService.getConnectionState().subscribe(state => {
      this.connectionStatus = state === 'connected' ? 'connected' : 'disconnected';
    });

    this.websocketService.getMessages().subscribe(message => {
      this.handleWebSocketMessage(message);
    });

    this.websocketService.getTVStatus().subscribe(status => {
      if (status?.payload?.currentState) {
        this.currentNavigation = {
          level: status.payload.currentState.level as any,
          performerId: status.payload.currentState.selectedPerformerId?.toString(),
          videoId: status.payload.currentState.selectedVideoId?.toString(),
          sceneTimestamp: status.payload.currentState.selectedSceneId?.toString()
        };
      }
      if (status?.payload?.playerState) {
        this.isPlaying = status.payload.playerState.isPlaying;
        this.volumeLevel = status.payload.playerState.volume;
      }
    });

    this.websocketService.getDiscoveredDevices().subscribe(devices => {
      this.discoveredDevices = devices.map(d => ({
        name: d.name,
        address: d.ip,
        port: d.port,
        type: d.type
      }));
    });
  }

  private handleWebSocketMessage(message: any) {
    switch (message.type) {
      case 'navigation-update':
        this.currentNavigation = message.navigation;
        break;
      case 'playback-status':
        this.isPlaying = message.isPlaying;
        this.isMuted = message.isMuted;
        this.volumeLevel = message.volume;
        break;
      case 'device-discovery':
        if (message.devices) {
          this.discoveredDevices = message.devices;
        }
        break;
    }
  }

  // Device discovery
  startDeviceDiscovery() {
    this.isScanning = true;
    this.discoveredDevices = [];
    
    // Simulate device discovery for now
    setTimeout(() => {
      this.discoveredDevices = [
        { name: 'Living Room TV', address: 'localhost', port: 8000, type: 'tv' }
      ];
      this.isScanning = false;
    }, 2000);
  }

  onDeviceSelection(event: any) {
    const selectedDevice = event.option.value;
    if (selectedDevice) {
      this.connectToDevice(selectedDevice);
    }
  }

  private connectToDevice(device: DiscoveredDevice) {
    this.connectionStatus = 'connecting';
    this.websocketService.connect(`ws://${device.address}:${device.port}`);
  }

  // Navigation methods
  navigateToPerformer(performerId: string) {
    this.websocketService.sendNavigationCommand('select_performer', parseInt(performerId));
  }

  navigateToPerformers() {
    this.websocketService.sendNavigationCommand('go_to_performers');
  }

  navigateToVideo(performerId: string, videoId: string) {
    this.websocketService.sendNavigationCommand('select_video', parseInt(performerId), parseInt(videoId));
  }

  navigateToVideos(performerId: string) {
    this.websocketService.sendNavigationCommand('go_to_videos', parseInt(performerId));
  }

  navigateToScene(performerId: string, videoId: string, sceneTimestamp: string) {
    // For scenes, we'll use the scene ID which is the timestamp
    this.websocketService.sendNavigationCommand('select_scene', parseInt(performerId), parseInt(videoId), parseInt(sceneTimestamp.replace(':', '')));
  }

  navigateToScenes(performerId: string, videoId: string) {
    this.websocketService.sendNavigationCommand('go_to_scenes', parseInt(performerId), parseInt(videoId));
  }

  private updateNavigation(navigation: NavigationState) {
    this.currentNavigation = navigation;
    // Navigation is now handled by the specific navigation methods above
  }

  // Data access methods
  getVideosForPerformer(performerId: string): Video[] {
    const performer = this.performers.find(p => p.id === parseInt(performerId));
    return performer?.videos || [];
  }

  getScenesForVideo(performerId: string, videoId: string): LikedScene[] {
    const performer = this.performers.find(p => p.id === parseInt(performerId));
    const video = performer?.videos.find(v => v.id === parseInt(videoId));
    return video?.scenes || [];
  }

  getCurrentVideo(): Video | undefined {
    if (!this.currentNavigation.performerId || !this.currentNavigation.videoId) {
      return undefined;
    }
    const performer = this.performers.find(p => p.id === parseInt(this.currentNavigation.performerId!));
    return performer?.videos.find(v => v.id === parseInt(this.currentNavigation.videoId!));
  }

  getCurrentScene(): LikedScene | undefined {
    if (!this.currentNavigation.sceneTimestamp) {
      return undefined;
    }
    const video = this.getCurrentVideo();
    return video?.scenes.find((s: any) => s.timestamp === this.currentNavigation.sceneTimestamp);
  }

  // Video control methods
  sendControlCommand(command: string) {
    // Map our command names to the WebSocket service expected format
    switch (command) {
      case 'play-pause':
        this.websocketService.sendControlCommand(this.isPlaying ? 'pause' : 'play');
        break;
      case 'previous-scene':
        // Handle scene navigation
        this.websocketService.sendControlCommand('seek', 0); // Go to beginning
        break;
      case 'next-scene':
        // Handle scene navigation
        this.websocketService.sendControlCommand('seek', 100); // Skip forward
        break;
      case 'rewind':
        this.websocketService.sendControlCommand('seek', -10);
        break;
      case 'fast-forward':
        this.websocketService.sendControlCommand('seek', 10);
        break;
      case 'toggle-fullscreen':
        this.websocketService.sendControlCommand('fullscreen');
        break;
      case 'toggle-mute':
        this.websocketService.sendControlCommand(this.isMuted ? 'unmute' : 'mute');
        break;
      default:
        console.log('Unknown command:', command);
    }
  }

  onVolumeChange(value: number) {
    this.volumeLevel = value;
    this.websocketService.sendControlCommand('volume_up', value);
  }

  hasPreviousScene(): boolean {
    const video = this.getCurrentVideo();
    if (!video || !this.currentNavigation.sceneTimestamp) {
      return false;
    }
    const currentIndex = video.scenes.findIndex((s: any) => s.timestamp === this.currentNavigation.sceneTimestamp);
    return currentIndex > 0;
  }

  hasNextScene(): boolean {
    const video = this.getCurrentVideo();
    if (!video || !this.currentNavigation.sceneTimestamp) {
      return false;
    }
    const currentIndex = video.scenes.findIndex((s: any) => s.timestamp === this.currentNavigation.sceneTimestamp);
    return currentIndex < video.scenes.length - 1;
  }

  // TrackBy functions for performance
  trackByPerformerId(index: number, performer: Performer): string {
    return performer.id.toString();
  }

  trackByVideoId(index: number, video: Video): string {
    return video.id.toString();
  }

  trackBySceneId(index: number, scene: LikedScene): string {
    return scene.timestamp.toString();
  }
}
