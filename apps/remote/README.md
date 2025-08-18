# Remote Application

Control interface and data owner connected to the Unified Server.

## 🎯 Purpose

The Remote application serves as the **data owner** and **enhanced UI** in the direct communication architecture. It manages all content data and provides an intuitive remote control interface for the TV display.

**Role**: Data Owner and Control Interface
- **WebSocket Client**: Connects to Unified Server `/ws`
- **Data Owner**: Seeds server FSM with data on connect
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
1. **Data Management**: Maintains dataset; seeds server on connect
2. **Navigation Control**: Sends navigation commands to server
3. **Video Control**: Sends playback commands to server (ack-gated)
4. **Resilience**: Reconnect/backoff via shared base service


---

*Part of the SAHAR TV Remote Control System*  
*For complete documentation, see [../../README.md](../../README.md)*
