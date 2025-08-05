# SAHAR TV Remote Control System 📺

*Real-time synchronized TV and tablet remote control system with direct WebSocket communication.*

## 🎯 Overview

A sophisticated Angular-based remote control system featuring direct TV-Remote communication, YouTube video integration, and real-time synchronization. The system uses WebSocket Protocol v2.0 for seamless device communication without external dependencies.

### Key Features
- **Direct Communication**: TV acts as WebSocket server, Remote connects as client  
- **Auto Discovery**: Remote automatically finds and connects to TV devices
- **Real-time Sync**: Navigation and playback state synchronized between devices
- **YouTube Integration**: Scene-based video playbook with automatic seeking and dynamic thumbnail calculation
- **Material Design**: Modern, responsive interfaces optimized for each device
- **No External Dependencies**: Self-contained system requiring only local network
- **Dynamic Thumbnails**: YouTube video thumbnails calculated dynamically using @angular/youtube-player

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Angular CLI 20+
- Local WiFi network

### Installation
```bash
# Install dependencies
cd apps/tv && npm install
cd ../remote && npm install
```

### Run Applications
```bash
# Start TV App (Terminal 1)
cd apps/tv && ng serve --port 4203

# Start Remote App (Terminal 2)  
cd apps/remote && ng serve --port 4202
```

### Access Points
- **TV Display**: http://localhost:4203
- **Remote Control**: http://localhost:4202

## 🏗️ Architecture

### System Components
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

### Core Principles
1. **Single Source of Truth**: Remote app owns all content data
2. **TV as Display**: TV app receives and displays data from Remote
3. **Direct Connection**: No external servers or dependencies
4. **Real-time Sync**: Navigation state synchronized via WebSocket

## 📱 Applications

### TV Application (`apps/tv/`)
**Role**: Display and Video Player
- **Technology**: Angular 20+ with Material Design
- **Bundle Size**: 500.27 kB (122.65 kB compressed)
- **Features**:
  - WebSocket server on ports 5544-5547
  - YouTube video player integration (@angular/youtube-player)
  - Dynamic YouTube thumbnail calculation
  - Receives all data from Remote app
  - Large-screen optimized Material Design interface
  - Scene-based video seeking and playback
  - Shared service architecture with consolidated utilities

### Remote Application (`apps/remote/`)  
**Role**: Control Interface and Data Owner
- **Technology**: Angular 20+ with Material Design  
- **Bundle Size**: 497.86 kB (120.15 kB compressed)
- **Features**:
  - Owns all performers/videos/scenes data
  - Network discovery and auto-connection
  - Touch-optimized tablet interface
  - Enhanced video controls during playback
  - Real-time command dispatch to TV
  - Dynamic YouTube thumbnail integration
  - Shared service architecture with optimized utilities

## 🎬 Content Structure

### Hierarchical Data Model
- **4 Performers**: Top-level content creators
- **11 Videos**: Video collections per performer  
- **44 Scenes**: Individual scenes within videos with timestamps
- **Enhanced Controls**: Additional navigation during video playback

### Video Integration
```typescript
interface Video {
  id: string;
  title: string;
  url: string;              // Full YouTube URL
  youtubeId: string;        // Extracted YouTube video ID
  likedScenes: Scene[];     // Renamed from scenes
}

interface Scene {
  id: string;
  title: string;
  startTime: number;        // Seconds for YouTube seeking
  endTime?: number;
  // thumbnail removed - calculated dynamically from YouTube
}

// Dynamic thumbnail calculation
function getVideoThumbnail(videoUrl: string): string {
  const videoId = extractYouTubeId(videoUrl);
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}
```

## 🔌 Communication Protocol

### WebSocket Protocol v2.0
- **Transport**: WebSocket over TCP
- **Format**: JSON messages
- **Connection**: Direct TV ↔ Remote (no external server)

### Key Message Types
```typescript
// Discovery (Remote → TV)
{ type: 'discovery', payload: { deviceType: 'remote', protocolVersion: '2.0' } }

// Data Transfer (Remote → TV)  
{ type: 'data', payload: { performers: [...], dataVersion: '1.0' } }

// Navigation (Remote → TV)
{ type: 'navigation', payload: { action: 'navigate_to_scene', targetId: 'scene-1' } }

// Status (TV → Remote)
{ type: 'status', payload: { currentState: {...}, playerState: {...} } }
```

