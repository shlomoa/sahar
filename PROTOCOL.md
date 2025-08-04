# SAHAR TV Remote - WebSocket Communication Protocol

*This is the definitive source of truth for communication protocol.*

## 📋 Protocol Specification

**Version**: 2.0  
**Transport**: WebSocket over TCP  
**Format**: JSON Messages  
**Architecture**: Direct TV ↔ Remote Communication  

## 🔌 Connection Architecture

### Direct Communication Model
```
┌─────────────────┐         ┌─────────────────┐
│   Remote App    │  ────>  │     TV App      │
│  (Port 4202)    │         │  (Port 4203)    │
│                 │         │                 │
│ WebSocket       │         │ WebSocket       │
│ Client          │         │ Server          │
│                 │         │ Listening on:   │
│ Discovers TV    │         │ 5544-5547       │
└─────────────────┘         └─────────────────┘
```

### Connection Establishment

#### 1. TV App Initialization
```typescript
// TV starts WebSocket server on first available port
const server = new WebSocket.Server({ 
  port: firstAvailablePort(5544, 5547),
  host: '0.0.0.0'
});

console.log(`📺 TV WebSocket server listening on port ${port}`);
```

#### 2. Remote Network Discovery
```typescript
// Remote scans for TV WebSocket servers
for (let port = 5544; port <= 5547; port++) {
  try {
    const ws = new WebSocket(`ws://${tvIP}:${port}`);
    ws.onopen = () => {
      // Send discovery message
      ws.send(JSON.stringify({
        type: 'discovery',
        timestamp: Date.now(),
        payload: {
          deviceType: 'remote',
          deviceId: 'remote-12345',
          protocolVersion: '2.0'
        }
      }));
    };
  } catch (error) {
    // Try next port
  }
}
```

#### 3. Connection Confirmation
```typescript
// TV responds to discovery
{
  "type": "discovery_response",
  "timestamp": 1722744000000,
  "payload": {
    "deviceType": "tv",
    "deviceId": "tv-67890",
    "status": "ready",
    "protocolVersion": "2.0"
  }
}
```

## 📨 Message Format Specification

### Base Message Structure
```typescript
interface WebSocketMessage {
  type: MessageType;
  timestamp: number;
  payload: any;
  messageId?: string;  // Optional for tracking
}

type MessageType = 
  | 'discovery' 
  | 'discovery_response'
  | 'data'
  | 'navigation' 
  | 'control'
  | 'status'
  | 'error'
  | 'heartbeat';
