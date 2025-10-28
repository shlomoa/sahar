import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { QRCodeComponent } from 'angularx-qrcode';

/**
 * QR Connection Component
 * 
 * Displays a QR code for Remote app connection to the TV.
 * Shows the Remote URL that can be scanned to connect.
 * 
 * Features:
 * - 50% larger size (144px vs original 96px)
 * - Centered layout
 * - Optional visual cues (icon/arrow)
 * - High contrast mode support
 * - Material Design styling
 */
@Component({
  selector: 'app-qr-connection',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    QRCodeComponent
  ],
  templateUrl: './qr-connection.component.html',
  styleUrl: './qr-connection.component.scss'
})
export class QrConnectionComponent {
  /** Remote URL to encode in QR code */
  @Input() remoteUrl!: string;
  
  /** QR code size in pixels (default 144px - 50% larger than original 96px) */
  @Input() size: number = 144;
  
  /** Center the QR code in its container */
  @Input() centered: boolean = true;
  
  /** Show visual cue (arrow pointing to QR) */
  @Input() showIcon: boolean = false;
  
  /** Error correction level for QR code */
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H' = 'M';
}
