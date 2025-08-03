import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Performer, Video, LikedScene, VideoItem, NavigationState, performersData } from '@shared/models/video-navigation';

@Injectable({
  providedIn: 'root'
})
export class VideoNavigationService {
  private navigationState: NavigationState = {
    currentLevel: [],
    breadcrumb: [],
    canGoBack: false
  };
  private performersData: Performer[] = performersData; // Use shared data directly

  private navigationSubject = new BehaviorSubject<NavigationState>(this.navigationState);
  public navigation$ = this.navigationSubject.asObservable();

  constructor() {
    // TV starts with shared data immediately
    console.log('📺 TV Navigation Service initialized');
    console.log('📺 Performers data available:', this.performersData.length);
    console.log('📺 First performer:', this.performersData[0]?.name || 'None');
    this.goHome(); // Show performers immediately
  }

  // Called by WebSocket service when Remote sends data
  setPerformersData(performers: Performer[]): void {
    console.log('📺 TV received performers data from Remote:', performers);
    this.performersData = performers;
    this.goHome(); // Show performers once data is received
  }

  // Add getter for performers data
  getPerformersData(): Performer[] {
    return this.performersData;
  }

  private showWaitingState(): void {
    this.navigationState = {
      currentLevel: [
        {
          id: 'waiting',
          title: 'Waiting for Remote Connection...',
          thumbnail: '',
          type: 'category'
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
    console.log('📺 Going home with performers:', this.performersData.length);
    if (this.performersData.length === 0) {
      console.warn('📺 No performers data available');
      this.showWaitingState();
      return;
    }

    this.navigationState = {
      currentLevel: this.performersData.map(performer => ({
        id: performer.id,
        title: performer.name,
        thumbnail: performer.thumbnail,
        type: 'performer' as const
      })),
      breadcrumb: ['Home'],
      canGoBack: false,
      currentPerformer: undefined,
      currentVideo: undefined
    };
    this.navigationSubject.next(this.navigationState);
  }

  navigateToPerformer(performerId: string): void {
    const performer = this.performersData.find(p => p.id === performerId);
    if (!performer) {
      console.error('📺 TV: Performer not found:', performerId);
      return;
    }

    this.navigationState = {
      currentLevel: performer.videos.map(video => ({
        id: video.id,
        title: video.title,
        thumbnail: video.thumbnail,
        type: 'video' as const,
        url: video.url
      })),
      breadcrumb: ['Home', performer.name],
      canGoBack: true,
      currentPerformer: performer,
      currentVideo: undefined
    };
    this.navigationSubject.next(this.navigationState);
  }

  navigateToVideo(videoId: string): void {
    const currentPerformer = this.navigationState.currentPerformer;
    if (!currentPerformer) {
      console.error('📺 TV: No current performer');
      return;
    }

    const video = currentPerformer.videos.find(v => v.id === videoId);
    if (!video) {
      console.error('📺 TV: Video not found:', videoId);
      return;
    }

    this.navigationState = {
      currentLevel: video.likedScenes.map(scene => ({
        id: scene.id,
        title: scene.title,
        thumbnail: scene.thumbnail || video.thumbnail,
        type: 'segment' as const,
        url: `${video.url}&t=${scene.startTime}`,
        startTime: scene.startTime,
        endTime: scene.endTime
      })),
      breadcrumb: ['Home', currentPerformer.name, video.title],
      canGoBack: true,
      currentPerformer: currentPerformer,
      currentVideo: video
    };
    this.navigationSubject.next(this.navigationState);
  }

  goBack(): void {
    if (!this.navigationState.canGoBack) return;

    if (this.navigationState.breadcrumb.length === 3) {
      // From scenes back to videos
      this.navigateToPerformer(this.navigationState.currentPerformer!.id);
    } else if (this.navigationState.breadcrumb.length === 2) {
      // From videos back to performers
      this.goHome();
    }
  }

  playScene(sceneId: string): void {
    console.log('📺 TV: playScene called with sceneId:', sceneId);
    const currentVideo = this.navigationState.currentVideo;
    if (!currentVideo) {
      console.warn('📺 TV: No current video to play scene in');
      return;
    }

    console.log('📺 TV: Current video:', currentVideo.title);
    console.log('📺 TV: Available scenes:', currentVideo.likedScenes.map(s => ({ id: s.id, title: s.title, startTime: s.startTime })));

    const scene = currentVideo.likedScenes.find(s => s.id === sceneId);
    if (!scene) {
      console.warn('📺 TV: Scene not found with ID:', sceneId);
      console.warn('📺 TV: Available scene IDs:', currentVideo.likedScenes.map(s => s.id));
      
      // Try to find scene by index (in case sceneId is a numeric string)
      const sceneIndex = parseInt(sceneId);
      if (!isNaN(sceneIndex) && sceneIndex >= 0 && sceneIndex < currentVideo.likedScenes.length) {
        const sceneByIndex = currentVideo.likedScenes[sceneIndex];
        console.log('📺 TV: Found scene by index:', sceneIndex, '→', sceneByIndex.title);
        return this.playSceneObject(sceneByIndex);
      }
      
      // Try to find scene by startTime (in case sceneId is a timestamp)
      const sceneByTime = currentVideo.likedScenes.find(s => s.startTime.toString() === sceneId);
      if (sceneByTime) {
        console.log('📺 TV: Found scene by startTime:', sceneId, '→', sceneByTime.title);
        return this.playSceneObject(sceneByTime);
      }
      
      return;
    }

    console.log('📺 TV: Found scene by ID:', scene.title, 'starting at:', scene.startTime);
    this.playSceneObject(scene);
  }

  private playSceneObject(scene: LikedScene): void {
    console.log('📺 TV: Playing scene object:', scene.title, 'at time:', scene.startTime);
    
    // Update navigation state to indicate we're playing a scene
    this.navigationState = {
      ...this.navigationState,
      breadcrumb: [...this.navigationState.breadcrumb, `▶️ ${scene.title}`],
      canGoBack: true
    };
    
    // Emit the updated state so the main component can respond
    this.navigationSubject.next(this.navigationState);
    
    console.log('📺 TV: Scene playback initiated for:', scene.title, 'at time:', scene.startTime);
  }

  getCurrentState(): NavigationState {
    return this.navigationState;
  }

  // Check if TV has received data from Remote
  hasData(): boolean {
    return this.performersData.length > 0;
  }
}
