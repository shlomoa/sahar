# Remote Application

*Enhanced UI and WebSocket client component of the SAHAR TV Remote Control System.*

## 🎯 Purpose

The Remote application serves as the **data owner** and **enhanced UI** in the direct communication architecture. It manages all content data and provides an intuitive remote control interface for the TV display.

**Role**: Data Owner and Control Interface
- **WebSocket Client**: Connects to TV app on ports 5544-5547
- **Data Owner**: Manages all performers, videos, and scenes data
- **Enhanced UI**: Mobile-optimized Material Design interface
- **Remote Control**: Sends navigation and control commands to TV

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
ng serve --port 4202

# Build for production
ng build --configuration production
```

**Access**: http://localhost:4202

## 🏗️ Architecture Overview

*For complete system architecture, see [../../ARCHITECTURE.md](../../ARCHITECTURE.md)*

### Remote App Role in Direct Communication
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
1. **Data Management**: Maintains complete performers/videos/scenes dataset
2. **TV Discovery**: Automatically discovers TV app WebSocket servers
3. **Content Transfer**: Sends all data to TV on successful connection
4. **Navigation Control**: Commands TV navigation through content
5. **Video Control**: Manages TV video playback commands

---

*Part of the SAHAR TV Remote Control System*  
*For complete documentation, see [../../README.md](../../README.md)*
