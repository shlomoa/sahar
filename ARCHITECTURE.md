
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

## 4. Unified Communication Protocol (Integrated)

### Protocol Version: 2.0
**Transport:** WebSocket over TCP
**Format:** JSON Messages
**Architecture:** Gateway Server Model (see above)

#### Connection Architecture & Flow
1. **Server Startup:** The unified server starts, serving static files and listening for WebSocket connections (ports 5544-5547).
2. **Client Initialization:** TV and Remote apps connect to the server, trying known ports in sequence.
3. **State Synchronization:** Server immediately sends a `state_update` message to any new client, ensuring up-to-date state.
4. **Command Handling:** Remote sends commands; server validates via FSM and updates state.
5. **Broadcast:** Server broadcasts new state to all clients.
6. **Disconnection Recovery:** Server and clients use heartbeat and exponential backoff for reconnection.

#### Message Format & Types
```typescript
interface WebSocketMessage {
  type: MessageType;
  timestamp: number;
  payload: any;
  messageId?: string;  // Optional for tracking
}
type MessageType = 
```

**Example Messages:**
```json
// Discovery (Remote → Server)
{
  "type": "discovery",
  "timestamp": 1722744000000,
  "payload": {
    "deviceType": "remote",
    "deviceId": "remote-12345",
    "protocolVersion": "2.0"
  }
}
// State Update (Server → All Clients)
{
  "type": "state_update",
  "timestamp": 1722744000000,
  "payload": { ... }
}
```

#### State Synchronization & FSM
- The server maintains a finite state machine (FSM) for each client type (remote, TV).
- All incoming messages are validated against the FSM and protocol.
- State changes are only accepted if they are valid transitions.
- On reconnection, the server resends the current state to the client.

#### Error Handling, Reconnection, and Heartbeat
- **Auto-Reconnection:** Exponential backoff retry logic for clients
- **Heartbeat:** 30s interval, 90s timeout (3 missed heartbeats)
- **Error Scenarios:**
  - Network loss: automatic reconnection
  - Invalid commands: error response, ignored
  - Protocol mismatch: version negotiation or graceful degradation
  - Data corruption: request retransmission

#### Security Considerations
- Local network only (server binds to local interfaces)
- No authentication (trusted environment)
- Message size limits and rate limiting

#### Performance Targets
- <50ms command processing
- <3s connection establishment
- <10s discovery

#### Debugging & Monitoring
- Message logging (type, size, direction, errors)
- Connection state and round-trip time
- Debug commands for status and stats

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
