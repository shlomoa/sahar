import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

interface DiscoveredDevice {
  name: string;
  address: string;
  port: number;
  type: string;
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

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
  @Input() connectionStatus: ConnectionStatus = 'disconnected';
  @Input() discoveredDevices: DiscoveredDevice[] = [];
  @Input() isScanning = false;
  
  @Output() deviceSelected = new EventEmitter<DiscoveredDevice>();
  @Output() refreshDevices = new EventEmitter<void>();

  onDeviceSelected(event: any) {
    const selectedDevice = event.option.value;
    if (selectedDevice) {
      this.deviceSelected.emit(selectedDevice);
    }
  }

  onRefreshDevices() {
    this.refreshDevices.emit();
  }
}
