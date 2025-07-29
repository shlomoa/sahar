# Shared Components

Shared data models and communication protocols for the Sahar TV Remote Control System. Ensures type safety and consistency across TV and Remote applications.

## 🎯 Purpose
- **Common Data Structures**: Unified models for performers, videos, and scenes
- **WebSocket Protocol**: Type-safe communication interface definitions
- **Type Safety**: TypeScript interfaces for compile-time validation
- **Protocol Documentation**: Complete communication specifications

## 📁 Structure
```
shared/
├── models/
│   └── video-navigation.ts        # Hierarchical content structure
└── websocket/
    └── websocket-protocol.ts       # Communication protocol types
```

## 📊 Data Models (`/models/`)

### Video Navigation Structure
```typescript
// 4 Performers → 11 Videos → 44 Scenes hierarchy
export interface Performer {
  id: string;
  name: string;
  thumbnail: string;
  videos: Video[];
}

export interface Video {
  id: string;
  title: string;
  thumbnail: string;
  performerId: string;
  scenes: Scene[];
}

export interface Scene {
  id: string;
  title: string;
  thumbnail: string;
  videoId: string;
  duration: string;
  videoUrl?: string;
}
```

### Current Implementation
- **4 Performers**: Artist One, Artist Two, Artist Three, Artist Four
- **11 Videos per Performer**: Performance collections with unique themes
- **44 Total Scenes**: Individual video segments with metadata
- **Hierarchical Navigation**: Parent-child relationships maintained

## 🌐 WebSocket Protocol (`/websocket/`)

### Message Types
```typescript
// Navigation Commands
export type NavigationMessage = 
  | { type: 'NAVIGATE_TO_PERFORMER'; performerId: string }
  | { type: 'NAVIGATE_TO_VIDEO'; videoId: string }
  | { type: 'NAVIGATE_TO_SCENE'; sceneId: string };

// Control Commands  
export type ControlMessage =
  | { type: 'PLAY_VIDEO'; sceneId: string }
  | { type: 'PAUSE_VIDEO' }
  | { type: 'VOLUME_CHANGE'; level: number }
  | { type: 'PREVIOUS_SCENE' }
  | { type: 'NEXT_SCENE' }
  | { type: 'FULLSCREEN_TOGGLE' };

// Status Updates
export type StatusMessage =
  | { type: 'NAVIGATION_UPDATE'; currentView: string; selectedItem: object }
  | { type: 'TV_STATUS'; status: 'ready' | 'playing' | 'paused' }
  | { type: 'CONNECTION_STATUS'; status: 'connected' | 'disconnected' };

// Device Discovery
export type DiscoveryMessage =
  | { type: 'DEVICE_DISCOVERY'; deviceInfo: DeviceInfo }
  | { type: 'DEVICE_RESPONSE'; tvInfo: TVInfo }
  | { type: 'CONNECTION_REQUEST'; remoteInfo: RemoteInfo };
```

### Device Information
```typescript
export interface DeviceInfo {
  id: string;
  name: string;
  type: 'tv' | 'remote';
  ipAddress: string;
  port: number;
  capabilities: string[];
}

export interface TVInfo extends DeviceInfo {
  type: 'tv';
  screenResolution: string;
  supportedFormats: string[];
}

export interface RemoteInfo extends DeviceInfo {
  type: 'remote';
  deviceModel: string;
  touchCapabilities: boolean;
}
```

## 🔄 Communication Flow

### 1. Device Discovery (UDP Broadcast)
```typescript
// Remote broadcasts on LAN
const discoveryMessage: DiscoveryMessage = {
  type: 'DEVICE_DISCOVERY',
  deviceInfo: {
    id: 'remote-001',
    name: 'iPad Remote',
    type: 'remote',
    ipAddress: '192.168.1.100',
    port: 0,
    capabilities: ['touch', 'enhanced-controls']
  }
};

// TV responds with info
const responseMessage: DiscoveryMessage = {
  type: 'DEVICE_RESPONSE', 
  tvInfo: {
    id: 'tv-001',
    name: 'Living Room TV',
    type: 'tv',
    ipAddress: '192.168.1.101',
    port: 8000,
    capabilities: ['video-streaming', 'websocket'],
    screenResolution: '1920x1080',
    supportedFormats: ['mp4', 'webm']
  }
};
```

