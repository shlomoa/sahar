# SAHAR TV Remote - Implementation details

This document outlines the implementation details for the SAHAR TV Remote system into the Unified Appliance Model, as defined in `ARCHITECTURE.md`.

## Implementation Guidelines

-   **Code Style**: Adhere to existing code styles. Use Prettier and ESLint where configured.
-   **Testing**: Every significant unit or functionality should have a corresponding set of tests.
    App level and integration tests will be documented in [VALIDATION.md](VALIDATION.md).
-   **Documentation**: Any significant feature, class, function and variable should be inline documented in detail.
-   **Completion**: Planning and execution management is done via GitHub tools.

### Dead Code Detection

All packages have TypeScript strict unused code checks enabled via `noUnusedLocals` and `noUnusedParameters` compiler options.

**Check individual packages:**
```bash
cd server && npm run typecheck
cd shared && npm run typecheck
cd apps/tv && npm run typecheck
cd apps/remote && npm run typecheck
```

**Check all packages at once:**
```bash
cd server && npm run typecheck:all
```

The typecheck scripts will flag unused variables, parameters, and imports. All packages currently pass with 0 issues.

---

## Implementation fabric
- **Frontend:** Angular 20+ with Standalone Components
- **UI Framework:** Angular Material 20.1.3
- **Implementation Directive: Standalone Material Components**: All Angular Material components **must** be imported as standalone components directly into the components that use them. Do not use `NgModule` for Material components. This approach improves tree-shaking and aligns with modern Angular practices.
- **Communication:** Native WebSocket API (Unified server `/ws`; clients send only allowed commands and MUST ack each `state_sync` with the received version)
- **Video:** YouTube Player API (@angular/youtube-player)
- **Reactive Programming:** RxJS
- **Styling:** SCSS
- **State Management:** Server-side FSM, stateless clients
- **Persistence:** In-memory (no local storage); Remote must repopulate state on server restart
- **Performance:** ~500KB bundles, <100MB memory, <50ms latency

---

### 4.4 Shared Functionality (`shared/`)

### Models and services shared between TV, Remote, and Server.
- **Models**: TypeScript interfaces and types for messages, application state, navigation levels, and commands.
    - **ApplicationState**: Central state structure shared between server and clients.
    - **PlayerState**: Consolidated player state interface with standardized 0-100 volume range. Eliminates duplicate implementations across TV and Remote apps.
    - **Messages**: Message types and interfaces.
        - Message Format
            All messages adhere to the `WebSocketMessage` interface defined in `shared/models/messages.ts`.

            ```typescript
                interface WebSocketMessage {
                    msgType: MessageType;
                    timestamp: number;
                    source: MessageSource;
                    payload: BasePayload;
                }
            ```
        - Control Commands
            Supported control actions handled by the server FSM:
            - `play`, `pause`: Video playback control
            - `seek`: Jump to specific time position
            - `set_volume`: Set volume (0-100 range)
            - `mute`, `unmute`: Audio control
            - `enter_fullscreen`, `exit_fullscreen`: Fullscreen mode control

    - **webSocket-protocol**: Connection states, utilities, and base classes.
        - Protocol constants (defaults)

            These defaults guide implementations and tests; they can be overridden via configuration at runtime (see IMPLEMENTATION Task 1.5).

            - ACK_TIMEOUT: 5000
            - WS_PATH: "/ws"
            - TV_DEV_PORT: 4203
            - REMOTE_DEV_PORT: 4202
            - SERVER_PORT: 8080
            - HEALTH_STATUS: "ok" | "degraded" | "error" (not currently implemented in code; future work)

- **Services**: Shared services for WebSocket handling, content delivery, and utilities.
    - **ContentService** (Added 2025-10-21, Updated 2025-10-23 with provideAppInitializer):
        - **Purpose**: HTTP-based catalog delivery with caching
        - **HTTP Endpoint**: `GET /api/content/catalog` returns `{ performers[], videos[], scenes[] }`
        - **Initialization**: Automatic via **provideAppInitializer()** in both TV and Remote apps
          - Modern functional provider (APP_INITIALIZER deprecated)
          - Catalog loads during app bootstrap (before components initialize)
          - Guarantees catalog availability when WebSocket connects
          - Eliminates race conditions between catalog and state_sync
          - See `apps/tv/src/app/app.config.ts` and `apps/remote/src/app/app.config.ts`
        - **Signal Support** (Optimized 2025-10-23):
          - `readonly catalog = signal<CatalogData | null>(null)`: Full catalog data
          - Removed `catalogReady` signal (redundant - catalog() !== null check sufficient)
          - Enables reactive computed signals in CatalogHelperService
        - **Caching**: In-memory signal-based cache prevents duplicate fetches
        - **Duplicate Request Prevention**: Closure-scoped promise prevents concurrent fetches
        - **Public Accessors** (guaranteed available after bootstrap):
          - `getPerformer(id): Performer`: Finds performer by ID or throws
          - `getVideo(id): Video`: Finds video by ID or throws
          - `getScene(id): Scene`: Finds scene by ID or throws
          - All getters use non-null assertions - provideAppInitializer guarantees catalog loaded
        - **FK Helpers** (guaranteed available after bootstrap):
          - `getVideosForPerformer(performerId): Video[]`: Filters by `performerId` FK
          - `getScenesForVideo(videoId): Scene[]`: Filters by `videoId` FK
          - Use non-null assertions - provideAppInitializer guarantees catalog loaded
        - **Error Handling**:
          - Fetch failures block app bootstrap (provideAppInitializer behavior)
          - Clear error feedback to user - no partial app initialization
          - Item-not-found errors throw with descriptive messages
    - **WebSocketBaseService**: Base class for WebSocket services in TV and Remote. Handles connection, reconnection, heartbeats, message parsing, and delegates catalog queries to ContentService:
        - **Catalog Delegation** (Updated 2025-10-21): No longer stores catalog data internally; all lookup methods delegate to ContentService
        - **Navigation State**: Maintains `applicationState$` BehaviorSubject with operational state only (no catalog)
        - **Lookup Utilities** (delegates to ContentService):
          - `getCurrentPerformer()`: Gets performerId from state, queries ContentService
          - `getCurrentVideo()`: Gets videoId from state, queries ContentService
          - `getCurrentScene()`: Gets sceneId from state, queries ContentService
          - `getVideosForPerformer(performerId)`: Delegates to ContentService
          - `getScenesForVideo(videoId)`: Delegates to ContentService
        - These utilities enable apps to derive display objects from HTTP-fetched catalog structure without local state duplication

### shared componenets
- **DeviceConnectionComponent**: Device connection indications and information.
- **SharedPerformersGridComponent**: Reusable component to display a grid of performers with selection capabilities.
- **SharedVideosGridComponent**: Reusable component to display a grid of videos with selection capabilities.
- **SharedScenesListComponent**: Reusable component to display a list of scenes with selection capabilities.

### utilities
- **WebSocketUtils**: Utility functions for WebSocket message handling and validation.
- **YouTube Helpers**: YouTube-specific utilities including `YouTubeThumbnailImageQuality` type system for standardized thumbnail quality handling.

## Server-Side - Unified Server + SSR Host

Goal: Evolve `server/websocket-server.ts` into the Unified Server and SSR host `server/main.ts`. In dev, proxy to Angular SSR servers. In prod, discover and run SSR bundles in child processes, proxy routes to them, and serve browser assets directly. Keep a single-origin WebSocket gateway at `/ws` and provide health endpoints.

