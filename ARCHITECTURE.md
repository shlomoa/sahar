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

**Client State Management Principle**:
- Server's `ApplicationState` is the single source of truth
- Clients derive all display state from server broadcasts
- No local state duplication - apps use lookup utilities to resolve IDs to objects
- **Flat Normalized Catalog** (Migrated 2025-10-20): Content stored as flat arrays with foreign key references
  - `CatalogData { performers[], videos[], scenes[] }`
  - Foreign keys: `Video.performerId` → `Performer.id`, `Scene.videoId` → `Video.id`
  - O(1) lookups instead of nested traversals
  - Each entity stored once (no duplication)
- See IMPLEMENTATION.md for technical details on `WebSocketBaseService` utilities

### Hybrid Architecture: Protocol Selection by Data Characteristics

**Architectural Principle**: Use the right protocol for the right data type.

**WebSocket**: Real-time operational state synchronization
- **Purpose**: Push dynamic state changes with minimal latency
- **Data Characteristics**: Frequently changing (navigation, player state)
- **Message Size**: Small (5-10KB operational state updates)
- **Caching**: Not applicable (state is ephemeral and changes constantly)
- **Examples**: `state_sync` with navigation/player updates, control commands

**HTTP REST API**: Static content delivery
- **Purpose**: On-demand content retrieval with built-in caching
- **Data Characteristics**: Infrequently changing (content catalog updates)
- **Message Size**: Large (catalog data can be 1MB+)
- **Caching**: Essential (browser cache, HTTP 304 Not Modified, CDN)
- **Examples**: `/api/content/performers`, `/api/content/videos/:id`

**Rationale for Separation**:
```
Current (inefficient): 1MB catalog × 100 state updates = 100MB bandwidth waste
Hybrid (optimized):    1MB catalog (once) + 5KB × 100 updates = 1.5MB total
```

**Industry Pattern**: Discord, Slack, GitHub all use this hybrid approach
- HTTP for message history/channel data (cacheable, on-demand)
- WebSocket for real-time notifications/updates (push, low-latency)

**Implementation Status**: See ANALYSIS.md "Content Data Architecture" for migration strategy from current monolithic `ApplicationState.data` to separated HTTP Content API.

### Protocol constants (defaults)

