import { Component, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QRCodeComponent } from 'angularx-qrcode';
import { AdminQrOverlayService } from '../../services/admin-qr-overlay.service';

@Component({
  selector: 'app-admin-qr-overlay',
  standalone: true,
  imports: [CommonModule, QRCodeComponent],
  templateUrl: './admin-qr-overlay.component.html',
  styleUrls: ['./admin-qr-overlay.component.scss']
})
export class AdminQrOverlayComponent {
  protected overlay = inject(AdminQrOverlayService);

  @HostListener('document:keydown.escape')
  onEsc(): void {
    if (this.overlay.visible()) this.overlay.hide();
  }

  onBackdropClick(): void {
    this.overlay.hide();
  }

  onDialogClick(event: MouseEvent): void {
    event.stopPropagation();
  }

  async copyUrl(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.overlay.adminUrl());
    } catch {
      // ignore clipboard errors
    }
  }
}
