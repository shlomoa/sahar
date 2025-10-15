import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Performer, LikedScene, NavigationState } from '../models/video-navigation';
import { getYoutubeThumbnailUrl } from '../utils/youtube-helpers';
import { ApplicationState } from '../models/application-state';

@Injectable({
  providedIn: 'root'
})
export class VideoNavigationService {
  private navigationState: NavigationState = {
    currentLevel: [],
    breadcrumb: [],
    canGoBack: false
  };

  private performersData: Performer[] = [];
  private navigationSubject = new BehaviorSubject<NavigationState>(this.navigationState);
  public navigation$ = this.navigationSubject.asObservable();
  // Player state observable exposed to TV app
  private playerState: ApplicationState['player'] = {
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 100,
    muted: false,
  };
  private playerSubject = new BehaviorSubject<ApplicationState['player']>(this.playerState);
  public player$ = this.playerSubject.asObservable();
  constructor() {
    console.log('📱 Remote 📺 TV navigation: Shared Navigation Service initialized');
    // This path is for the TV app
    console.log('📱 Remote 📺 TV navigation: Service configured with no data. Waiting for Remote.');
    this.showWaitingState(); // Start in the waiting state
  }

  // Called by WebSocket service when Remote sends data
  setPerformersData(performers: Performer[]): void {
    console.log('📱 Remote 📺 TV navigation: Received performers data from Remote:', performers);
    this.performersData = performers;
    this.goHome(); // Show performers once data is received
  }

  // Add getter for performers data
  getPerformersData(): Performer[] {
    console.log('📱 Remote 📺 TV navigation: getPerformersData called, returning', this.performersData.length, 'performers');
    return this.performersData;
  }

  // Helper method for getting YouTube thumbnails
  getVideoThumbnail(videoUrl: string, quality: 'default' | 'mqdefault' | 'hqdefault' | 'sddefault' | 'maxresdefault' = 'hqdefault'): string | null {
    console.log('📱 Remote 📺 TV navigation: getVideoThumbnail called with URL:', videoUrl);
    // Extract video ID from URL and generate thumbnail
    const videoIdMatch = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
    if (videoIdMatch && videoIdMatch[1]) {
      return getYoutubeThumbnailUrl(videoIdMatch[1], quality);
    }
    return null;
  }

  private showWaitingState(): void {
    console.log('📱 Remote 📺 TV navigation: Showing waiting state');
    this.navigationState = {
      currentLevel: [
        {
          id: 'waiting',
          title: 'Waiting for Remote Connection...',
          thumbnail: '',
          itemType: 'category'
        }
      ],
      breadcrumb: ['Waiting for Remote...'],
      canGoBack: false,
      currentPerformer: undefined,
      currentVideo: undefined
    };
    this.navigationSubject.next(this.navigationState);
  }

  goHome(): void {
    console.log('📱 Remote 📺 TV navigation: Going home with performers:', this.performersData.length);
    
    if (this.performersData.length === 0) {
      console.warn('📱 Remote 📺 TV navigation: No performers data available');
      this.showWaitingState();
      return;
    }

    this.navigationState = {
      currentLevel: this.performersData.map(performer => ({
        id: performer.id,
        title: performer.name,
        thumbnail: performer.thumbnail,
        itemType: 'performer' as const
      })),
      breadcrumb: ['Home'],
      canGoBack: false,
      currentPerformer: undefined,
      currentVideo: undefined
    };
    console.log('📱 Remote 📺 TV navigation: Home state set with', this.navigationState.currentLevel.length, 'performers' );
    this.navigationSubject.next(this.navigationState);
  }

  navigateToPerformer(performerId: string): void {
    const performer = this.performersData.find(p => p.id === performerId);
    if (!performer) {
      console.error('📱 Remote 📺 TV navigation: Performer not found:', performerId);
      return;
    }

    this.navigationState = {
      currentLevel: performer.videos.map(video => ({
        id: video.id,
        title: video.title,
        thumbnail: this.getVideoThumbnail(video.url) || '',
        itemType: 'video' as const,
        url: video.url
      })),
      breadcrumb: ['Home', performer.name],
      canGoBack: true,
      currentPerformer: performer,
      currentVideo: undefined
    };
    console.log('📱 Remote 📺 TV navigation: Navigated to performer:', performer.name, 'with', this.navigationState.currentLevel.length, 'videos');
    this.navigationSubject.next(this.navigationState);
  }