[See IMEPLEMENTATION.md for authoritative runtime constants.](./IMPLEMENTATION.md#models-and-constants---protocol-constants)

Notes
- Stop-and-wait protocol: Client commands get immediate server ACKs (no client-side timeout needed). However, `state_sync` broadcasts require client ACKs within 5 seconds or clients are forcibly disconnected (see "Perform or Exit" policy below).
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

**Asymmetric ACK Pattern:**
The protocol uses **asymmetric acknowledgement behavior** optimized for different communication patterns:

**Server → Client ACKs (Immediate, No Timeout):**
- Server ACKs **ALL** valid client commands immediately (register, navigation_command, control_command, action_confirmation, heartbeat)
- No timeout enforcement needed (server controls protocol and is reliable)
- Request/response pattern (1-to-1)

**Client → Server ACKs ("Perform or Exit" Policy):**
- Clients **MUST** ACK `state_sync` broadcasts within **5 seconds** (`WEBSOCKET_CONFIG.ACK_TIMEOUT`)
- Clients that fail to ACK are **forcibly disconnected** with WebSocket close code **1008 (Policy Violation)**
- No retry attempts - disconnected clients must reconnect and re-register
- Broadcast pattern (1-to-many, ACK-gated queue)

**ACK Matrix:**

| Message Type | Direction | Server Sends ACK? | Client Must ACK? | Timeout Enforced? |
|--------------|-----------|-------------------|------------------|-------------------|
| `state_sync` | Server → Client(s) | ❌ No | ✅ **YES** | ✅ **YES (5s, Code 1008)** |
| `register` | Client → Server | ✅ **YES** | ❌ No | ❌ No |
| `navigation_command` | Client → Server | ✅ **YES** | ❌ No | ❌ No |
| `control_command` | Remote → Server | ✅ **YES** | ❌ No | ❌ No |
| `action_confirmation` | TV → Server | ✅ **YES** | ❌ No | ❌ No |
| `heartbeat` | Client → Server | ✅ **YES** | ❌ No | ❌ No |
| `ack` | Both directions | ❌ No | ❌ No | ❌ No |
| `error` | Both directions | ❌ No | ❌ No | ❌ No |

**Why Asymmetric?**
1. Server is authoritative and reliable (can always ACK immediately)
2. Clients might be slow, broken, or unresponsive (need enforcement)
3. Server broadcasts block the ACK-gated queue (critical path requiring timeout)
4. Client commands don't block anything (courtesy ACKs only)

**Broadcast Queue Mechanism:**
- Server maintains an **ACK-gated queue** for `state_sync` broadcasts
- When state changes during an in-flight broadcast, newer versions **collapse** older pending broadcasts (clients only need latest state)
- After all clients ACK (or timeout), the queue flushes pending broadcasts immediately
- **Version Tracking:** Every state mutation increments a monotonic version counter for idempotency, ordering, and deduplication

**General Flow:**
1.  **Message Sent:** A sender (client or server) sends a single message.
2.  **Wait for Acknowledgement:** The sender enters a "waiting" state and **must not** send any further messages until it receives an `ack` from the receiver (applies to client→server messages; server ACKs immediately).
3.  **Acknowledgement Received:** Upon receiving the `ack`, the sender is unblocked and can send its next message.
4.  **Timeout (state_sync only):** If clients do not ACK `state_sync` within 5 seconds, server forcibly disconnects them with close code 1008.
5.  **Exception:** The `ack` message and `error` messages are not acknowledged, preventing infinite loops.


#### Key Message Types & Flow Example (`play` command)

**Supported Message Types:**
- `register`, `navigation_command`, `control_command`, `action_confirmation`, `ack`, `state_sync`, `error`, `heartbeat`
- ~~`data`~~ (Removed October 2025 - catalog served via HTTP `GET /api/content/catalog`)

**Flow with Asymmetric ACKs:**

1.  **`control_command` (Remote → Server):** The Remote sends a command to play a video.
    - The Remote is now blocked, awaiting an `ack`.
2.  **`ack` (Server → Remote):** The Server **immediately** acknowledges receipt of the command.
    - The Remote is now unblocked.
    - ⚡ **Server ACKs are immediate** (no timeout needed, server is reliable)
3.  **FSM Update (Optional):** The Server may update its FSM optimistically or wait for TV confirmation (depends on command type).
4.  **`control_command` (Server → TV):** The Server forwards the `play` command to the TV.
    - **Note:** Server does NOT wait for TV ACK before continuing (server is not blocked by forwarding)
5.  **TV Execution:** The TV receives the command and executes the YouTube Player API action (e.g., `player.playVideo()`).
6.  **`action_confirmation` (TV → Server):** Once the video is actually playing, the TV sends a confirmation with `playerState`.
    - The TV is now blocked, awaiting an `ack`.
7.  **`ack` (Server → TV):** The Server **immediately** acknowledges the confirmation.
    - The TV is now unblocked.
    - ⚡ **Server ACKs are immediate** (no timeout)
8.  **FSM Update:** The Server updates its FSM with the confirmed `playerState` from the TV.
9.  **`state_sync` (Server → All Clients):** The Server broadcasts the new `ApplicationState` (which now reflects `isPlaying: true`) to all connected clients.
    - ⏰ **Server waits for ALL client ACKs** (5-second timeout enforced)
10. **`ack` (Remote → Server) & `ack` (TV → Server):** The clients acknowledge the state update.
    - 🚨 **Critical:** Clients MUST ACK within 5 seconds or face forced disconnect (close code 1008)
    - The Server is now unblocked. The cycle is complete.

**Timeout Enforcement:**
- If any client fails to ACK `state_sync` within 5 seconds:
  - Server logs critical error
  - Server forcibly closes the client connection: `ws.close(1008, 'Policy Violation: Failed to ACK state_sync within timeout')`
  - Client must reconnect and re-register to resume
  - **No retry attempts** - strict "Perform or Exit" policy ensures fast failure detection

### Control Commands Architecture (Implemented October 2025)

**Status**: ✅ Production - Reactive Pattern (Option 2)

The control command infrastructure enables the Remote to send playback control commands (play, pause, mute, volume, seek, fullscreen) to the TV via the server.

#### Design Decision: Reactive Pattern (Option 2)

After analysis of two architectural patterns (see ANALYSIS.md "WebSocket ACK Patterns"), we chose **Reactive Pattern (Option 2)**: TV executes commands and sends back confirmed state.

**Architecture Flow:**
```
Remote → control_command → Server (forwards) → TV
                                                ↓
                                    TV executes YouTube Player API
                                                ↓
                                    TV sends action_confirmation with playerState
                                                ↓
                                    Server updates FSM with confirmed playerState
                                                ↓
                                    Server broadcasts state_sync with updated state
                                                ↓
                            Both apps receive state_sync and update UI
```

**Rationale:**
- **Accuracy over Speed**: Confirmed state from actual YouTube Player API vs optimistic updates
- **Reliability**: Handles API failures gracefully (TV can report errors)
- **Consistency**: Same pattern for all control commands
- **Trade-off**: 200-500ms UI delay acceptable for guaranteed accuracy

#### ActionConfirmationPayload Extension

The `action_confirmation` message was extended with an optional `playerState` field:

```typescript
interface ActionConfirmationPayload {
  status: 'success' | 'failure';
  errorMessage?: string;
  playerState?: PlayerState;  // ✅ Added October 2025
}
```

**Purpose**: When TV confirms a player action, it includes the **actual player state** from the YouTube Player API. This ensures:
- `currentTime` is preserved across pause/play transitions
- Volume changes are accurately reflected  
- All player properties (`isPlaying`, `isMuted`, `volume`, `isFullscreen`) stay synchronized

**Server Behavior**: When receiving `action_confirmation` with `playerState`, the server:
1. Updates `ApplicationState.player` with the confirmed values
2. Broadcasts `state_sync` to all connected clients
3. Both TV and Remote UIs update based on confirmed state

#### Supported Control Commands

All commands follow the same reactive pattern:

- `play` - Start/resume video playback
- `pause` - Pause video playback
- `toggle-mute` - Mute/unmute audio
- `volume-up` - Increase volume by 10%
- `volume-down` - Decrease volume by 10%
- `seek` - Jump to specific time position (with `targetTime` parameter)
- `toggle-fullscreen` - Enter/exit fullscreen mode

#### Single Source of Truth Pattern

**Client State Management Principle** (Refined October 2025):

Applications maintain **zero local state copies**. All state is derived from server's `ApplicationState` via getters:

```typescript
// apps/tv/src/app/app.ts
export class AppComponent {
  protected readonly applicationState = this.wsService.applicationState;
  
  // Derived state - no local copy
  get playerState() {
    return this.applicationState()?.player;
  }
  
  get currentVideoId() {
    return this.playerState?.currentVideoId;
  }
}
```

**Benefits:**
- Always reflects current server state
- No synchronization overhead
- Impossible to have stale local state
- Zero-cost abstraction (simple property access)

**Implementation Note**: TV app previously had dual update pattern (`playerState$` + `state$`). This was eliminated in October 2025 - all updates now flow through single `state$` observable.

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

### Remote Video Controls UX & Graphics (Authoritative UI spec)
For the Remote's control surface, the graphics and layout are designed for a child with hearing, mobility, and vision impairments. Controls must be simple, colorful, intuitive, and highly accessible.

Authoritative details live in GRAPHICS.md. Summary:

- Icons (SVGs under `assets/icons/`):
    - play.svg, pause.svg, forward.svg, backward.svg, volume-up.svg, volume-down.svg, mute.svg, exit.svg, fullscreen.svg
- Control Areas:
    1. Video Navigation Panel (horizontal): backward | play/pause | forward
    2. Volume Control Panel (vertical): volume up | mute | volume down
    3. Global Buttons: home, fullscreen, exit

Implementation notes:
- Remote app should render large, high-contrast buttons with clear labels and ARIA attributes.
- Play/Pause share the same button location and toggle based on playback state.
- Backward/Forward should be disabled at boundaries (no previous/next scene).
- Prefer focus-visible styles, large hit areas, and readable labels.
- See GRAPHICS.md for the canonical list of icons and intended placement.

### Accessibility & Narration Features

**Status**: ✅ Production (Implemented 2025-10)

The Remote app includes comprehensive accessibility features to support users with hearing, mobility, and vision impairments. The system provides Hebrew-language text-to-speech narration and visual button descriptions.

#### Architecture: Signal-Based Modernization

The accessibility implementation modernizes the POC pattern (`stackblitz_narated_buttons`) using Angular 20 signals while preserving all original features:

**Core Components** (all in `shared/shared/src/lib/`):
1. **NarrationService** (`services/narration.service.ts`)
   - Web Speech API integration with Hebrew language support (`he-IL`)
   - Smart voice selection (prefers Google Hebrew voice)
   - Niqqud and cantillation handling for accurate Hebrew pronunciation
   - Signal-based reactive state: `isSpeaking()`, `isSupported()`, `isEnabled()`
   - Methods: `speak(text, options)`, `enable()`, `disable()`, `setLang(lang)`

2. **ButtonDescriptionService** (`services/button-description.service.ts`)
   - Signal-based state management: `description = signal<string | null>(null)`
   - Replaces POC's BehaviorSubject Observable pattern
   - Methods: `setDescription(text)`

3. **ButtonDescriptionPanelComponent** (`components/button-description-panel/`)
   - Fixed bottom banner displaying button descriptions
   - Standalone component with OnPush change detection
   - Styles ported from POC:
     - Position: `fixed; left: 0; right: 0; bottom: 0`
     - Font: `clamp(18px, 2.6vw, 28px)` responsive sizing
     - Background: `rgba(0,0,0,.85)` with `backdrop-filter: blur(6px)`
     - Animation: slide up from bottom (`translateY(100%)` → `translateY(0)`)
     - ARIA: `role="status"`, `aria-live="polite"`, `aria-hidden`
   - Placed once at app root (Remote app component)

4. **FocusDescDirective** (`directives/focus-desc.directive.ts`)
   - Standalone directive with selector: `[libFocusDesc]`
   - Inputs: `libFocusDesc` (description text), `speakOnFocus` (boolean, default: true)
   - Event handlers coordinate both services:
     - `focus`: Shows description panel + speaks (if enabled)
     - `blur`: Hides description panel
     - `mouseenter`: Shows description only (no speech)
     - `mouseleave`: Hides description
     - `touchstart`: Long-press (700ms) → shows + speaks
     - `touchend/touchcancel`: Clears timer

#### Usage Pattern

**Remote App Integration** (`apps/remote/src/app/`):

1. **App Root** (`app.html`):
   ```html
   <lib-button-description-panel></lib-button-description-panel>
   ```

2. **Service Initialization** (`app.ts`):
   ```typescript
   ngOnInit() {
     this.narrationService.setLang('he-IL');
     this.narrationService.enable();
   }
   ```

3. **Button Markup** (video-remote-control.component.html):
   ```html
   <button
     mat-fab
     libFocusDesc="נַגֵּן אֶת הַוִּידֵאוֹ"
     [speakOnFocus]="true"
     (click)="onControlCommand('play-pause')">
     <mat-icon>play_arrow</mat-icon>
   </button>
   ```

#### Hebrew Text Examples

All 10 video control buttons have Hebrew descriptions with niqqud:
- **Play**: "נַגֵּן אֶת הַוִּידֵאוֹ"
- **Pause**: "הַשְׁהֵה אֶת הַוִּידֵאוֹ"
- **Volume Up**: "הַגְּבֶּר אֶת עוצְמַת הַקוֹל"
- **Mute**: "השתקת הקול" / "ביטול השתקה"
- **Home**: "מעבר לדף הבית"
- **Fullscreen**: "מעבר למסך מלא" / "יציאה ממסך מלא"
- **Exit**: "חזרה לרשימת סצנות"
- **Previous**: "סצנה קודמת"
- **Next**: "סצנה הבאה"
- **Volume Down**: "הנמכת עוצמת הקול"

#### Implementation Scope

**Current Implementation** (Remote video controls only):
- ✅ Video Remote Control buttons (10 buttons with Hebrew narration)
- ✅ ButtonDescriptionPanel placed at app root
- ✅ NarrationService initialized with Hebrew language
- ✅ All POC features preserved (niqqud, voice selection, touch handlers)

**Future Scope** (Not yet implemented):
- ⏳ Navigation grids (performers/videos/scenes cards)
- ⏳ Narration toggle (mat-slide-toggle in toolbar)

#### Technical Benefits

**Signal-Based Modernization**:
- ✅ Automatic reactivity - templates update when state changes
- ✅ Zero boilerplate - no manual change detection
- ✅ Type safety - non-null guarantees enforced at compile time
- ✅ Performance - fine-grained updates via computed signals
- ✅ Angular 20 Best Practice - signals recommended over RxJS for UI state

**Accessibility Standards**:
- ✅ WCAG 2.1 Level AA compliance
- ✅ Screen reader support via ARIA attributes
- ✅ Keyboard navigation (focus/blur primary interaction)
- ✅ Touch support (700ms long-press threshold)
- ✅ Mouse/pointer support (hover shows description without speech)

#### Dependencies

- **Web Speech API**: Native browser API (no external libraries)
- **Angular Signals**: Core Angular 20 reactive primitive
- **Angular Material**: Button components and icons
- **Shared Library**: All accessibility features in `shared/shared/src/lib/`

For implementation details, see [IMPLEMENTATION.md — Accessibility Features](#). For validation flows, see [VALIDATION.md — Accessibility Testing](#).

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

### Application Bootstrap & Initialization Order

SAHAR uses Angular's **provideAppInitializer()** function to guarantee catalog availability before app bootstrap completes. This prevents race conditions between catalog loading and WebSocket state synchronization.

**Why provideAppInitializer():**
- Catalog data is critical - apps are unusable without performers/videos/scenes
- Data is small (~few KB) - fast fetch on LAN, minimal bootstrap delay
- Prevents race conditions - guarantees catalog loads before WebSocket connects
- Simplifies components - no loading states or defensive null checks needed
- Fail-fast behavior - catalog errors block bootstrap with clear user feedback
- Modern Angular pattern - functional provider (APP_INITIALIZER deprecated)

**Bootstrap Sequence:**
```
1. Angular App Starts
   ↓
2. provideAppInitializer() Executes (blocks bootstrap)
   ↓
3. ContentService.fetchCatalog() - HTTP GET /api/content/catalog
   ↓
4. Catalog Data Cached in Signal
   ↓
5. Bootstrap Completes - Components Initialize
   ↓
6. WebSocket Connection Established
   ↓
7. Navigation State Syncs (catalog already available)
```

**Configuration** (both TV and Remote `app.config.ts`):
```typescript
export const appConfig: ApplicationConfig = {
  providers: [
    // ... other providers
    provideAppInitializer(() => {
      const contentService = inject(ContentService);
      return contentService.fetchCatalog();
    })
  ]
};
```

**Error Handling:**
- Catalog fetch failures prevent app bootstrap
- User sees loading indicator until success or error
- Retry mechanism managed by Angular's initialization framework
- No partial app state - either fully initialized or failed

**Benefits:**
- WebSocket state_sync can safely reference catalog data
- Components access catalog synchronously (no async loading)
- CatalogHelperService assumptions hold (both state and catalog ready)
- Eliminates entire class of race condition bugs

See `shared/shared/src/lib/services/content.service.ts` for implementation details.

---

## Shared Service Architecture

### CatalogHelperService - Signal-Based State-Aware Facade

**Purpose**: Bridge between ApplicationState (navigation context) and ContentService (catalog data) using modern Angular signals for automatic reactivity.

**Architecture Decision**: Signal-based stateful service over stateless parameter-passing approach.

**Rationale**:
- Automatic reactivity - templates update when state or catalog changes (no manual change detection)
- Zero boilerplate - apps expose signals directly without manual getters or try/catch blocks
- Type safety - non-null state contract enforced at compile time
- Performance - fine-grained updates via computed signals (only affected views re-render)
- Angular 20 BKM - signals are the recommended reactive primitive over RxJS observables

**Service Contract**:
```typescript
/**
 * CONTRACT (Enforced via TypeScript):
 * - State must be initialized before accessing any computed signals
 * - State is NEVER set to null after initialization (always valid ApplicationState)
 * - Apps MUST call setState() with non-null state before using helper methods
 * - Violation results in undefined behavior
 */

// State signal type is non-nullable
private state = signal<ApplicationState>(null as unknown as ApplicationState);

// setState() only accepts non-null
setState(state: ApplicationState): void {
  this.state.set(state);
}
```

**API Surface**:

1. **State Management**
   - `setState(state: ApplicationState): void` - Update internal state (NEVER pass null)

2. **Current Item Computed Signals** (return `T | null`)
   - `readonly currentPerformer` - Auto-updates when state/catalog changes
   - `readonly currentVideo` - Auto-updates when state/catalog changes
   - `readonly currentScene` - Auto-updates when state/catalog changes

3. **Level-Based Collection Computed Signals** (return `T[]`)
   - `readonly currentPerformers` - Returns performers array when level === 'performers'
   - `readonly currentVideos` - Returns videos array when level === 'videos'
   - `readonly currentScenes` - Returns scenes array when level === 'scenes'

4. **Utility Signals**
   - `readonly catalogReady` - Returns boolean (checks if catalog is loaded)

**Usage Pattern** (in app components):
```typescript
// 1. Inject service
private catalogHelper = inject(CatalogHelperService);

// 2. Initialize state (REQUIRED before accessing signals)
ngOnInit(): void {
  // When WebSocket sends initial state
  this.catalogHelper.setState(initialState);
}

// 3. Expose computed signals (zero boilerplate)
readonly currentPerformer = this.catalogHelper.currentPerformer;
readonly currentVideos = this.catalogHelper.currentVideos;
readonly catalogReady = this.catalogHelper.catalogReady;

// 4. Update state when it changes
handleStateSync(state: ApplicationState): void {
  this.catalogHelper.setState(state);  // Triggers all computed signal updates
}

// 5. Use in templates with signal syntax
// Template:
@if (catalogReady()) {
  @if (currentPerformer(); as performer) {
    <h2>{{ performer.name }}</h2>
  }
  
  @for (video of currentVideos(); track video.id) {
    <div>{{ video.title }}</div>
  }
}
```

**Benefits Delivered**:
- ✅ Eliminates 8 duplicate methods from WebSocketBaseService (separation of concerns)
- ✅ Single source of truth for "current item" logic (DRY principle)
- ✅ Synchronization guarantees via computed signals (prevents race conditions)
- ✅ Reduces TV/Remote app code by ~57% (120 lines duplicated → 52 lines shared)
- ✅ Type-safe non-null contract enforced at compile time
- ✅ Zero manual change detection or getter boilerplate

**Dependencies**:
- `ContentService` - Access `catalog` signal and ID/FK getters
- No WebSocketBaseService dependency (clean separation of concerns)

**Location**: `shared/shared/src/lib/services/catalog-helper.service.ts`

---

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
