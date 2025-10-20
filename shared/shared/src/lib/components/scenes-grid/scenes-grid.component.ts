import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Scene } from '../../models/video-navigation';

@Component({
  selector: 'shared-scenes-grid',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './scenes-grid.component.html',
  styleUrls: ['./scenes-grid.component.scss']
})
export class SharedScenesGridComponent {
  @Input() scenes: Scene[] = [];
  @Input() selectedSceneId?: string;
  @Input() clientType: 'remote' | 'tv' = 'remote';
  
  @Output() sceneSelected = new EventEmitter<string>();
  @Output() backToVideos = new EventEmitter<void>();

  onSceneSelected(sceneId: string) {
    console.log('📱 Scene selected with ID:', sceneId);
    this.sceneSelected.emit(sceneId);
  }

  onBackToVideos() {
    this.backToVideos.emit();
  }

  trackBySceneId(index: number, scene: Scene): string {
    return scene.id;
  }

  // Helper methods for styling based on display mode
  getSectionClasses(): string {
    return this.clientType === 'tv' 
      ? 'scenes-section tv-mode' 
      : 'scenes-section remote-mode';
  }

  getGridClasses(): string {
    return this.clientType === 'tv' 
      ? 'scenes-grid tv-mode' 
      : 'scenes-grid remote-mode';
  }

  getCardClasses(): string {
    const baseClasses = 'scene-card';
    return this.clientType === 'tv' 
      ? `${baseClasses} tv-card` 
      : `${baseClasses} remote-card`;
  }

  // Format time in seconds to mm:ss
  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}
