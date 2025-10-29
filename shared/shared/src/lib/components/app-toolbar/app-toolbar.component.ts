import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ConnectionState } from '../../models';

/**
 * Shared toolbar component for TV and Remote apps.
 * Displays app title, home button, and connection status.
 */
@Component({
  selector: 'shared-app-toolbar',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './app-toolbar.component.html',
  styleUrls: ['./app-toolbar.component.scss']
})
export class AppToolbarComponent {
  // Inputs using signal-based API
  title = input.required<string>();
  connectionStatus = input.required<ConnectionState>();
  
  // Outputs
  homeClick = output<void>();
  
  /**
   * Convert connection state to display text with emoji
   */
  protected getStatusDisplay(status: ConnectionState): string {
    switch (status) {
      case 'connected': return '🟢 Connected';
      case 'connecting': return '🟡 Connecting...';
      case 'disconnected': return '🔴 Disconnected';
      default: return '⚪ Unknown';
    }
  }
  
  /**
   * Handle home button click
   */
  protected onHomeClick(): void {
    this.homeClick.emit();
  }
}
