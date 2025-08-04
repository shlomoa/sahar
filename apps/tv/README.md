# TV Application

*WebSocket server and display component of the SAHAR TV Remote Control System.*

## 🎯 Purpose

The TV application serves as the **WebSocket server** and **display component** in the direct communication architecture. It receives all content data from the Remote app and provides video playback capabilities.

**Role**: Display and Video Player
- **WebSocket Server**: Listens on ports 5544-5547 for Remote connections
- **Data Receiver**: Receives all content data from Remote app (no local data)
- **Video Player**: YouTube integration with scene-based seeking
- **Display Interface**: Large-screen optimized Material Design UI

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
ng serve --port 4203

# Build for production
ng build --configuration production
```

**Access**: http://localhost:4203

## 🏗️ Architecture Overview

*For complete system architecture, see [../../ARCHITECTURE.md](../../ARCHITECTURE.md)*

### TV App Role in Direct Communication
```
┌─────────────────┐    WebSocket     ┌─────────────────┐
│   Remote App    │◄──────────────►  │     TV App      │
│  (Data Owner)   │   Protocol v2.0  │ (Display/Player)│
│   Port: 4202    │                  │   Port: 4203    │
│                 │                  │                 │
│ • All Data      │ ──── Sends ────► │ • Receives Data │
│ • Discovery     │      Content     │ • Shows Grid    │
│ • Enhanced UI   │                  │ • Plays Videos  │
│                 │ ◄── Confirms ─── │ • WebSocket     │
│                 │      State       │   Server        │
└─────────────────┘                  └─────────────────┘
```

### Key Responsibilities
1. **WebSocket Server**: Auto-starts on first available port (5544-5547)
2. **Data Reception**: Receives complete performers/videos/scenes from Remote
3. **Content Display**: Shows synchronized navigation grids
4. **Video Playback**: YouTube player with @angular/youtube-player
5. **State Synchronization**: Confirms navigation changes to Remote

---

*Part of the SAHAR TV Remote Control System*  
*For complete documentation, see [../../README.md](../../README.md)*
