import { Component, OnInit, OnDestroy, ViewChild, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { QRCodeComponent } from 'angularx-qrcode';
import { Observable, Subscription } from 'rxjs';
import { VideoNavigationService,
         ControlCommandMessage,
         getYoutubeVideoId,
         NetworkDevice,
         ApplicationState,
         ConnectionState,
         WEBSOCKET_CONFIG,
         NavigationLevel,
         SharedNavigationRootComponent,
         NavigationState,
         Video,
         LikedScene,
         Performer } from 'shared';
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
  navigation$: Observable<NavigationState>;
  private subscriptions: Subscription[] = [];

  // Service injections
  private readonly navigationService = inject(VideoNavigationService);
  private readonly webSocketService = inject(WebSocketService);
  private readonly snackBar = inject(MatSnackBar);  

  // Video playback state
  currentVideo: Video | undefined = undefined;
  currentScene: LikedScene | undefined = undefined;

  // Local playback flag (derived from player$)
  isPlaying = false;
  isMuted = false;
  isFullscreen = false;
  volumeLevel = 50;

  // QR: Remote entry URL to encode
  remoteUrl = '';

  // Visibility flag: when both TV and Remote are connected according to server state
  bothConnected = false;
  // internal debounce timer id used to avoid flicker when connections flap
  private _bothConnectedDebounceTimer: number | null = null;
  // Connection status text to mirror Remote's UI mapping: 'connected' | 'connecting' | 'disconnected'
  connectionStatus: ConnectionState = 'disconnected';

  // Derived playback bindings for the video-player component
  get playbackVideoId(): string | null {
    return this.currentVideo?.url ? getYoutubeVideoId(this.currentVideo.url) : null;
  }

  get playbackPositionSec(): number | null {
    return this.currentScene?.startTime ?? null;
  }

  get playbackIsPlaying(): boolean { // basic POC default
    return this.videoPlayer?.isPlaying ?? false;
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

  get currentVideos(): Video[] {
    const nav = this.navigationService.getCurrentState();
    if (!!nav.currentPerformer && !nav.currentVideo) { // Videos level
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
    if (!!nav.currentPerformer && !nav.currentVideo) return 'videos';
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
    return (nav?.canGoBack);
  }

  ngOnInit(): void {
    // Build Remote URL as protocol://FQDN:SERVER_DEFAULT_PORT (avoid localhost in QR).
    // Prefer server-provided LAN IP from /host-ip, fall back to the browser hostname.
    const protocol = window.location.protocol;
    const defaultHost = window.location.hostname; // If the TV is accessed via FQDN, this will be the FQDN
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
        // Fail silently and keep using the browser hostname as a fallback.
        console.warn('📺 TV: Failed to fetch /host-ip, falling back to browser hostname for QR.', err);
      }

      // Warn if the QR still encodes localhost so developers notice the issue.
      if (this.remoteUrl.includes('localhost') || this.remoteUrl.includes('127.0.0.1')) {
        console.warn('📺 TV: QR is using localhost. Access the TV via its FQDN or IP so the QR encodes a scannable host.');
      }
    })();

    // Keep local view in sync with authoritative navigation state updates
    this.navigation$.subscribe(nav => {
      console.log('📺 Navigation state updated:', nav);
      console.log('📺 Current level items:', nav.currentLevel.map(item => ({
        title: item.title,
        thumbnail: item.thumbnail,
        type: item.itemType
      })));
    });

    // Subscribe to explicit player state when available. If the shared package
    // hasn't been rebuilt for the consuming app, use a runtime guard so this    // default, s.
    interface PlayerState { playingSceneId?: string; isPlaying?: boolean }

    // If the navigation service exposes player$ we should listen for explicit playingSceneId
    const navAny = this.navigationService as unknown as Record<string, unknown>;
    const player$ = navAny['player$'] as Observable<PlayerState> | undefined;
    const isObservableLike = (v: unknown): v is Observable<unknown> => !!v && typeof (v as { subscribe?: unknown }).subscribe === 'function';
    if (player$ && isObservableLike(player$)) {
      const playerSub = player$.subscribe((player: PlayerState | undefined) => {
        if (!player || !player.playingSceneId) {
          this.currentVideo = undefined;
          this.currentScene = undefined;
          this.isPlaying = false;
          return;
        }
        // Try to resolve the scene id to a Video and LikedScene
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
          console.log('📺 TV: Starting video playback from player$:', {
            video: this.currentVideo?.title,
            scene: this.currentScene.title,
            url: this.currentVideo?.url,
            startTime: this.currentScene.startTime
          });
        } else {
          console.warn('📺 TV: Could not resolve playingSceneId to a known scene:', player.playingSceneId);
        }
      });
      this.subscriptions.push(playerSub);
    }

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
        console.warn('📺 TV: Failed to parse state_sync for connection info', e);
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

  private initializeWebSocket(): void {
    // Subscribe to WebSocket connection status from base class
    const connectionSub = this.webSocketService.connected$.subscribe(state => {
      if (state === 'connected') {
        this.snackBar.open('Remote connected', 'Close', { duration: 3000 });
      } else if (state === 'disconnected') {
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

  // Event handlers for shared components
  onPerformerSelected(performerId: string): void {
    console.log('📺 TV: Performer selected:', performerId);
    this.navigationService.navigateToPerformer(performerId);
  }

  onVideoSelected(videoId: string): void {
    console.log('📺 TV: Video selected:', videoId);
    this.navigationService.navigateToVideo(videoId);
  }

  onSceneSelected(sceneId: string): void {
    console.log('📺 TV: Scene selected:', sceneId);
    // When a scene is clicked, find the current video and scene data
    const nav = this.navigationService.getCurrentState();
    if (nav.currentVideo) {
      this.currentVideo = nav.currentVideo;
      // Find the specific scene in the current video
      const scene = nav.currentVideo.likedScenes.find(s => s.id === sceneId);
      if (scene) {
        this.currentScene = scene;
        console.log('📺 TV: Starting video playback:', {
          video: this.currentVideo.title,
          scene: this.currentScene.title,
          url: this.currentVideo.url
        });
      }
    }
    this.navigationService.playScene(sceneId);
  }

  // Video Player Event Handlers
  onPlayerReady(): void {
    console.log('📺 TV: Video player is ready');
  }

  onVideoStarted(): void {
    console.log('📺 TV: Video playback started');
    // Don't immediately set volume to avoid autoplay policy conflicts
    // Volume will be controlled by Remote commands or user interaction
    // setTimeout(() => {
    //   this.videoPlayer?.setVolume(this.volumeLevel);
    // }, 1000);
  }

  onVideoPaused(): void {
    console.log('📺 TV: Video playback paused');
  }

  onVideoEnded(): void {
    console.log('📺 TV: Video playback ended');
    // Optionally return to scene list or play next scene
    this.currentVideo = undefined;
    this.currentScene = undefined;
  }

  onTimeUpdate(currentTime: number): void {
    // Handle time updates if needed for progress tracking
    console.log('📺 TV: Video time update:', currentTime);
  }

  onBackClick(): void {
    console.log('📺 TV: Back button clicked');
    this.navigationService.goBack();
  }

  onHomeClick(): void {
    console.log('📺 TV: Home button clicked');
    this.navigationService.goHome();
  }
}
