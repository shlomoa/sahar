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
import { getYoutubeVideoId } from '@shared/utils/youtube-helpers';

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
  // Compute QR target URL (per spec: encode `${location.origin}/remote`)
  this.remoteUrl = `${window.location.origin}/remote`;
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

    // Initialize WebSocket connection
    this.initializeWebSocket();

    // Task 2.23: Wire control commands to YouTube player
    const controlSub = this.webSocketService.tvMessages$.subscribe((msg) => {
      if (!msg || msg.type !== 'control') return;
      const action = msg.payload?.action;
      const payload = msg.payload || {};
      switch (action) {
        case 'play':
        case 'resume':
          this.videoPlayer?.play();
          break;
        case 'pause':
          this.videoPlayer?.pause();
          break;
        case 'stop':
          this.videoPlayer?.stop();
          break;
        case 'seek':
        case 'seek_video': {
          const seekType = payload.seekType || 'absolute';
          const time = payload.time ?? payload.seekTime ?? 0;
          if (seekType === 'relative') {
            const current = this.videoPlayer?.getCurrentTime() ?? 0;
            this.videoPlayer?.seekTo(current + time);
          } else {
            this.videoPlayer?.seekTo(time);
          }
          break;
        }
        case 'set_volume':
        case 'volume_change': {
          if (typeof payload.volume === 'number') this.videoPlayer?.setVolume(payload.volume);
          break;
        }
        // Optional advanced actions — best‑effort mapping
        case 'play_video': {
          // If currentVideo exists, just play; deeper wiring requires domain context
          this.videoPlayer?.play();
          break;
        }
      }
    });
    this.subscriptions.push(controlSub);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    // Use public disconnect method if available, or handle cleanup differently
    if (this.webSocketService.disconnect) {
      try {
        this.webSocketService.disconnect();
      } catch {
        console.log('WebSocket already disconnected');
      }
    }
  }

  private initializeWebSocket(): void {
    // Subscribe to WebSocket connection status from base class
    const connectionSub = this.webSocketService.getConnectionState().subscribe(state => {
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

    // Subscribe to TV-specific WebSocket errors
    const errorSub = this.webSocketService.tvErrors$.subscribe(error => {
      console.error('WebSocket error:', error);
      this.snackBar.open(`Connection error: ${error.message}`, 'Close', { duration: 5000 });
    });

    // Subscribe to discovered devices
    const devicesSub = this.webSocketService.devices$.subscribe(devices => {
      console.log('Discovered devices:', devices);
      if (devices.length > 0) {
        const remoteDevices = devices.filter(d => d.deviceType === 'remote');
        if (remoteDevices.length > 0) {
          const snackBarRef = this.snackBar.open(`Found ${remoteDevices.length} remote(s)`, 'Connect', {
            duration: 10000
          });
          snackBarRef.onAction().subscribe(() => {
            // Connect to the first available remote
            this.webSocketService.connectToDevice(remoteDevices[0]);
          });
        }
      }
    });

    this.subscriptions.push(connectionSub, errorSub, devicesSub);

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
