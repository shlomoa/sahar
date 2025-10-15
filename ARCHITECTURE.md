# SAHAR TV Remote - System Architecture

*This is the definitive source of truth for system architecture and protocol.*

## Overview & Core Principles

### [🎯 Overview](/README.md#-overview)

**Core Principles:**
- Unified server architecture (Node.js + Express + ws)
- Centralized state management (server-side FSM)
- Strict protocol adherence for all communications
- Robust recovery from disconnections
- Real-time synchronization between TV and Remote - Navigation state and video playback synchronized via server with WebSocket
- **Single Source of Truth** - everything is done in one place and then referenced: coding, documentation, etc
- Server owns all content data
- **TV as Display**: TV app receives and displays data from Remote
- **Direct Connection**: No external servers or dependencies
- **Real-time Sync**: 
> SSR Note: Angular can render initial HTML on the server; the client then hydrates for interactivity.

## 🏗️ System Components (Apps) & App communication diagram

### Architecture Diagram
```
┌──────────────┐      ┌────────────────────────────┐      ┌──────────────┐
│  Remote App  │      │      Unified Server        │      │   TV App     │
│   (Client)   │      │ (Express + ws + FSM/State) │      │  (Client)    │
│  Angular     │◄────►│  Serves static files,      │◄────►│  Angular     │
│  Port: 4202  │      │  manages protocol, FSM,    │      │  Port: 4203  │
│              │      │  and relays messages       │      │              │
└──────────────┘      └────────────────────────────┘      └──────────────┘
```

Note: 4202/4203 are development SSR ports. In production, a single server port serves both TV (`/`) and Remote (`/remote`).

## Application Details

### Server App (Unified Node.js Server)
- **Role:** Unified static file server and WebSocket gateway
- **Responsibilities:**
  - Serves Angular apps (TV and Remote)
  - Manages shared application state
  - Maintains a finite state machine (FSM) for both remote and TV clients
  - Handles client connections and recovers from disconnections
  - Ensures all communications strictly adhere to the FSM and protocol
  - Relays messages and synchronizes state between clients
  - Own and manage all performers/videos/scenes data
- **Key technologies:** Node.js, TypeScript, Express, ws, state management

Additional serving responsibilities (clarification):
- SSR HTML delivery: Returns server-rendered HTML for TV (`/`) and Remote (`/remote`), followed by client-side hydration.
- Static assets: Serves built browser assets for both apps under their respective paths (for example, `/assets`, `/remote/assets`).
- Development mode: May proxy `/` and `/remote` to each app's `ng serve --ssr` while continuing to host the WebSocket gateway and `/health`.
- Production mode: Executes each app's SSR server bundle to render HTML and serves browser assets directly on the same origin.
- WebSocket gateway: Exposes a single-origin WebSocket endpoint on the same server/port as HTTP(S), managed by the server-side FSM.
- TV route alias (development convenience): The Unified Server may expose `/tv` as an alias to the TV app. The canonical TV route in production is `/`.
- WebSocket endpoint path: `ws(s)://<server-ip>:<port>/ws` (same-origin). Clients should prefer same-origin WS/WSS.
- Health endpoints: `/health` (overall), `/ready` (readiness), and `/live` (liveness) return JSON for monitoring and validation.

### TV Application (`apps/tv/`)

-   **Role**: Display video navigation and play selected YouTube video scene (Client)
-   **URL**: `http://<server-ip>:<port>/tv` (Served by the Unified Server)
-   **WebSocket**: Client, connects to the Unified Server
-   **Technology**: Angular 20+ with Material Design, Angular youtube player, Angular QR code

**Responsibilities**:
-   Connect to the WebSocket Gateway on the Unified Server 🔧 *Refactoring Needed*
-   Publish a QR code as an IP discovery mechanism.
-   Receive all state updates from the Unified Server 🔧 *Refactoring Needed*
-   Display synchronized performers/videos/scenes grids 🔧 *Refactoring Needed*
-   Play YouTube videos with @angular/youtube-player integration 🔧 *Refactoring Needed*
-   Handle scene-based seeking and playback controls 🔧 *Refactoring Needed*
-   Render display based on the state received from the server 🔧 *Refactoring Needed*
-   Calculate YouTube thumbnails dynamically 🔧 *Refactoring Needed*

