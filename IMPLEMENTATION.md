# SAHAR TV Remote - Implementation details

This document outlines the implementation details for the SAHAR TV Remote system into the Unified Appliance Model, as defined in `ARCHITECTURE.md`.

## Implementation Guidelines

-   **Code Style**: Adhere to existing code styles. Use Prettier and ESLint where configured.
-   **Testing**: Every significant unit or functionality should have a corresponding set of tests.
    App level and integration tests will be documented in [VALIDATION.md](VALIDATION.md).
-   **Documentation**: Any significant feature, class, function and variable should be inline documented in detail.
-   **Completion**: Planning and execution management is done via GitHub tools.

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

## Shared Library (`shared/`)

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
    - **ContentService** (Added 2025-10-21): HTTP-based catalog delivery with caching
        - **Purpose**: Fetch static content catalog once via HTTP instead of receiving it in every WebSocket state_sync message
        - **HTTP Endpoint**: `GET /api/content/catalog` returns `{ performers[], videos[], scenes[] }`
        - **Caching**: In-memory cache prevents duplicate fetches
        - **Public Accessors**:
          - `getPerformers()`: Returns flat performers array
          - `getPerformer(id)`: Finds performer by ID (O(n))
          - `getVideosForPerformer(performerId)`: Filters videos by `performerId` FK
          - `getVideo(id)`: Finds video by ID (O(n))
          - `getScenesForVideo(videoId)`: Filters scenes by `videoId` FK
          - `getScene(id)`: Finds scene by ID (O(n))
        - **Usage**: Apps call `await contentService.fetchCatalog()` on startup before connecting WebSocket
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

### ApplicationState definition and implementation
The state is maintained and managed in the server FSM. Clients receive authoritative state snapshots via `state_sync` messages after each committed change.

**Navigation State Management** (Updated 2025-10-21):
- Server FSM owns navigation state as IDs only: `{ currentLevel, performerId?, videoId?, sceneId? }`
- FSM transitions on navigation commands:
  - `navigate_to_performer`: sets `currentLevel='videos'`, `performerId`
  - `navigate_to_video`: sets `currentLevel='scenes'`, `videoId`
  - `navigate_to_scene`: sets `currentLevel='playing'`, `sceneId` ⭐ triggers video playback
  - `navigate_back`: steps back one level (playing→scenes→videos→performers)
  - `navigate_home`: resets to `currentLevel='performers'`
- **HTTP Content Delivery** (Migrated 2025-10-21):
  - Catalog delivered via `GET /api/content/catalog` (not in WebSocket state)
  - `ApplicationState` no longer has `data` field - operational state only
  - Clients fetch catalog once on startup via ContentService
  - Server FSM stores catalog in private `catalogData` field (initialized from mock-data.ts)
- **Flat Normalized Catalog Structure** (Implemented 2025-10-20):
  - `CatalogData { performers[], videos[], scenes[] }` with flat arrays
  - Foreign key references enable O(n) lookups: `Video.performerId`, `Scene.videoId`
  - No nested data structures - each entity stored once in its own array
- Clients derive display objects via ContentService and WebSocketBaseService:
  - ContentService: Fetches and caches catalog, provides lookup methods
  - WebSocketBaseService: Delegates catalog queries to ContentService
  - `getCurrentPerformer()`: Gets performerId from state, queries ContentService
  - `getCurrentVideo()`: Gets videoId from state, queries ContentService
  - `getCurrentScene()`: Gets sceneId from state, queries ContentService
  - `getVideosForPerformer(performerId)`: Delegates to ContentService
  - `getScenesForVideo(videoId)`: Delegates to ContentService
- TV app: checks `currentLevel === 'playing'` to show video player vs navigation grids

```typescript
// Shared PlayerState interface (consolidated from duplicate implementations)
export interface PlayerState {
    isPlaying: boolean;
    isFullscreen: boolean;
    currentTime: number;
    duration: number;
    volume: number;      // 0-100 range (standardized across YouTube API and UI)
    muted: boolean;
    youtubeId?: string;
    // Optional explicit marker for which scene is currently playing
    playingSceneId?: string;
}

// Monotonic version increases on each committed state change
export interface ApplicationState {
    version: number;
    fsmState: FsmState;
    connectedClients: {
        tv?: ClientInfo;
        remote?: ClientInfo;
    };
    navigation: {
        currentLevel: NavigationLevel;
        performerId?: string;
        videoId?: string;
        sceneId?: string;
    };
    player: PlayerState;  // Uses shared PlayerState interface
    // Flat normalized catalog structure (Migrated 2025-10-20)
    data?: CatalogData;  // { performers[], videos[], scenes[] } with FK references
    error?: {
        code: string;
        message: string;
    };
}

// CatalogData: Flat normalized structure (Migrated 2025-10-20)
export interface CatalogData {
    performers: Performer[];  // { id, name, thumbnail, description }
    videos: Video[];          // { id, title, url, performerId, description }
    scenes: Scene[];          // { id, title, videoId, startTime, endTime, description }
}
```

---

## Client-Side - TV & Remote Apps

### TV Application (`apps/tv/`)

#### Note: YouTube POC (Angular YouTube package)
- Use the Angular YouTube package to embed a minimal player in the TV app. If the package exposes built-in controls, render them (no custom controls required for the POC).
 - Wire the player where applicable via the existing server-driven state (stateless rendering from `state_sync`, see Task 2.5).
- Keep tests shallow and deterministic (mock/stub the player API); avoid loading the real iframe in unit tests.
- Validation of end-to-end playback remains in `VALIDATION.md` (Flow 2 — Video Playback Control).

### Remote Application (`apps/remote/`)

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
