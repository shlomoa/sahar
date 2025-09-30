import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from "@angular/material/icon";
import { RouterOutlet } from '@angular/router';
import { Observable, Subscription } from 'rxjs';
import { VideoNavigationService, SharedPerformersGridComponent, SharedScenesGridComponent, SharedVideosGridComponent, ClientType, NetworkDevice, ConnectionState, NavigationState, NavigationLevel, ApplicationState } from 'shared';
import { SharedBackCardComponent } from 'shared';
import { Performer, Video, LikedScene } from 'shared';
import { VideoControlsComponent } from './components/video-controls/video-controls.component';
import { WebSocketService } from './services/websocket.service';



@Component({
  selector: 'app-root',  
  imports: [
    RouterOutlet,
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    VideoControlsComponent,
    SharedPerformersGridComponent,
    SharedScenesGridComponent,
    SharedVideosGridComponent,
    MatIconModule,
    SharedBackCardComponent
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
  private readonly webSocketService = inject(WebSocketService);
  private readonly videoNavigationService = inject(VideoNavigationService);

  // Video playback state
  currentVideo: Video | undefined = undefined;
  currentScene: LikedScene | undefined = undefined;
  
  // Data
  performers: Performer[] = [];
  clientType: ClientType = 'remote';
    
  // Video control states
  isPlaying = false;
  isMuted = false;
  volumeLevel = 50;
  
  // Visibility flag: when both TV and Remote are connected according to server state
  bothConnected = false;
  // internal debounce timer id used to avoid flicker when connections flap
  private _bothConnectedDebounceTimer: number | null = null;
  // Connection management - starts disconnected
  connectionStatus: ConnectionState = 'disconnected';

  // Event handlers to mirror TV behavior so Remote UI follows the same navigation model
  onPerformerSelected(performerId: string): void {
    console.log('📱 Remote: Performer selected:', performerId);
    this.webSocketService.sendNavigationCommand('navigate_to_performer', performerId, 'performer');
    this.videoNavigationService.navigateToPerformer(performerId);
  }

  onVideoSelected(videoId: string): void {
    console.log('📱 Remote: Video selected:', videoId);
    this.webSocketService.sendNavigationCommand('navigate_to_video', videoId, 'video');
    this.videoNavigationService.navigateToVideo(videoId);
  }

  onSceneSelected(sceneId: string): void {
    console.log('📱 Remote: Scene selected:', sceneId);
    // Play scene via local navigation service; server will reconcile via state_sync
    this.videoNavigationService.playScene(sceneId);
    // Use the shared control command shim (string variant) for simple play
    this.webSocketService.sendControlCommand('play');
  }

  onBackToPerformers(): void {
    console.log('📱 Remote: Back to performers');
    this.webSocketService.sendNavigationCommand('navigate_to_performer', 'home', 'performer');
    this.videoNavigationService.goHome();
  }

  onBackToVideos(): void {
    console.log('📱 Remote: Back to videos');
    this.videoNavigationService.goBack();
  }

  onItemClick(item: { itemType: string; id: string }): void {
    // Mirror TV's behavior for items
    switch (item.itemType) {
      case 'performer':
        this.onPerformerSelected(item.id);
        break;
      case 'video':
        this.onVideoSelected(item.id);
        break;
      case 'segment': {
        // When a segment is clicked, attempt to find the current video and start playback
        const nav = this.videoNavigationService.getCurrentState();
        if (nav.currentVideo) {
          this.currentVideo = nav.currentVideo as Video;
          const scene: LikedScene | undefined = nav.currentVideo.likedScenes.find((s) => s.id === item.id);
          if (scene) {
            this.currentScene = scene;
            this.videoNavigationService.playScene(item.id);
          }
        }
        break;
      }
    }
  }

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
  
  // Whether going back is possible (breadcrumb length > 1)
  get canGoBack(): boolean {
    const nav = this.navigationService.getCurrentState();
    return (nav?.breadcrumb?.length ?? 1) > 1;
  } 

  ngOnInit() {    

    // Keep local view in sync with authoritative navigation state updates
    this.navigation$.subscribe(nav => {
      // Update performers list when data changes
      this.performers = this.videoNavigationService.getPerformersData();

      // Update currentVideo/currentScene based on navigation state
      if (nav.currentVideo) {
        this.currentVideo = nav.currentVideo;
      } else {
        this.currentVideo = undefined;
      }

      // If the navigation service exposes player$ we should listen for explicit playingSceneId
      const navAny = this.videoNavigationService as unknown as Record<string, unknown>;
      const player$ = navAny['player$'] as Observable<unknown> | undefined;
      const isObservableLike = (v: unknown): v is Observable<unknown> => !!v && typeof (v as { subscribe?: unknown }).subscribe === 'function';
  if (player$ && isObservableLike(player$)) {
    // Subscribe lazily once
    const playerSub = (player$ as import('rxjs').Observable<unknown>).subscribe((p: unknown) => {
      if (!p || typeof p !== 'object') {
        this.currentScene = undefined;
        this.isPlaying = false;
        return;
      }
      const asAny = p as Record<string, unknown>;
      const playingSceneId = typeof asAny['playingSceneId'] === 'string' ? asAny['playingSceneId'] as string : undefined;
      const isPlayingFlag = typeof asAny['isPlaying'] === 'boolean' ? (asAny['isPlaying'] as boolean) : undefined;
      if (!playingSceneId) {
        this.currentScene = undefined;
        this.isPlaying = false;
        return;
      }
      // Try to resolve the scene id to a known LikedScene
      if (this.currentVideo) {
        const s = this.currentVideo.likedScenes.find((sc) => sc.id === playingSceneId);
        if (s) {
          this.currentScene = s;
          this.isPlaying = !!isPlayingFlag;
          return;
        }
      }
      // Otherwise search performers for the scene
      for (const perf of this.performers) {
        for (const vid of perf.videos) {
          const s = vid.likedScenes.find((sc) => sc.id === playingSceneId);
          if (s) {
            this.currentVideo = vid;
            this.currentScene = s;
            this.isPlaying = !!isPlayingFlag;
            return;
          }
        }
      }
    });
    this.subscriptions.push(playerSub);
      }
    });
    
    // Initialize performers from the navigation service and subscribe to updates    
    this.initializeWebSocket();

    // Watch for authoritative state_sync messages so we can hide the QR when both clients are connected
    const stateSub = this.webSocketService.messages.subscribe((msg) => {
      try {
        if (!msg || msg.msgType !== 'state_sync') return;
        const payloadUnknown = msg.payload as unknown;
        const state = payloadUnknown as ApplicationState | undefined;
        const connectedClients = (state && (state as ApplicationState).connectedClients) ?? undefined;
        const tvConn = !!connectedClients?.tv;
        const remoteConn = !!connectedClients?.remote;
        const shouldBeBoth = tvConn && remoteConn;

        // Debounce transitions to avoid QR flicker on short connection flaps.
        // If both become true, apply immediately. If either disconnects, wait
        // a short grace period before hiding the QR.
        if (shouldBeBoth) {
          if (this._bothConnectedDebounceTimer) {
            window.clearTimeout(this._bothConnectedDebounceTimer);
            this._bothConnectedDebounceTimer = null;
          }
          this.bothConnected = true;
        } else {
          if (this._bothConnectedDebounceTimer) window.clearTimeout(this._bothConnectedDebounceTimer);
          // wait 1500ms before clearing bothConnected so short flakes don't show QR
          this._bothConnectedDebounceTimer = window.setTimeout(() => {
            this.bothConnected = false;
            this._bothConnectedDebounceTimer = null;
          }, 1500);
        }
      } catch (e) {
        console.warn('Failed to parse state_sync for connection info', e);
      }
    });
    this.subscriptions.push(stateSub);

    // Subscribe to WebSocket connection state to expose the same connection indicator as Remote
    const connSub = this.webSocketService.connected$.subscribe((state: ConnectionState) => {
      this.connectionStatus = state === 'connected' ? 'connected' : state === 'connecting' ? 'connecting' : 'disconnected';
    });
    this.subscriptions.push(connSub);
    
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());    
  }

  // WebSocket event handlers
  private initializeWebSocket() {
    this.webSocketService.getConnectionState().subscribe(state => {
      this.connectionStatus = state === 'connected' ? 'connected' : 
                              state === 'connecting' ? 'connecting' : 'disconnected';
      
      // Reset navigation when disconnected
      if (this.connectionStatus === 'disconnected') {
        console.log('❌ Disconnected - resetting navigation state');        
      }
     
      console.log('🔌 Connection status:', this.connectionStatus);
    });

  }

  // Connected device
  deviceInfo(): NetworkDevice {
    const networkDevice = this.webSocketService.deviceInfo;
    console.log('🔌 Connecting to device:', networkDevice);
    return networkDevice
  }

  reconnectToDevice() {
    const networkDevice = this.webSocketService.deviceInfo;
    console.log('🔌 Reconnecting to device:', networkDevice);
    this.connectionStatus = 'connecting';
    this.webSocketService.reconnectToDevice();
  }

  // Navigation methods
  navigateToPerformer(performerId: string) {
    console.log('👤 Navigate to performer:', performerId);
    this.webSocketService.sendNavigationCommand('navigate_to_performer', performerId.toString(), 'performer');
    this.navigationService.navigateToPerformer(performerId);
  }

  navigateToPerformers() {
    console.log('🏠 Navigate to performers');
    this.webSocketService.sendNavigationCommand('navigate_to_performer', 'home', 'performer');
    this.navigationService.goHome();
  }

  navigateToVideo(videoId: string) {
    console.log('🎬 Navigate to video:', videoId);
    this.webSocketService.sendNavigationCommand('navigate_to_video', videoId.toString(), 'video');
    this.navigationService.navigateToVideo(videoId);
  }

  navigateToVideos(performerId: string) {
    console.log('📹 Navigate to videos for performer:', performerId);
    this.webSocketService.sendNavigationCommand('navigate_to_performer', performerId.toString(), 'performer');
    this.navigationService.navigateToPerformer(performerId);
  }

  navigateToScene(sceneId: string) {
    console.log('🎯 Navigate to scene:', sceneId);
    this.webSocketService.sendNavigationCommand('navigate_to_scene', sceneId, 'scene');
    //@TODO: update the state and the GUI accordingly
  }

  navigateToScenes(videoId: string) {
    console.log('🎬 Navigate to scenes for video:', videoId);
    this.webSocketService.sendNavigationCommand('navigate_to_video', videoId.toString(), 'video');
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
        this.webSocketService.sendControlCommand(this.isPlaying ? 'pause' : 'play');
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
        this.webSocketService.sendControlCommand('back');
        break;
      case 'fast-forward':
        // Use resume command for forward movement
        this.webSocketService.sendControlCommand('resume');
        break;
      case 'toggle-fullscreen':
        // Fullscreen not available in shared protocol, use play as alternative
        this.webSocketService.sendControlCommand('play');
        break;
      case 'toggle-mute':
        // Mute not available in shared protocol, use pause as alternative
        this.webSocketService.sendControlCommand(this.isMuted ? 'resume' : 'pause');
        this.isMuted = !this.isMuted;
        break;
      case 'stop':
        this.webSocketService.sendControlCommand('stop');
        this.isPlaying = false;
        break;
    }
  }

  onVolumeChange(value: number) {
    this.volumeLevel = value;
    // Volume control not available in shared protocol, send play command with value
    this.webSocketService.sendControlCommand('play');
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
