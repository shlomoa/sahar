# SAHAR TV Remote - System Architecture

*This is the definitive source of truth for system architecture.*

## 🎯 Overview

The SAHAR TV Remote Control System is a real-time synchronized application suite featuring direct TV-Remote communication over WebSocket Protocol v2.0.

### Core Architecture Principles

1. **Direct Communication**: TV acts as WebSocket server, Remote connects as client
2. **Data Ownership**: Remote owns all content data, TV displays received data
3. **Real-time Sync**: Navigation and playback state synchronized via WebSocket
4. **No External Dependencies**: Self-contained system with no external servers required

## 🏗️ System Components

### Architecture Diagram
```
┌─────────────────┐    WebSocket     ┌─────────────────┐
│   Remote App    │◄──────────────►  │     TV App      │
│  (Data Owner)   │   Protocol v2.0  │ (Display/Player)│
│   Port: 4202    │                  │   Port: 4203    │
│                 │                  │                 │
│ • All Data      │ ──── Sends ────► │ • Receives Data │
│ • Navigation    │      Content     │ • Shows Grid    │
│ • Discovery     │                  │ • Plays Videos  │
│ • Enhanced UI   │ ◄── Confirms ─── │ • WebSocket     │
│                 │      State       │   Server        │
└─────────────────┘                  └─────────────────┘
        │                                     │
        └─────── Network Discovery ───────────┘
            (TV listens on ports 5544-5547)
```

## 📱 Application Details

### TV Application (`apps/tv/`)

**Role**: Display and Video Player
- **URL**: `http://localhost:4203`
- **WebSocket**: Server on ports 5544-5547
- **Technology**: Angular 20+ with Material Design
- **Bundle Size**: 500.27 kB (122.65 kB compressed)

**Responsibilities**:
- Start WebSocket server on first available port (5544-5547) ✅ *Implemented*
- Receive all content data from Remote app ✅ *Implemented*
- Display synchronized performers/videos/scenes grids ✅ *Implemented*
- Play YouTube videos with @angular/youtube-player integration ✅ *Implemented*
- Handle scene-based seeking and playback controls ✅ *Implemented*
- Maintain navigation state synchronization ✅ *Implemented*
- Calculate YouTube thumbnails dynamically ✅ *Implemented*

**Key Features**:
- No local data storage (receives everything from Remote) ✅ *Implemented*
- YouTube integration with automatic scene seeking ✅ *Implemented*
- Material Design optimized for large screens ✅ *Implemented*
- Real-time WebSocket command processing ✅ *Implemented*
- Dynamic thumbnail calculation using shared utilities ✅ *Implemented*

### Remote Application (`apps/remote/`)

**Role**: Control Interface and Data Owner
- **URL**: `http://localhost:4202`  
- **WebSocket**: Client with network discovery
- **Technology**: Angular 20+ with Material Design
- **Bundle Size**: 497.86 kB (120.15 kB compressed)

**Responsibilities**:
- Own and manage all performers/videos/scenes data ✅ *Implemented*
- Discover TV devices via network scanning (ports 5544-5547) ✅ *Implemented*
- Establish and maintain WebSocket connection to TV ✅ *Implemented*
- Send complete data sets to TV upon connection ✅ *Implemented*
- Provide touch-optimized navigation interface ✅ *Implemented*
- Dispatch navigation and control commands ✅ *Implemented*
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
**Connection**: Direct TV ↔ Remote (no external server)

### Connection Flow

1. **TV Startup**: WebSocket server starts on first available port (5544-5547)
2. **Remote Discovery**: Network scan finds TV's WebSocket server  
3. **Connection**: Direct WebSocket connection established
4. **Data Transfer**: Remote sends complete data payload to TV
5. **Navigation Sync**: Real-time command synchronization
6. **Video Control**: Scene-based YouTube playback coordination

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
- **TV WebSocket Server**: 5544-5547 (first available)
- **Discovery Scanning**: Remote scans TV on all WebSocket ports

### Network Discovery Process
1. **Port Scanning**: Remote tests WebSocket connections on ports 5544-5547
2. **Connection Testing**: Real WebSocket connection attempts (2s timeout per port)
3. **Auto-Connect**: Successful connection triggers data transfer
4. **Retry Logic**: Exponential backoff (1s, 2s, 4s, 8s, max 30s)
5. **Error Handling**: Graceful fallback and user feedback

## 🔧 Technical Implementation

### Technology Stack
- **Frontend**: Angular 20+ with Standalone Components
- **UI Framework**: Angular Material 20.1.3
- **Communication**: Native WebSocket API
- **Video**: YouTube Player API (@angular/youtube-player)
- **Reactive Programming**: RxJS for async operations
- **Styling**: SCSS with Material Design theming

### State Management
- **Remote App**: Manages complete application state
- **TV App**: Stateless display layer (receives state from Remote)
- **Synchronization**: Real-time state updates via WebSocket
- **Persistence**: No local storage required (Remote is source of truth)

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