Prerequisites
- TV/Remote dev: When developing with SSR, each app runs `ng serve --ssr` on its own dev port (TV: 4203, Remote: 4202).
- TV/Remote prod: `ng build` produces `apps/<app>/dist/<name>/{browser,server}`.

### Server Architecture - Service Extraction (Completed 2025-10-26)

The server has been refactored into clean, well-separated services following **Single Responsibility Principle**:

#### **main.ts** - Bootstrap & Orchestration (256 lines)
**Responsibilities:**
- Initialize FSM with application state
- Configure Express application  
- Instantiate and wire services (HttpService, ServerWebSocketService)
- Serve static files for TV and Remote apps
- Graceful shutdown handling

**Does NOT contain:** Business logic, endpoint handlers, or protocol implementation

```typescript
// Service initialization
const fsm = new Fsm();
const clients = new Map<WebSocket, ClientMetadata>();

const wsService = new ServerWebSocketService(wss, fsm, clients);
wsService.initialize();

const httpService = new HttpService(fsm, wss, clients, () => isReady);
httpService.setupRoutes(app);
```

#### **services/http.service.ts** - HTTP Endpoint Handlers (107 lines)
**Responsibilities:**
- Health/readiness probes: `/live`, `/ready`, `/health`
- Utility endpoints: `/host-ip` (for QR code generation)
- API endpoints: `/api/content/catalog`

**Dependencies:** Fsm (read-only), WebSocketServer (for client stats), clients Map

#### **services/server-websocket.service.ts** - WebSocket Handling (639 lines)
**Responsibilities:**
- Connection lifecycle management (accept, track, disconnect)
- Message routing and validation (9 message types: register, navigation_command, control_command, action_confirmation, ack, heartbeat, state_sync, error, data-deprecated)
- State broadcasting with ACK-gated queue
- Protocol enforcement (registration, uniqueness, "Perform or Exit" ACK policy)

**Key Features:**
- **"Perform or Exit" ACK Policy**: Clients MUST ACK `state_sync` within 5s or face forced disconnect (WebSocket close code 1008: Policy Violation per RFC 6455)
- **ACK-gated broadcast queue**: Waits for all clients to ACK before sending next state update
- **Pending collapse mechanism**: Intermediate state changes collapse during in-flight broadcasts (ensures state convergence)
- **Version tracking**: Monotonic counter ensures state consistency and enables idempotency

**ClientMetadata** (Simplified 2025-10-26):
```typescript
interface ClientMetadata {
  clientType: 'tv' | 'remote';
  deviceId: string;
  lastHeartbeat?: number;  // Only for health monitoring
}
// Removed fields: lastStateAckVersion, missedAckVersions, ackRetryCount (graceful degradation artifacts)
```

**Dependencies:** Fsm (read-write), WebSocketServer, clients Map

**Message Flow Pattern** (Mirrors WebSocketBaseService structure as internal BKM):
```typescript
class ServerWebSocketService {
  // Connection Management
  private setupConnectionHandling() { ... }
  private handleNewConnection(ws: WebSocket) { ... }
  private handleDisconnect(ws: WebSocket) { ... }
  
  // Message Routing (dispatch to protocol handlers)
  private handleMessage(ws: WebSocket, data: RawData) { ... }
  
  // Protocol Handlers
  private handleRegister(ws: WebSocket, msg: RegisterMessage) { ... }
  private handleNavigationCommand(ws: WebSocket, msg: NavigationCommandMessage) { ... }
  private handleControlCommand(ws: WebSocket, msg: ControlCommandMessage) { ... }
  private handleActionConfirmation(ws: WebSocket, msg: ActionConfirmationMessage) { ... }
  private handleAck(ws: WebSocket, msg: AckMessage) { ... }
  private handleHeartbeat(ws: WebSocket) { ... }
  
  // Broadcast Logic (ACK-gated queue)
  private broadcastStateIfChanged() { ... }
  private performBroadcast(version: number) { ... }
  private flushPending() { ... }
}
```

#### **fsm.ts** - Finite State Machine (Unchanged)
**Responsibilities:**
- Owns authoritative ApplicationState with versioned snapshots
- Provides mutation methods for navigation, player control, client registration
- Stores catalog privately (not part of ApplicationState)

**Key Methods:**
- `registerClient(clientType, deviceId)` - Client registration
- `deregisterClient(clientType)` - Client cleanup  
- `navigationCommand(action, targetId?)` - Navigation mutations
- `controlPlayer(payload)` - Player control mutations
- `actionConfirmation(status, errorMessage?)` - TV feedback handling
- `getSnapshot()` - Returns current ApplicationState with version
- `getCatalogData()` - Returns catalog (HTTP-only, not in state)

**Refactoring Benefits:**
- ✅ **Improved Maintainability**: Each service has clear, focused responsibilities
- ✅ **Better Testability**: Services can be tested independently
- ✅ **Reduced Complexity**: main.ts reduced from ~960 lines to 256 lines
- ✅ **Code Reusability**: Services follow established patterns (WebSocketBaseService structure)
- ✅ **100% Backward Compatible**: All functionality preserved, no breaking changes

---

### Control Commands Implementation (Phase 1 - Completed October 2025)

**Status**: ✅ COMPLETED

The control command infrastructure implements **Reactive Pattern (Option 2)** - TV executes commands and sends back confirmed state to the server FSM.

#### Architecture Flow

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

#### Key Implementation Details

**1. ActionConfirmationPayload Extension**
```typescript
interface ActionConfirmationPayload {
  status: 'success' | 'failure';
  errorMessage?: string;
  playerState?: PlayerState;  // ✅ Preserves currentTime, volume, etc.
}
```

**Purpose**: When TV confirms a player action (play, pause, seek, volume), it includes the **actual player state** from the YouTube Player API. This ensures:
- `currentTime` is preserved across pause/play transitions
- Volume changes are accurately reflected
- All player properties stay synchronized

**2. Server FSM Updates from Confirmations**

Location: `server/src/fsm.ts`

When the server receives `action_confirmation`, it:
1. Extracts `playerState` from the payload
2. Updates `ApplicationState.player` with confirmed values
3. Broadcasts `state_sync` to all connected clients

**3. Single Source of Truth via state$ Observable**

All player state updates flow through a single path:
- TV: `state$` observable emits on control_command and state_sync
- Remote: `state$` observable emits on state_sync
- No duplicate subscriptions or dual update patterns

**4. Angular Change Detection**

Templates use `@Input()` bindings that require new object references:
```typescript
this.state$.next({
  ...state,
  player: { ...state.player }  // New reference triggers ngOnChanges
});
```

#### Supported Control Commands

- ✅ `play` - Start/resume video playback
- ✅ `pause` - Pause video playback  
- ✅ `toggle-mute` - Mute/unmute audio
- ✅ `volume-up` - Increase volume by 10%
- ✅ `volume-down` - Decrease volume by 10%
- ✅ `seek` - Jump to specific time position
- ✅ `toggle-fullscreen` - Enter/exit fullscreen mode

#### Trade-offs

**Pros**:
- ✅ Accurate state - confirmed by actual YouTube Player
- ✅ Reliable - handles API failures gracefully
- ✅ Consistent - same pattern for all control commands

**Cons**:
- ⚠️ UI Delay - 200-500ms from Remote button press to state update
- ⚠️ Network dependent - requires round-trip to TV

