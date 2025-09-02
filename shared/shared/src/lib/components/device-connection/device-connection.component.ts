import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ConnectionState, NetworkDevice } from '../../models/websocket-protocol';

@Component({
  selector: 'device-connection',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './device-connection.component.html',
  styleUrls: ['./device-connection.component.scss']
})
export class DeviceConnectionComponent {
  @Input() connectionStatus: ConnectionState = 'disconnected';
  @Input() networkDevice: NetworkDevice = { deviceId: '', clientType: 'remote', ip: null, port: '', lastSeen: 0 };
  
  @Output() reconnectDevice = new EventEmitter<void>();

  isConnecting: boolean = false;

  onReconnectDevice() {
    this.isConnecting = true;
    this.reconnectDevice.emit();
  }
}
