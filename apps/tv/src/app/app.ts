import { Component, OnInit, OnDestroy, ViewChild, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { QRCodeComponent } from 'angularx-qrcode';
import { VideoNavigationService } from '@shared/services/video-navigation.service';
import { WebSocketService } from './services/websocket.service';
import { NavigationState, VideoItem, Video, LikedScene, Performer } from '@shared/models/video-navigation';
import { VideoPlayerComponent } from './components/video-player/video-player.component';
import { SharedPerformersGridComponent, SharedVideosGridComponent, SharedScenesGridComponent } from '@shared/components';
import { Observable, Subscription } from 'rxjs';
import { ControlCommandMessage } from '@shared/websocket/websocket-protocol';
import { getYoutubeVideoId } from '@shared/utils/youtube-helpers';
import { WEBSOCKET_CONFIG } from '@shared/websocket/websocket-protocol';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    CommonModule,
    MatToolbarModule,
    MatGridListModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    QRCodeComponent,
    VideoPlayerComponent,
    SharedPerformersGridComponent,
    SharedVideosGridComponent,
    SharedScenesGridComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit, OnDestroy {
  @ViewChild(VideoPlayerComponent) private videoPlayer?: VideoPlayerComponent;
  protected title = 'Sahar TV';
  navigation$: Observable<NavigationState>;
  private subscriptions: Subscription[] = [];

  private readonly navigationService = inject(VideoNavigationService);
  private readonly webSocketService = inject(WebSocketService);
  private readonly snackBar = inject(MatSnackBar);

  // Video playback state
  currentVideo: Video | null = null;
  currentScene: LikedScene | null = null;

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

  // QR: Remote entry URL to encode
  remoteUrl = '';

  // Current navigation level helpers for templates
  get currentPerformers(): Performer[] {
    const nav = this.navigationService.getCurrentState();
    if (nav.breadcrumb.length === 1) { // Home level
      // Get the actual performers data with full video information
      return this.navigationService.getPerformersData();
    }
    return [];
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

  get currentLevel(): 'performers' | 'videos' | 'scenes' | 'playing' {
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

  ngOnInit(): void {
    // Build Remote URL as protocol://FQDN:REMOTE_PORT (avoid localhost in QR).
    // Prefer server-provided LAN IP from /host-ip, fall back to the browser hostname.
    const protocol = window.location.protocol;
    const defaultHost = window.location.hostname; // If the TV is accessed via FQDN, this will be the FQDN
    const remotePort = WEBSOCKET_CONFIG.REMOTE_DEV_PORT;
    const buildRemoteUrl = (host: string) => `${protocol}//${host}:${remotePort}`;

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
        console.warn('Failed to fetch /host-ip, falling back to browser hostname for QR.', err);
      }

      // Warn if the QR still encodes localhost so developers notice the issue.
      if (this.remoteUrl.includes('localhost') || this.remoteUrl.includes('127.0.0.1')) {
        console.warn('QR is using localhost. Access the TV via its FQDN or IP so the QR encodes a scannable host.');
      }
    })();
    // Navigation service automatically initializes to home
    this.navigation$.subscribe(nav => {
      console.log('Navigation state updated:', nav);
      console.log('Current level items:', nav.currentLevel.map(item => ({
        title: item.title,
        thumbnail: item.thumbnail,
        type: item.type
      })));
      
      // Check if this is a scene playback (breadcrumb indicates playing)
      if (nav.breadcrumb.some(crumb => crumb.startsWith('▶️')) && nav.currentVideo) {
        console.log('📺 Scene playback detected via navigation state');
        this.currentVideo = nav.currentVideo;
        
        // Find the scene being played (look for the last breadcrumb with ▶️)
        const sceneTitle = nav.breadcrumb.find(crumb => crumb.startsWith('▶️'))?.substring(3);
        if (sceneTitle) {
          const scene = nav.currentVideo.likedScenes.find(s => s.title === sceneTitle);
          if (scene) {
            this.currentScene = scene;
            console.log('📺 Starting video playback from WebSocket:', {
              video: this.currentVideo.title,
              scene: this.currentScene.title,
              url: this.currentVideo.url,
              startTime: this.currentScene.startTime
            });
          }
        }
      }
    });

    // Initialize WebSocket connection and wire control commands to YouTube player
    this.initializeWebSocket();

    const controlSub = this.webSocketService.messages.subscribe((msg) => {
      if (!msg || msg.type !== 'control_command') return;
      const { action } = (msg as ControlCommandMessage).payload;
      const payload = (msg as ControlCommandMessage).payload;
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
          if (typeof payload.volume === 'number') this.videoPlayer?.setVolume(payload.volume);
          break;
        }
        case 'mute':
          this.videoPlayer?.setVolume(0);
          break;
        case 'unmute':
          this.videoPlayer?.setVolume(100);
          break;
      }
    });
    this.subscriptions.push(controlSub);
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
          this.webSocketService.connect();
        });
      }
    });

    // Subscribe to WebSocket errors
    const errorSub = this.webSocketService.errors.subscribe(error => {
      console.error('WebSocket error:', error);
      this.snackBar.open(`Connection error: ${error}`, 'Close', { duration: 5000 });
    });

    this.subscriptions.push(connectionSub, errorSub);

    // Start the WebSocket connection
    this.webSocketService.connect();
    
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

  onBackToPerformers(): void {
    console.log('📺 TV: Back to performers');
    this.navigationService.goHome();
  }

  onBackToVideos(): void {
    console.log('📺 TV: Back to videos');
    this.navigationService.goBack();
  }

  onItemClick(item: VideoItem): void {
    console.log('Clicked item:', item); // Debug log
    let nav: NavigationState;
    switch (item.type) {
      case 'performer':
        this.navigationService.navigateToPerformer(item.id);
        break;
      case 'video':
        this.navigationService.navigateToVideo(item.id);
        break;
      case 'segment':
        // When a scene is clicked, find the current video and scene data
        nav = this.navigationService.getCurrentState();
        if (nav.currentVideo) {
          this.currentVideo = nav.currentVideo;
          // Find the specific scene in the current video
          const scene = nav.currentVideo.likedScenes.find(s => s.id === item.id);
          if (scene) {
            this.currentScene = scene;
            console.log('Starting video playback:', {
              video: this.currentVideo.title,
              scene: this.currentScene.title,
              url: this.currentVideo.url
            });
          }
        }
        this.navigationService.playScene(item.id);
        break;
    }
  }

  // Video Player Event Handlers
  onPlayerReady(): void {
    console.log('Video player is ready');
  }

  onVideoStarted(): void {
    console.log('Video playback started');
  }

  onVideoPaused(): void {
    console.log('Video playback paused');
  }

  onVideoEnded(): void {
    console.log('Video playback ended');
    // Optionally return to scene list or play next scene
    this.currentVideo = null;
    this.currentScene = null;
  }

  onTimeUpdate(currentTime: number): void {
    // Handle time updates if needed for progress tracking
    console.log('Video time update:', currentTime);
  }

  onImageError(event: Event): void {
    console.log('Image failed to load:', (event.target as HTMLImageElement).src);
    const img = event.target as HTMLImageElement;
    img.src = 'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg?auto=compress&cs=tinysrgb&w=300';
  }

  onBackClick(): void {
    this.navigationService.goBack();
  }

  onHomeClick(): void {
    this.navigationService.goHome();
  }
}