```

## 🔄 Protocol Messages

### 1. Discovery Messages

#### Discovery Request (Remote → TV)
```json
{
  "type": "discovery",
  "timestamp": 1722744000000,
  "payload": {
    "deviceType": "remote",
    "deviceId": "remote-12345",
    "deviceName": "iPad Remote Control",
    "capabilities": ["navigation", "control", "data"],
    "networkInfo": {
      "ip": "192.168.1.100",
      "port": 4202
    },
    "protocolVersion": "2.0"
  }
}
```

#### Discovery Response (TV → Remote)
```json
{
  "type": "discovery_response", 
  "timestamp": 1722744000000,
  "payload": {
    "deviceType": "tv",
    "deviceId": "tv-67890",
    "deviceName": "Samsung Smart TV",
    "status": "ready",
    "capabilities": ["display", "video", "audio"],
    "networkInfo": {
      "ip": "192.168.1.200",
      "port": 5544
    },
    "protocolVersion": "2.0"
  }
}
```

### 2. Data Transfer Messages

#### Complete Data Transfer (Remote → TV)
```json
{
  "type": "data",
  "timestamp": 1722744000000,
  "payload": {
    "performers": [
      {
        "id": "yuval",
        "name": "Yuval",
        "thumbnail": "yuval-thumb.jpg",
        "videos": [
          {
            "id": "yuval-birthday-song",
            "title": "Birthday Song",
            "youtubeId": "dQw4w9WgXcQ",
            "thumbnail": "video-thumb.jpg",
            "scenes": [
              {
                "id": "scene-1",
                "title": "Opening",
                "startTime": 0,
                "endTime": 45
              },
              {
                "id": "scene-2", 
                "title": "Verse 1",
                "startTime": 45,
                "endTime": 120
              }
            ]
          }
        ]
      }
    ],
    "dataVersion": "1.0",
    "checksum": "abc123def456",
    "totalSize": 1024
  }
}
```

#### Data Confirmation (TV → Remote)
```json
{
  "type": "data_confirmation",
  "timestamp": 1722744000000,
  "payload": {
    "status": "received",
    "dataVersion": "1.0",
    "checksum": "abc123def456",
    "itemsReceived": {
      "performers": 4,
      "videos": 11,
      "scenes": 44
    }
  }
}
```

### 3. Navigation Messages

#### Navigate to Performer (Remote → TV)
```json
{
  "type": "navigation",
  "timestamp": 1722744000000,
  "payload": {
    "action": "navigate_to_performer",
    "targetId": "yuval",
    "targetType": "performer",
    "navigationPath": ["performers", "yuval"]
  }
}
```

#### Navigate to Video (Remote → TV)
```json
{
  "type": "navigation",
  "timestamp": 1722744000000,
  "payload": {
    "action": "navigate_to_video",
    "targetId": "yuval-birthday-song",
    "targetType": "video",
    "parentId": "yuval",
    "navigationPath": ["performers", "yuval", "videos", "yuval-birthday-song"]
  }
}
```

#### Navigate to Scene (Remote → TV)
```json
{
  "type": "navigation",
  "timestamp": 1722744000000,
  "payload": {
    "action": "navigate_to_scene",
    "targetId": "scene-1",
    "targetType": "scene",
    "parentId": "yuval-birthday-song",
    "sceneData": {
      "startTime": 0,
      "endTime": 45,
      "title": "Opening",
      "youtubeId": "dQw4w9WgXcQ"
    },
    "navigationPath": ["performers", "yuval", "videos", "yuval-birthday-song", "scenes", "scene-1"]
  }
}
```

#### Navigation Back (Remote → TV)
```json
{
  "type": "navigation",
  "timestamp": 1722744000000,
  "payload": {
    "action": "navigate_back",
    "currentLevel": "scenes",
    "targetLevel": "videos"
  }
}
```

#### Navigate Home (Remote → TV)
```json
{
  "type": "navigation", 
  "timestamp": 1722744000000,
  "payload": {
    "action": "navigate_home",
    "targetLevel": "performers"
  }
}
```

### 4. Video Control Messages

#### Play Video (Remote → TV)
```json
{
  "type": "control",
  "timestamp": 1722744000000,
  "payload": {
    "action": "play_video",
    "sceneId": "scene-1",
    "youtubeId": "dQw4w9WgXcQ",
    "startTime": 0,
    "autoplay": true
  }
}
```

#### Pause Video (Remote → TV)
```json
{
  "type": "control",
  "timestamp": 1722744000000,
  "payload": {
    "action": "pause_video"
  }
}
```

#### Seek Video (Remote → TV)
```json
{
  "type": "control",
  "timestamp": 1722744000000,
  "payload": {
    "action": "seek_video",
    "seekType": "absolute",
    "time": 120.5
  }
}
```

#### Volume Control (Remote → TV)
```json
{
  "type": "control",
  "timestamp": 1722744000000,
  "payload": {
    "action": "volume_change",
    "volume": 75,
    "muted": false
  }
}
```

#### Scene Navigation (Remote → TV)
```json
{
  "type": "control",
  "timestamp": 1722744000000,
  "payload": {
    "action": "next_scene",
    "currentSceneId": "scene-1",
    "nextSceneId": "scene-2",
    "sceneData": {
      "startTime": 45,
      "endTime": 120,
      "title": "Verse 1"
    }
  }
}
```

### 5. Status Messages

#### Current State (TV → Remote)
```json
{
  "type": "status",
  "timestamp": 1722744000000,
  "payload": {
    "currentState": {
      "level": "scenes",
      "performerId": "yuval",
      "performerName": "Yuval",
      "videoId": "yuval-birthday-song",
      "videoTitle": "Birthday Song",
      "sceneId": "scene-1",
      "sceneTitle": "Opening",
      "breadcrumb": ["Performers", "Yuval", "Birthday Song", "Opening"],
      "canGoBack": true,
      "canGoHome": true
    },
    "playerState": {
      "isPlaying": true,
      "currentTime": 15.5,
      "duration": 180.0,
      "volume": 75,
      "muted": false,
      "youtubeState": "playing"
    },
    "connectionState": {
      "connected": true,
      "lastHeartbeat": 1722744000000
    }
  }
}
```

#### Player State Update (TV → Remote)
```json
{
  "type": "status",
  "timestamp": 1722744000000,
  "payload": {
    "playerState": {
      "isPlaying": false,
      "currentTime": 67.3,
      "duration": 180.0,
      "buffered": 75.2,
      "youtubeState": "paused"
    }
  }
}
```

### 6. Error Messages

#### Command Error (TV → Remote)
```json
{
  "type": "error",
  "timestamp": 1722744000000,
  "payload": {
    "errorCode": "INVALID_SCENE_ID",
    "errorMessage": "Scene 'scene-99' not found in current video",
    "originalMessage": {
      "type": "navigation",
      "payload": { "targetId": "scene-99" }
    },
    "suggestions": ["Check scene ID", "Refresh data"]
  }
}
```

#### Connection Error (Remote → TV)
```json
{
  "type": "error",
  "timestamp": 1722744000000,
  "payload": {
    "errorCode": "CONNECTION_LOST",
    "errorMessage": "WebSocket connection lost",
    "retryAttempt": 2,
    "nextRetryIn": 4000
  }
}
```

### 7. Heartbeat Messages

#### Heartbeat (Bidirectional)
```json
{
  "type": "heartbeat",
  "timestamp": 1722744000000,
  "payload": {
    "deviceId": "remote-12345",
    "status": "alive"
  }
}
```

## 🔄 Connection Management

### Heartbeat Protocol
- **Interval**: 30 seconds
- **Timeout**: 90 seconds (3 missed heartbeats)
- **Recovery**: Automatic reconnection with exponential backoff

### Reconnection Logic
```typescript
class ReconnectionManager {
  private retryIntervals = [1000, 2000, 4000, 8000, 15000, 30000];
  private maxRetries = 6;
  
