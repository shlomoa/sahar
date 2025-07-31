import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Performer } from '../../../../../../shared/models/video-navigation';

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
  @Input() selectedPerformerId?: string;
  
  @Output() performerSelected = new EventEmitter<string>();

  selectPerformer(performerId: string) {
    this.performerSelected.emit(performerId);
  }

  trackByPerformerId(index: number, performer: Performer): string {
    return performer.id;
  }

  onImageError(event: any) {
    event.target.src = 'assets/placeholder-performer.jpg';
  }
}
