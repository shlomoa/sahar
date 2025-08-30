import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  ClientType
} from '../../models/messages';
import { ConnectionState } from '../../models/websocket-protocol';

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
  @Input() discoveredDevices: NetworkDevice[] = [];
  @Input() isScanning = false;
  
  @Output() deviceSelected = new EventEmitter<NetworkDevice>();
  @Output() refreshDevices = new EventEmitter<void>();

  onDeviceSelected(event: any) {
    // Handle MatSelectionListChange event - get the selected option's value
    const selectedOptions = event.options;
    if (selectedOptions && selectedOptions.length > 0) {
      const selectedDevice = selectedOptions[0].value;
      console.log('📱 Device selected in component:', selectedDevice);
      this.deviceSelected.emit(selectedDevice);
    }
  }

  onRefreshDevices() {
    this.refreshDevices.emit();
  }
}

// Local helper type for discovered devices
type NetworkDevice = { deviceId: string; deviceName: string; clientType: ClientType; ip: string; port: number; lastSeen: number; capabilities?: string[] };