**Decision**: Accuracy over speed - better to show correct state slightly delayed than show incorrect state immediately.

#### Files Modified

1. `shared/shared/src/lib/models/messages.ts` - Extended ActionConfirmationPayload
2. `server/src/fsm.ts` - FSM updates from action_confirmation
3. `apps/tv/src/app/services/websocket.service.ts` - Sends confirmations with playerState
4. `apps/tv/src/app/app.ts` - Single state$ subscription
5. `apps/remote/src/app/services/websocket.service.ts` - Sends control commands

#### Testing Status

- ✅ Mute confirmed working (user validation)
- ✅ Play/Pause confirmed working (user validation)
- ✅ Volume up/down working (minor initial button state issue noted)
- ⏳ Fullscreen needs testing (likely already works)
- ⏳ Seek needs testing

---

### Message Type Cleanup (Completed October 2025)

**Status**: ✅ COMPLETED

The deprecated `'data'` message type was removed from the entire codebase as it was no longer needed with the HTTP-based catalog architecture.

#### Architecture Rationale

**Phase 3 Migration (2025-10-21)**: Catalog data moved from WebSocket to HTTP API:
- Catalog served via `GET /api/content/catalog`
- ApplicationState contains only IDs (performerId, videoId, sceneId)
- WebSocket reserved for real-time state synchronization and control commands

**Result**: The `'data'` message type became obsolete - no client sends or expects it.

#### What Was Removed

1. **Shared Type Definitions** (`shared/shared/src/lib/models/messages.ts`):
   - Removed `'data'` from MessageType union
   - Removed `DataPayload` interface
   - Removed `DataMessage` interface
   - Removed `DataMessage` from `SaharMessage` union

2. **Remote App** (`apps/remote/src/app/services/websocket.service.ts`):
   - Removed 'data' generator function
   - Removed `DataPayload` import

3. **Server** (`server/src/services/server-websocket.service.ts`):
   - Removed 'data' validation case

4. **Validation Stub** (`validation/src/stubs/remote-stub.ts`):
   - Removed 'seed' command that sent 'data' messages

#### Verification

PowerShell verification confirmed zero references:
```powershell
Get-ChildItem -Path server,shared,apps -Recurse -Include *.ts | 
  Select-String "DataMessage|DataPayload|msgType.*'data'" | 
  Measure-Object
# Result: Count = 0 ✅
```

#### Benefits

- ✅ Reduced confusion - removed dead code path
- ✅ Clearer validation - only valid message types accepted
- ✅ Documentation alignment - code reflects HTTP catalog architecture
- ✅ Prevents misuse - clients can't use deprecated pattern

---

### ApplicationState definition and implementation
The state is maintained and managed in the server FSM. Clients receive authoritative state snapshots via `state_sync` messages after each committed change.

**Navigation State Management** (Updated 2025-10-21):
- Server FSM owns navigation state as IDs only: `{ currentLevel, performerId?, videoId?, sceneId? }`
- NavigationLevel: `'performers' | 'videos' | 'scenes'` (removed 'scene-selected' and 'playing' 2025-10-21)
- FSM transitions on navigation commands:
  - `navigate_to_performer`: sets `currentLevel='videos'`, `performerId`
  - `navigate_to_video`: sets `currentLevel='scenes'`, `videoId`
  - `navigate_to_scene`: sets `sceneId` (stays at 'scenes' level) ⭐ playback controlled by PlayerState.isPlaying
  - `navigate_back`: steps back one level (scenes→videos→performers)
  - `navigate_home`: resets to `currentLevel='performers'`
- **HTTP Content Delivery** (Phase 3, Migrated 2025-10-21):
  - Catalog delivered via `GET /api/content/catalog` endpoint (HTTP-based, not WebSocket)
  - `ApplicationState` no longer has `data` field - operational state only (navigation + player + clients)
  - Clients fetch catalog once on startup via ContentService and cache locally
  - Server FSM stores catalog privately in `catalogData` field (initialized from mock-data.ts)
  - Deprecated endpoint: POST `/seed` returns 410 Gone (data seeding no longer supported)
- **Flat Normalized Catalog Structure** (Implemented 2025-10-20):
  - `CatalogData { performers[], videos[], scenes[] }` with flat arrays
  - Foreign key references enable O(n) lookups: `Video.performerId`, `Scene.videoId`
  - No nested data structures - each entity stored once in its own array
- **Client Content Resolution** (Phase 3 Pattern):
  - ContentService: Fetches catalog via HTTP GET, caches locally, provides lookup methods
  - WebSocketBaseService: Delegates catalog queries to ContentService (no longer from state)
- **Client State Pattern** (Updated 2025-10-21):
  - Apps use **getters to derive all state** from `applicationState` (server snapshot)
  - No local copies of player or connection state - eliminates desync risk
  - Player state: `get isPlaying() { return this.applicationState?.player.isPlaying ?? false; }`
  - Connection state: `get bothConnected() { return tv && remote both 'connected'; }`
  - Result: ~17 redundant assignments removed, 2 duplicate subscriptions eliminated
  - Clients combine navigation IDs from `state_sync` with ContentService catalog:
    * `getCurrentPerformer()`: Gets `performerId` from state, queries ContentService
    * `getCurrentVideo()`: Gets `videoId` from state, queries ContentService
    * `getCurrentScene()`: Gets `sceneId` from state, queries ContentService
    * `getVideosForPerformer(performerId)`: Delegates to ContentService
    * `getScenesForVideo(videoId)`: Delegates to ContentService
- TV app: checks `currentLevel === 'scenes' && navigation.sceneId` to show video player vs navigation grids
- Remote app: shows video controls when scene is selected (same check)

```typescript
// Shared PlayerState interface (consolidated from duplicate implementations)
// Note: duration removed (2025-10-21) - runtime value from YouTube player, not part of server state
// Note: youtubeId removed (2025-10-21) - derived from navigation.videoId lookup in apps
// Note: playingSceneId removed (2025-10-21) - use navigation.sceneId directly
// Note: Client apps use getters to derive from ApplicationState.player (2025-10-21) - no local copies
export interface PlayerState {
    isPlaying: boolean;
    isFullscreen: boolean;
    currentTime: number;
    volume: number;      // 0-100 range (standardized across YouTube API and UI)
    isMuted: boolean;
}

// Monotonic version increases on each committed state change
export interface ApplicationState {
    version: number;
    clientsConnectionState: {
        tv?: ConnectionState;
        remote?: ConnectionState;
    };
    navigation: {
        currentLevel: NavigationLevel;
        performerId?: string;
        videoId?: string;
        sceneId?: string;
    };
    player: PlayerState;  // Uses shared PlayerState interface
    // Phase 3: data field removed (HTTP Content API migration 2025-10-21)
    // Catalog now fetched via GET /api/content/catalog (not in state)
    // FSM stores catalog privately in catalogData field
    error?: {
        code: string;
        message: string;
    };
}

// CatalogData: Flat normalized structure (Migrated 2025-10-20)
// Delivered via HTTP GET /api/content/catalog (Phase 3, 2025-10-21)
export interface CatalogData {
    performers: Performer[];  // { id, name, thumbnail, description }
    videos: Video[];          // { id, title, url, performerId, description }
    scenes: Scene[];          // { id, title, videoId, startTime, endTime, description }
}
```

---

## Client-Side - TV & Remote Apps

### Single Source of Truth Architecture (Completed October 2025)

