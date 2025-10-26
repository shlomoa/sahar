import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from "@angular/material/icon";
import { RouterOutlet } from '@angular/router';
import { Subscription } from 'rxjs';
import { ClientType,
         NetworkDevice,
         ConnectionState,
         NavigationLevel,
         ApplicationState,
         Video,
         Scene,
         ContentService,
         CatalogHelperService,
         ControlCommandPayload,
         PlayerState} from 'shared';
import { SharedNavigationRootComponent } from 'shared';
import { VideoControlsComponent } from './components/video-controls/video-controls.component';
import { WebSocketService } from './services/websocket.service';



@Component({
  selector: 'app-root',  
  imports: [
    RouterOutlet,
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    VideoControlsComponent,
    SharedNavigationRootComponent   
],
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
  standalone: true,
})
export class App implements OnInit, OnDestroy {
  protected title = 'Sahar TV Remote';
  
  // Server state - single source of truth
  protected applicationState: ApplicationState = {} as ApplicationState;
  private subscriptions: Subscription[] = [];

  // Service injections
  private readonly webSocketService = inject(WebSocketService);
  private readonly contentService = inject(ContentService);
  private readonly catalogHelper = inject(CatalogHelperService);
  
  // Computed signals from CatalogHelperService - automatic reactivity
  readonly currentPerformer = this.catalogHelper.currentPerformer;
  readonly currentVideo = this.catalogHelper.currentVideo;
  readonly currentScene = this.catalogHelper.currentScene;
  readonly currentPerformers = this.catalogHelper.currentPerformers;
  readonly currentVideos = this.catalogHelper.currentVideos;
  readonly currentScenes = this.catalogHelper.currentScenes;
  readonly catalogReady = this.catalogHelper.catalogReady;

  // Data
  clientType: ClientType = 'remote';

  // Event handlers - send commands to server only, don't update local state
  onPerformerSelected(performerId: string): void {
    console.log('📱 Remote: Performer selected:', performerId);
    this.webSocketService.sendNavigationCommand('navigate_to_performer', performerId, 'performer');
  }

  onVideoSelected(videoId: string): void {
    console.log('📱 Remote: Video selected:', videoId);
    this.webSocketService.sendNavigationCommand('navigate_to_video', videoId, 'video');
  }

  onSceneSelected(sceneId: string): void {
    console.log('📱 Remote: Scene selected:', sceneId);
    const video = this.currentVideo();
    const scene = this.currentScene();
    const playerState: PlayerState  = {
      currentTime: scene?.startTime || 0,
      volume: this.applicationState?.player.volume ?? 50,
      isMuted: this.applicationState?.player.isMuted ?? false,
      isFullscreen: this.applicationState?.player.isFullscreen ?? false,
      isPlaying: this.applicationState?.player.isPlaying ?? false
    }
    // Send play command with scene context
    this.webSocketService.sendControlCommand({
        msgType: 'control_command',        
        ...playerState        
      } as ControlCommandPayload
    );
  }

  onBackToPerformers(): void {
    console.log('📱 Remote: Back to performers');
    this.webSocketService.sendNavigationCommand('navigate_to_performer', 'Home', 'performer');
  }

  onBackToVideos(): void {
    console.log('📱 Remote: Back to videos');
    this.webSocketService.sendNavigationCommand('navigate_back');
  }

  onItemClick(item: { itemType: string; id: string }): void {
    // Handle item clicks - send commands to server
    switch (item.itemType) {
      case 'performer':
        this.onPerformerSelected(item.id);
        break;
      case 'video':
        this.onVideoSelected(item.id);
        break;
      case 'segment':
        this.onSceneSelected(item.id);
        break;
    }
  }

  // Current navigation level helpers for templates - derive from server state
  get currentLevel(): NavigationLevel {
    const state = this.applicationState;
    if (!state) return 'performers';
    
    return state.navigation.currentLevel;
  }

  // Whether going back is possible - derive from current level
  get canGoBack(): boolean {
    const level = this.currentLevel;
    return level !== 'performers';
  }
  
