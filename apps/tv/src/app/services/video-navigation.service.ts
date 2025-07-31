import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Performer, Video, LikedScene, VideoItem, NavigationState, performersData } from '../../../../../shared/models/video-navigation';

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
    const currentVideo = this.navigationState.currentVideo;
    if (!currentVideo) return;

    const scene = currentVideo.likedScenes.find(s => s.id === sceneId);
    if (!scene) return;

    const url = `${currentVideo.url}&t=${scene.startTime}`;
    console.log('📺 TV: Playing scene:', scene.title, 'at', url);
    // Here you would integrate with video player
  }

  getCurrentState(): NavigationState {
    return this.navigationState;
  }

  // Check if TV has received data from Remote
  hasData(): boolean {
    return this.performersData.length > 0;
  }
}
