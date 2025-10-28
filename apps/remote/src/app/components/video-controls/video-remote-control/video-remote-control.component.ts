import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from "@angular/material/card";
import { PlayerState } from 'shared';
import { FocusDescDirective } from 'shared';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'video-remote-control',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    FocusDescDirective
],
  templateUrl: './video-remote-control.component.html',
  styleUrls: ['./video-remote-control.component.scss']
})
export class VideoRemoteControlComponent {
  @Input() playerState!: PlayerState;
  @Input() hasPreviousScene = false;
  @Input() hasNextScene = false;
  
  @Output() controlCommand = new EventEmitter<string>();
  @Output() volumeChange = new EventEmitter<number>();
  @Output() backToScenes = new EventEmitter<void>();

  onControlCommand(command: string) {
    console.log('Emitting control command:', command);
    this.controlCommand.emit(command);
  }

  // General control methods

  onBackToScenes(): void {
    console.log('Emitting back to scenes');
    this.backToScenes.emit();
  }
  
  volumeDown(): void {  
    console.log('Volume down pressed');
    if (this.playerState.volume == 0) {
      console.warn('Volume is already at minimum');
      return;
    }    
    this.volumeChange.emit(this.playerState.volume - 10);
    console.log('Volume went down one notch');
  }

  volumeUp(): void {    
    console.log('Volume up pressed');
    if (this.playerState.volume == 100) {
        console.warn('Volume is already at maximum');
        return;
    }
    this.volumeChange.emit(this.playerState.volume + 10);
    console.log('Volume going up one notch');
  }

}
