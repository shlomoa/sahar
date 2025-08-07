
# SAHAR TV Remote - System Architecture

*This is the definitive source of truth for system architecture and protocol.*

## 1. Overview & Core Principles

The SAHAR TV Remote Control System is a real-time synchronized application suite built around a unified Node.js server that serves as both a static file server and a WebSocket gateway. All communications and state management are centralized, and all protocol details are fully integrated into this document.

**Core Principles:**
- Unified server architecture (Node.js + Express + ws)
- Centralized state management (server-side FSM)
- Strict protocol adherence for all communications
- Robust recovery from disconnections
- Real-time synchronization between TV and Remote

## 2. System Components & Architecture Diagram

### Architecture Diagram
```
┌──────────────┐      ┌────────────────────────────┐      ┌──────────────┐
│  Remote App  │      │      Unified Server        │      │   TV App     │
│   (Client)   │      │ (Express + ws + FSM/State)│      │  (Client)    │
│  Angular     │◄────►│  Serves static files,      │◄────►│  Angular     │
│  Port: 4202  │      │  manages protocol, FSM,    │      │  Port: 4203  │
│              │      │  and relays messages       │      │              │
└──────────────┘      └────────────────────────────┘      └──────────────┘
```

## 3. Application Details

### Server App (Unified Node.js Server)
- **Role:** Unified static file server and WebSocket gateway
- **Responsibilities:**
  - Serves Angular apps (TV and Remote)
  - Manages shared application state
  - Maintains a finite state machine (FSM) for both remote and TV clients
  - Handles client connections and recovers from disconnections
  - Ensures all communications strictly adhere to the FSM and protocol
  - Relays messages and synchronizes state between clients
- **Key technologies:** Node.js, TypeScript, Express, ws, state management

### TV Application (`apps/tv/`)

-   **Role**: Display and Video Player (Client)
-   **URL**: `http://<server-ip>:<port>/` (Served by the Unified Server)
-   **WebSocket**: Client, connects to the Unified Server
-   **Technology**: Angular 20+ with Material Design

**Responsibilities**:
-   Connect to the WebSocket Gateway on the Unified Server 🔧 *Refactoring Needed*
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

### Remote Application (`apps/remote/`)

-   **Role**: Control Interface (Client)
-   **URL**: `http://<server-ip>:<port>/remote` (Served by the Unified Server)
-   **WebSocket**: Client, connects to the Unified Server
-   **Technology**: Angular 20+ with Material Design

**Responsibilities**:
-   Own and manage all performers/videos/scenes data 🔧 *Refactoring Needed*
-   Connect to the WebSocket Gateway on the Unified Server 🔧 *Refactoring Needed*
-   Establish and maintain WebSocket connection to the Unified Server 🔧 *Refactoring Needed*
-   Send complete data sets to the server upon connection 🔧 *Refactoring Needed*
-   Provide touch-optimized navigation interface 🔧 *Refactoring Needed*
-   Dispatch navigation and control commands to the server 🔧 *Refactoring Needed*
-   Show enhanced video controls during scene playback 🔧 *Refactoring Needed*
-   Calculate and display YouTube thumbnails dynamically 🔧 *Refactoring Needed*

**Key Features**:
-   Single source of truth for all content data 🔧 *Refactoring Needed*
-   Automatic server discovery (via QR code or other method) 🔧 *Refactoring Needed*
-   Material Design optimized for tablet/touch interfaces 🔧 *Refactoring Needed*
-   Enhanced video controls with scene-level interaction 🔧 *Refactoring Needed*
-   Dynamic YouTube thumbnail integration with shared utilities 🔧 *Refactoring Needed*

## 4. Unified Communication Protocol

### Protocol Version: 3.0
**Transport:** WebSocket
**Format:** JSON
**Architecture:** Centralized Server with a Finite State Machine (FSM)
**Communication Model:** Synchronous "Stop-and-Wait"

The entire system operates on a strictly synchronous, server-centric communication model. All state is owned by the server's FSM. Clients are stateless and merely reflect the state broadcast by the server.

