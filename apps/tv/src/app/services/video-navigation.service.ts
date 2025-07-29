import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Performer, Video, LikedScene, VideoItem, NavigationState, performersData } from '../models/video-navigation';

@Injectable({
  providedIn: 'root'
})
export class VideoNavigationService {
  private navigationState: NavigationState = {
    currentLevel: [],
    breadcrumb: [],
    canGoBack: false,
    currentPerformer: undefined,
    currentVideo: undefined
  };

  private navigationSubject = new BehaviorSubject<NavigationState>(this.navigationState);
  public navigation$ = this.navigationSubject.asObservable();

  constructor() {
    this.goHome();
  }

  goHome(): void {
    this.navigationState = {
      currentLevel: performersData.map(performer => ({
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
    const performer = performersData.find(p => p.id === performerId);
    if (!performer) return;

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
    if (!currentPerformer) return;

    const video = currentPerformer.videos.find(v => v.id === videoId);
    if (!video) return;

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
    console.log('Playing scene:', scene.title, 'at', url);
    // Here you would integrate with video player
  }

  getCurrentState(): NavigationState {
    return this.navigationState;
  }
}
