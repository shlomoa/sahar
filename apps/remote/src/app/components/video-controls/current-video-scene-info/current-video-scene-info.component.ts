import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { LikedScene, Video } from 'shared';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'current-video-scene-info',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule
  ],
  templateUrl: './current-video-scene-info.component.html',
  styleUrls: ['./current-video-scene-info.component.scss']
})
export class CurrentVideoSceneInfoComponent {
  @Input() currentVideo?: Video;
  @Input() currentScene?: LikedScene;
}
