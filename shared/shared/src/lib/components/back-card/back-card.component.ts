import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'shared-back-card',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule],
  templateUrl: './back-card.component.html',
  styleUrls: ['./back-card.component.scss'],
  host: {
    '[style.flex]': "'0 0 ' + widthPercent + '%'",
    '[style.height]': '"100%"'
  }
})
export class SharedBackCardComponent {
  // Enable/disable the back button
  @Input() enabled = false;
  // Percentage width of this card relative to its flex container (default 15)
  @Input() widthPercent = 15;
  @Output() back = new EventEmitter<void>();
}