**Status**: ✅ COMPLETED

The client applications were refactored to eliminate dual update patterns and ensure all state updates flow through a single observable path.

#### Problem Identified

**Before (Dual Update Pattern)** - TV app had two competing state update mechanisms:
```typescript
// apps/tv/src/app/services/websocket.service.ts
private playerState$ = new BehaviorSubject<PlayerState | null>(null);  // ❌ Duplicate

handleControlCommand() {
  this.playerState$.next(newPlayerState);  // ❌ Update 1
}

handleStateSync(state: ApplicationState) {
  this.playerState$.next(state.player);    // ❌ Update 2
  this.emitState(state);                   // ❌ Update 3
}
```

**Issues**:
- Two subscriptions in TV app.ts (state$ and playerState$)
- Risk of desynchronization between playerState$ and state$.player
- Redundant emissions and processing
- Unclear which is the source of truth

#### Solution Implemented

**After (Single Source)** - All updates flow through state$ observable:
```typescript
// apps/tv/src/app/services/websocket.service.ts
// Removed: private playerState$ BehaviorSubject

handleControlCommand() {
  const updatedState = {
    ...this.applicationState$.value!,
    player: { ...newPlayerState }
  };
  this.emitState(updatedState);  // ✅ Single emission via state$
}

handleStateSync(state: ApplicationState) {
  this.emitState(state);  // ✅ Single emission via state$
}
```

#### Implementation Details

**1. Removed playerState$ BehaviorSubject**
- Deleted from TV WebSocketService
- No longer needed - player state accessed via applicationState.player

**2. Updated handleControlCommand**
- Builds complete ApplicationState with updated player
- Emits via emitState() (which updates state$)
- Creates new object references for Angular change detection

**3. Simplified handleStateSync**
- Directly emits received state
- No duplicate playerState$ update

**4. Updated TV app.ts**
- Removed playerState$ subscription
- Single subscription to state$ observable
- Derives playerState via getter: `get playerState() { return this.applicationState()?.player; }`

#### Benefits Achieved

- ✅ **Single Source of Truth**: state$ is the only state emission point
- ✅ **No Desync Risk**: Impossible to have competing state values
- ✅ **Cleaner Code**: Removed ~50 lines of redundant subscription logic
- ✅ **Better Performance**: Single subscription, single change detection cycle
- ✅ **Easier Debugging**: One state update path to trace

#### Pattern: Getter-Based Derivation

Components access derived state via getters instead of maintaining copies:

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

**Benefits**:
- Always reflects current applicationState
- No synchronization needed
- Zero-cost abstraction (simple property access)

#### Files Modified

1. `apps/tv/src/app/services/websocket.service.ts`:
   - Removed playerState$ BehaviorSubject
   - Updated handleControlCommand to emit via state$
   - Simplified handleStateSync
   - Updated sendActionConfirmation to use applicationState$.value.player

2. `apps/tv/src/app/app.ts`:
   - Removed playerState$ subscription
   - Added playerState getter
   - Removed unused @ViewChild(VideoPlayerComponent)

#### Testing Status

- ✅ Control commands working (mute, play/pause confirmed)
- ✅ State synchronization working
- ✅ No console errors
- ✅ TypeScript compilation successful

---

### TV Application (`apps/tv/`)

#### Note: YouTube POC (Angular YouTube package)
- Use the Angular YouTube package to embed a minimal player in the TV app. If the package exposes built-in controls, render them (no custom controls required for the POC).
 - Wire the player where applicable via the existing server-driven state (stateless rendering from `state_sync`, see Task 2.5).
- Keep tests shallow and deterministic (mock/stub the player API); avoid loading the real iframe in unit tests.
- Validation of end-to-end playback remains in `VALIDATION.md` (Flow 2 — Video Playback Control).

### Remote Application (`apps/remote/`)

---

## Operator Tools — Admin QR Overlay (TV)

Status: Implemented (November 2025)

Purpose
- Provide a safe, on-demand way to open the Admin UI on another device by revealing a QR code on the TV via a secret gesture.

How it works
- Gesture: Two-burst tap pattern anywhere on the TV screen — 3 taps, short pause, then 3 taps ("3–pause–3").
  - Timing thresholds: intraTapMaxMs=400ms, interBurstMinMs=300ms, interBurstMaxMs=1200ms, cooldownMs=5000ms.
- Overlay: Modal with QR + URL, auto-hides after ~5s. ESC and click‑outside to close. Countdown indicator and Copy URL button included.
- URL: Encodes `/admin` at the server host/port. Host prefers `/host-ip` endpoint and falls back to `window.location.hostname`. Port comes from `WEBSOCKET_CONFIG.SERVER_DEFAULT_PORT`.

Code locations
- Gesture detection: `apps/tv/src/app/services/secret-tap.service.ts`
- Overlay service: `apps/tv/src/app/services/admin-qr-overlay.service.ts`
- Overlay component: `apps/tv/src/app/components/admin-qr-overlay/`
- App wiring (gesture + overlay host):
  - `apps/tv/src/app/app.ts` (subscribe to secret tap and call `adminQrOverlay.show(visibleMs, adminUrl)`)
  - `apps/tv/src/app/app.html` (place `<app-admin-qr-overlay>` once at root)
- Admin URL building: Implemented inline in `apps/tv/src/app/app.ts` next to the Remote QR builder (utility extraction optional).

Accessibility
- Dialog semantics with ESC to close; high-contrast backdrop; copy button feedback is non-blocking.

Behavioral notes
- Available on any TV screen; no authentication required (LAN operator convenience).
- `show()` is idempotent; retriggers extend the visibility window.

Manual verification
- See `TODO.md` → Admin QR code display → Verification for latest smoke test status.

---

## Operational Schemas: Health/Readiness

The Unified Server exposes three HTTP endpoints with JSON payloads for preflight and monitoring. Status values: "ok" | "degraded" | "error".

### `/live`
```json
{
    "status": "live",
    "ts": "2025-08-11T12:34:56.000Z",
    "uptimeSec": 1234
}
```

### `/ready`
```json
{
    "status": "ready",
    "ts": "2025-08-11T12:34:56.000Z",
    "wsInitialized": true,
    "proxiesReady": true
}
```

### `/health`
```json
{
    "status": "ok", // Health status model is referenced in docs but not implemented in code (future work)
    "ts": "2025-08-11T12:34:56.000Z",
    "stateVersion": 42,
    "clients": { "tv": true, "remote": false },
    "children": {
        "tvSsr": { "status": "ok", "port": 5101, "pid": 12345, "restarts": 0 },
        "remoteSsr": { "status": "ok", "port": 5102, "pid": 12346, "restarts": 0 }
    }
}
```

**Note:** Health status model is not currently implemented in code. Future work may add this. Until then, align expectations to the minimal shape actually returned by the server.

---

## Structured Logging (Server + Stubs)

All runtime components (Unified Server, TV Stub, Remote Stub) emit single-line JSON logs to stdout for deterministic parsing during validation.
Context: Initial structured logging (Task 1.12 / 1.20) provides JSON-esque event logs (event name + meta). The next iteration introduces controllable verbosity, consistent schema, and resilience-focused critical logging. This plan is documentation-only until individual tasks are scheduled (target: Milestone 2 "Robust logging" goal).

### Schema

