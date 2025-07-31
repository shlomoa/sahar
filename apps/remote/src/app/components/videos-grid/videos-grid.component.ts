import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Video } from '../../../../../../shared/models/video-navigation';

@Component({
  selector: 'videos-grid',
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
export class VideosGridComponent {
  @Input() videos: Video[] = [];
  @Input() selectedVideoId?: string;
  
  @Output() videoSelected = new EventEmitter<string>();
  @Output() backToPerformers = new EventEmitter<void>();

  onVideoSelected(videoId: string) {
    this.videoSelected.emit(videoId);
  }

  onBackToPerformers() {
    this.backToPerformers.emit();
  }

  trackByVideoId(index: number, video: Video): string {
    return video.id;
  }
}
