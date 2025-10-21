import { Component, OnInit, OnDestroy, ViewChild, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { QRCodeComponent } from 'angularx-qrcode';
import { Subscription } from 'rxjs';
import { ControlCommandMessage,
         getYoutubeVideoId,
         NetworkDevice,
         ApplicationState,
         ConnectionState,
         WEBSOCKET_CONFIG,
         NavigationLevel,
         SharedNavigationRootComponent,
         Video,
         Scene,
         Performer,
         ContentService} from 'shared';
import { WebSocketService } from './services/websocket.service';
import { VideoPlayerComponent } from './components/video-player/video-player.component';


@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    QRCodeComponent,
    VideoPlayerComponent,
    SharedNavigationRootComponent
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
  standalone: true
})
export class App implements OnInit, OnDestroy {
  @ViewChild(VideoPlayerComponent) private videoPlayer?: VideoPlayerComponent;
  protected title = 'Sahar TV';
  
  // Server state - single source of truth
  private applicationState: ApplicationState | null = null;
  private subscriptions: Subscription[] = [];

  // Service injections
  private readonly webSocketService = inject(WebSocketService);
  private readonly contentService = inject(ContentService);
  private readonly snackBar = inject(MatSnackBar);  

  // Local playback flags (derived from player state)
  isPlaying = false;
  isMuted = false;
  isFullscreen = false;
  volumeLevel = 50;

  // QR: Remote entry URL to encode
  remoteUrl = '';

  // Visibility flag: when both TV and Remote are connected according to server state
  bothConnected = false;
  // Connection status text to mirror Remote's UI mapping: 'connected' | 'connecting' | 'disconnected'
  connectionStatus: ConnectionState = 'disconnected';

  // Derived playback bindings for the video-player component
  get playbackVideoId(): string | null {
    const currentVideo = this.webSocketService.getCurrentVideo();
    return currentVideo?.url ? getYoutubeVideoId(currentVideo.url) : null;
  }

  get playbackPositionSec(): number | null {
    const currentScene = this.webSocketService.getCurrentScene();
    return currentScene?.startTime ?? null;
  }