```json
{
    ts: string (ISO 8601 UTC),
    level: "debug" | "info" | "warn" | "error" | "critical",
    event: string (canonical snake_case or dot.notation identifier),
    msg?: string (short human-friendly message),
    meta?: object (arbitrary structured payload; MUST be JSON-serializable)
}
```

**Note:** All constant names and log levels in documentation match those in code.

Additional fixed fields may appear inside `meta` when provided via base context:

- component: "server" | "tv_stub" | "remote_stub"
- client_id: (stub only)

### Canonical Events (Initial Set)

Server:
- server_start
- server_status
- server_ready
- client_connected
- client_registered
- message_received
- navigation_command_handled
- control_command_handled
- action_confirmation_received
- invalid_message (warn)
- websocket_error (error)
- shutdown_signal (warn)
- server_shutdown

Stubs (prefix `ws.` and `http.` retained):
- ws.connect.start
- ws.open
- ws.ack
- ws.state_sync
- ws.close (warn)
- ws.error (error)
- ws.reconnect.schedule
- ws.message / ws.message.parse_error (error)
- http.listen
- http.reset
- http.command.sent / http.command.seed / http.command.error (error)

### Validation Expectations

Automated and manual validation may assert:
1. Each log line parses as valid JSON and contains required fields (ts, level, event).
2. No raw `console.log` usage for runtime events outside the shared logger (future static check may enforce this).
3. `invalid_message` events include error `code` and `message` inside `meta`.
4. For a successful startup sequence, expected ordered events (subset):
    - server_start → server_status → server_ready
5. For a full registration flow (server + both stubs):
    - client_connected (twice) → client_registered (tv) → client_registered (remote) → `state_sync` events (implicit) → navigation/control handling events when commands issued.
6. Absence of `websocket_error` and `invalid_message` during happy-path scenarios.

### Sampling & Buffering

Stubs retain an in-memory rolling buffer (size 500) of emitted log records surfaced via `GET /logs` for black-box test drivers. The server does not buffer (logs are stream-only) to preserve simplicity—tests should tail stdout or capture process logs.

### Extensibility Rules

When adding new events:
- Prefer a stable, machine-oriented event key (snake_case or dotted groups) over free-form text.
- Include only structured data in `meta`; avoid embedding large blobs (>5KB) or circular references.
- Avoid changing semantics of existing event names; introduce a new event instead.

### Failure Modes

If JSON serialization of `meta` fails (e.g., circular reference), the logger emits a fallback record:
```
{ "ts": <iso>, "level": <level>, "event": <original_event>, "msg": "logging_failure", "error": <error_message> }
```
Tests treat any `logging_failure` occurrence as a validation warning.

### Future Enhancements (Not Yet Implemented)
- Static validation script to scan for disallowed raw console usage.
- Log schema contract test ensuring required fields and allowed level values.
- Correlation IDs (e.g., for multi-step command lifecycles) if/when needed.
- Health status model implementation.

### Objectives
- Provide runtime-configurable log level filtering (reduce noise in normal operation).
- Standardize level taxonomy and event classification for predictable observability.
- Improve incident forensics with correlation identifiers and state version tagging.
- Capture and surface unrecoverable failures distinctly ("critical").
- Enable automated schema validation (Task 4.11) without brittle parsing.

### Level Taxonomy
| Level | Purpose | Typical Events |
|-------|---------|----------------|
| debug | High-volume diagnostic detail (development / deep troubleshooting) | message_received, state_broadcast_skipped, internal transition metrics |
| info  | Normal life-cycle & material state changes | server_start, client_registered, state_broadcast, navigation_command_handled |
| warn  | Client / environmental anomalies requiring attention but auto-recoverable | invalid_message (non-fatal), duplicate register attempts, slow_ack (future) |
| error | Operation failed or data rejected with impact to current request/interaction | websocket_error, failed_action_confirmation |
| critical | System integrity risk / process about to exit / invariant breach | uncaught_exception, unhandled_rejection, fatal_config_missing |

### Configuration Mechanism
Priority order (first present wins):
1. Command-line flag: `--log-level=<level>` (server start script enhancement).
2. Environment variable: `LOG_LEVEL`.
3. Default: `info`.

Implementation Sketch:
```ts
// logger.ts enhancement
const activeLevel = resolveLevelFrom(process.argv, process.env.LOG_LEVEL, 'info');
export function createLogger(baseMeta) {
	return {
		debug: (e,m,msg) => emit('debug', e, m, msg),
		info:  (e,m,msg) => emit('info', e, m, msg),
		warn:  (e,m,msg) => emit('warn', e, m, msg),
		error: (e,m,msg) => emit('error', e, m, msg),
		critical: (e,m,msg) => emit('critical', e, m, msg)
	};
}
```

Filtering: Numeric precedence map; drop events below threshold early (no expensive meta computation when avoidable).

### Event Reclassification (Current → Target)
- message_received: info → debug
- state_broadcast_skipped: info → debug
- client_connected/client_disconnected: info (keep)
- navigation_command_handled/control_command_handled/action_confirmation_received: info (retain), add `state_version`
- invalid_message: warn (with code)
- websocket_error: error
- server_start / server_ready: info
- future fatal events: critical

### Metadata Schema (Incremental)
Mandatory base fields per log line (flat JSON object):
- ts (ISO 8601 UTC string)
- level (one of: debug, info, warn, error, critical)
- event
- msg (optional human-readable)
- state_version (if related to FSM change or broadcast)
- client_type / device_id (when related to a specific client)
- error_code (when applicable)
- stack (on error/critical when available)

Enhancement: Ensure creation of lightweight helpers to append `state_version` lazily (`fsm.getSnapshot().version`). Avoid multiple snapshot calls inside loops.

### Critical Error Handling
Attach once (idempotent guard) in server bootstrap:
```ts
process.on('uncaughtException', err => logger.critical('uncaught_exception', { message: err.message, stack: err.stack }));
process.on('unhandledRejection', (reason:any) => logger.critical('unhandled_rejection', { reason: reason?.message || String(reason) }));
```
Option: configurable auto-exit on critical vs continue (env: `EXIT_ON_CRITICAL=true|false`, default true in prod, false in dev).

### Validation Alignment

### Incremental Task Breakdown (Standardized Tasks)

### Non-Goals (For Now)
- Log shipping / external aggregation connectors.
- Sampling / rate limiting strategies.
- Metrics extraction (separate future observability pass).

### Risks & Mitigations
- Risk: Overhead from frequent snapshot calls. Mitigation: cache version inside handler prior to logging multiple events.
- Risk: Inconsistent meta fields. Mitigation: central normalizeMeta helper enforcing schema defaults.
- Risk: Developer drift on event naming. Mitigation: document event registry table inside ARCHITECTURE.md (future doc task).

### Success Criteria
- Ability to reduce normal log volume to high-signal info/warn/error in production.
- Debug mode surfaces skipped broadcasts & granular message receipt without code changes.
- Critical failures always produce a final structured log line before exit.
- Validation task (future) can parse and assert schema with <2% false positives.

---

## Admin & Observability (Optional)
- Minimal Admin UI: An optional backend-only surface may be exposed under `/admin` for validation and troubleshooting.
    - `/admin/logs`: Live log viewer (SSE or WebSocket), with level filter and tail.
    - Access Control: Protect with basic auth, IP allowlist, or bind to localhost only in production.
    - Toggleable Sinks: Console, file, and SSE/WebSocket broadcast can be enabled via configuration.