  async reconnect(attempt: number = 0): Promise<void> {
    if (attempt >= this.maxRetries) {
      throw new Error('Max reconnection attempts exceeded');
    }
    
    const delay = this.retryIntervals[attempt] || 30000;
    await this.delay(delay);
    
    try {
      await this.establishConnection();
    } catch (error) {
      return this.reconnect(attempt + 1);
    }
  }
}
```

### Error Handling Strategy
1. **Invalid Messages**: Log and ignore, send error response
2. **Connection Loss**: Automatic reconnection with user notification
3. **Protocol Mismatch**: Version negotiation or graceful degradation
4. **Data Corruption**: Request data retransmission

## 🛡️ Security Considerations

### Message Validation
```typescript
interface MessageValidator {
  validateMessage(message: any): ValidationResult;
  sanitizePayload(payload: any): any;
  checkMessageSize(message: string): boolean;
}

// Maximum message size: 1MB
const MAX_MESSAGE_SIZE = 1024 * 1024;

// Required fields validation
const REQUIRED_FIELDS = ['type', 'timestamp', 'payload'];
```

### Network Security
- **Local Network Only**: WebSocket server binds to local network interfaces
- **No Authentication**: Designed for trusted local network environment
- **Message Size Limits**: Prevent memory exhaustion attacks
- **Rate Limiting**: Prevent message flooding

## 📊 Performance Characteristics

### Message Processing Targets
- **Latency**: <50ms for command processing
- **Throughput**: 100+ messages per second
- **Message Size**: 1KB typical, 1MB maximum
- **Connection Establishment**: <3 seconds
- **Discovery Time**: <10 seconds

### Network Requirements
- **Bandwidth**: Minimal (1-10KB per message)
- **Protocol Overhead**: ~100 bytes per message
- **Connection Type**: Local WiFi network required
- **Subnet**: TV and Remote must be on same subnet

## 🔍 Debugging and Monitoring

### Message Logging
```typescript
interface MessageLog {
  timestamp: number;
  direction: 'sent' | 'received';
  type: string;
  size: number;
  processingTime?: number;
  error?: string;
}
```

### Connection Monitoring
- **Connection State**: disconnected | connecting | connected | error
- **Last Message**: Timestamp of last received message
- **Round Trip Time**: Latency measurement via heartbeat
- **Message Queue**: Pending outbound messages

### Debug Commands
```json
// Request connection status
{
  "type": "debug",
  "payload": {
    "command": "connection_status"
  }
}

// Request message statistics  
{
  "type": "debug",
  "payload": {
    "command": "message_stats"
  }
}
```

---

*For architecture details, see [ARCHITECTURE.md](./ARCHITECTURE.md)*  
*For deployment guide, see [DEPLOYMENT.md](./DEPLOYMENT.md)*  
*For project overview, see [README.md](./README.md)*
