# TV Application

Stateless display/player connected to the Unified Server.

## 🎯 Purpose

The TV application serves as the **display/player client** in the Unified Server architecture. It connects over WebSocket to the server, receives all content/state from the server, and provides video playback capabilities.

**Role**: Display and Video Player
- **WebSocket Client**: Connects to Unified Server at `ws://localhost:8080/ws`
- **Data Receiver**: Receives `state_sync` and content from server (no local data)
- **Video Player**: YouTube integration with scene-based seeking
- **Display Interface**: Large-screen optimized Material Design UI

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server (app only)
ng serve --port 4203

# Build for production
ng build --configuration production
```

**Access**: http://localhost:4203 (dev app server)

## 🏗️ Architecture Overview

*For complete system architecture, see [../../ARCHITECTURE.md](../../ARCHITECTURE.md)*

### TV App Role (Unified Server model)
For the canonical communication schema (Remote ↔ Unified Server ↔ TV over `/ws`), see ARCHITECTURE.md:
- [System Components & Architecture Diagram](../../ARCHITECTURE.md#2-system-components--architecture-diagram)
- [Unified Communication Protocol](../../ARCHITECTURE.md#4-unified-communication-protocol)
- [Network Architecture & Discovery](../../ARCHITECTURE.md#6-network-architecture--discovery)

Note:
- QR code rendering (onboarding): use `angularx-qrcode` in Angular components
	- Package: https://www.npmjs.com/package/angularx-qrcode

### Key Responsibilities
1. **WebSocket Client**: Connects to Unified Server `/ws`
2. **Content Display**: Renders navigation grids from server `state_sync`
3. **Video Playback**: YouTube player with @angular/youtube-player
4. **Stateless**: No outbound status; all state owned by server


---

*Part of the SAHAR TV Remote Control System*  
*For complete documentation, see [../../README.md](../../README.md)*
