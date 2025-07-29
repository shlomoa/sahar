import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { inputVideoData, NavigationState, VideoItem } from './video-navigation';



@Injectable({
  providedIn: 'root'
})
export class VideoNavigationService {
  private navigationState = new BehaviorSubject<NavigationState>({
    currentLevel: [],
    breadcrumb: ['Home'],
    canGoBack: false
  });

  private navigationStack: VideoItem[][] = [];

  // Detailed video data structure with specific videos and segments
  private videoData: VideoItem[] = inputVideoData;

  constructor() {
    // Initialize with root level
    this.updateNavigationState(this.videoData, ['Home'], false);
  }

  getNavigationState(): Observable<NavigationState> {
    return this.navigationState.asObservable();
  }

  navigateToItem(item: VideoItem): void {
    if (item.type === 'category' && item.children) {
      // Navigate to category or video with segments
      this.navigationStack.push(this.navigationState.value.currentLevel);
      const newBreadcrumb = [...this.navigationState.value.breadcrumb, item.title];
      this.updateNavigationState(item.children, newBreadcrumb, true);
    } else if (item.type === 'segment' && item.url) {
      // Play video segment - this will be handled by the WebSocket service
      console.log('Playing video segment:', item.url);
    }
  }

  goBack(): void {
    if (this.navigationStack.length > 0) {
      const previousLevel = this.navigationStack.pop()!;
      const newBreadcrumb = [...this.navigationState.value.breadcrumb];
      newBreadcrumb.pop();
      const canGoBack = this.navigationStack.length > 0;
      this.updateNavigationState(previousLevel, newBreadcrumb, canGoBack);
    }
  }

  goHome(): void {
    this.navigationStack = [];
    this.updateNavigationState(this.videoData, ['Home'], false);
  }

  private updateNavigationState(currentLevel: VideoItem[], breadcrumb: string[], canGoBack: boolean): void {
    this.navigationState.next({
      currentLevel,
      breadcrumb,
      canGoBack
    });
  }
}