### 2. WebSocket Connection Establishment
```typescript
// Connection request from remote
const connectionRequest: DiscoveryMessage = {
  type: 'CONNECTION_REQUEST',
  remoteInfo: { /* remote device info */ }
};

// Connection status updates
const statusUpdate: StatusMessage = {
  type: 'CONNECTION_STATUS',
  status: 'connected'
};
```

### 3. Synchronized Navigation
```typescript
// Remote sends navigation command
const navigationCommand: NavigationMessage = {
  type: 'NAVIGATE_TO_PERFORMER',
  performerId: 'performer-1'
};

// TV confirms navigation update
const navigationUpdate: StatusMessage = {
  type: 'NAVIGATION_UPDATE',
  currentView: 'performers',
  selectedItem: { id: 'performer-1', name: 'Artist One' }
};
```

### 4. Enhanced Video Controls
```typescript
// Scene selection triggers enhanced controls
const sceneSelection: NavigationMessage = {
  type: 'NAVIGATE_TO_SCENE', 
  sceneId: 'scene-1-1-1'
};

// Remote sends control commands
const playCommand: ControlMessage = {
  type: 'PLAY_VIDEO',
  sceneId: 'scene-1-1-1'  
};

const volumeCommand: ControlMessage = {
  type: 'VOLUME_CHANGE',
  level: 75
};
```

## ✅ Protocol Features

### Type Safety
- **Compile-time Validation**: TypeScript interfaces prevent runtime errors
- **Exhaustive Checking**: Union types ensure all cases handled
- **IntelliSense Support**: IDE autocomplete for protocol messages

### Error Handling
```typescript
export interface ErrorMessage {
  type: 'ERROR';
  code: string;
  message: string;
  timestamp: string;
}

export type WebSocketMessage = 
  | NavigationMessage 
  | ControlMessage 
  | StatusMessage 
  | DiscoveryMessage 
  | ErrorMessage;
```

### Versioning
```typescript
export interface ProtocolInfo {
  version: '1.0.0';
  supportedMessages: string[];
  capabilities: string[];
}
```

## 🚀 Usage Examples

### In TV Application
```typescript
import { NavigationMessage, StatusMessage } from '../../shared/websocket/websocket-protocol';
import { VideoNavigationService } from '../services/video-navigation.service';

// Handle incoming navigation commands
handleNavigationMessage(message: NavigationMessage) {
  switch (message.type) {
    case 'NAVIGATE_TO_PERFORMER':
      this.navigationService.navigateToPerformer(message.performerId);
      break;
    case 'NAVIGATE_TO_VIDEO':
      this.navigationService.navigateToVideo(message.videoId);
      break;
    case 'NAVIGATE_TO_SCENE':
      this.navigationService.navigateToScene(message.sceneId);
      break;
  }
}
```

### In Remote Application
```typescript
import { ControlMessage, DiscoveryMessage } from '../../shared/websocket/websocket-protocol';
import { WebSocketService } from '../services/websocket.service';

// Send enhanced video controls
sendPlayCommand(sceneId: string) {
  const message: ControlMessage = {
    type: 'PLAY_VIDEO',
    sceneId
  };
  this.websocketService.send(message);
}
```

## 🔧 Benefits

### Development Efficiency
- **Code Reuse**: Single source of truth for data structures
- **Type Safety**: Prevents runtime errors from invalid messages
- **Documentation**: Self-documenting protocol through TypeScript

### Maintainability  
- **Centralized Protocol**: Changes made in one place
- **Version Control**: Track protocol evolution
- **Compatibility**: Ensure consistent communication

### Quality Assurance
- **Compile-time Checks**: Catch errors before runtime
- **IntelliSense**: IDE support for faster development
- **Testing**: Mock objects follow real interfaces

---

*Shared foundation for the Sahar TV Remote Control System - Ensuring type-safe, consistent communication between TV and Remote applications*
