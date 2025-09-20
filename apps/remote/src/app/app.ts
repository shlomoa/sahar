import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Observable, Subscription } from 'rxjs';
import { VideoNavigationService, SharedPerformersGridComponent, SharedScenesGridComponent, SharedVideosGridComponent, ClientType, NetworkDevice, ConnectionState, NavigationState, NavigationLevel } from 'shared';
import { Performer, Video, LikedScene } from 'shared';
import { VideoControlsComponent } from './components/video-controls/video-controls.component';
import { WebSocketService } from './services/websocket.service';


@Component({
  selector: 'app-root',  
  imports: [
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    VideoControlsComponent,    
    SharedPerformersGridComponent,
    SharedScenesGridComponent,
    SharedVideosGridComponent
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
  standalone: true,
})
export class App implements OnInit, OnDestroy {
  protected title = 'Sahar TV Remote';
  navigation$: Observable<NavigationState>;
  private subscriptions: Subscription[] = [];
  
  // Service injections
  private readonly navigationService = inject(VideoNavigationService);
  private readonly websocketService = inject(WebSocketService);
  private readonly videoNavigationService = inject(VideoNavigationService);

  // Video playback state
  currentVideo: Video | undefined = undefined;
  currentScene: LikedScene | undefined = undefined;

  // Data
  performers: Performer[] = [];
  clientType: ClientType = 'remote';
   
  // Connection management - starts disconnected
  connectionStatus: ConnectionState = 'disconnected';
  autoConnectEnabled = true;
  
  // Video control states
  isPlaying = false;
  isMuted = false;
  volumeLevel = 50;
  

    // Current navigation level helpers for templates
  get currentPerformers(): Performer[] {
    const nav = this.navigationService.getCurrentState();
    if (nav.breadcrumb.length === 1) { // Home level
      // Get the actual performers data with full video information
      return this.navigationService.getPerformersData();
    }
    return [];
  }

  get currentPerformer(): Performer | undefined {
    const nav = this.navigationService.getCurrentState();
    if (nav.breadcrumb.length >= 2 && nav.currentPerformer) { // Videos or deeper level
      return nav.currentPerformer;
    }
    return undefined;
  }

  get currentVideos(): Video[] {
    const nav = this.navigationService.getCurrentState();
    if (nav.breadcrumb.length === 2 && nav.currentPerformer) { // Videos level
      return nav.currentPerformer.videos;
    }
    return [];
  }

  get currentScenes(): LikedScene[] {
    const nav = this.navigationService.getCurrentState();
    if (nav.breadcrumb.length === 3 && nav.currentVideo) { // Scenes level
      return nav.currentVideo.likedScenes;
    }
    return [];
  }

  get currentLevel(): NavigationLevel {
    const nav = this.navigationService.getCurrentState();
    if (this.currentVideo && this.currentScene) return 'playing';
    if (nav.breadcrumb.length === 1) return 'performers';
    if (nav.breadcrumb.length === 2) return 'videos';
    if (nav.breadcrumb.length === 3) return 'scenes';
    return 'performers';
  }

  constructor(
    //private navigationService: VideoNavigationService,
    //private webSocketService: WebSocketService,
    //private snackBar: MatSnackBar
  ) {
    this.navigation$ = this.navigationService.navigation$;
  }
  

  ngOnInit() {
    this.performers = this.videoNavigationService.getPerformersData();
    this.setupWebSocketListeners();
    // Device discovery is now handled by the WebSocket service
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());    
  }

  // WebSocket event handlers
  private setupWebSocketListeners() {
    this.websocketService.getConnectionState().subscribe(state => {
      this.connectionStatus = state === 'connected' ? 'connected' : 
                              state === 'connecting' ? 'connecting' : 'disconnected';
      
      // Reset navigation when disconnected
      if (this.connectionStatus === 'disconnected') {
        console.log('❌ Disconnected - resetting navigation state');        
      }
     
      console.log('🔌 Connection status:', this.connectionStatus);
    });

    // Track auto-connect state
    this.autoConnectEnabled = this.websocketService.isAutoConnectEnabled();
  }

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
    this.navigationService.navigateToPerformer(performerId);
  }

  navigateToPerformers() {
    console.log('🏠 Navigate to performers');
    this.websocketService.sendNavigationCommand('navigate_to_performer', 'home', 'performer');
    this.navigationService.goHome();
  }

  navigateToVideo(videoId: string) {
    console.log('🎬 Navigate to video:', videoId);
    this.websocketService.sendNavigationCommand('navigate_to_video', videoId.toString(), 'video');
    this.navigationService.navigateToVideo(videoId);
  }

  navigateToVideos(performerId: string) {
    console.log('📹 Navigate to videos for performer:', performerId);
    this.websocketService.sendNavigationCommand('navigate_to_performer', performerId.toString(), 'performer');
    this.navigationService.navigateToPerformer(performerId);
  }

  navigateToScene(sceneId: string) {
    console.log('🎯 Navigate to scene:', sceneId);
    this.websocketService.sendNavigationCommand('navigate_to_scene', sceneId, 'scene');
    //@TODO: update the state and the GUI accordingly
  }

  navigateToScenes(videoId: string) {
    console.log('🎬 Navigate to scenes for video:', videoId);
    this.websocketService.sendNavigationCommand('navigate_to_video', videoId.toString(), 'video');
    this.navigationService.navigateToVideo(videoId);
  }

  navigateToPreviousScene() {
    throw new Error('Method not implemented.');
  }
  navigateToNextScene() {
    throw new Error('Method not implemented.');
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
    return this.currentVideo;
  }

  getCurrentScene(): LikedScene | undefined {
    return this.currentScene
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

  onVolumeChange(value: number) {
    this.volumeLevel = value;
    // Volume control not available in shared protocol, send play command with value
    this.websocketService.sendControlCommand('play');
    console.log('🔊 Volume changed to:', value);
  }

  // Enhanced controls visibility
  showEnhancedControls(): boolean {
    return (this.currentLevel === 'scene-selected') && 
           (this.connectionStatus === 'connected');
  }

  hasPreviousScene(): boolean {
    throw new Error('Method not implemented.');
  }

  hasNextScene(): boolean {
    throw new Error('Method not implemented.');
  }

  onBackClick(): void {
    this.navigationService.goBack();
  }

  onHomeClick(): void {
    this.navigationService.goHome();
  }

}
