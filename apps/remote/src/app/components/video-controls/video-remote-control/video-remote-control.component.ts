import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'video-remote-control',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './video-remote-control.component.html',
  styleUrls: ['./video-remote-control.component.scss']
})
export class VideoRemoteControlComponent {
  @Input() isPlaying = false;
  @Input() isMuted = false;
  @Input() volumeLevel = 50;
  @Input() hasPreviousScene = false;
  @Input() hasNextScene = false;
  
  @Output() controlCommand = new EventEmitter<string>();
  @Output() volumeChange = new EventEmitter<number>();

  onControlCommand(command: string) {
    this.controlCommand.emit(command);
  }

  onVolumeChange(value: number) {
    this.volumeChange.emit(value);
  }

  // Accessibility helpers for coarse volume changes
  incrementVolume(step = 10) {
    const next = Math.min(100, Math.max(0, this.volumeLevel + step));
    this.volumeChange.emit(next);
  }

  decrementVolume(step = 10) {
    const next = Math.min(100, Math.max(0, this.volumeLevel - step));
    this.volumeChange.emit(next);
  }
}