#### Connection and Registration Flow
1.  **Server Startup:** The Unified Server starts, serving the client applications and listening for WebSocket connections on its designated port (e.g., 8080).
2.  **Client Connection:** The TV and Remote apps connect to the server's WebSocket endpoint.
3.  **Client Registration:** Upon connecting, each client **must** send a `register` message to identify itself (e.g., as 'tv' or 'remote'). The server will not accept any other messages from an unregistered client.
4.  **Initial State Sync:** After a client successfully registers, the server sends a `state_sync` message containing the complete, current `ApplicationState`. The client then renders its UI based on this state.

#### Synchronous "Stop-and-Wait" Acknowledgement Model
This protocol enforces a strict, lock-step communication flow to guarantee message delivery and order.

1.  **Message Sent:** A sender (client or server) sends a single message.
2.  **Wait for Acknowledgement:** The sender enters a "waiting" state and **must not** send any further messages until it receives an `ack` from the receiver.
3.  **Acknowledgement Received:** Upon receiving the `ack`, the sender is unblocked and can send its next message.
4.  **Timeout:** If the sender does not receive an `ack` within a specified period (`ACK_TIMEOUT`), it must consider the connection lost and initiate reconnection procedures.
5.  **Exception:** The `ack` message is the *only* message that is not acknowledged, which prevents an infinite loop.

#### Message Format
All messages adhere to the `WebSocketMessage` interface defined in `shared/websocket/websocket-protocol.ts`.

```typescript
interface WebSocketMessage {
  type: MessageType;
  timestamp: number;
  source: 'tv' | 'remote' | 'server';
  payload: any;
}
```

#### Key Message Types & Flow Example (`play` command)
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

## 5. Video Integration

### YouTube Player Architecture
- Scene-based playback (automatic seeking)
- Enhanced controls (play/pause/volume/seek)
- Responsive design for TV
- Error handling for unavailable videos

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

## 6. Network Architecture & Discovery

- **TV App Development:** 4203 (ng serve)
- **Remote App Development:** 4202 (ng serve)
- **Server:** Listens on 5544-5547
- **Discovery:** Clients try known ports sequentially; QR code or mDNS can be used for discovery

## 7. Technical Implementation

- **Frontend:** Angular 20+ with Standalone Components
- **UI Framework:** Angular Material 20.1.3
- **Communication:** Native WebSocket API
- **Video:** YouTube Player API (@angular/youtube-player)
- **Reactive Programming:** RxJS
- **Styling:** SCSS
- **State Management:** Server-side FSM, stateless clients
- **Persistence:** In-memory (no local storage); Remote must repopulate state on server restart
- **Performance:** ~500KB bundles, <100MB memory, <50ms latency

## 8. Data Flow Architecture

### Content Data Flow
```
1. Remote App Startup
   ↓
2. Load Performers/Videos/Scenes Data (Local to Remote)
   ↓
3. Network Discovery (Find Server)
   ↓
4. WebSocket Connection Established
   ↓
5. Data Transfer (Remote → Server)
   ↓
6. TV Receives Data from Server
   ↓
7. Navigation Commands (Remote → Server)
   ↓
8. Real-time State Sync (Bidirectional)
```

### Navigation State Flow
```
User Interaction (Remote)
    ↓
Navigation Command Created
    ↓
WebSocket Message Sent (Remote → Server)
    ↓
Server FSM Validates & Updates State
    ↓
TV Updates Display State
    ↓
Status Confirmation (Server → Remote)
    ↓
Remote Updates UI State
```

## 9. System Requirements

- **Network:** Local WiFi (same subnet)
- **Browser:** Modern WebSocket support (Chrome 88+, Firefox 85+, Safari 14+)
- **TV Device:** Any device capable of running Angular web application
- **Remote Device:** Tablet or smartphone with touch interface
- **Recommended:** TV 32"+, Remote 10"+, 5GHz WiFi

---

*For implementation details, see [IMPLEMENTATION.md](./IMPLEMENTATION.md). For validation and testing, see [VALIDATION.md](./VALIDATION.md).*
