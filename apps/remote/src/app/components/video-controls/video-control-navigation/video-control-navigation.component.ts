import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'video-control-navigation',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './video-control-navigation.component.html',
  styleUrls: ['./video-control-navigation.component.scss']
})
export class VideoControlNavigationComponent {
  @Output() backToScenes = new EventEmitter<void>();

  onBackToScenes() {
    this.backToScenes.emit();
  }
}