- Metrics/Health: Extend `/health`, `/ready`, `/live` with structured JSON for monitoring systems.
- Non-invasive: The admin UI is not required for normal operation and can be disabled entirely for production deployments.


---

## Video Integration

The video data structure is designed to support the playback and control of video content within the SAHAR system. It includes metadata for each video, such as its ID, title, YouTube ID, and scenes for scene-based seeking.

**Content Delivery** (Updated 2025-10-21): Catalog data is served via HTTP `GET /api/content/catalog` instead of WebSocket. The server is authoritative for catalog (initialized from `server/src/mock-data.ts`). Clients fetch catalog once on startup via ContentService, then receive only operational state updates via `state_sync` WebSocket messages.

**Deprecated Endpoints**: `POST /seed` returns 410 Gone (catalog is now read-only and initialized from mock-data.ts).

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

---

## Graphics & Controls Implementation (Remote)

The Remote video controls use a standardized icon set and layout optimized for accessibility. The authoritative spec is in `GRAPHICS.md`.

Practical notes:
- Place SVG assets under the Remote app's `assets/icons/` directory (for example, `apps/remote/src/assets/icons/`).
- Reference icons in templates via `<img src="assets/icons/play.svg" alt="Play">` or via `mat-icon` with an SVG registry if desired.
- Ensure ARIA attributes and roles match the semantics: `role="button"`, `aria-label="Play"`, `aria-pressed` for toggle states.
- Enforce large hit targets (~64px+) and high-contrast colors per the spec; keep focus outlines visible.
- Backward/Forward buttons should be disabled when there is no previous/next scene.
- Keep Play/Pause in the same slot and toggle based on the current player state.

For visual layout and the list of required icons, see `GRAPHICS.md`.

---

## Accessibility Features (Narration & Button Descriptions)

**Status**: ✅ Production (Implemented 2025-10)

### Overview

The Remote app includes comprehensive accessibility features using signal-based architecture to support users with hearing, mobility, and vision impairments. The implementation provides Hebrew-language text-to-speech narration and visual button descriptions.

### Architecture Decision

**Pattern**: Signal-Based Modernization of POC (`stackblitz_narated_buttons`)

The implementation modernizes the POC's Observable pattern while preserving all original features:
- POC used BehaviorSubject → Our implementation uses Angular 20 signals
- All POC event handlers preserved (focus/blur, mouse, touch)
- All POC features retained (Hebrew support, niqqud, voice selection)

**Benefits**:
- ✅ Automatic reactivity without manual change detection
- ✅ Type-safe non-null guarantees at compile time
- ✅ Performance optimization via fine-grained signal updates
- ✅ Angular 20 recommended pattern over RxJS Observables

### Component Architecture

#### 1. NarrationService (`shared/shared/src/lib/services/narration.service.ts`)

**Purpose**: Text-to-speech engine with Hebrew language support

**Key Features**:
- **Web Speech API Integration**: Native browser `window.speechSynthesis`
- **Hebrew Language Support**: Configured for `he-IL` locale
- **Smart Voice Selection**: Prefers Google Hebrew voice, falls back to system voices
- **Niqqud Handling**: Regex-based removal of cantillation marks for accurate pronunciation
  - `RE_CANTILLATION`: Removes trop/te'amim marks
  - `RE_NIQQUD`: Removes vowel points (optional, configurable)
- **Voice Loading**: Handles `onvoiceschanged` event for late voice discovery
- **Configuration Options**: `rate`, `pitch`, `volume`, `voiceName` per utterance

**Signal-Based State** (Modernization):
```typescript
readonly isSpeaking = signal<boolean>(false);   // Tracks active speech
readonly isSupported = signal<boolean>(false);  // Browser capability
readonly isEnabled = signal<boolean>(false);    // User preference
```

**Public API**:
```typescript
speak(text: string, options?: SpeechOptions): void
enable(): void
disable(): void
setLang(lang: string): void
cancel(): void  // Stop current speech
```

**Implementation Details**:
- Cancels previous utterance before speaking new text
- Updates `isSpeaking` signal via utterance `onstart`/`onend` events
- Filters voices by language code for Hebrew preference
- Sanitizes Hebrew text by removing niqqud marks before speech

**Dependencies**: None (native Web Speech API only)

**Location**: `shared/shared/src/lib/services/narration.service.ts` (140 lines)

---

#### 2. ButtonDescriptionService (`shared/shared/src/lib/services/button-description.service.ts`)

**Purpose**: State management for button description text

**Architecture**: Signal-based replacement for POC's BehaviorSubject pattern

**Implementation**:
```typescript
@Injectable({ providedIn: 'root' })
export class ButtonDescriptionService {
  readonly description = signal<string | null>(null);
  
  setDescription(text: string | null): void {
    this.description.set(text);
  }
}
```

**Benefits over POC**:
- Simpler API (no Observable subscription needed)
- Direct signal consumption in templates
- Automatic change detection propagation

**Location**: `shared/shared/src/lib/services/button-description.service.ts` (10 lines)

---

#### 3. ButtonDescriptionPanelComponent (`shared/shared/src/lib/components/button-description-panel/`)

**Purpose**: Fixed bottom banner displaying button descriptions

**Architecture**: Standalone component with OnPush change detection

**Template** (button-description-panel.component.html):
```html
@if (description(); as desc) {
  <div 
    class="description-panel"
    role="status"
    [attr.aria-live]="desc ? 'polite' : null"
    [attr.aria-hidden]="!desc">
    {{ desc }}
  </div>
}
```

**Styles** (button-description-panel.component.scss) - Ported from POC:
```scss
.description-panel {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  
  font-size: clamp(18px, 2.6vw, 28px);  // Responsive sizing
  min-height: 64px;
  padding: 12px 20px;
  
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(6px);
  
  color: white;
  text-align: center;
  
  z-index: 10000;
  
  // Slide-up animation
  animation: slideUp 160ms ease-out;
  
  @keyframes slideUp {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }
}
```

**ARIA Attributes** (Accessibility):
- `role="status"`: Live region for screen readers
- `aria-live="polite"`: Announces changes when user is idle
- `aria-hidden`: Hides from screen readers when empty

**Implementation**:
```typescript
@Component({
  selector: 'lib-button-description-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './button-description-panel.component.html',
  styleUrls: ['./button-description-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ButtonDescriptionPanelComponent {
  private descriptionService = inject(ButtonDescriptionService);
  
  // Direct signal consumption - no manual subscription needed
  protected readonly description = this.descriptionService.description;
}
```

**Placement**: Single instance at Remote app root (`apps/remote/src/app/app.html`)

**Location**: `shared/shared/src/lib/components/button-description-panel/` (30 lines .ts, 25 lines .scss)

---

#### 4. FocusDescDirective (`shared/shared/src/lib/directives/focus-desc.directive.ts`)

**Purpose**: Coordinate description panel and narration on user interactions

**Architecture**: Standalone directive with comprehensive event handling

**Selector**: `[libFocusDesc]`

**Inputs**:
```typescript
@Input({ required: true }) libFocusDesc!: string;  // Description text
@Input() speakOnFocus = true;  // Enable/disable narration
```

**Event Handlers** (All from POC):

1. **Focus/Blur** (Primary - keyboard navigation):
   ```typescript
   @HostListener('focus')
   onFocus() {
     this.descriptionService.setDescription(this.libFocusDesc);
     if (this.speakOnFocus && this.narrationService.isEnabled()) {
       this.narrationService.speak(this.libFocusDesc);
     }
   }
   
   @HostListener('blur')
   onBlur() {
     this.descriptionService.setDescription(null);
   }
   ```

