import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSliderModule } from '@angular/material/slider';
import { LikedScene, Video } from '../../../../../../shared/models/video-navigation';

@Component({
  selector: 'video-controls',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './video-controls.component.html',
  styleUrls: ['./video-controls.component.scss']
})
export class VideoControlsComponent {
  @Input() currentVideo?: Video;
  @Input() currentScene?: LikedScene;
  @Input() sceneId?: string;
  @Input() isPlaying = false;
  @Input() isMuted = false;
  @Input() volumeLevel = 50;
  @Input() hasPreviousScene = false;
  @Input() hasNextScene = false;
  
  @Output() controlCommand = new EventEmitter<string>();
  @Output() volumeChange = new EventEmitter<number>();
  @Output() backToScenes = new EventEmitter<void>();

  onControlCommand(command: string) {
    this.controlCommand.emit(command);
  }

  onVolumeChange(value: number) {
    this.volumeChange.emit(value);
  }

  onBackToScenes() {
    this.backToScenes.emit();
  }
}
