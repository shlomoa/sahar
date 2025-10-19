import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from "@angular/material/icon";
import { RouterOutlet } from '@angular/router';
import { Observable, Subscription } from 'rxjs';
import { VideoNavigationService,
         SharedNavigationRootComponent,
         ClientType,
         NetworkDevice,
         ConnectionState,
         NavigationState,
         NavigationLevel,
         ApplicationState,
         Performer,
         Video,
         LikedScene, 
         PlayerState} from 'shared';
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
  isFullscreen = false;
  
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
    // Send play command with scene context
    this.webSocketService.sendControlCommand({
      msgType: 'control_command',
      action: 'play',
      youtubeId: this.currentVideo?.url,
      startTime: this.currentScene?.startTime
    });
  }

  onBackToPerformers(): void {
    console.log('📱 Remote: Back to performers');
    this.webSocketService.sendNavigationCommand('navigate_to_performer', 'Home', 'performer');
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
    if (!nav.currentPerformer && !nav.currentVideo) { // Home level
      // Get the actual performers data with full video information
      return this.navigationService.getPerformersData();
    }
    return [];
  }

  get currentPerformer(): Performer | undefined {
    const nav = this.navigationService.getCurrentState();
    if (nav.currentPerformer) { // Videos or deeper level
      return nav.currentPerformer;
    }
    return undefined;
  }

  get currentVideos(): Video[] {
    const nav = this.navigationService.getCurrentState();
    if (nav.currentPerformer && !nav.currentVideo) { // Videos level
      return nav.currentPerformer.videos;
    }
    return [];
  }

  get currentScenes(): LikedScene[] {
    const nav = this.navigationService.getCurrentState();
    if (nav.currentVideo) { // Scenes level
      return nav.currentVideo.likedScenes;
    }
    return [];
  }

  get currentLevel(): NavigationLevel {
    const nav = this.navigationService.getCurrentState();
    if (this.currentVideo && this.currentScene) return 'playing';
    if (!nav.currentPerformer && !nav.currentVideo) return 'performers';
    if (nav.currentPerformer && !nav.currentVideo) return 'videos';
    if (nav.currentVideo) return 'scenes';
    return 'performers';
  }

  constructor(
    //private navigationService: VideoNavigationService,
    //private webSocketService: WebSocketService,
    //private snackBar: MatSnackBar
  ) {
    this.navigation$ = this.navigationService.navigation$;
  }
  
  // Whether going back is possible
  get canGoBack(): boolean {
    const nav = this.navigationService.getCurrentState();
    return nav?.canGoBack;
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
      console.log('Navigation state updated:', nav);
      console.log('Current level items:', nav.currentLevel.map(item => ({
        title: item.title,
        thumbnail: item.thumbnail,
        type: item.itemType
      })));
    });

    // @TODO: verify if this is still needed
    // Subscribe to explicit player state when available. If the shared package
    // hasn't been rebuilt for the consuming app, use a runtime guard so this
    // code doesn't crash. 
    

    // If the navigation service exposes player$ we should listen for explicit playingSceneId
    const navAny = this.videoNavigationService as unknown as Record<string, unknown>;
    const player$ = navAny['player$'] as Observable<PlayerState> | undefined;
    const isObservableLike = (v: unknown): v is Observable<unknown> => !!v && typeof (v as { subscribe?: unknown }).subscribe === 'function';
    if (player$ && isObservableLike(player$)) {
      // Subscribe lazily once
      const playerSub = player$.subscribe((player: PlayerState | undefined) => {
        if (!player || !player.playingSceneId) {
          this.currentVideo = undefined;
          this.currentScene = undefined;
          this.isPlaying = false;
          this.isFullscreen = false;
          return;
        }
 
        // Try to resolve the scene id to a known LikedScene
        const nav = this.navigationService.getCurrentState();
        let foundScene: LikedScene | undefined;
        let foundVideo: Video | undefined = undefined;
        if (nav.currentVideo) {
          foundScene = nav.currentVideo.likedScenes.find((s) => s.id === player.playingSceneId);
          if (foundScene) foundVideo = nav.currentVideo;
        }
        if (!foundScene) {
          // Search performers/videos for the scene id
          const performers = this.navigationService.getPerformersData();
          outer: for (const p of performers) {
            for (const v of p.videos) {
              const s = v.likedScenes.find((s2) => s2.id === player.playingSceneId);
              if (s) {
                foundScene = s;
                foundVideo = v;
                break outer;
              }
            }
          }
        }
        if (foundScene && foundVideo) {
          this.currentVideo = foundVideo;
          this.currentScene = foundScene;
          this.isPlaying = (player && player.isPlaying) || false;
          this.isFullscreen = (player && player.isFullscreen) || false;
          console.log('📺 Starting video playback from player$:', {
            video: this.currentVideo?.title,
            scene: this.currentScene.title,
            url: this.currentVideo?.url,
            startTime: this.currentScene.startTime
          });
        } else {
          console.warn('Could not resolve playingSceneId to a known scene:', player.playingSceneId);
        }
      });
      this.subscriptions.push(playerSub);
    };
    
    // Initialize performers from the navigation service and subscribe to updates    
    this.initializeWebSocket();

    // Watch for authoritative state_sync messages so we can hide the QR when both clients are connected
    const stateSub = this.webSocketService.messages.subscribe((msg) => {
      try {
        if (!msg || msg.msgType !== 'state_sync') return;
        console.log('📱 Remote: Received state_sync message:', msg);
        const payloadUnknown = msg.payload as unknown;
        const state = payloadUnknown as ApplicationState | undefined;
        
        // Handle player state updates from server
        if (state?.player) {
          this.isPlaying = state.player.isPlaying;
          this.isMuted = state.player.muted;
          this.isFullscreen = state.player.isFullscreen ;
          this.volumeLevel = state.player.volume ?? 50;  // Server now uses 0-100 range directly
          console.log('📱 Remote: Player state updated from server:', {
            isPlaying: this.isPlaying,
            isMuted: this.isMuted,
            volumeLevel: this.volumeLevel
          });
        } else {
          console.log('📱 Remote: No player state in state_sync message');
        }
        
        // Handle connection state for QR visibility
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
    this.webSocketService.sendNavigationCommand('navigate_to_performer', 'Home', 'performer');
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
    this.webSocketService.sendNavigationCommand('navigate_to_scene', sceneId, 'segment');
    //@TODO: update the state and the GUI accordingly
  }

  navigateToScenes(videoId: string) {
    console.log('🎬 Navigate to scenes for video:', videoId);
    this.webSocketService.sendNavigationCommand('navigate_to_video', videoId.toString(), 'video');
    this.navigationService.navigateToVideo(videoId);
  }

  navigateToPreviousScene() {
    if (!this.currentVideo || !this.currentScene) return;
    const scenes = this.currentVideo.likedScenes || [];
    const idx = scenes.findIndex(s => s.id === this.currentScene!.id);
    if (idx > 0) {
      const prev = scenes[idx - 1];
      this.navigateToScene(prev.id);
      this.currentScene = prev;
    }
  }
  
  navigateToNextScene() {
    if (!this.currentVideo || !this.currentScene) return;
    const scenes = this.currentVideo.likedScenes || [];
    const idx = scenes.findIndex(s => s.id === this.currentScene!.id);
    if (idx >= 0 && idx < scenes.length - 1) {
      const next = scenes[idx + 1];
      this.navigateToScene(next.id);
      this.currentScene = next;
    }
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
    // ✅ INFORMED: Remote knows exactly what it's controlling
    if (!this.currentVideo || !this.currentScene) {
      throw new Error('Cannot control playback - no video/scene context');
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
        this.isFullscreen = !this.isFullscreen;
        break;
      case 'toggle-mute':
        // Use proper mute/unmute actions
        this.webSocketService.sendControlCommand({
          msgType: 'control_command',
          action: this.isMuted ? 'unmute' : 'mute'
        });
        this.isMuted = !this.isMuted;
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
    this.isMuted = (value === 0);
    this.volumeLevel = value;
    // Send proper volume control command with actual volume data
    this.webSocketService.sendControlCommand({
      msgType: 'control_command',
      action: 'set_volume',
      volume: value
    });
    console.log('🔊 Volume changed to:', value);
  }

  // Enhanced controls visibility
  showEnhancedControls(): boolean {
    return (this.currentLevel === 'playing') && 
           (this.connectionStatus === 'connected');
  }

  hasPreviousScene(): boolean {
    if (!this.currentVideo || !this.currentScene) return false;
    const scenes = this.currentVideo.likedScenes || [];
    const idx = scenes.findIndex(s => s.id === this.currentScene!.id);
    return idx > 0;
  }

  hasNextScene(): boolean {
    if (!this.currentVideo || !this.currentScene) return false;
    const scenes = this.currentVideo.likedScenes || [];
    const idx = scenes.findIndex(s => s.id === this.currentScene!.id);
    return idx >= 0 && idx < scenes.length - 1;
  }

  onBackClick(): void {
    // Emit canonical navigation back to server and update local UI
    this.webSocketService.sendNavigationCommand('navigate_back');
    this.navigationService.goBack();
  }

  onHomeClick(): void {
    // Emit canonical navigation home to server and update local UI
    this.webSocketService.sendNavigationCommand('navigate_home');
    this.navigationService.goHome();
  }

}
