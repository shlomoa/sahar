import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { SharedBackCardComponent } from '../back-card/back-card.component';
import { SharedPerformersGridComponent } from '../performers-grid/performers-grid.component';
import { SharedVideosGridComponent } from '../videos-grid/videos-grid.component';
import { SharedScenesGridComponent } from '../scenes-grid/scenes-grid.component';
import { NavigationLevel } from '../../models/application-state';
import { Performer, Video, Scene } from '../../models/video-navigation';
import { ClientType } from '../../models';

@Component({
  selector: 'shared-navigation-root',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    SharedBackCardComponent,
    SharedPerformersGridComponent,
    SharedVideosGridComponent,
    SharedScenesGridComponent,
  ],
  templateUrl: './navigation-root.component.html',
  styleUrls: ['./navigation-root.component.scss']
})
export class SharedNavigationRootComponent {
  // Inputs (presentational-only)
  @Input() level: NavigationLevel = 'performers';
  @Input() performers: Performer[] = [];
  @Input() videos: Video[] = [];
  @Input() scenes: Scene[] = [];
  @Input() selectedPerformerId?: string;
  @Input() selectedVideoId?: string;
  @Input() sceneSelected = false;
  @Input() clientType: ClientType = 'remote';

  // Outputs (bubbled to host apps)
  @Output() back = new EventEmitter<void>();
  @Output() home = new EventEmitter<void>();
  @Output() selectPerformer = new EventEmitter<string>();
  @Output() selectVideo = new EventEmitter<string>();
  @Output() selectScene = new EventEmitter<string>();

  get disabledBack(): boolean {
    return !this.level || this.level === 'performers';
  }
  get disabledHome(): boolean {
    return !this.level || this.level === 'performers';
  }
}
