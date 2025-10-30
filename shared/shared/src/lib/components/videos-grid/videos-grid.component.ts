import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Video } from '../../models/video-navigation';
import { getYoutubeVideoId, getYoutubeThumbnailUrl } from '../../utils/youtube-helpers';
import { ClientType } from '../../models';

@Component({
  selector: 'shared-videos-grid',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './videos-grid.component.html',
  styleUrls: ['./videos-grid.component.scss']
})
export class SharedVideosGridComponent {
  @Input() videos: Video[] = [];
  @Input() selectedVideoId?: number;
  @Input() clientType: ClientType = 'remote';
  
  @Output() videoSelected = new EventEmitter<number>();
  @Output() backToPerformers = new EventEmitter<void>();

  onVideoSelected(videoId: number) {
    this.videoSelected.emit(videoId);
  }

  onBackToPerformers() {
    this.backToPerformers.emit();
  }

  // Helper methods for styling based on display mode
  getSectionClasses(): string {
    return this.clientType === 'tv' 
      ? 'videos-section tv-mode' 
      : 'videos-section remote-mode';
  }

  getGridClasses(): string {
    return this.clientType === 'tv' 
      ? 'videos-grid tv-mode' 
      : 'videos-grid remote-mode';
  }

  getCardClasses(): string {
    const baseClasses = 'video-card';
    return this.clientType === 'tv' 
      ? `${baseClasses} tv-card` 
      : `${baseClasses} remote-card`;
  }

  // Calculate YouTube thumbnail URL from video URL
  getVideoThumbnail(video: Video): string | null {
    const videoId = getYoutubeVideoId(video.url);
    return videoId ? getYoutubeThumbnailUrl(videoId) : null;
  }
}
