import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';

// Components
import { VideoNavigationService, DeviceConnectionComponent, SharedPerformersGridComponent, SharedScenesGridComponent, SharedVideosGridComponent, ClientType, WebSocketUtils, NetworkDevice } from 'shared';
import { Performer, Video, LikedScene } from 'shared';

import { VideoControlsComponent } from './components/video-controls/video-controls.component';

// Services and Models
import { WebSocketService } from './services/websocket.service';
import { RemoteNavigationState, ConnectionStatus } from './models/remote-navigation';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    VideoControlsComponent,
    DeviceConnectionComponent,
    SharedPerformersGridComponent,
    SharedScenesGridComponent,
    SharedVideosGridComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  // Data
  performers: Performer[] = [];
  clientType: ClientType = 'remote';
  // Navigation state (synced with TV) - starts undefined until connected
  currentNavigation: RemoteNavigationState = { level: 'performers' };
  
  // Connection management - starts disconnected
  connectionStatus: ConnectionStatus = 'disconnected';
  autoConnectEnabled = true;
  
  // Video control states
  isPlaying = false;
  isMuted = false;
  volumeLevel = 50;

  private websocketService = inject(WebSocketService);
  private videoNavigationService = inject(VideoNavigationService);

  ngOnInit() {
    this.performers = this.videoNavigationService.getPerformersData();
    this.setupWebSocketListeners();
    // Device discovery is now handled by the WebSocket service
  }

  // WebSocket event handlers
  private setupWebSocketListeners() {
    this.websocketService.getConnectionState().subscribe(state => {
      this.connectionStatus = state === 'connected' ? 'connected' : 
                              state === 'connecting' ? 'connecting' : 'disconnected';
      
      // Reset navigation when disconnected
      if (this.connectionStatus === 'disconnected') {
        console.log('❌ Disconnected - resetting navigation state');
        this.currentNavigation = { level: 'performers' };
      }
     
      console.log('🔌 Connection status:', this.connectionStatus);
    });
    /*
    this.websocketService.getTVState().subscribe(state => {
      const nav = state?.payload?.navigation;
      const player = state?.payload?.player;
      if (nav) this.synchronizeWithTVNavigation(nav);
      if (player) this.synchronizeWithTVPlayer(player);
    });
    */
    // Track auto-connect state
    this.autoConnectEnabled = this.websocketService.isAutoConnectEnabled();
  }
  /*
  // Synchronization methods
  private synchronizeWithTVNavigation(tvNav: ApplicationState['navigation']) {
    console.log('📍 Synchronizing navigation with TV:', tvNav);
    
    if (tvNav.currentLevel === 'performers') {
      this.currentNavigation = { level: 'performers' };
    } else if (tvNav.currentLevel === 'videos' && tvNav.performerId) {
      this.currentNavigation = { 
        level: 'videos', 
        performerId: tvNav.performerId.toString() 
      };
    } else if (tvNav.currentLevel === 'scenes' && tvNav.performerId && tvNav.videoId) {
      this.currentNavigation = { 
        level: 'scenes', 
        performerId: tvNav.performerId.toString(),
        videoId: tvNav.videoId.toString()
      };
    } else if (tvNav.sceneId) {
      this.currentNavigation = { 
        level: 'scene-selected', 
        performerId: tvNav.performerId?.toString(),
        videoId: tvNav.videoId?.toString(),
        sceneId: tvNav.sceneId?.toString()
      };
    }
    
    console.log('📱 Remote navigation updated:', this.currentNavigation);
  }

  private synchronizeWithTVPlayer(playerState: ApplicationState['player']) {
    console.log('🎮 Synchronizing player state with TV:', playerState);
    
    this.isPlaying = playerState.isPlaying || false;
    this.isMuted = playerState.volume === 0;
    this.volumeLevel = playerState.volume || 50;
    
    // Keep current scene selection if present; server exposes youtubeId not scene/video IDs here
    if (this.currentNavigation.level === 'scene-selected') {
      this.currentNavigation = {
        level: 'scene-selected',
        performerId: this.currentNavigation.performerId,
        videoId: this.currentNavigation.videoId,
        sceneId: this.currentNavigation.sceneId
      };
    }
  }
  */

  // Connected device
  deviceInfo(): NetworkDevice {
    const networkDevice = this.websocketService.deviceInfo;
    console.log('🔌 Connecting to device:', networkDevice);
    return networkDevice
  }

  reconnectToDevice() {
    const networkDevice = this.websocketService.deviceInfo;
    console.log('🔌 Reconnecting to device:', networkDevice);
    this.connectionStatus = 'connecting';
    this.websocketService.reconnectToDevice();
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

  navigateToScene(performerId: string, videoId: string, sceneId: string) {
    console.log('🎯 Navigate to scene:', performerId, videoId, sceneId);
    this.websocketService.sendNavigationCommand('navigate_to_scene', sceneId, 'scene');
    this.currentNavigation = { level: 'scene-selected', performerId, videoId, sceneId: sceneId };
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

  getScenesForVideo(performerId: string, videoId: string): LikedScene[] {
    const performer = this.performers.find((p: Performer) => p.id === performerId);
    const video = performer?.videos.find((v: Video) => v.id === videoId);
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
    if (!this.currentNavigation.sceneId) {
      return undefined;
    }
    const video = this.getCurrentVideo();
    return video?.likedScenes.find((s: LikedScene) => s.id === this.currentNavigation.sceneId);
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
    if (!video || !this.currentNavigation.sceneId) return;
    
    const currentIndex = video.likedScenes.findIndex((s: LikedScene) => s.id === this.currentNavigation.sceneId);
    if (currentIndex > 0) {
      const previousScene = video.likedScenes[currentIndex - 1];
      this.navigateToScene(
        this.currentNavigation.performerId!,
        this.currentNavigation.videoId!,
        previousScene.id
      );
    }
  }

  private navigateToNextScene() {
    const video = this.getCurrentVideo();
    if (!video || !this.currentNavigation.sceneId) return;
    
    const currentIndex = video.likedScenes.findIndex((s: LikedScene) => s.id === this.currentNavigation.sceneId);
    if (currentIndex < video.likedScenes.length - 1) {
      const nextScene = video.likedScenes[currentIndex + 1];
      this.navigateToScene(
        this.currentNavigation.performerId!,
        this.currentNavigation.videoId!,
        nextScene.id
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
    if (!video || !this.currentNavigation.sceneId) return false;
    const currentIndex = video.likedScenes.findIndex((s: LikedScene) => s.id === this.currentNavigation.sceneId);
    return currentIndex > 0;
  }

  hasNextScene(): boolean {
    const video = this.getCurrentVideo();
    if (!video || !this.currentNavigation.sceneId) return false;
    const currentIndex = video.likedScenes.findIndex((s: LikedScene) => s.id === this.currentNavigation.sceneId);
    return currentIndex < video.likedScenes.length - 1;
  }
}
