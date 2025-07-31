import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { LikedScene } from '../../../../../../shared/models/video-navigation';

@Component({
  selector: 'scenes-grid',
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
export class ScenesGridComponent {
  @Input() scenes: LikedScene[] = [];
  @Input() selectedSceneTimestamp?: string;
  
  @Output() sceneSelected = new EventEmitter<string>();
  @Output() backToVideos = new EventEmitter<void>();

  onSceneSelected(sceneId: string) {
    console.log('📱 Remote: Scene selected with ID:', sceneId);
    this.sceneSelected.emit(sceneId);
  }

  onBackToVideos() {
    this.backToVideos.emit();
  }

  trackBySceneId(index: number, scene: LikedScene): string {
    return scene.id;
  }
}
