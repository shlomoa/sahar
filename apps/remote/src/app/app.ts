import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from "@angular/material/icon";
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterOutlet } from '@angular/router';
import { Subscription } from 'rxjs';
import { SharedNavigationRootComponent,
         ClientType,
         NetworkDevice,
         ConnectionState,
         NavigationLevel,
         ApplicationState,
         Performer,
         Video,
         Scene,
         ContentService} from 'shared';
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
  private applicationState: ApplicationState | null = null;
  private subscriptions: Subscription[] = [];

  // Service injections
  private readonly webSocketService = inject(WebSocketService);
  private readonly contentService = inject(ContentService);
  private readonly snackBar = inject(MatSnackBar);

  // Data
  clientType: ClientType = 'remote';
    
  // Video control states (derived from server state)
  isPlaying = false;
  isMuted = false;
  volumeLevel = 50;
  isFullscreen = false;
  
  // Visibility flag: when both TV and Remote are connected according to server state
  bothConnected = false;
  // Connection management - starts disconnected
  connectionStatus: ConnectionState = 'disconnected';

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
    const currentVideo = this.webSocketService.getCurrentVideo();
    const currentScene = this.webSocketService.getCurrentScene();
    
    // Send play command with scene context
    this.webSocketService.sendControlCommand({
      msgType: 'control_command',
      action: 'play',
      youtubeId: currentVideo?.url,
      startTime: currentScene?.startTime
    });
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
  get currentPerformers(): Performer[] {
    const state = this.applicationState;
    if (!state) return [];
    
    // At performers level (no IDs set)
    if (!state.navigation.performerId) {
      return this.webSocketService.getPerformersData();
    }
    return [];
  }

  get currentPerformer(): Performer | undefined {
    return this.webSocketService.getCurrentPerformer();
  }

  get currentVideos(): Video[] {
    const state = this.applicationState;
    if (!state) return [];
    
    // At videos level (performer set, no video)
    if (state.navigation.performerId && !state.navigation.videoId) {
      return this.webSocketService.getVideosForPerformer(state.navigation.performerId);
    }
    return [];
  }

  get currentScenes(): Scene[] {
    const state = this.applicationState;
    if (!state) return [];
    
    // At scenes level (video set)
    if (state.navigation.videoId) {
      return this.webSocketService.getScenesForVideo(state.navigation.videoId);
    }
    return [];
  }

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

  ngOnInit() {    
    // Fetch catalog data via HTTP before initializing WebSocket
    this.initializeCatalog();

    // Subscribe to application state from server - single source of truth
    const stateSub = this.webSocketService.state$.subscribe(state => {
      this.applicationState = state;
      
      if (!state) {
        this.connectionStatus = 'disconnected';
        return;
      }

      // Update connection status
      this.connectionStatus = state.clientsConnectionState.remote || 'disconnected';
      
      // Update player state from server
      if (state.player) {
        this.isPlaying = state.player.isPlaying;
        this.isMuted = state.player.isMuted;
        this.isFullscreen = state.player.isFullscreen;
        this.volumeLevel = state.player.volume ?? 50;
      }
      
      // Update both connected flag
      this.bothConnected = (
        state.clientsConnectionState.tv === 'connected' && 
        state.clientsConnectionState.remote === 'connected'
      );
      
      console.log('📱 Remote: Application state updated:', {
        level: state.navigation.currentLevel,
        performerId: state.navigation.performerId,
        videoId: state.navigation.videoId,
        sceneId: state.navigation.sceneId,
        isPlaying: this.isPlaying,
        bothConnected: this.bothConnected
      });
    });
    this.subscriptions.push(stateSub);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());    
  }

  private async initializeCatalog(): Promise<void> {
    try {
      console.log('📱 Remote: Fetching catalog via HTTP...');
      await this.contentService.fetchCatalog();
      console.log('📱 Remote: Catalog fetched successfully');
    } catch (error) {
      console.error('📱 Remote: Failed to fetch catalog:', error);
      this.snackBar.open('Failed to load content catalog', 'Retry', { 
        duration: 0 
      }).onAction().subscribe(() => {
        this.initializeCatalog();
      });
    }
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
    const currentVideo = this.webSocketService.getCurrentVideo();
    const currentScene = this.webSocketService.getCurrentScene();
    
    if (!currentVideo || !currentScene) return;
    
    const scenes = this.webSocketService.getScenesForVideo(currentVideo.id);
    const idx = scenes.findIndex((s: Scene) => s.id === currentScene.id);
    if (idx > 0) {
      const prev = scenes[idx - 1];
      this.navigateToScene(prev.id);
    }
  }
  
  navigateToNextScene() {
    const currentVideo = this.webSocketService.getCurrentVideo();
    const currentScene = this.webSocketService.getCurrentScene();
    
    if (!currentVideo || !currentScene) return;
    
    const scenes = this.webSocketService.getScenesForVideo(currentVideo.id);
    const idx = scenes.findIndex((s: Scene) => s.id === currentScene.id);
    if (idx >= 0 && idx < scenes.length - 1) {
      const next = scenes[idx + 1];
      this.navigateToScene(next.id);
    }
  }

  // Data access methods - use webSocketService utilities
  getVideosForPerformer(performerId: string): Video[] {
    return this.webSocketService.getVideosForPerformer(performerId);
  }

  getScenesForVideo(performerId: string, videoId: string): Scene[] {
    return this.webSocketService.getScenesForVideo(videoId);
  }

  getCurrentVideo(): Video | undefined {
    return this.webSocketService.getCurrentVideo();
  }

  getCurrentScene(): Scene | undefined {
    return this.webSocketService.getCurrentScene();
  }

  // Video control methods
  sendControlCommand(command: string) {
    console.log('🎮 Control command:', command);
    const currentVideo = this.webSocketService.getCurrentVideo();
    const currentScene = this.webSocketService.getCurrentScene();
    
    // Check if we have video/scene context for commands that need it
    if (!currentVideo || !currentScene) {
      console.warn('Cannot control playback - no video/scene context');
      // Some commands (like go-home) don't need video context
      if (command !== 'go-home') {
        return;
      }
    }
    
    switch (command) {
      case 'play-pause': {
        console.log('📱 Remote: Play-pause button clicked, current isPlaying:', this.isPlaying);
        const actionToSend = this.isPlaying ? 'pause' : 'play';
        console.log('📱 Remote: Sending action:', actionToSend);
        this.webSocketService.sendControlCommand({
          msgType: 'control_command',
          action: actionToSend
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
        this.webSocketService.sendControlCommand({
          msgType: 'control_command',
          action: this.isFullscreen ? 'exit_fullscreen' : 'enter_fullscreen'
        });
        break;
      case 'toggle-mute':
        this.webSocketService.sendControlCommand({
          msgType: 'control_command',
          action: this.isMuted ? 'unmute' : 'mute'
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
    // Send volume control command - server will update state
    this.webSocketService.sendControlCommand({
      msgType: 'control_command',
      action: 'set_volume',
      volume: value
    });
    console.log('🔊 Volume change requested:', value);
  }

  // Enhanced controls visibility
  showEnhancedControls(): boolean {
    return (this.currentLevel === 'playing') && 
           (this.connectionStatus === 'connected');
  }

  hasPreviousScene(): boolean {
    const currentVideo = this.webSocketService.getCurrentVideo();
    const currentScene = this.webSocketService.getCurrentScene();
    
    if (!currentVideo || !currentScene) return false;
    
    const scenes = this.webSocketService.getScenesForVideo(currentVideo.id);
    const idx = scenes.findIndex((s: Scene) => s.id === currentScene.id);
    return idx > 0;
  }

  hasNextScene(): boolean {
    const currentVideo = this.webSocketService.getCurrentVideo();
    const currentScene = this.webSocketService.getCurrentScene();
    
    if (!currentVideo || !currentScene) return false;
    
    const scenes = this.webSocketService.getScenesForVideo(currentVideo.id);
    const idx = scenes.findIndex((s: Scene) => s.id === currentScene.id);
    return idx >= 0 && idx < scenes.length - 1;
  }

  onBackClick(): void {
    this.webSocketService.sendNavigationCommand('navigate_back');
  }

  onHomeClick(): void {
    this.webSocketService.sendNavigationCommand('navigate_home');
  }

}
