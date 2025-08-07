# SAHAR TV Remote - System Architecture

*This is the definitive source of truth for system architecture.*

## 🎯 Overview

The SAHAR TV Remote Control System is a real-time synchronized application suite featuring a central gateway server architecture over WebSocket Protocol v2.0.

### Core Architecture Principles

1. **Gateway Architecture**: A central Node.js server acts as a WebSocket gateway.
2. **State Management**: The gateway server manages the shared application state.
3. **Real-time Sync**: Navigation and playback state synchronized via the WebSocket gateway.
4. **Core Dependency**: Requires a running Node.js gateway server for all communication.

## 🏗️ System Components

### Architecture Diagram
```
┌─────────────────┐      ┌──────────────────────┐      ┌─────────────────┐
│   Remote App    │      │  WebSocket Gateway   │      │     TV App      │
│  (Client)       │      │   (Node.js Server)   │      │  (Client)       │
│   Port: 4202    │      │                      │      │   Port: 4203    │
│                 │      │  Listens on Ports:   │      │                 │
│ WebSocket       │ ◄───►│  5544-5547           │◄───► │ WebSocket       │
│ Client          │      │                      │      │ Client          │
│                 │      │  Relays Messages &   │      │                 │
│ Connects to     │      │  Manages State       │      │ Connects to     │
│ Gateway         │      │                      │      │ Gateway         │
└─────────────────┘      └──────────────────────┘      └─────────────────┘
```

## 📱 Application Details

### TV Application (`apps/tv/`)

**Role**: Display and Video Player (Client)
- **URL**: `http://localhost:4203`
- **WebSocket**: Client, connects to Gateway Server
- **Technology**: Angular 20+ with Material Design
- **Bundle Size**: 500.27 kB (122.65 kB compressed)

**Responsibilities**:
- Connect to the WebSocket Gateway Server ✅ *Implemented*
- Receive all state updates from the Gateway Server ✅ *Implemented*
- Display synchronized performers/videos/scenes grids ✅ *Implemented*
- Play YouTube videos with @angular/youtube-player integration ✅ *Implemented*
- Handle scene-based seeking and playback controls ✅ *Implemented*
- Render display based on the state received from the server ✅ *Implemented*
- Calculate YouTube thumbnails dynamically ✅ *Implemented*

**Key Features**:
- No local data storage (receives everything from Remote) ✅ *Implemented*
- YouTube integration with automatic scene seeking ✅ *Implemented*
- Material Design optimized for large screens ✅ *Implemented*
- Real-time WebSocket command processing ✅ *Implemented*
- Dynamic thumbnail calculation using shared utilities ✅ *Implemented*

### Remote Application (`apps/remote/`)

**Role**: Control Interface (Client)
- **URL**: `http://localhost:4202`  
- **WebSocket**: Client, connects to Gateway Server
- **Technology**: Angular 20+ with Material Design
- **Bundle Size**: 497.86 kB (120.15 kB compressed)

**Responsibilities**:
- Own and manage all performers/videos/scenes data ✅ *Implemented*
- Connect to the WebSocket Gateway Server ✅ *Implemented*
- Establish and maintain WebSocket connection to the Gateway ✅ *Implemented*
- Send complete data sets to the Gateway upon connection ✅ *Implemented*
- Provide touch-optimized navigation interface ✅ *Implemented*
- Dispatch navigation and control commands to the Gateway ✅ *Implemented*
- Show enhanced video controls during scene playback ✅ *Implemented*
- Calculate and display YouTube thumbnails dynamically ✅ *Implemented*

**Key Features**:
- Single source of truth for all content data ✅ *Implemented*
- Automatic TV discovery with exponential backoff retry ✅ *Implemented*
- Material Design optimized for tablet/touch interfaces ✅ *Implemented*
- Enhanced video controls with scene-level interaction ✅ *Implemented*
- Dynamic YouTube thumbnail integration with shared utilities ✅ *Implemented*

## 🔌 Communication Protocol

### Protocol Version: 2.0

**Transport**: WebSocket over TCP  
**Format**: JSON Messages  
**Connection**: Client-Server via Gateway

### Connection Flow

1. **Gateway Startup**: The `websocket-server.js` starts, listening on ports 5544-5547.
2. **Client Connection**: Both TV and Remote apps connect to the Gateway.
3. **State Synchronization**: Gateway sends the current `sharedState` to the new client.
4. **Command Handling**: Remote sends commands to the Gateway.
5. **State Update**: Gateway updates its `sharedState`.
6. **Broadcast**: Gateway broadcasts the new state to ALL connected clients.

### Message Types

