# SAHAR TV Remote - Port Configuration 🌐

## 🎯 Final Port Architecture (IMPLEMENTED ✅)

### WebSocket Communication Ports
```
Primary Communication:
├── 8000    → Main WebSocket server (TV ↔ Remote)
└── Backup  → Fallback for development/testing

Discovery Ports (Multi-port scanning):
├── 5544    → Device discovery endpoint #1
├── 5545    → Device discovery endpoint #2  
├── 5546    → Device discovery endpoint #3
└── 5547    → Device discovery endpoint #4
```

### Application Development Ports
```
Angular Development Servers:
├── 4202    → Remote App (ng serve)
├── 4203    → TV App (ng serve)
└── Auto    → Available port fallback
```

## 🔧 Implementation Details

### WebSocket Server Configuration
```javascript
// websocket-test-server-multiport.js
const ports = [8000, 5544, 5545, 5546, 5547];

ports.forEach(port => {
  const server = new WebSocketServer({ 
    port: port,
    perMessageDeflate: false 
  });
  
  server.on('connection', (ws, request) => {
    console.log(`📡 New connection on port ${port}`);
    handleWebSocketConnection(ws, port);
  });
});
```

### Remote App Discovery Logic
```typescript
// Remote App WebSocket Service
private readonly DISCOVERY_PORTS = [5544, 5545, 5546, 5547];
private readonly PRIMARY_PORT = 8000;

async startDeviceDiscovery(): Promise<void> {
  const gatewayIP = await this.getGatewayIP();
  const ipRange = this.generateIPRange(gatewayIP);
  
  // Scan all IPs across all discovery ports
  for (const ip of ipRange) {
    for (const port of this.DISCOVERY_PORTS) {
      this.checkTVDevice(ip, port);
    }
  }
  
  // Also check localhost for development
  this.checkTVDevice('localhost', this.PRIMARY_PORT);
}
```

### Auto-Connect Port Priority
```
Discovery Scan Order:
1. Network IPs + Ports 5544-5547 (Real device discovery)
2. localhost:8000 (Development fallback)
3. Auto-connect to first responding device
4. Upgrade to primary port 8000 for main communication
```

## 🌐 Network Discovery Strategy

### IP Range Scanning
```typescript
// Intelligent network scanning
private generateIPRange(gatewayIP: string): string[] {
  const baseIP = gatewayIP.split('.').slice(0, 3).join('.');
  const ipList: string[] = [];
  
  // Scan common device ranges first
  const priorityRanges = [
    { start: 100, end: 120 },  // Common smart TV range
    { start: 10, end: 50 },    // Router/gateway range  
    { start: 200, end: 254 }   // DHCP high range
  ];
  
  priorityRanges.forEach(range => {
    for (let i = range.start; i <= range.end; i++) {
      ipList.push(`${baseIP}.${i}`);
    }
  });
  
  return ipList;
}
```

### Connection Testing
```typescript
// Real WebSocket connection attempts
private async checkTVDevice(ip: string, port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const testWs = new WebSocket(`ws://${ip}:${port}`);
    
    const timeout = setTimeout(() => {
      testWs.close();
      reject(new Error('Connection timeout'));
    }, 2000); // 2-second timeout per attempt
    
    testWs.onopen = () => {
      clearTimeout(timeout);
      this.addDiscoveredDevice(ip, port, 'tv');
      testWs.close();
      resolve();
    };
    
    testWs.onerror = () => {
      clearTimeout(timeout);
      testWs.close();
      reject(new Error('Connection failed'));
    };
  });
}
```

## 🔄 Port Usage Workflow

### 1. System Startup
```
WebSocket Server starts → Listens on all 5 ports (8000, 5544-5547)
TV App starts → Connects to WebSocket server (any port)
Remote App starts → Begins device discovery scan
```

### 2. Device Discovery
```
Remote App → Scans network IPs on ports 5544-5547
TV Responds → From any of the listening ports
Remote App → Detects TV device and adds to discovered list
Auto-Connect → Establishes connection to primary port 8000
```

### 3. Communication Phase
```
Primary Channel → Port 8000 (main data transfer)
Data Messages → Performers, videos, scenes transmission
Navigation → Real-time command synchronization  
Control → Video playback commands
```

## 🛡️ Port Security & Error Handling

### Connection Resilience
```typescript
// Robust error handling per port
private handleConnectionError(port: number, error: Error): void {
  console.warn(`❌ Port ${port} connection failed:`, error.message);
  
  // Try next port in sequence
  const nextPort = this.getNextPort(port);
  if (nextPort) {
    this.attemptConnection(nextPort);
  }
}

// Fallback to localhost for development
private attemptLocalFallback(): void {
  console.log('🔄 Attempting localhost fallback...');
  this.checkTVDevice('localhost', 8000);
}
```

### Development vs Production
```typescript
// Environment-specific port behavior
private getPortConfiguration(): PortConfig {
  if (this.isDevelopmentMode()) {
    return {
      primary: 8000,
      discovery: [8000], // Simplified for dev
      fallback: 'localhost'
    };
  } else {
    return {
      primary: 8000,
      discovery: [5544, 5545, 5546, 5547], // Full scan for prod
      fallback: 'network'
    };
  }
}
```

## 📊 Port Performance & Monitoring

### Connection Metrics
```
Port 8000:  Primary communication (low latency required)
Port 5544:  Discovery endpoint (timeout: 2s)
Port 5545:  Discovery endpoint (timeout: 2s)  
Port 5546:  Discovery endpoint (timeout: 2s)
Port 5547:  Discovery endpoint (timeout: 2s)
```

### Traffic Analysis
```
Discovery Phase:  High connection attempts, quick disconnect
Communication:    Persistent WebSocket, bi-directional data
Control Commands: Low latency, immediate response required
Data Transfer:    Medium payload, reliable delivery needed
```

## 🚀 Production Deployment Considerations

### Firewall Configuration
```
Required Open Ports:
├── 8000  → WebSocket communication
├── 5544  → Device discovery  
├── 5545  → Device discovery
├── 5546  → Device discovery
├── 5547  → Device discovery
├── 4202  → Remote App (development only)
└── 4203  → TV App (development only)
```

### Network Requirements
```
Bandwidth:      Minimal (WebSocket text messages)
Latency:        <100ms for responsive control
Reliability:    TCP-based WebSocket connection
Security:       Local network only (no external access)
Compatibility:  WebSocket support required
```

## ✅ Port Configuration Status

### Implementation Verification
- [x] **Multi-port WebSocket server**: 5 ports operational
- [x] **Discovery algorithm**: Network scanning implemented
- [x] **Auto-connect logic**: Sophisticated RxJS observables
- [x] **Error handling**: Robust fallback mechanisms
- [x] **Development support**: Localhost fallback working
- [x] **Production ready**: Network discovery operational

### Build Verification
- [x] **Remote App**: Builds successfully with discovery logic
- [x] **TV App**: Builds successfully with WebSocket reception
- [x] **Server Script**: Multi-port server operational
- [x] **Protocol Support**: All message types implemented

**Status**: Port configuration complete and fully operational! 🎉