2. **Mouse Hover** (Shows description, no speech):
   ```typescript
   @HostListener('mouseenter')
   onMouseEnter() {
     this.descriptionService.setDescription(this.libFocusDesc);
   }
   
   @HostListener('mouseleave')
   onMouseLeave() {
     this.descriptionService.setDescription(null);
   }
   ```

3. **Touch Long-Press** (700ms threshold):
   ```typescript
   @HostListener('touchstart')
   onTouchStart() {
     this.touchTimer = setTimeout(() => {
       this.descriptionService.setDescription(this.libFocusDesc);
       if (this.speakOnFocus && this.narrationService.isEnabled()) {
         this.narrationService.speak(this.libFocusDesc);
       }
     }, 700);
   }
   
   @HostListener('touchend')
   @HostListener('touchcancel')
   onTouchEnd() {
     if (this.touchTimer) {
       clearTimeout(this.touchTimer);
       this.touchTimer = null;
     }
   }
   ```

**Service Integration**:
```typescript
private descriptionService = inject(ButtonDescriptionService);
private narrationService = inject(NarrationService);
```

**Design Pattern**:
- Directive always calls service methods
- Services check their own enabled state internally
- No complex conditional logic in directive

**Location**: `shared/shared/src/lib/directives/focus-desc.directive.ts` (56 lines)

---

### Remote App Integration

#### App Root Setup (`apps/remote/src/app/app.ts`)

**1. Service Initialization**:
```typescript
export class App {
  private readonly narrationService = inject(NarrationService);
  
  ngOnInit() {
    // Initialize Hebrew narration
    this.narrationService.setLang('he-IL');
    this.narrationService.enable();
    
    // ... other initialization
  }
}
```

**2. Component Placement** (`apps/remote/src/app/app.html`):
```html
<div class="remote-container">
  <!-- Single instance at app root -->
  <lib-button-description-panel></lib-button-description-panel>
  
  <!-- Rest of app content -->
  <video-controls></video-controls>
</div>
```

#### Video Controls Integration (`apps/remote/src/app/components/video-controls/video-remote-control/`)

**Component TypeScript**:
```typescript
@Component({
  selector: 'video-remote-control',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    FocusDescDirective  // Import directive
  ],
  // ...
})
export class VideoRemoteControlComponent {
  // Component logic
}
```

**Template with Directive** (10 buttons total):

1. **Navigation Buttons** (3):
   ```html
   <button mat-fab libFocusDesc="מעבר לדף הבית" (click)="onControlCommand('go-home')">
     <mat-icon>home</mat-icon>
   </button>
   
   <button mat-fab 
     [libFocusDesc]="playerState.isFullscreen ? 'יציאה ממסך מלא' : 'מעבר למסך מלא'"
     (click)="onControlCommand('toggle-fullscreen')">
     <mat-icon>{{ playerState.isFullscreen ? 'fullscreen_exit' : 'fullscreen' }}</mat-icon>
   </button>
   
   <button mat-fab libFocusDesc="חזרה לרשימת סצנות" (click)="onBackToScenes()">
     <mat-icon>exit_to_app</mat-icon>
   </button>
   ```

2. **Playback Buttons** (3):
   ```html
   <button mat-fab libFocusDesc="סצנה קודמת" 
     [disabled]="!hasPreviousScene" (click)="onControlCommand('previous-scene')">
     <mat-icon>skip_previous</mat-icon>
   </button>
   
   <button mat-fab 
     [libFocusDesc]="playerState.isPlaying ? 'הַשְׁהֵה אֶת הַוִּידֵאוֹ' : 'נַגֵּן אֶת הַוִּידֵאוֹ'"
     (click)="onControlCommand('play-pause')">
     <mat-icon>{{ playerState.isPlaying ? 'pause' : 'play_arrow' }}</mat-icon>
   </button>
   
   <button mat-fab libFocusDesc="סצנה הבאה"
     [disabled]="!hasNextScene" (click)="onControlCommand('next-scene')">
     <mat-icon>skip_next</mat-icon>
   </button>
   ```

3. **Volume Buttons** (4):
   ```html
   <button mat-fab libFocusDesc="הנמכת עוצמת הקול" (click)="volumeDown()">
     <mat-icon>remove</mat-icon>
   </button>
   
   <button mat-fab 
     [libFocusDesc]="playerState.isMuted ? 'ביטול השתקה' : 'השתקת הקול'"
     (click)="onControlCommand('toggle-mute')">
     <mat-icon>{{ playerState.isMuted ? 'volume_off' : 'volume_up' }}</mat-icon>
   </button>
   
   <button mat-fab libFocusDesc="הַגְּבֶּר אֶת עוצְמַת הַקוֹל" (click)="volumeUp()">
     <mat-icon>add</mat-icon>
   </button>
   ```

---

### Hebrew Text Conventions

**All button descriptions use Hebrew with niqqud for accurate pronunciation**:

| Button | Hebrew Text (with niqqud) | Translation |
|--------|---------------------------|-------------|
| Play | נַגֵּן אֶת הַוִּידֵאוֹ | Play the video |
| Pause | הַשְׁהֵה אֶת הַוִּידֵאוֹ | Pause the video |
| Volume Up | הַגְּבֶּר אֶת עוצְמַת הַקוֹל | Increase volume |
| Volume Down | הנמכת עוצמת הקול | Decrease volume |
| Mute | השתקת הקול | Mute |
| Unmute | ביטול השתקה | Unmute |
| Home | מעבר לדף הבית | Go to home |
| Fullscreen | מעבר למסך מלא | Enter fullscreen |
| Exit Fullscreen | יציאה ממסך מלא | Exit fullscreen |
| Exit | חזרה לרשימת סצנות | Return to scenes |
| Previous | סצנה קודמת | Previous scene |
| Next | סצנה הבאה | Next scene |

**Niqqud Processing**:
- NarrationService includes regex patterns to remove niqqud/cantillation before speech
- Visual display preserves niqqud for reading clarity
- Web Speech API receives sanitized text for better pronunciation

---

### Implementation Scope

**Current Implementation** (Remote video controls):
- ✅ NarrationService with all POC features + signals
- ✅ ButtonDescriptionService (signal-based)
- ✅ ButtonDescriptionPanelComponent (POC styles + ARIA)
- ✅ FocusDescDirective (all POC event handlers)
- ✅ 10 video control buttons with Hebrew descriptions
- ✅ Service initialization in Remote app
- ✅ Component placement at app root

**Future Scope** (Planned but not implemented):
- ⏳ Navigation grids (performers/videos/scenes cards)
- ⏳ Narration toggle (mat-slide-toggle in toolbar)
- ⏳ TV app integration (if needed)

---

### Dependencies

**Runtime**:
- Web Speech API (native browser, no external library)
- Angular 20 signals (core framework)
- Angular Material (buttons, icons)

**Development**:
- TypeScript 5.7+
- Angular CLI 20+
- RxJS (minimal usage)

**Browser Support**:
- Chrome 88+ (full support)
- Firefox 85+ (partial - voice selection limited)
- Safari 14+ (partial - requires user gesture)
- Edge 88+ (full support via Chromium)

**Hebrew Voice Support**:
- Google Hebrew (best quality - installed on most Android/Chrome OS)
- Microsoft Hebrew (Windows 10+)
- System voices (fallback)

