import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LikedScene, Video } from 'shared';
import { VideoControlNavigationComponent } from './video-control-navigation/video-control-navigation.component';
import { CurrentVideoSceneInfoComponent } from './current-video-scene-info/current-video-scene-info.component';
import { VideoRemoteControlComponent } from './video-remote-control/video-remote-control.component';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'video-controls',
  standalone: true,
  imports: [
    CommonModule,
    VideoControlNavigationComponent,
    CurrentVideoSceneInfoComponent,
    VideoRemoteControlComponent
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