```typescript
// Discovery Message (Remote → TV)
{
  "type": "discovery",
  "payload": {
    "deviceType": "remote",
    "deviceId": "remote-12345",
    "protocolVersion": "2.0"
  }
}

// Data Transfer (Remote → TV)
{
  "type": "data", 
  "payload": {
    "performers": [...],
    "dataVersion": "1.0"
  }
}

// Navigation Command (Remote → TV)
{
  "type": "navigation",
  "payload": {
    "action": "navigate_to_scene",
    "targetId": "scene-1",
    "sceneData": { "startTime": 45, "title": "Opening" }
  }
}

// Status Update (TV → Remote)
{
  "type": "status",
  "payload": {
    "currentState": {
      "level": "scenes",
      "performerId": "yuval",
      "videoId": "yuval-birthday-song"
    }
  }
}
```

*For complete protocol specification, see [PROTOCOL.md](./PROTOCOL.md)*

## 🎬 Video Integration

### YouTube Player Architecture

**Component**: @angular/youtube-player (TV app only)
- **Scene-Based Playback**: Automatic seeking to scene start times
- **Enhanced Controls**: Remote provides play/pause/volume/seek commands
- **Responsive Design**: Adapts to TV screen dimensions
- **Error Handling**: Graceful fallbacks for unavailable videos

### Video Data Structure
```typescript
interface Video {
  id: string;
  title: string;
  youtubeId: string;
  scenes: Scene[];
}

interface Scene {
  id: string;
  title: string;
  startTime: number;  // Seconds for YouTube seeking
  endTime?: number;
}
```

## 🌐 Network Architecture

### Port Configuration
- **TV App Development**: 4203 (ng serve)
- **Remote App Development**: 4202 (ng serve)
- **Gateway Server**: `websocket-server.js` listens on 5544-5547.
- **Client Connection**: Remote and TV apps connect directly to the gateway.

### Network Discovery Process
The explicit network discovery/scanning process is no longer needed. Both clients are configured to know the gateway's potential IP (localhost for development) and the port range [5544-5547]. They attempt to connect to these ports sequentially until a connection is established.

## 🔧 Technical Implementation

### Technology Stack
- **Frontend**: Angular 20+ with Standalone Components
- **UI Framework**: Angular Material 20.1.3
- **Communication**: Native WebSocket API
- **Video**: YouTube Player API (@angular/youtube-player)
- **Reactive Programming**: RxJS for async operations
- **Styling**: SCSS with Material Design theming

### State Management
- **Gateway Server**: Manages the complete, shared application state (`sharedState`). This is the single source of truth.
- **Client Apps (TV & Remote)**: Are now stateless display/control layers. They receive state updates from the server and render the UI accordingly.
- **Synchronization**: The server sends a `state_update` message to all clients whenever the state changes.
- **Persistence**: No local storage is required. State is held in memory on the server. On restart, the Remote app must reconnect and send the initial `data` message to repopulate the server's state.

### Performance Characteristics
- **WebSocket Latency**: <50ms target for command processing
- **Discovery Time**: <10 seconds for TV detection
- **Connection Establishment**: <3 seconds target
- **Bundle Sizes**: ~500KB each app (optimized for production)
- **Memory Usage**: <100MB per application

## 🔍 Data Flow Architecture

### Content Data Flow
```
1. Remote App Startup
   ↓
2. Load Performers/Videos/Scenes Data (Local to Remote)
   ↓
3. Network Discovery Scan (Find TV)
   ↓
4. WebSocket Connection Established
   ↓
5. Data Transfer (Remote → TV)
   ↓
6. TV Displays Received Data
   ↓
7. Navigation Commands (Remote → TV)
   ↓
8. Real-time State Sync (Bidirectional)
```

### Navigation State Flow
```
User Interaction (Remote) 
    ↓
Navigation Command Created
    ↓
WebSocket Message Sent (Remote → TV)
    ↓
TV Updates Display State
    ↓
Status Confirmation (TV → Remote)
    ↓
Remote Updates UI State
```

## 🛡️ Error Handling & Resilience

### Connection Resilience
- **Auto-Reconnection**: Exponential backoff retry logic
- **Connection Monitoring**: Heartbeat and timeout detection
- **Graceful Degradation**: UI feedback during connection issues
- **State Recovery**: Navigation state restored after reconnection

### Error Scenarios
- **Network Loss**: Automatic reconnection with user feedback
- **Invalid Commands**: Graceful filtering and error responses
- **Video Errors**: Fallback handling for unavailable YouTube content
- **Discovery Timeout**: User notification and retry options

## 📊 System Requirements

### Minimum Requirements
- **Network**: Local WiFi network (TV and Remote on same subnet)
- **Browser**: Modern WebSocket support (Chrome 88+, Firefox 85+, Safari 14+)
- **TV Display**: Any device capable of running Angular web application
- **Remote Device**: Tablet or smartphone with touch interface

### Recommended Setup
- **TV**: Large screen display (32"+ recommended)
- **Remote**: iPad or Android tablet (10"+ recommended)
- **Network**: 5GHz WiFi for optimal performance
- **Bandwidth**: Minimal (1-10KB per WebSocket message)

---

*For deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)*  
*For protocol details, see [PROTOCOL.md](./PROTOCOL.md)*  
*For project overview, see [README.md](./README.md)*