---

### Testing Status

**Manual Validation** (Completed):
- ✅ Keyboard navigation (Tab through buttons)
- ✅ Focus shows description panel
- ✅ Focus triggers Hebrew narration
- ✅ Mouse hover shows description (no speech)
- ✅ Touch long-press (700ms) triggers description + speech
- ✅ All 10 buttons have correct Hebrew text
- ✅ Dynamic descriptions (play/pause, mute/unmute, fullscreen)

**Known Issues**:
- None currently reported

**Automated Tests**:
- ⏳ Unit tests for services (planned)
- ⏳ Component tests (planned)
- ⏳ Integration tests (planned)

---

### Accessibility Standards Compliance

**WCAG 2.1 Level AA**:
- ✅ 2.1.1 Keyboard - All functionality via keyboard
- ✅ 2.4.3 Focus Order - Logical tab order
- ✅ 2.4.7 Focus Visible - Clear focus indicators
- ✅ 4.1.2 Name, Role, Value - ARIA attributes on all controls
- ✅ 4.1.3 Status Messages - Live region announcements

**Additional Features**:
- ✅ Large hit targets (Material fab buttons ~56px)
- ✅ High contrast text (white on dark background)
- ✅ Responsive font sizing (clamp 18-28px)
- ✅ Multi-modal interaction (keyboard, mouse, touch)
- ✅ Screen reader support (ARIA live regions)

---

#### 5. AppToolbarComponent (`shared/shared/src/lib/components/app-toolbar/`)

**Purpose**: Shared navigation toolbar for TV and Remote apps

**Architecture**: Standalone component with signal-based inputs

**Refactor Date**: 2025-10-29 - Extracted from duplicated TV/Remote toolbar code

**Component API**:
```typescript
@Component({
  selector: 'shared-app-toolbar',
  standalone: true,
  imports: [CommonModule, MatToolbarModule, MatButtonModule, MatIconModule],
  templateUrl: './app-toolbar.component.html',
  styleUrls: ['./app-toolbar.component.scss']
})
export class AppToolbarComponent {
  // Signal-based inputs
  title = input.required<string>();                    // "📺 SAHAR TV" or "📱 SAHAR TV Remote"
  connectionStatus = input.required<ConnectionState>(); // 'connected' | 'connecting' | 'disconnected'
  
  // Output events
  homeClick = output<void>();
  
  // Helper method
  protected getStatusDisplay(status: ConnectionState): string {
    // Returns: '🟢 Connected' | '🟡 Connecting...' | '🔴 Disconnected'
  }
}
```

**Template Structure** (app-toolbar.component.html):
```html
<mat-toolbar color="primary">
  <span class="header-title">{{ title() }}</span>
  <button mat-icon-button (click)="onHomeClick()">
    <mat-icon>home</mat-icon>
  </button>
  <span class="spacer"></span>
  <span class="connection-status">
    {{ getStatusDisplay(connectionStatus()) }}
  </span>
</mat-toolbar>
```

**Shared Styles** (app-toolbar.component.scss) - Merged minimal subset:
```scss
:host {
  display: contents;
}

mat-toolbar {
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);  // Lighter shadow (modern)
  flex-shrink: 0;  // Prevent shrinking in flex layouts
  
  .header-title {
    font-size: 1.2rem;
    font-weight: 600;
  }
  
  .spacer {
    flex: 1 1 auto;
  }
  
  .connection-status {
    font-weight: 500;
    color: white;
    font-size: 0.9rem;
  }
}
```

**App-Specific Overrides**:

*TV App* (`apps/tv/src/app/app.scss`):
```scss
// TV-specific: Make toolbar 10% of viewport height
shared-app-toolbar mat-toolbar {
  height: 10vh;
  min-height: 64px;
}
```

*Remote App*: No overrides needed (uses default Material toolbar height)

**Usage**:

*TV App* (`apps/tv/src/app/app.html`):
```html
<shared-app-toolbar
  [title]="'📺 SAHAR TV'"
  [connectionStatus]="connectionStatus"
  (homeClick)="onHomeClick()">
</shared-app-toolbar>
```

*Remote App* (`apps/remote/src/app/app.html`):
```html
<shared-app-toolbar
  [title]="'📱 SAHAR TV Remote'"
  [connectionStatus]="connectionStatus"
  (homeClick)="onHomeClick()">
</shared-app-toolbar>
```

**Benefits**:
- ✅ **DRY Principle**: Eliminated ~50 lines of duplicated toolbar code
- ✅ **Single Source of Truth**: Toolbar behavior/styling defined once
- ✅ **Type Safety**: Signal-based inputs with strong typing
- ✅ **Maintainability**: Changes only need to happen in one place
- ✅ **Consistency**: Guaranteed identical behavior across apps
- ✅ **App Flexibility**: Each app can override styles locally if needed

**Location**: `shared/shared/src/lib/components/app-toolbar/` (3 files: .ts, .html, .scss)

**Code Eliminated**:
- TV: Removed `MatButtonModule`, `MatIconModule` imports, removed `.tv-nav-bar` styles
- Remote: Removed `MatToolbarModule`, `MatButtonModule`, `MatIconModule` imports, removed `.remote-nav-bar` styles

---

### Files Modified/Created

**Created** (`shared/shared/src/lib/`):
1. `services/narration.service.ts` - 140 lines
2. `services/button-description.service.ts` - 10 lines
3. `components/button-description-panel/button-description-panel.component.ts` - 30 lines
4. `components/button-description-panel/button-description-panel.component.scss` - 25 lines
5. `components/button-description-panel/button-description-panel.component.html` - 8 lines
6. `directives/focus-desc.directive.ts` - 56 lines
7. `components/app-toolbar/app-toolbar.component.ts` - 50 lines (2025-10-29)
8. `components/app-toolbar/app-toolbar.component.html` - 12 lines (2025-10-29)
9. `components/app-toolbar/app-toolbar.component.scss` - 25 lines (2025-10-29)

**Modified**:
1. `shared/shared/src/lib/services/index.ts` - Added exports
2. `shared/shared/src/lib/components/index.ts` - Added exports (button-description-panel, app-toolbar)
3. `shared/shared/src/lib/directives/index.ts` - Created with export
4. `shared/shared/src/public-api.ts` - Added directives export
5. `apps/remote/src/app/app.ts` - Service initialization, AppToolbarComponent import (2025-10-29)
6. `apps/remote/src/app/app.html` - Component placement, toolbar refactored (2025-10-29)
7. `apps/remote/src/app/app.scss` - Removed .remote-nav-bar styles (2025-10-29)
8. `apps/remote/src/app/components/video-controls/video-remote-control/video-remote-control.component.ts` - Directive import
9. `apps/remote/src/app/components/video-controls/video-remote-control/video-remote-control.component.html` - Directive usage (9 buttons)
10. `apps/tv/src/app/app.ts` - AppToolbarComponent import (2025-10-29)
11. `apps/tv/src/app/app.html` - Toolbar refactored (2025-10-29)
12. `apps/tv/src/app/app.scss` - Replaced .tv-nav-bar with height override (2025-10-29)

**Total Lines of Code**: ~370 lines (services + components + directive + toolbar + integration)

---

For architectural overview, see [ARCHITECTURE.md — Accessibility & Narration Features](./ARCHITECTURE.md#accessibility--narration-features). For validation flows, see [VALIDATION.md — Accessibility Testing](#).

---
