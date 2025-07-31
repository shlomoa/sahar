import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';

// Components
import { DeviceConnectionComponent } from './components/device-connection/device-connection.component';
import { PerformersGridComponent } from './components/performers-grid/performers-grid.component';
import { VideosGridComponent } from './components/videos-grid/videos-grid.component';
import { ScenesGridComponent } from './components/scenes-grid/scenes-grid.component';
import { VideoControlsComponent } from './components/video-controls/video-controls.component';

// Services and Models
import { WebSocketService, DiscoveredDevice } from './services/websocket.service';
import { performersData, Performer, Video, LikedScene } from '../../../../shared/models/video-navigation';

interface NavigationState {
  level: 'performers' | 'videos' | 'scenes' | 'scene-selected';
  performerId?: string;
  videoId?: string;
  sceneTimestamp?: string;
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
  
  // Navigation state (synced with TV) - starts undefined until connected
  currentNavigation: NavigationState = { level: 'performers' };
  
  // Connection management - starts disconnected
  connectionStatus: ConnectionStatus = 'disconnected';
  discoveredDevices: DiscoveredDevice[] = [];
  isScanning = false;
  autoConnectEnabled = true;
  
  // Video control states
  isPlaying = false;
  isMuted = false;
  volumeLevel = 50;

  constructor(private websocketService: WebSocketService) {}

  ngOnInit() {
    this.setupWebSocketListeners();
    // Device discovery is now handled by the WebSocket service
  }

  ngOnDestroy() {
    this.websocketService.disconnect();
  }

  // WebSocket event handlers
  private setupWebSocketListeners() {
    this.websocketService.getConnectionState().subscribe(state => {
      const previousStatus = this.connectionStatus;
      this.connectionStatus = state === 'connected' ? 'connected' : 
                              state === 'connecting' ? 'connecting' : 'disconnected';
      
      // Reset navigation when disconnected
      if (this.connectionStatus === 'disconnected') {
        console.log('❌ Disconnected - resetting navigation state');
        this.currentNavigation = { level: 'performers' };
      }
      
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
      this.discoveredDevices = devices;
      console.log('🔍 Discovered devices:', this.discoveredDevices);
    });

    this.websocketService.getScanningState().subscribe(scanning => {
      this.isScanning = scanning;
    });

    // Track auto-connect state
    this.autoConnectEnabled = this.websocketService.isAutoConnectEnabled();
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
    this.websocketService.connectToDevice(device);
  }

  startDeviceDiscovery() {
    console.log('� Starting device discovery...');
    this.websocketService.startDeviceDiscovery();
  }

  // Navigation methods
  navigateToPerformer(performerId: string) {
    console.log('👤 Navigate to performer:', performerId);
    this.websocketService.sendNavigationCommand('navigate_to_performer', performerId.toString(), 'performer');
    this.currentNavigation = { level: 'videos', performerId };
  }

  navigateToPerformers() {
    console.log('🏠 Navigate to performers');
    this.websocketService.sendNavigationCommand('navigate_to_performer', 'home', 'performer');
    this.currentNavigation = { level: 'performers' };
  }

  navigateToVideo(performerId: string, videoId: string) {
    console.log('🎬 Navigate to video:', performerId, videoId);
    this.websocketService.sendNavigationCommand('navigate_to_video', videoId.toString(), 'video');
    this.currentNavigation = { level: 'scenes', performerId, videoId };
  }

  navigateToVideos(performerId: string) {
    console.log('📹 Navigate to videos for performer:', performerId);
    this.websocketService.sendNavigationCommand('navigate_to_performer', performerId.toString(), 'performer');
    this.currentNavigation = { level: 'videos', performerId };
  }

  navigateToScene(performerId: string, videoId: string, sceneTimestamp: string) {
    console.log('🎯 Navigate to scene:', performerId, videoId, sceneTimestamp);
    const sceneId = parseInt(sceneTimestamp.replace(':', ''));
    this.websocketService.sendNavigationCommand('navigate_to_scene', sceneId.toString(), 'segment');
    this.currentNavigation = { level: 'scene-selected', performerId, videoId, sceneTimestamp };
  }

  navigateToScenes(performerId: string, videoId: string) {
    console.log('🎬 Navigate to scenes for video:', performerId, videoId);
    this.websocketService.sendNavigationCommand('navigate_to_video', videoId.toString(), 'video');
    this.currentNavigation = { level: 'scenes', performerId, videoId };
  }

  // Data access methods
  getVideosForPerformer(performerId: string): Video[] {
    const performer = this.performers.find(p => p.id === performerId);
    return performer?.videos || [];
  }

  getScenesForVideo(performerId: string, videoId: string): any[] {
    const performer = this.performers.find((p: any) => p.id === performerId);
    const video = performer?.videos.find((v: any) => v.id === videoId);
    return video?.likedScenes || [];
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
    return video?.likedScenes.find((s: any) => s.startTime.toString() === this.currentNavigation.sceneTimestamp);
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
        // Use navigation back command instead of seek
        this.websocketService.sendControlCommand('back');
        break;
      case 'fast-forward':
        // Use resume command for forward movement
        this.websocketService.sendControlCommand('resume');
        break;
      case 'toggle-fullscreen':
        // Fullscreen not available in shared protocol, use play as alternative
        this.websocketService.sendControlCommand('play');
        break;
      case 'toggle-mute':
        // Mute not available in shared protocol, use pause as alternative
        this.websocketService.sendControlCommand(this.isMuted ? 'resume' : 'pause');
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
    
    const currentIndex = video.likedScenes.findIndex((s: any) => s.startTime.toString() === this.currentNavigation.sceneTimestamp);
    if (currentIndex > 0) {
      const previousScene = video.likedScenes[currentIndex - 1];
      this.navigateToScene(
        this.currentNavigation.performerId!,
        this.currentNavigation.videoId!,
        previousScene.startTime.toString()
      );
    }
  }

  private navigateToNextScene() {
    const video = this.getCurrentVideo();
    if (!video || !this.currentNavigation.sceneTimestamp) return;
    
    const currentIndex = video.likedScenes.findIndex((s: any) => s.startTime.toString() === this.currentNavigation.sceneTimestamp);
    if (currentIndex < video.likedScenes.length - 1) {
      const nextScene = video.likedScenes[currentIndex + 1];
      this.navigateToScene(
        this.currentNavigation.performerId!,
        this.currentNavigation.videoId!,
        nextScene.startTime.toString()
      );
    }
  }

  onVolumeChange(value: number) {
    this.volumeLevel = value;
    // Volume control not available in shared protocol, send play command with value
    this.websocketService.sendControlCommand('play');
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
    const currentIndex = video.likedScenes.findIndex((s: any) => s.startTime.toString() === this.currentNavigation.sceneTimestamp);
    return currentIndex > 0;
  }

  hasNextScene(): boolean {
    const video = this.getCurrentVideo();
    if (!video || !this.currentNavigation.sceneTimestamp) return false;
    const currentIndex = video.likedScenes.findIndex((s: any) => s.startTime.toString() === this.currentNavigation.sceneTimestamp);
    return currentIndex < video.likedScenes.length - 1;
  }
}