  get playbackIsPlaying(): boolean {
    return this.videoPlayer?.isPlaying ?? false;
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

  get currentPerformer(): Performer | undefined {
    return this.webSocketService.getCurrentPerformer();
  }

  // Whether going back is possible - derive from current level
  get canGoBack(): boolean {
    const level = this.currentLevel;
    return level !== 'performers';
  }

  // Whether video player should be shown - when scene is selected
  get isSceneSelected(): boolean {
    return this.currentLevel === 'scenes' && !!this.applicationState?.navigation.sceneId;
  }

  ngOnInit(): void {
    // Fetch catalog data via HTTP before initializing WebSocket
    this.initializeCatalog();

    // Build Remote URL as protocol://FQDN:SERVER_DEFAULT_PORT (avoid localhost in QR).
    // Prefer server-provided LAN IP from /host-ip, fall back to the browser hostname.
    const protocol = window.location.protocol;
    const defaultHost = window.location.hostname;
    const buildRemoteUrl = (host: string) => `${protocol}//${host}:${WEBSOCKET_CONFIG.SERVER_DEFAULT_PORT}/remote`;

    // Start with a provisional URL based on the browser hostname.
    this.remoteUrl = buildRemoteUrl(defaultHost);

    // Try to fetch authoritative host IP from the server and prefer it if available.
    (async () => {
      try {
        const resp = await fetch('/host-ip', { cache: 'no-cache' });
        if (resp.ok) {
          const data = await resp.json();
          const ip = data?.ip;
          if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
            this.remoteUrl = buildRemoteUrl(ip);
          }
        }
      } catch (err) {
        console.warn('📺 TV: Failed to fetch /host-ip, falling back to browser hostname for QR.', err);
      }

      if (this.remoteUrl.includes('localhost') || this.remoteUrl.includes('127.0.0.1')) {
        console.warn('📺 TV: QR is using localhost. Access the TV via its FQDN or IP so the QR encodes a scannable host.');
      }
    })();

    // Subscribe to application state from server - single source of truth
    const mainStateSub = this.webSocketService.state$.subscribe(state => {
      this.applicationState = state;
      
      if (!state) {
        this.connectionStatus = 'disconnected';
        return;
      }

      // Update connection status
      this.connectionStatus = state.clientsConnectionState.tv || 'disconnected';
      
      // Update both connected flag
      this.bothConnected = (
        state.clientsConnectionState.tv === 'connected' && 
        state.clientsConnectionState.remote === 'connected'
      );
      
      console.log('📺 TV: Application state updated:', {
        level: state.navigation.currentLevel,
        performerId: state.navigation.performerId,
        videoId: state.navigation.videoId,
        sceneId: state.navigation.sceneId,
        bothConnected: this.bothConnected
      });
    });
    this.subscriptions.push(mainStateSub);

    // Initialize WebSocket connections 
    this.initializeWebSocket();

    // wire control commands to YouTube player
    const controlSub = this.webSocketService.messages.subscribe((msg) => {
      if (!msg || msg.msgType !== 'control_command') return;
      const { action } = (msg as ControlCommandMessage).payload;
      const payload = (msg as ControlCommandMessage).payload;
      console.log('📺 TV: Received control command via WebSocket:', action, payload);
      switch (action) {
        case 'play':
          this.videoPlayer?.play();
          break;
        case 'pause':
          this.videoPlayer?.pause();
          break;
        case 'seek': {
          const time = payload.seekTime ?? 0;
          this.videoPlayer?.seekTo(time);
          break;
        }
        case 'set_volume': {
          if (typeof payload.volume === 'number') {
            this.videoPlayer?.setVolume(payload.volume);
          }
          break;
        }
        case 'mute':
          this.videoPlayer?.setVolume(0);
          this.isMuted = true;
          break;
        case 'unmute':
          this.videoPlayer?.setVolume(100);
          this.isMuted = false;
          break;
        case 'enter_fullscreen':
        case 'exit_fullscreen':
          this.videoPlayer?.toggleFullscreen();
          this.isFullscreen = !this.isFullscreen;
          break;
        default:
          console.error('📺 TV: Unknown control command action:', action);
          break;
      }
    });
    this.subscriptions.push(controlSub);

    // Watch for authoritative state_sync messages so we can hide the QR when both clients are connected
    const stateSub = this.webSocketService.messages.subscribe((msg) => {
      try {
        if (!msg || msg.msgType !== 'state_sync') return;
        console.log('📺 TV: Received state_sync message via WebSocket:', msg);
        const payloadUnknown = msg.payload as unknown;
        const state = payloadUnknown as ApplicationState | undefined;
        this.bothConnected = ((state?.clientsConnectionState['tv'] && state?.clientsConnectionState['remote']) && 
        state?.clientsConnectionState['tv'] === 'connected' && state?.clientsConnectionState['remote'] === 'connected') || false;        
      } catch (e) {
        console.warn('📺 TV: Failed to parse state_sync for connection info', e);
      }
    });
    this.subscriptions.push(stateSub);

    // Subscribe to application state to get server's authoritative connection status
    const connSub = this.webSocketService.state$.subscribe(appState => {
      if (appState) {
        this.connectionStatus = appState.clientsConnectionState.tv || 'disconnected';
      } else {
        this.connectionStatus = 'disconnected';
      }
    });
    this.subscriptions.push(connSub);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private async initializeCatalog(): Promise<void> {
    try {
      console.log('📺 TV: Fetching catalog via HTTP...');
      await this.contentService.fetchCatalog();
      console.log('📺 TV: Catalog fetched successfully');
    } catch (error) {
      console.error('📺 TV: Failed to fetch catalog:', error);
      this.snackBar.open('Failed to load content catalog', 'Retry', { 
        duration: 0 
      }).onAction().subscribe(() => {
        this.initializeCatalog();
      });
    }
  }

  private initializeWebSocket(): void {
    // Subscribe to application state for connection status
    const connectionSub = this.webSocketService.state$.subscribe(appState => {
      if (!appState) return;
      
      const remoteStatus = appState.clientsConnectionState.remote;
      if (remoteStatus === 'connected') {
        this.snackBar.open('Remote connected', 'Close', { duration: 3000 });
      } else if (remoteStatus === 'disconnected') {
        const snackBarRef = this.snackBar.open('Remote disconnected', 'Retry', { 
          duration: 5000
        });
        snackBarRef.onAction().subscribe(() => {
          console.info('📺 TV: Network disconnected:');          
        });
      }
    });
    this.subscriptions.push(connectionSub);

    // Subscribe to WebSocket errors
    const errorSub = this.webSocketService.errors.subscribe(error => {
      console.error('📺 TV: WebSocket error:', error);
      this.snackBar.open(`Connection error: ${error}`, 'Close', { duration: 5000 });
    });

    this.subscriptions.push(errorSub);
    
  }

    // Connected device
  deviceInfo(): NetworkDevice {
    const networkDevice = this.webSocketService.deviceInfo;
    console.log('🔌 Connecting to device:', networkDevice);
    return networkDevice
  }

  // Event handlers for shared components - TV is display-only, these are stubs for local testing
  onPerformerSelected(performerId: string): void {
    console.log('📺 TV: Performer selected (local event, no-op):', performerId);
    // TV is display-only: navigation commands should come from Remote via server
  }

  onVideoSelected(videoId: string): void {
    console.log('📺 TV: Video selected (local event, no-op):', videoId);
    // TV is display-only: navigation commands should come from Remote via server
  }

  onSceneSelected(sceneId: string): void {
    console.log('📺 TV: Scene selected (local event, no-op):', sceneId);
    // TV is display-only: navigation commands should come from Remote via server
    const currentVideo = this.webSocketService.getCurrentVideo();
    const currentScene = this.webSocketService.getCurrentScene();
    
    if (currentVideo && currentScene) {
      console.log('📺 TV: Would start video playback:', {
        video: currentVideo.title,
        scene: currentScene.title,
        url: currentVideo.url
      });
    }
  }

  // Video Player Event Handlers
  onPlayerReady(): void {
    console.log('📺 TV: Video player is ready');
  }

  onVideoStarted(): void {
    console.log('📺 TV: Video playback started');
    this.isPlaying = true;
    // Send action confirmation to update server state
    this.webSocketService.sendActionConfirmation('success');
    // Don't immediately set volume to avoid autoplay policy conflicts
    // Volume will be controlled by Remote commands or user interaction
  }

  onVideoPaused(): void {
    console.log('📺 TV: Video playback paused');
    this.isPlaying = false;
    // Send action confirmation to update server state
    this.webSocketService.sendActionConfirmation('success');
  }

  onVideoEnded(): void {
    console.log('📺 TV: Video playback ended');
    this.isPlaying = false;
    // Send action confirmation to update server state
    this.webSocketService.sendActionConfirmation('success');
    // Optionally return to scene list or play next scene
  }

  onTimeUpdate(currentTime: number): void {
    // Handle time updates if needed for progress tracking
    console.log('📺 TV: Video time update:', currentTime);
  }

  onBackClick(): void {
    console.log('📺 TV: Back button clicked (local event, no-op)');
    // TV is display-only: navigation commands should come from Remote via server
  }

  onHomeClick(): void {
    console.log('📺 TV: Home button clicked (local event, no-op)');
    // TV is display-only: navigation commands should come from Remote via server
  }
}