**Key Features**:
-   No local data storage (receives everything from the server) 🔧 *Refactoring Needed*
-   YouTube integration with automatic scene seeking 🔧 *Refactoring Needed*
-   Material Design optimized for large screens 🔧 *Refactoring Needed*
-   Real-time WebSocket command processing 🔧 *Refactoring Needed*
-   Dynamic thumbnail calculation using shared utilities 🔧 *Refactoring Needed*
-   Displays a QR code with the Remote entrypoint URL to onboard the remote device

### Remote Application (`apps/remote/`)

-   **Role**: Specialized TV Remote Control Interface (Client)
-   **URL**: `http://<server-ip>:<port>/remote` (Served by the Unified Server)
-   **WebSocket**: Client, connects to the Unified Server
-   **Technology**: Angular 20+ with Material Design

**Responsibilities**:
-   Connect to the WebSocket Gateway on the Unified Server 🔧 *Refactoring Needed*
-   Establish and maintain WebSocket connection to the Unified Server 🔧 *Refactoring Needed*
-   Provide touch-optimized navigation interface 🔧 *Refactoring Needed*
-   Dispatch navigation and control commands to the server 🔧 *Refactoring Needed*
-   Show enhanced video controls during scene playback 🔧 *Refactoring Needed*
-   Calculate and display YouTube thumbnails dynamically 🔧 *Refactoring Needed*

**Key Features**:
-   QR code onboarding: scan the TV-displayed QR to open the Remote URL 🔧 *Refactoring Needed*
-   Material Design optimized for tablet/touch interfaces 🔧 *Refactoring Needed*
-   Enhanced video controls with scene-level interaction 🔧 *Refactoring Needed*
-   Dynamic YouTube thumbnail integration with shared utilities 🔧 *Refactoring Needed*

Target Architecture Note (clarification): The server will own content and navigation state; the Remote will evolve toward a pure UI that sends commands and renders server-driven state.

> PWA/HTTPS: Service worker and install require HTTPS in production; when HTTPS is enabled, WebSocket should use WSS.

### SSR Delivery Model (Development and Production)

- Development
    - Each app (TV, Remote) can run with Angular SSR dev server (`ng serve --ssr`) on its dev port.
    - The Unified Server may proxy `/tv` and `/remote` to these SSR dev servers while continuing to host the WebSocket gateway and `/health`.
- Production
    - Each app is built to produce browser and server bundles; the Unified Server serves SSR HTML via the app server bundles and serves browser assets directly.
    - After the first server-rendered response, Angular hydrates on the client to enable full interactivity.
    - SSR execution model: Each app's SSR server bundle runs in a child process with its own port; the Unified Server proxies `/` (TV) and `/remote` to these children and serves browser assets directly on the main origin.

## Unified Communication Protocol

> Note: The Angular SSR delivery model does not alter the WebSocket protocol. The server-owned FSM and synchronous, ack-based communication remain unchanged.

### Protocol Version: 3.0
**Transport:** WebSocket
**Format:** JSON
**Architecture:** Centralized Server with a Finite State Machine (FSM)
**Communication Model:** Synchronous "Stop-and-Wait"

The entire system operates on a strictly synchronous, server-centric communication model. All state is owned by the server's FSM. Clients are stateless and merely reflect the state broadcast by the server.

### Protocol constants (defaults)

