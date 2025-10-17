import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from "@angular/material/card";

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'video-remote-control',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule
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
    console.log('Emitting control command:', command);
    this.controlCommand.emit(command);
  }

  // General control methods

  exitPlayer(): void {
    console.log('Exiting player');
  }
  
  volumeDown(): void {    
    if (this.volumeLevel > 0) {
      this.volumeChange.emit(this.volumeLevel - 10);
      if (this.volumeLevel - 10 <= 0) {
        this.isMuted = true;
      }
      console.log('Volume:', this.volumeLevel);
    }
  }

  volumeUp(): void {    
    if (this.volumeLevel < 100) {
      this.volumeChange.emit(this.volumeLevel + 10);
      this.isMuted = false;
      console.log('Volume:', this.volumeLevel);
    }
  }

}
