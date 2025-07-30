import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Performer } from '../../models/video-navigation';

@Component({
  selector: 'performers-grid',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './performers-grid.component.html',
  styleUrls: ['./performers-grid.component.scss']
})
export class PerformersGridComponent {
  @Input() performers: Performer[] = [];
  @Input() selectedPerformerId?: number;
  
  @Output() performerSelected = new EventEmitter<number>();

  selectPerformer(performerId: number) {
    this.performerSelected.emit(performerId);
  }

  trackByPerformerId(index: number, performer: Performer): number {
    return performer.id;
  }

  onImageError(event: any) {
    event.target.src = 'assets/placeholder-performer.jpg';
  }
}