[See IMEPLEMENTATION.md for authoritative runtime constants.](./IMPLEMENTATION.md#models-and-constants---protocol-constants)

Notes
- Stop-and-wait allows only one in-flight message per peer; on timeout, the sender treats the connection as lost and reconnects.
- Clients should use same-origin WS/WSS at the fixed path `/ws` unless explicitly configured otherwise.

Configuration Note (2025-08-12)
- Centralized config module (original Task 1.5) retired for Milestone 1 to keep scope lean.
- Only minimal runtime protocol constants are exported via `WEBSOCKET_CONFIG`.
- Validation/stub-only timing & backoff parameters live in `validation/config/validation-config.ts` and are intentionally kept out of production runtime exports.
- Env-driven additions (SSR child ports, HTTPS cert/key paths, log level) will be introduced alongside Tasks 1.6–1.11 & 1.13.

#### Connection and Registration Flow
1.  **Server Startup:** The Unified Server starts, serving the client applications and listening for WebSocket connections on its designated port (e.g., 8080).
2.  **Client Connection:** The TV and Remote apps connect to the server's WebSocket endpoint.
3.  **Client Registration:** Upon connecting, each client **must** send a `register` message to identify itself (e.g., as 'tv' or 'remote'). The server will not accept any other messages from an unregistered client.
4.  **Initial `state_sync`:** After a client successfully registers, the server sends a `state_sync` message containing the complete, current `ApplicationState`. The client then renders its UI based on this state.

#### Synchronous "Stop-and-Wait" Acknowledgement Model
This protocol enforces a strict, lock-step communication flow to guarantee message delivery and order.

1.  **Message Sent:** A sender (client or server) sends a single message.
2.  **Wait for Acknowledgement:** The sender enters a "waiting" state and **must not** send any further messages until it receives an `ack` from the receiver.
3.  **Acknowledgement Received:** Upon receiving the `ack`, the sender is unblocked and can send its next message.
4.  **Timeout:** If the sender does not receive an `ack` within a specified period (`ACK_TIMEOUT`), it must consider the connection lost and initiate reconnection procedures.
5.  **Exception:** The `ack` message is the *only* message that is not acknowledged, which prevents an infinite loop.


#### Key Message Types & Flow Example (`play` command)

**Supported Message Types:**
- `register`, `data`, `navigation_command`, `control_command`, `action_confirmation`, `ack`, `state_sync`, `error`, `heartbeat`

1.  **`control_command` (Remote → Server):** The Remote sends a command to play a video.
    - The Remote is now blocked, awaiting an `ack`.
2.  **`ack` (Server → Remote):** The Server acknowledges receipt of the command.
    - The Remote is now unblocked.
3.  **FSM Update:** The Server processes the command, updates its internal FSM, and identifies that the TV client must perform an action.
4.  **`control_command` (Server → TV):** The Server forwards the `play` command to the TV.
    - The Server is now blocked, awaiting an `ack` from the TV.
5.  **`ack` (TV → Server):** The TV acknowledges receipt of the command.
    - The Server is now unblocked. The TV begins the action (e.g., loading the video).
6.  **`action_confirmation` (TV → Server):** Once the video is actually playing, the TV sends a confirmation.
    - The TV is now blocked, awaiting an `ack`.
7.  **`ack` (Server → TV):** The Server acknowledges the confirmation.
    - The TV is now unblocked.
8.  **`state_sync` (Server → All Clients):** The Server broadcasts the new `ApplicationState` (which now reflects `isPlaying: true`) to all connected clients.
    - The Server is now blocked, awaiting `ack`s from all clients.
9.  **`ack` (Remote → Server) & `ack` (TV → Server):** The clients acknowledge the state update.
    - The Server is now unblocked. The cycle is complete.

#### Error Handling and Connection Management
-   **No Heartbeat:** Client liveness is determined implicitly by the `ack` mechanism. Failure to acknowledge a message within the `ACK_TIMEOUT` window signifies a dead connection.
-   **Disconnection:** If a client disconnects, the server updates its FSM (`connectedClients`) and broadcasts the new state to the remaining client.
-   **Reconnection:** Upon reconnecting, a client simply follows the registration flow again, receiving the latest state from the server.
-   **Invalid Messages:** If the server receives an invalid message (e.g., wrong format, invalid state transition), it will send an `error` message to the originating client and the message will be discarded.

### Server-owned ApplicationState (authoritative schema)

The server owns and broadcasts the full application state. Minimal baseline below; apps may ignore fields they do not need.
[See IMEPLEMNTATION.md](./ARCHITECTURE.md#sahar-tv-remote---Server-Side-ApplicationState-authoritative-schema) for the authoritative schema and field descriptions.

State rules
- The server increments `version` after an acknowledged state mutation.
- Clients render based on the latest `state_sync` and treat their local UI state as derived.
- The Remote issues commands that trigger state transitions; only the server commits them.

### Structured logging (pointer)
- For the authoritative logging schema and event taxonomy, see IMPLEMENTATION.md → "Structured Logging (Server + Stubs)". The canonical format uses ISO timestamps and levels including "critical".

**Note:** All constant names (e.g., `INVALID_REGISTRATION`, `ACK_TIMEOUT`, `TV_DEV_PORT`) in documentation match those in code.

## Video Integration

Authoritative types and data structures are defined in [IMPLEMENTATION.md — Video Integration](./IMPLEMENTATION.md#video-integration).

### YouTube Player Architecture
- Scene-based playback (automatic seeking)
- Enhanced controls (play/pause/volume/seek)
- Responsive design for TV
- Error handling for unavailable videos

## Network Architecture & Discovery

### Development Network Solution
- **Discovery (development):** The 5544–5547 range may be used by clients for discovery/scanning.
- **TV App Development:** 4203 (ng serve)
- **Remote App Development:** 4202 (ng serve)

### Production Ports
- **Unified Server:** Single port (configurable, e.g., 8080) serves `/` (TV), `/remote`, static assets, and the WebSocket endpoint on the same origin.
- **Discovery:** Primary onboarding is QR-based; the TV displays a QR that encodes the absolute Remote URL. Optional fallbacks include mDNS hints or manual URL entry; port scanning is not used in the normal flow.

### Discovery Flow (QR-based)
1. Server starts and listens on its configured port (for example, http(s)://<server-ip>:<port>).
2. TV application starts (served from `/` or `/tv`) and renders the initial screen.
3. TV displays a QR code that encodes the Remote app entrypoint: `http(s)://<server-ip>:<port>/remote`.
    - In browsers, this can simply encode `${location.origin}/remote`.
4. The server waits for a connection from the Remote app.
5. The user scans the QR code with the iPad camera and opens the detected URL in the browser.
6. The Remote app loads and connects to the server's WebSocket endpoint (same-origin, `/ws`), then proceeds with registration per the protocol.

Note (SSR Development): TV (4203) and Remote (4202) can use `ng serve --ssr`; the Unified Server can proxy `/tv` and `/remote` to these during development.

Ports (clarification):
- Production: a single server port (configurable via environment, e.g., 8080) serves `/` (TV), `/remote`, static assets, and the WebSocket endpoint on the same origin.
- Development: TV uses 4203 and Remote uses 4202 with `ng serve --ssr`; the Unified Server may proxy to these while keeping the WebSocket and `/health` on its own port.

## Data Flow Architecture

### Server-owned Data Model
```
1. Server Startup
   ↓
2. Load Performers/Videos/Scenes Data (Local to Server)
   ↓
3. Store Data in Server Memory (Authoritative Source)
   ↓
4. Reset FSM to Initial State
   ↓
5. Await Client Connections
```

### TV and remote Clients Data Flow initialization

```
1. Client App Startup
   ↓
2. WebSocket Connection Established
   ↓
3. Data Transfer (Server → Client)
   ↓
4. Client Receives Data from Server
   ↓
5. Client Renders UI Based on Received Data
   ↓
6. Client confirms status and message recieved
   ↓
7. Client Awaits Further Commands/State Updates
```

### Navigation State Flow
```
User Interaction (Remote)
    ↓
`navigation_command` created
    ↓
WebSocket Message Sent (Remote → Server)
    ↓
Server FSM Validates & Updates State
    ↓
WebSocket Message Sent (Server → TV)
    ↓
TV Updates display State
    ↓
`action_confirmation` created (TV)
    ↓
WebSocket Message Sent (TV → Server)
    ↓
Server FSM Validates Confirmation
    ↓
WebSocket Status Confirmation (Server → Remote)
    ↓
Remote Updates display State
```

### Video control Flow
```
User Interaction (Remote)
    ↓
`control_command` created
    ↓
WebSocket Message Sent (Remote → Server)
    ↓
Server FSM Validates & Updates State
    ↓
WebSocket Message Sent (Server → TV)
    ↓
TV Executes Video Control Action async
    ↓
`action_confirmation` created  (TV)
    ↓
WebSocket Message Sent (TV → Server)
    ↓
Server FSM Validates Confirmation
    ↓
WebSocket Status Confirmation (Server → Remote)
    ↓
Remote Updates display State async
```

## System Requirements

- **Network:** Local WiFi (same subnet)
- **Browser:** Modern WebSocket support (Chrome 88+, Firefox 85+, Safari 14+)
- **TV Device:** Any device capable of running Angular web application
- **Remote Device:** Tablet or smartphone with touch interface
- **Recommended:** TV 32"+, Remote 10"+, 5GHz WiFi

## HTTPS, WSS, and PWA Requirements

- Production HTTPS: Remote PWA install and service worker require HTTPS in production. The Unified Server should support HTTPS for deployment.
- WebSocket over HTTPS: When HTTPS is enabled, use WSS for the WebSocket endpoint. Prefer same-origin for simplicity and security.
- Certificates on LAN: Self-signed or locally-issued certificates are acceptable for LAN deployments. iPad devices must trust the certificate (install the profile, then enable full trust in Settings → General → About → Certificate Trust Settings).
- Configuration: Certificate and key are deployment-provided. Exact configuration (for example, environment variables for cert/key paths) is defined in implementation details.

---

*For implementation details, see [IMPLEMENTATION.md](./IMPLEMENTATION.md). For validation and testing, see [VALIDATION.md](./VALIDATION.md).*
