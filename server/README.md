# Unified Server

Node.js server with Express and WebSocket, owning the authoritative Finite State Machine (FSM).

## 🎯 Purpose

The Unified Server is the **central authority** in the SAHAR TV Remote Control System. It owns all application state via a server-side FSM, serves both TV and Remote Angular applications, and manages WebSocket communication using Protocol v3.0 (Stop-and-Wait).

**Role**: Centralized State Authority
- **HTTP Server**: Express serving static Angular apps and Content API
- **WebSocket Server**: Manages `/ws` connections using the `ws` library
- **FSM Owner**: Authoritative state machine with versioned state snapshots
- **Content API**: HTTP endpoint serving catalog data

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Build (compiles TypeScript and prepares Angular apps)
npm run build

# Start server
npm start
```

**Server URL**: http://localhost:8080
**WebSocket**: ws://localhost:8080/ws

## 🏗️ Architecture Overview

*For complete system architecture, see [../ARCHITECTURE.md](../ARCHITECTURE.md)*

### Server Role (Unified Model)
See the canonical architecture details in ARCHITECTURE.md:
- [System Components & Architecture Diagram](../ARCHITECTURE.md#2-system-components--architecture-diagram)
- [Unified Communication Protocol](../ARCHITECTURE.md#4-unified-communication-protocol)
- [Server App: Unified Node.js Server](../ARCHITECTURE.md#server-app-unified-nodejs-server)

### Key Responsibilities
1. **State Authority**: FSM owns all state (navigation, player, clients, version)
2. **HTTP Serving**: 
   - Static apps: `/tv` (TV app), `/remote` (Remote app)
   - Content API: `GET /api/content/catalog` (catalog JSON)
   - Health endpoints: `/live`, `/ready`, `/health`
   - Host IP helper: `/host-ip` (for QR code generation)
3. **WebSocket Management**: 
   - Client registration and lifecycle
   - Protocol v3.0 Stop-and-Wait (ACK-gated broadcasts)
   - Message validation and routing
4. **Content Serving**: Catalog initialized from `mock-data.ts`, served via HTTP

## 📁 Project Structure

```
server/
├── src/
│   ├── main.ts                              # Server bootstrap & orchestration
│   ├── fsm.ts                               # Finite State Machine (authoritative state)
│   ├── mock-data.ts                         # Catalog initialization data
│   ├── services/
│   │   ├── http.service.ts                  # HTTP endpoint handlers
│   │   └── server-websocket.service.ts      # WebSocket connection & message handling
│   └── utils/
│       └── host-ip.ts                       # Host IP resolution utility
├── tests/
│   ├── fsm.test.ts                          # FSM unit tests
│   └── host-ip.test.ts                      # Host IP helper tests
├── package.json                             # Dependencies and scripts
└── tsconfig.*.json                          # TypeScript configurations
```

**For detailed service architecture, implementation specifics, and usage examples, see:**
- [IMPLEMENTATION.md - Server Architecture](../IMPLEMENTATION.md#server-architecture---service-extraction-completed-2025-10-26)
- [ARCHITECTURE.md - System Components](../ARCHITECTURE.md#2-system-components--architecture-diagram)

## 🔌 Endpoints

### HTTP Endpoints

#### Static Apps
- `GET /tv` - TV application (production build)
- `GET /remote` - Remote application (production build)
- `GET /` - Redirects to `/remote`

#### Content API
- `GET /api/content/catalog` - Returns catalog JSON (`{ performers, videos, scenes }`)

#### Health & Monitoring
- `GET /live` - Liveness check (always 200 OK)
- `GET /ready` - Readiness check (200 when WebSocket server ready)
- `GET /health` - Health status with FSM state and client count

#### Utility
- `GET /host-ip` - Returns server's best host IP for QR code generation

#### Deprecated
- `POST /seed` - Returns 410 Gone (deprecated in Phase 3, use HTTP Content API)

### WebSocket Endpoint
- `WS /ws` - WebSocket connection for Protocol v3.0 communication

## 📡 Protocol v3.0 (Stop-and-Wait)

**Message Flow**:
1. Client connects and sends `register` with `{ clientType, deviceId }`
2. Server ACKs registration and sends initial `state_sync`
3. Client ACKs `state_sync` with version: `{ msgType: 'ack', version }`
4. Server waits for all client ACKs before broadcasting next state change
5. Commands (`navigation_command`, `control_command`) are validated and processed
6. Server broadcasts updated state only after all clients ACK previous version

**Key Features**:
- Versioned state snapshots (monotonic version counter)
- ACK-gated broadcasts (no new broadcast until all clients ACK)
- Client-type uniqueness enforcement (one TV, one Remote)
- Automatic retry with timeout for missed ACKs
- Heartbeat monitoring

See [ARCHITECTURE.md - Protocol v3.0](../ARCHITECTURE.md#4-unified-communication-protocol) for complete details.

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Full validation suite (from repo root)
npm run quick:dev -w validation
```

## 🔧 Configuration

**Port**: Default 8080 (configured in `WEBSOCKET_CONFIG`)
**ACK Timeout**: 5000ms (configurable in `WEBSOCKET_CONFIG`)
**Log Format**: Structured JSON with component metadata

See `shared/shared/src/lib/models/websocket-protocol.ts` for protocol constants.

## 📊 State Management

The FSM (`fsm.ts`) owns:
- **Version**: Monotonic counter (incremented on mutations)
- **FSM State**: System readiness (`initializing`, `ready`, `error`)
- **Navigation**: Current level and IDs (performers/videos/scenes)
- **Player**: Playback state (isPlaying, currentTime, volume, mute/fullscreen flags)
- **Clients**: Connection states (TV/Remote online/offline)
- **Catalog**: Private field (not in ApplicationState, served via HTTP)

State mutations happen only through FSM methods:
- `registerClient(clientType)`
- `updateClientState(clientType, isConnected)`
- `navigate(action, targetId?)`
- `controlPlayer(action, data?)`

## 🔍 Logging

All logs are structured JSON:
```json
{
  "timestamp": "2025-10-21T12:34:56.789Z",
  "level": "info",
  "component": "server",
  "event": "client_registered",
  "data": { "clientType": "tv", "deviceId": "tv-abc123" }
}
```

**Log Levels**: `info`, `warn`, `error`
**Key Events**: 
- `server_start`, `client_registered`, `client_disconnected`
- `state_broadcast`, `state_broadcast_ack_timeout`
- `navigation_command_received`, `control_command_received`
- `fsm_state_change`, `fsm_get_snapshot`

## 🚀 Deployment

See [../DEPLOYMENT.md](../DEPLOYMENT.md) for production deployment guide.

**Build Process**:
1. Build shared library: `npm run build -w shared`
2. Install shared in server: `npm install ../shared/dist/shared --save` (from server dir)
3. Build TV and Remote apps with production config
4. Build server: `npm run build` (in server dir)
5. Start: `npm start`

---

*Part of the SAHAR TV Remote Control System*  
*For complete documentation, see [../README.md](../README.md)*