## 🌐 Network Architecture

### Connection Flow
1. **TV Startup**: WebSocket server starts on first available port (5544-5547)
2. **Remote Discovery**: Network scan finds TV's WebSocket server
3. **Direct Connection**: WebSocket connection established  
4. **Data Transfer**: Remote sends complete data payload to TV
5. **Navigation Sync**: Real-time command synchronization
6. **Video Control**: Scene-based YouTube playback coordination

### Performance Characteristics
- **Discovery Time**: <10 seconds for TV detection
- **Connection Latency**: <50ms for WebSocket commands
- **Bundle Sizes**: ~500KB each app (production optimized)
- **Network Usage**: 1-10KB per message, minimal bandwidth

## 🧪 Testing

### Manual Testing Checklist
- [ ] **Connection**: Remote discovers and connects to TV
- [ ] **Data Sync**: Both apps display synchronized performers grid
- [ ] **Navigation**: Performer → Videos → Scenes navigation works
- [ ] **Video Playback**: Scene selection triggers YouTube player on TV
- [ ] **Enhanced Controls**: Remote shows video controls during playback
- [ ] **Error Handling**: Network disconnection and reconnection works

### Build Verification
```bash
# Test builds
cd apps/tv && ng build       # Should complete successfully  
cd apps/remote && ng build   # Should complete successfully
```

## 📖 Documentation

### Complete Documentation Suite
- **[ARCHITECTURE.md](./ARCHITECTURE.md)**: Complete technical architecture and implementation details
- **[PROTOCOL.md](./PROTOCOL.md)**: WebSocket communication protocol specification  
- **[DEPLOYMENT.md](./DEPLOYMENT.md)**: Deployment guide, testing procedures, and troubleshooting
- **[VERIFICATION-RESULTS.md](./VERIFICATION-RESULTS.md)**: Implementation status and verification results

## 🛠️ Development

### Technology Stack
- **Frontend**: Angular 20+ with Standalone Components
- **UI Framework**: Angular Material 20.1.3
- **Communication**: Native WebSocket API
- **Video**: YouTube Player API (@angular/youtube-player)
- **Reactive Programming**: RxJS for async operations
- **Styling**: SCSS with Material Design theming

### Development Workflow
```bash
# Development with live reload
cd apps/tv && ng serve --port 4203 --host 0.0.0.0
cd apps/remote && ng serve --port 4202 --host 0.0.0.0

# Production builds
cd apps/tv && ng build --configuration production
cd apps/remote && ng build --configuration production
```

## 🔧 System Requirements

### Minimum Requirements
- **Network**: Local WiFi (TV and Remote on same subnet)
- **Browser**: Modern WebSocket support (Chrome 88+, Firefox 85+, Safari 14+)
- **TV Device**: Any device capable of running Angular web application
- **Remote Device**: Tablet or smartphone with touch interface

### Recommended Setup
- **TV**: Large screen display (32"+ recommended)
- **Remote**: iPad or Android tablet (10"+ recommended)  
- **Network**: 5GHz WiFi for optimal performance
- **Bandwidth**: Minimal (1-10KB per WebSocket message)

## 🚀 Production Deployment

### Build for Production
```bash
# Build both applications
cd apps/tv && ng build --configuration production     # 500.27 kB bundle
cd apps/remote && ng build --configuration production # 497.86 kB bundle
```

### Deployment Options
- **Development**: Angular CLI dev server (ng serve)
- **Production**: Static web server (nginx, Apache, http-server)
- **Smart TV**: Package as platform-specific apps (Tizen, webOS, Android TV)
- **Progressive Web App**: PWA deployment for mobile devices

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**SAHAR TV Remote** - Transforming smart TV control with real-time synchronization 🚀

*For detailed technical information, see the complete documentation suite in [ARCHITECTURE.md](./ARCHITECTURE.md), [PROTOCOL.md](./PROTOCOL.md), and [DEPLOYMENT.md](./DEPLOYMENT.md)*