  navigateToVideo(videoId: string): void {
    const currentPerformer = this.navigationState.currentPerformer;
    if (!currentPerformer) {
      console.error('📱 Remote 📺 TV navigation: No current performer');
      return;
    }

    const video = currentPerformer.videos.find(v => v.id === videoId);
    if (!video) {
      console.error('📱 Remote 📺 TV navigation: Video not found:', videoId);
      return;
    }

    this.navigationState = {
      currentLevel: video.likedScenes.map(scene => ({
        id: scene.id,
        title: scene.title,
        thumbnail: scene.thumbnail || this.getVideoThumbnail(video.url) || '',
        itemType: 'segment' as const,
        url: `${video.url}&t=${scene.startTime}`,
        startTime: scene.startTime,
        endTime: scene.endTime
      })),
      breadcrumb: ['Home', currentPerformer.name, video.title],
      canGoBack: true,
      currentPerformer: currentPerformer,
      currentVideo: video
    };
    console.log('📱 Remote 📺 TV navigation: Navigated to video:', video.title, 'with', this.navigationState.currentLevel.length, 'scenes');
    this.navigationSubject.next(this.navigationState);
  }

  goBack(): void {
    if (!this.navigationState.canGoBack) {
      console.info('📱 Remote 📺 TV navigation: Cannot go back from current state');
      return;
    }
    console.log('📱 Remote 📺 TV navigation: Going back from breadcrumb:', this.navigationState.breadcrumb);
    if (this.navigationState.breadcrumb.length === 3) {
      // From scenes back to videos
      this.navigateToPerformer(this.navigationState.currentPerformer!.id);
    } else if (this.navigationState.breadcrumb.length === 2) {
      // From videos back to performers
      this.goHome();
    }
  }

  playScene(sceneId: string): void {
    console.log('📱 Remote 📺 TV navigation: playScene called with sceneId:', sceneId);
    const currentVideo = this.navigationState.currentVideo;
    if (!currentVideo) {
      console.warn('📱 Remote 📺 TV navigation: No current video to play scene in');
      return;
    }

    console.log('📱 Remote 📺 TV navigation: Current video:', currentVideo.title);
    console.log('📱 Remote 📺 TV navigation: Available scenes:', currentVideo.likedScenes.map(s => ({ id: s.id, title: s.title, startTime: s.startTime })));

    const scene = currentVideo.likedScenes.find(s => s.id === sceneId);
    if (!scene) {
      console.error('📱 Remote 📺 TV navigation: Scene not found with ID:', sceneId);
      return;
    }

    console.log('📱 Remote 📺 TV navigation: Found scene by ID:', scene.title, 'starting at:', scene.startTime);
    this.playSceneObject(scene);
  }

  private playSceneObject(scene: LikedScene): void {
    console.log('📱 Remote 📺 TV navigation: Playing scene object:', scene.title, 'at time:', scene.startTime);

    // Update navigation state to indicate we're playing a scene (explicit playback marker)
    this.navigationState = {
      ...this.navigationState,
      // Keep breadcrumb semantic (no emoji markers). The player observable carries playingSceneId.
      breadcrumb: [...this.navigationState.breadcrumb],
      canGoBack: true
    };
    this.navigationSubject.next(this.navigationState);

    // Update player observable with explicit playing scene id
    this.playerState = {
      ...this.playerState,
      isPlaying: true,
      currentTime: scene.startTime,
      // duration left undefined if unknown
      youtubeId: undefined,
      playingSceneId: scene.id
    } as ApplicationState['player'];
    this.playerSubject.next(this.playerState);

    console.log('📱 Remote 📺 TV navigation: Scene playback initiated for:', scene.title, 'at time:', scene.startTime, 'sceneId:', scene.id);
  }

  // Player state API used by websocket handlers to set authoritative state
  setPlayerState(player: Partial<ApplicationState['player']>): void {
    console.log('📱 Remote 📺 TV navigation: setPlayerState called with:', player);
    this.playerState = { ...this.playerState, ...(player as ApplicationState['player']) } as ApplicationState['player'];
    this.playerSubject.next(this.playerState);
  }

  clearPlayingScene(): void {
    console.log('📱 Remote 📺 TV navigation: clearPlayingScene called, stopping playback');
    this.playerState = { ...this.playerState, isPlaying: false, playingSceneId: undefined } as ApplicationState['player'];
    this.playerSubject.next(this.playerState);
  }

  getCurrentState(): NavigationState {
    return this.navigationState;
  }

  // Check if TV has received data from Remote
  hasData(): boolean {
    return this.performersData.length > 0;
  }
}
