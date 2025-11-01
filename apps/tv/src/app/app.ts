import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';
import { getYoutubeVideoId,
         NetworkDevice,
         ApplicationState,
         ConnectionState,
         WEBSOCKET_CONFIG,
         NavigationLevel,
         SharedNavigationRootComponent,
         CatalogHelperService,         
         DEFAULT_APPLICATION_STATE,
         AppToolbarComponent} from 'shared';
import { WebSocketService } from './services/websocket.service';
import { VideoPlayerComponent } from './components/video-player/video-player.component';
import { QrConnectionComponent } from './components/qr-connection/qr-connection.component';
import { AdminQrOverlayComponent } from './components/admin-qr-overlay/admin-qr-overlay.component';
import { SecretTapService } from './services/secret-tap.service';
import { AdminQrOverlayService } from './services/admin-qr-overlay.service';


@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    CommonModule,
    MatToolbarModule,
    MatSnackBarModule,
    VideoPlayerComponent,
    SharedNavigationRootComponent,
    QrConnectionComponent,
    AdminQrOverlayComponent,
    AppToolbarComponent
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
  standalone: true
})
export class App implements OnInit, OnDestroy {
  protected title = 'Sahar TV';
  
  // Server state - single source of truth
  protected applicationState: ApplicationState = DEFAULT_APPLICATION_STATE;
  private subscriptions: Subscription[] = [];

  // Service injections
  private readonly webSocketService = inject(WebSocketService);
  private readonly catalogHelper = inject(CatalogHelperService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly secretTap = inject(SecretTapService);
  private readonly adminQrOverlay = inject(AdminQrOverlayService);
  
  // Computed signals from CatalogHelperService - automatic reactivity
  readonly currentPerformer = this.catalogHelper.currentPerformer;
  readonly currentVideo = this.catalogHelper.currentVideo;
  readonly currentScene = this.catalogHelper.currentScene;
  readonly currentPerformers = this.catalogHelper.currentPerformers;
  readonly currentVideos = this.catalogHelper.currentVideos;
  readonly currentScenes = this.catalogHelper.currentScenes;
  readonly catalogReady = this.catalogHelper.catalogReady;  

  // QR: Remote entry URL to encode
  remoteUrl = '';

  // QR: Admin panel URL to encode
  adminUrl = '';

  // Derived playback bindings for the video-player component
  get playbackVideoId(): string {
    const video = this.currentVideo();
    if (!video) {
      throw new Error('No current video for playbackVideoId');
    }
    return getYoutubeVideoId(video.url);
  }

  get playbackPositionSec(): number | null {
    const scene = this.currentScene();
    return scene?.startTime ?? null;
  }

  // Player state getters - derive from server's authoritative state  
  
  // Connection state getters - derive from server's authoritative state
  get bothConnected(): boolean {
    return (
      this.applicationState?.clientsConnectionState?.tv === 'connected' &&
      this.applicationState?.clientsConnectionState?.remote === 'connected'
    ) ?? false;
  }

  get connectionStatus(): ConnectionState {
    return this.applicationState?.clientsConnectionState?.tv ?? 'disconnected';
  }

  // Current navigation level helpers for templates - derive from server state
  get currentLevel(): NavigationLevel {
    const state = this.applicationState;
    if (!state?.navigation) return 'performers';
    
    return state.navigation.currentLevel;
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
    // Build Remote URL as protocol://FQDN:SERVER_DEFAULT_PORT (avoid localhost in QR).
    // Prefer server-provided LAN IP from /host-ip, fall back to the browser hostname.
    const protocol = window.location.protocol;
    const defaultHost = window.location.hostname;
    const buildRemoteUrl = (host: string) => `${protocol}//${host}:${WEBSOCKET_CONFIG.SERVER_DEFAULT_PORT}/remote`;
    const buildAdminUrl = (host: string) => `${protocol}//${host}:${WEBSOCKET_CONFIG.SERVER_DEFAULT_PORT}/admin`;

    // Start with a provisional URL based on the browser hostname.
    this.remoteUrl = buildRemoteUrl(defaultHost);
    this.adminUrl = buildAdminUrl(defaultHost);

    // Try to fetch authoritative host IP from the server and prefer it if available.
    (async () => {
      try {
        const resp = await fetch('/host-ip', { cache: 'no-cache' });
        if (resp.ok) {
          const data = await resp.json();
          const ip = data?.ip;
          if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
            this.remoteUrl = buildRemoteUrl(ip);
            this.adminUrl = buildAdminUrl(ip);
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
      this.applicationState = { ...state };
      
      // CRITICAL: Update CatalogHelperService state (enables all computed signals)
      if (state) {
        this.catalogHelper.setState(state);
      }

      console.log('📺 TV: Application state updated:', {
        level: state?.navigation?.currentLevel,
        performerId: state?.navigation?.performerId,
        videoId: state?.navigation?.videoId,
        sceneId: state?.navigation?.sceneId,
        bothConnected: this.bothConnected
      });
    });
    this.subscriptions.push(mainStateSub);

    // Subscribe to application state for connection status
    const connectionSub = this.webSocketService.state$.subscribe(appState => {
      if (!appState?.clientsConnectionState) return;
      
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

    // Secret admin gesture: attach global tap listener and show admin QR overlay on trigger
    this.secretTap.attach(document);
    const secretSub = this.secretTap.triggered$.subscribe(() => {
      this.adminQrOverlay.show(5000, this.adminUrl);
    });
    this.subscriptions.push(secretSub);

  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.secretTap.detach(document);
  }

  // Connected device
  deviceInfo(): NetworkDevice {
    const networkDevice = this.webSocketService.deviceInfo;
    console.log('🔌 Connecting to device:', networkDevice);
    return networkDevice
  }
  
  // Event handlers for shared components - TV is display-only, these are stubs for local testing
  onPerformerSelected(performerId: number): void {
    console.log('📺 TV: Performer selected (local event, no-op):', performerId);
    // TV is display-only: navigation commands should come from Remote via server
  }

  onVideoSelected(videoId: number): void {
    console.log('📺 TV: Video selected (local event, no-op):', videoId);
    // TV is display-only: navigation commands should come from Remote via server
  }

  onSceneSelected(sceneId: number): void {
    console.log('📺 TV: Scene selected (local event, no-op):', sceneId);
    // TV is display-only: navigation commands should come from Remote via server
    const video = this.currentVideo();
    const scene = this.currentScene();
    
    if (video && scene) {
      console.log('📺 TV: Would start video playback:', {
        video: video.name,
        scene: scene.name,
        url: video.url
      });
    }
  }

  // Video Player Event Handlers
  onPlayerReady(): void {
    console.log('📺 TV: Video player is ready');
  }

  onIsPlaying(): void {
    console.log('📺 TV: Video playback started');
    // Send action confirmation to update server state
    this.webSocketService.sendActionConfirmation('success');
    // Don't immediately set volume to avoid autoplay policy conflicts
    // Volume will be controlled by Remote commands or user interaction
  }

  onVideoPaused(): void {
    console.log('📺 TV: Video playback paused');
    // Send action confirmation to update server state
    this.webSocketService.sendActionConfirmation('success');
  }

  onVideoEnded(): void {
    console.log('📺 TV: Video playback ended');
    // Send action confirmation to update server state
    this.webSocketService.sendActionConfirmation('success');
    // Optionally return to scene list or play next scene
  }

  onTimeUpdate(currentTime: number): void {
    // Handle time updates if needed for progress tracking
    console.log('📺 TV: Video time update:', currentTime);
    this.webSocketService.sendActionConfirmation('success');
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
