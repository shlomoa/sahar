# Remote Application

Control interface connected to the Unified Server.

## 🎯 Purpose

The Remote application serves as the **control interface** in the Unified Server architecture. It provides an intuitive remote control interface for the TV display, sending navigation and playback commands to the server. Content data is fetched via HTTP from the server's Content API.

**Role**: Control Interface
- **WebSocket Client**: Connects to Unified Server `/ws`
- **Content Consumer**: Fetches catalog via HTTP Content API on startup
- **Enhanced UI**: Mobile-optimized Material Design interface
- **Remote Control**: Sends navigation and control commands (ack-gated)

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server (app only)
ng serve --port 4202

# Build for production
ng build --configuration production
```

**Access**: http://localhost:4202 (dev app server)

## 🏗️ Architecture Overview

*For complete system architecture, see [../../ARCHITECTURE.md](../../ARCHITECTURE.md)*

### Remote App Role (Unified Server model)
See the canonical communication schema and details in ARCHITECTURE.md:
- [System Components & Architecture Diagram](../../ARCHITECTURE.md#2-system-components--architecture-diagram)
- [Unified Communication Protocol](../../ARCHITECTURE.md#4-unified-communication-protocol)
- [Network Architecture & Discovery](../../ARCHITECTURE.md#6-network-architecture--discovery)

Note:
- QR onboarding and any QR rendering should use `angularx-qrcode` in Angular components
	- Package: https://www.npmjs.com/package/angularx-qrcode

### Key Responsibilities
1. **Content Fetching**: Fetches catalog via HTTP GET /api/content/catalog on startup
2. **Navigation Control**: Sends navigation commands to server
3. **Video Control**: Sends playback commands to server (ack-gated)
4. **Resilience**: Reconnect/backoff via shared base service


---

*Part of the SAHAR TV Remote Control System*  
*For complete documentation, see [../../README.md](../../README.md)*