  // Connection state getters - derive from server's authoritative state
  get bothConnected(): boolean {
    return (
      this.applicationState?.clientsConnectionState.tv === 'connected' &&
      this.applicationState?.clientsConnectionState.remote === 'connected'
    ) ?? false;
  }

  get connectionStatus(): ConnectionState {
    return this.applicationState?.clientsConnectionState.remote ?? 'disconnected';
  }

  ngOnInit() {    
    // Subscribe to application state from server - single source of truth
    const stateSub = this.webSocketService.state$.subscribe(state => {
      this.applicationState = state;
      
      // CRITICAL: Update CatalogHelperService state (enables all computed signals)
      if (state) {
        this.catalogHelper.setState(state);
      }
      
      console.log('📱 Remote: Application state updated:', {
        level: state?.navigation.currentLevel,
        performerId: state?.navigation.performerId,
        videoId: state?.navigation.videoId,
        sceneId: state?.navigation.sceneId,        
        bothConnected: this.bothConnected
      });
    });
    this.subscriptions.push(stateSub);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());    
  }

  // Connected device
  deviceInfo(): NetworkDevice {
    return this.webSocketService.deviceInfo;
  }

  reconnectToDevice() {
    console.log('🔌 Reconnecting to device');
    this.webSocketService.reconnectToDevice();
  }

  // Navigation methods - send commands to server only
  navigateToPerformer(performerId: string) {
    console.log('👤 Navigate to performer:', performerId);
    this.webSocketService.sendNavigationCommand('navigate_to_performer', performerId.toString(), 'performer');
  }

  navigateToPerformers() {
    console.log('🏠 Navigate to performers');
    this.webSocketService.sendNavigationCommand('navigate_to_performer', 'Home', 'performer');
  }

  navigateToVideo(videoId: string) {
    console.log('🎬 Navigate to video:', videoId);
    this.webSocketService.sendNavigationCommand('navigate_to_video', videoId.toString(), 'video');
  }

  navigateToVideos(performerId: string) {
    console.log('📹 Navigate to videos for performer:', performerId);
    this.webSocketService.sendNavigationCommand('navigate_to_performer', performerId.toString(), 'performer');
  }

  navigateToScene(sceneId: string) {
    console.log('🎯 Navigate to scene:', sceneId);
    this.webSocketService.sendNavigationCommand('navigate_to_scene', sceneId, 'segment');
  }

  navigateToScenes(videoId: string) {
    console.log('🎬 Navigate to scenes for video:', videoId);
    this.webSocketService.sendNavigationCommand('navigate_to_video', videoId.toString(), 'video');
  }

  navigateToPreviousScene() {
    console.log('⏮️ Navigate to previous scene');
    const video = this.currentVideo();
    const scene = this.currentScene();
    
    if (!video || !scene) return;
    
    const scenes = this.contentService.getScenesForVideo(video.id);
    const idx = scenes.findIndex((s: Scene) => s.id === scene.id);
    if (idx > 0) {
      const prev = scenes[idx - 1];
      this.navigateToScene(prev.id);
    }
  }
  
  navigateToNextScene() {
    console.log('⏭️ Navigate to next scene');
    const video = this.currentVideo();
    const scene = this.currentScene();
    
    if (!video || !scene) return;
    
    const scenes = this.contentService.getScenesForVideo(video.id);
    const idx = scenes.findIndex((s: Scene) => s.id === scene.id);
    if (idx >= 0 && idx < scenes.length - 1) {
      const next = scenes[idx + 1];
      this.navigateToScene(next.id);
    }
  }

  // Data access methods - use contentService directly
  getVideosForPerformer(performerId: string): Video[] {
    console.log('📹 Fetching videos for performer:', performerId);
    return this.contentService.getVideosForPerformer(performerId);
  }

  getScenesForVideo(videoId: string): Scene[] {
    console.log('🎬 Fetching scenes for video:', videoId);
    return this.contentService.getScenesForVideo(videoId);
  }

  getCurrentVideo(): Video {
    const video = this.currentVideo();
    if (!video) {
      throw new Error('No current video selected');
    }
    return video;
  }

  getCurrentScene(): Scene {
    const scene = this.currentScene();
    if (!scene) {
      throw new Error('No current scene selected');
    }
    return scene;
  }

  // Video control methods
  sendControlCommand(command: string) {
    console.log('🎮 Control command:', command);
    const video = this.currentVideo();
    const scene = this.currentScene();
    
    // Check if we have video/scene context for commands that need it
    if (!video || !scene) {
      console.warn('Cannot control playback - no video/scene context');
      // Some commands (like go-home) don't need video context
      if (command !== 'go-home') {
        return;
      }
    }
    const playerState: PlayerState  = {
      currentTime: scene?.startTime || 0,
      volume: this.applicationState?.player.volume ?? 50,
      isMuted: this.applicationState?.player.isMuted ?? false,
      isFullscreen: this.applicationState?.player.isFullscreen ?? false,
      isPlaying: this.applicationState?.player.isPlaying ?? false
    }
    switch (command) {
      case 'play-pause': {
        console.log('📱 Remote: Play-pause button clicked, current isPlaying:', this.applicationState?.player.isPlaying);
        playerState.isPlaying = !playerState.isPlaying;
        this.webSocketService.sendControlCommand({
          msgType: 'control_command',          
          ...playerState
        });
        // Don't optimistically update isPlaying - wait for server state_sync
        break;
      }
      case 'go-home':
        this.onHomeClick();
        break;
      case 'previous-scene':
        this.navigateToPreviousScene();
        break;
      case 'next-scene':
        this.navigateToNextScene();
        break;
      case 'toggle-fullscreen':
        playerState.isFullscreen = !playerState.isFullscreen;
        this.webSocketService.sendControlCommand({
          msgType: 'control_command',          
          ...playerState
        });
        break;
      case 'toggle-mute':
        playerState
        this.webSocketService.sendControlCommand({
          msgType: 'control_command',          
          ...playerState
        });
        break;
      default:
        console.error('Unknown control command:', command);
        break;
    }
  }

  onVolumeChange(value: number) {    
    if (value < 0  || value > 100) {
      console.error('Volume value out of range (0-100):', value);
      return;
    }
    const playerState: PlayerState  = {
      currentTime: this.applicationState?.player.currentTime ?? 0,
      volume: value,
      isMuted: this.applicationState?.player.isMuted,
      isFullscreen: this.applicationState?.player.isFullscreen,
      isPlaying: this.applicationState?.player.isPlaying ?? false
    }
    // Send volume control command - server will update state
    this.webSocketService.sendControlCommand({
      msgType: 'control_command',      
      ...playerState,      
    });
    console.log('🔊 Volume change requested:', value);
  }

  // Check if scene is selected (for video controls visibility)
  get isSceneSelected(): boolean {
    const state = this.applicationState;
    return this.currentLevel === 'scenes' && !!state?.navigation.sceneId;
  }

  // Enhanced controls visibility
  showEnhancedControls(): boolean {
    return this.isSceneSelected && 
           (this.connectionStatus === 'connected');
  }

  hasPreviousScene(): boolean {
    const video = this.currentVideo();
    const scene = this.currentScene();
    
    if (!video || !scene) return false;
    
    const scenes = this.contentService.getScenesForVideo(video.id);
    const idx = scenes.findIndex((s: Scene) => s.id === scene.id);
    return idx > 0;
  }

  hasNextScene(): boolean {
    const video = this.currentVideo();
    const scene = this.currentScene();
    
    if (!video || !scene) return false;
    
    const scenes = this.contentService.getScenesForVideo(video.id);
    const idx = scenes.findIndex((s: Scene) => s.id === scene.id);
    return idx >= 0 && idx < scenes.length - 1;
  }

  onBackClick(): void {
    this.webSocketService.sendNavigationCommand('navigate_back');
  }

  onHomeClick(): void {
    this.webSocketService.sendNavigationCommand('navigate_home');
  }

}
