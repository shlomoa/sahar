import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';

// Components
import { DeviceConnectionComponent } from './components/device-connection/device-connection.component';
import { PerformersGridComponent } from './components/performers-grid/performers-grid.component';
import { VideosGridComponent } from './components/videos-grid/videos-grid.component';
import { ScenesGridComponent } from './components/scenes-grid/scenes-grid.component';
import { VideoControlsComponent } from './components/video-controls/video-controls.component';

// Services and Models
import { WebSocketService } from './services/websocket.service';
import { performersData, Performer, Video, LikedScene } from './models/video-navigation';

interface NavigationState {
  level: 'performers' | 'videos' | 'scenes' | 'scene-selected';
  performerId?: number;
  videoId?: number;
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
    MatButtonModule,
    DeviceConnectionComponent,
    PerformersGridComponent,
    VideosGridComponent,
    ScenesGridComponent,
    VideoControlsComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit, OnDestroy {
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

  // WebSocket event handlers
  private setupWebSocketListeners() {
    this.websocketService.getConnectionState().subscribe(state => {
      this.connectionStatus = state === 'connected' ? 'connected' : 
                              state === 'connecting' ? 'connecting' : 'disconnected';
      console.log('🔌 Connection status:', this.connectionStatus);
    });

    this.websocketService.getTVStatus().subscribe(status => {
      if (status?.payload?.currentState) {
        this.synchronizeWithTVNavigation(status.payload.currentState);
      }
      if (status?.payload?.playerState) {
        this.synchronizeWithTVPlayer(status.payload.playerState);
      }
    });

    this.websocketService.getDiscoveredDevices().subscribe(devices => {
      this.discoveredDevices = devices.map(d => ({
        name: d.name,
        address: d.ip,
        port: d.port,
        type: d.type
      }));
      console.log('🔍 Discovered devices:', this.discoveredDevices);
    });
  }

  // Synchronization methods
  private synchronizeWithTVNavigation(tvState: any) {
    console.log('📍 Synchronizing navigation with TV:', tvState);
    
    if (tvState.level === 'performers') {
      this.currentNavigation = { level: 'performers' };
    } else if (tvState.level === 'videos' && tvState.selectedPerformerId) {
      this.currentNavigation = { 
        level: 'videos', 
        performerId: tvState.selectedPerformerId.toString() 
      };
    } else if (tvState.level === 'scenes' && tvState.selectedPerformerId && tvState.selectedVideoId) {
      this.currentNavigation = { 
        level: 'scenes', 
        performerId: tvState.selectedPerformerId.toString(),
        videoId: tvState.selectedVideoId.toString()
      };
    } else if (tvState.selectedSceneId) {
      this.currentNavigation = { 
        level: 'scene-selected', 
        performerId: tvState.selectedPerformerId?.toString(),
        videoId: tvState.selectedVideoId?.toString(),
        sceneTimestamp: tvState.selectedSceneId?.toString()
      };
    }
    
    console.log('📱 Remote navigation updated:', this.currentNavigation);
  }

  private synchronizeWithTVPlayer(playerState: any) {
    console.log('🎮 Synchronizing player state with TV:', playerState);
    
    this.isPlaying = playerState.isPlaying || false;
    this.isMuted = playerState.volume === 0;
    this.volumeLevel = playerState.volume || 50;
    
    if (playerState.selectedSceneId && playerState.selectedVideoId) {
      this.currentNavigation = {
        level: 'scene-selected',
        performerId: this.currentNavigation.performerId,
        videoId: playerState.selectedVideoId.toString(),
        sceneTimestamp: playerState.selectedSceneId.toString()
      };
    }
  }

  // Device connection methods
  connectToDevice(device: DiscoveredDevice) {
    console.log('🔌 Connecting to device:', device);
    this.connectionStatus = 'connecting';
    const url = `ws://${device.address}:${device.port}`;
    this.websocketService.connect(url);
  }

  startDeviceDiscovery() {
    this.isScanning = true;
    this.discoveredDevices = [];
    console.log('🔍 Starting device discovery...');
    
    setTimeout(() => {
      this.isScanning = false;
      if (this.discoveredDevices.length === 0) {
        this.discoveredDevices = [
          { name: 'Local TV (Test)', address: 'localhost', port: 8000, type: 'tv' }
        ];
        console.log('📺 Added fallback device for testing');
      }
    }, 3000);
  }

  // Navigation methods
  navigateToPerformer(performerId: number) {
    console.log('👤 Navigate to performer:', performerId);
    this.websocketService.sendNavigationCommand('select_performer', performerId);
    this.currentNavigation = { level: 'videos', performerId };
  }

  navigateToPerformers() {
    console.log('🏠 Navigate to performers');
    this.websocketService.sendNavigationCommand('go_to_performers');
    this.currentNavigation = { level: 'performers' };
  }

  navigateToVideo(performerId: number, videoId: number) {
    console.log('🎬 Navigate to video:', performerId, videoId);
    this.websocketService.sendNavigationCommand('select_video', performerId, videoId);
    this.currentNavigation = { level: 'scenes', performerId, videoId };
  }

  navigateToVideos(performerId: number) {
    console.log('📹 Navigate to videos for performer:', performerId);
    this.websocketService.sendNavigationCommand('go_to_videos', performerId);
    this.currentNavigation = { level: 'videos', performerId };
  }

  navigateToScene(performerId: number, videoId: number, sceneTimestamp: string) {
    console.log('🎯 Navigate to scene:', performerId, videoId, sceneTimestamp);
    const sceneId = parseInt(sceneTimestamp.replace(':', ''));
    this.websocketService.sendNavigationCommand('select_scene', performerId, videoId, sceneId);
    this.currentNavigation = { level: 'scene-selected', performerId, videoId, sceneTimestamp };
  }

  navigateToScenes(performerId: number, videoId: number) {
    console.log('🎬 Navigate to scenes for video:', performerId, videoId);
    this.websocketService.sendNavigationCommand('go_to_scenes', performerId, videoId);
    this.currentNavigation = { level: 'scenes', performerId, videoId };
  }

  // Data access methods
  getVideosForPerformer(performerId: number): Video[] {
    const performer = this.performers.find(p => p.id === performerId);
    return performer?.videos || [];
  }

  getScenesForVideo(performerId: number, videoId: number): LikedScene[] {
    const performer = this.performers.find(p => p.id === performerId);
    const video = performer?.videos.find(v => v.id === videoId);
    return video?.scenes || [];
  }

  getCurrentVideo(): Video | undefined {
    if (!this.currentNavigation.performerId || !this.currentNavigation.videoId) {
      return undefined;
    }
    const performer = this.performers.find(p => p.id === this.currentNavigation.performerId!);
    return performer?.videos.find(v => v.id === this.currentNavigation.videoId!);
  }

  getCurrentScene(): LikedScene | undefined {
    if (!this.currentNavigation.sceneTimestamp) {
      return undefined;
    }
    const video = this.getCurrentVideo();
    return video?.scenes.find((s: any) => s.timestamp.toString() === this.currentNavigation.sceneTimestamp);
  }

  // Video control methods
  sendControlCommand(command: string) {
    console.log('🎮 Control command:', command);
    
    switch (command) {
      case 'play-pause':
        this.websocketService.sendControlCommand(this.isPlaying ? 'pause' : 'play');
        this.isPlaying = !this.isPlaying;
        break;
      case 'previous-scene':
        this.navigateToPreviousScene();
        break;
      case 'next-scene':
        this.navigateToNextScene();
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
        this.isMuted = !this.isMuted;
        break;
      case 'stop':
        this.websocketService.sendControlCommand('stop');
        this.isPlaying = false;
        break;
    }
  }

  private navigateToPreviousScene() {
    const video = this.getCurrentVideo();
    if (!video || !this.currentNavigation.sceneTimestamp) return;
    
    const currentIndex = video.scenes.findIndex((s: any) => s.timestamp.toString() === this.currentNavigation.sceneTimestamp);
    if (currentIndex > 0) {
      const previousScene = video.scenes[currentIndex - 1];
      this.navigateToScene(
        this.currentNavigation.performerId!,
        this.currentNavigation.videoId!,
        previousScene.timestamp.toString()
      );
    }
  }

  private navigateToNextScene() {
    const video = this.getCurrentVideo();
    if (!video || !this.currentNavigation.sceneTimestamp) return;
    
    const currentIndex = video.scenes.findIndex((s: any) => s.timestamp.toString() === this.currentNavigation.sceneTimestamp);
    if (currentIndex < video.scenes.length - 1) {
      const nextScene = video.scenes[currentIndex + 1];
      this.navigateToScene(
        this.currentNavigation.performerId!,
        this.currentNavigation.videoId!,
        nextScene.timestamp.toString()
      );
    }
  }

  onVolumeChange(value: number) {
    this.volumeLevel = value;
    this.websocketService.sendControlCommand('volume_up', value);
    console.log('🔊 Volume changed to:', value);
  }

  // Enhanced controls visibility
  showEnhancedControls(): boolean {
    return this.currentNavigation.level === 'scene-selected' && 
           this.connectionStatus === 'connected';
  }

  hasPreviousScene(): boolean {
    const video = this.getCurrentVideo();
    if (!video || !this.currentNavigation.sceneTimestamp) return false;
    const currentIndex = video.scenes.findIndex((s: any) => s.timestamp.toString() === this.currentNavigation.sceneTimestamp);
    return currentIndex > 0;
  }

  hasNextScene(): boolean {
    const video = this.getCurrentVideo();
    if (!video || !this.currentNavigation.sceneTimestamp) return false;
    const currentIndex = video.scenes.findIndex((s: any) => s.timestamp.toString() === this.currentNavigation.sceneTimestamp);
    return currentIndex < video.scenes.length - 1;
  }
}
