import { Component, input, output, signal, computed, effect, OnInit, OnDestroy } from '@angular/core';
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
export class AppToolbarComponent implements OnInit, OnDestroy {
  // Inputs using signal-based API
  title = input.required<string>();
  connectionStatus = input.required<ConnectionState>();
  bothConnected = input.required<boolean>();
  
  // Outputs
  homeClick = output<void>();

  // NEW: Auto-hide functionality
  private readonly isVisible = signal<boolean>(true);
  private hideTimer?: number;

  // Computed: Only auto-hide when BOTH clients are connected
  private readonly shouldAutoHide = computed(() => 
    this.bothConnected()
  );

  // Public: For template binding
  readonly toolbarVisible = computed(() => this.isVisible());

  constructor() {
    // Watch connection status changes - must be in constructor for injection context
    effect(() => {
      const bothConnected = this.bothConnected();
      
      if (bothConnected) {
        // Start 5-second auto-hide timer only when BOTH are connected
        this.startHideTimer();
      } else {
        // Show permanently when not both connected
        this.showPermanently();
      }
    });
  }

  ngOnInit(): void {
    // Effect is now in constructor - this method can be empty or removed
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }

  // PUBLIC: For Remote app touch interaction
  showTemporarily(): void {
    this.isVisible.set(true);
    if (this.shouldAutoHide()) {
      this.startHideTimer();
    }
  }

  private startHideTimer(): void {
    this.clearTimer();
    this.hideTimer = window.setTimeout(() => {
      this.isVisible.set(false);
    }, 5000);
  }

  private showPermanently(): void {
    this.clearTimer();
    this.isVisible.set(true);
  }

  private clearTimer(): void {
    if (this.hideTimer) {
      window.clearTimeout(this.hideTimer);
      this.hideTimer = undefined;
    }
  }
  
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
