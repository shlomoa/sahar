# SAHAR TV Remote Control System 📺

*Real-time synchronized TV and Remote controlled by a unified Node.js server (Express + ws) with a server-owned FSM.*

## 🎯 Overview

A centralized, server-driven system where a Unified Server (Node.js + Express + ws) serves the Angular apps and owns all application state via a server-side FSM. Communication follows Protocol v3.0 using a synchronous Stop-and-Wait model; clients are stateless and render based on server `state_sync` updates.

For complete architecture and protocol details, see the single source of truth: [ARCHITECTURE.md](./ARCHITECTURE.md).

### Key Features
- **Unified Server**: Server-side FSM owns state; clients are stateless
- **Auto Discovery**: Remote automatically finds and connects to TV devices
- **Real-time Sync**: Navigation and playback state synchronized between devices
- **YouTube Integration**: Scene-based video playbook with automatic seeking and dynamic thumbnail calculation
- **Material Design**: Modern, responsive interfaces optimized for each device
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
cd apps/tv && ng serve

# Start Remote App (Terminal 2)
cd apps/remote && ng serve
```

### Integrated run and validation
- For end-to-end running and validation flows, see [VALIDATION.md](./VALIDATION.md).

## 🏗️ Architecture

### System Components

For the canonical diagram and detailed component breakdown, see:
- [ARCHITECTURE.md — System Components & Architecture Diagram](./ARCHITECTURE.md#2-system-components--architecture-diagram)

Roles at a glance (details in ARCHITECTURE.md → Application Details):
- [Unified Server](./ARCHITECTURE.md#server-app-unified-nodejs-server): Serves apps, owns the FSM, manages protocol, relays messages.
- [TV Application](./ARCHITECTURE.md#tv-application-appstv): Stateless display/player; renders based on `state_sync` from the server.
- [Remote Application](./ARCHITECTURE.md#remote-application-appsremote): Control and data owner; connects to server and sends commands/data.

Dev ports and discovery are defined here:
- [ARCHITECTURE.md — Network Architecture & Discovery](./ARCHITECTURE.md#6-network-architecture--discovery)

### Core Principles
1. **Single Source of Truth**: Remote app owns all content data
2. **TV as Display**: TV app receives and displays data from Remote
3. **Direct Connection**: No external servers or dependencies
4. **Real-time Sync**: Navigation state synchronized via WebSocket

## 📱 Applications

### TV Application (`apps/tv/`)
**Role**: Display and Video Player
- **Technology**: Angular 20+ with Material Design
- **Summary**:
  - Displays synchronized performers → videos → scenes grids
  - Stateless client that renders UI from server `state_sync` messages
  - YouTube video player integration (@angular/youtube-player) and dynamic thumbnails
  - Large-screen optimized Material Design interface
  - No on-device user controls; all control comes from the Remote
  - See details: [ARCHITECTURE.md — TV Application](./ARCHITECTURE.md#tv-application-appstv)

### Remote Application (`apps/remote/`)  
**Role**: Control Interface and Data Owner
- **Technology**: Angular 20+ with Material Design
- **Summary**:
  - Owns performers/videos/scenes data and provides it to the server on connection
  - Navigates performers → videos → scenes; touch-optimized UI
  - Sends navigation and control commands to the server and provides all playback controls
  - Enhanced video controls during playback and dynamic thumbnail integration
  - See details: [ARCHITECTURE.md — Remote Application](./ARCHITECTURE.md#remote-application-appsremote)

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

- Protocol v3.0 (Stop-and-Wait), centralized server-owned FSM; clients are stateless and render from `state_sync`.
- See architecture and flows: [ARCHITECTURE.md — Unified Communication Protocol](./ARCHITECTURE.md#4-unified-communication-protocol)
- Canonical message types and enums: [shared/websocket/websocket-protocol.ts](./shared/websocket/websocket-protocol.ts)

## 🛠️ Implementation plan & progress

For the authoritative implementation tasks and current progress, see [IMPLEMENTATION.md](./IMPLEMENTATION.md).

## 🌐 Network Architecture
See the authoritative flow and details in: [ARCHITECTURE.md — Network Architecture & Discovery](./ARCHITECTURE.md#6-network-architecture--discovery).

Summary: both clients connect to the unified server; the server owns the FSM, pushes `state_sync` updates, and clients send navigation/control commands using the Stop-and-Wait protocol.

## 🧪 Testing

- For complete validation flows (Environment Check, Start Applications, Integration Tests), see [VALIDATION.md](./VALIDATION.md).

### Build Verification
```bash
# Test builds
cd apps/tv && ng build       # Should complete successfully  
cd apps/remote && ng build   # Should complete successfully
```

## 📖 Documentation

### Complete Documentation Suite
- **[ARCHITECTURE.md](./ARCHITECTURE.md)**: Complete technical architecture and implementation details
- **Unified Communication Protocol (in ARCHITECTURE.md)**: [Protocol v3.0 — Stop-and-Wait](./ARCHITECTURE.md#4-unified-communication-protocol)  
- **[DEPLOYMENT.md](./DEPLOYMENT.md)**: Deployment guide, testing procedures, and troubleshooting
- **[VALIDATION.md](./VALIDATION.md)**: Validation flows, checks, and testing guidance

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
cd apps/tv && ng serve
cd apps/remote && ng serve

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

For development, integrated validation, and production deployment, see: [DEPLOYMENT.md](./DEPLOYMENT.md).

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

*For detailed technical information, see the complete documentation suite in [ARCHITECTURE.md](./ARCHITECTURE.md), [IMPLEMENTATION.md](./IMPLEMENTATION.md), [DEPLOYMENT.md](./DEPLOYMENT.md), and [VALIDATION.md](./VALIDATION.md)*
