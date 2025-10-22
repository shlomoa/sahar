import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Performer } from '../../models/video-navigation';
import { ClientType } from '../../models/websocket-protocol';

@Component({
  selector: 'shared-performers-grid',
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
export class SharedPerformersGridComponent {
  @Input() performers: Performer[] = [];
  @Input() selectedPerformerId?: string;
  @Input() clientType: ClientType = 'remote'; // New: Support different display modes
  
  @Output() performerSelected = new EventEmitter<string>();

  selectPerformer(performerId: string) {
    this.performerSelected.emit(performerId);
  }

  onImageError(event: any) {
    // Fallback to a data URL placeholder
    event.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==';
  }

  // Helper methods for CSS classes based on display mode
  getGridClasses(): string {
    return this.clientType === 'tv' 
      ? 'performers-grid tv-mode' 
      : 'performers-grid remote-mode';
  }

  getCardClasses(): string {
    const baseClasses = 'performer-card';
    return this.clientType === 'tv' 
      ? `${baseClasses} tv-card` 
      : `${baseClasses} remote-card`;
  }
}
