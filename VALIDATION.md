# SAHAR - Validation Strategy

This document outlines the comprehensive testing and validation strategy for the SAHAR Unified Appliance Model. It defines a series of manual and automated tests to ensure the system is "Always Alive, Always Correct."

---

## 1. Validation Structure

Validation is divided into three primary phases, executed sequentially after any implementation task. A lightweight multi‑mode runner (npm scripts under `validation/`) lets you spin up only the pieces needed per phase (see Section 1.1).

1.  **Unit Testing**: Focused, automated tests for individual components.
2.  **Per-App Testing**: Manual, flow-based tests for each application against a mock server.
3.  **Full Integration Testing**: Automated, end-to-end tests of the complete system.

### 1.1 Runtime Modes (Rapid Iteration)

The validation workspace provides four orchestrated modes (no extra JS launcher files — pure npm scripting). Choose the lightest mode that still exercises the layer you are changing:

Mode | Purpose | Angular Builds | Processes Started
-----|---------|----------------|------------------
`mode:prod` | Full stack (both real UIs) | tv + remote | server
`tv-stub` | Real Remote UI, simulated TV | remote | server + tv stub
`remote-stub` | Real TV UI, simulated Remote | tv | server + remote stub
`stubs` | Protocol / server only (fast loop) | none | server + both stubs

Invocation examples (from repo root):
```powershell
npm run mode:prod -w validation
npm run tv-stub -w validation
npm run remote-stub -w validation
npm run stubs -w validation
```

Section 7 flows map naturally:
- Flows 8–10 are best exercised via `stubs`, `tv-stub`, or `remote-stub` respectively.
- Full integration (Section 4) typically uses `mode:prod` (or targeted mixed modes while iterating).

---

## 2. Unit Testing

### 2.1. Server-Side FSM (`server/websocket-server.ts`)

-   **Method**: Automated unit tests.
-   **Validation Tasks**:
    -   [ ] **Validation Task 2.1.1**: State Transitions `(YYYY-MM-DD)` – Verify all valid and invalid state transitions (including rejection paths and no-op suppression).
    -   [ ] **Validation Task 2.1.2**: Message Handling `(YYYY-MM-DD)` – Test handlers for `register`, `navigation_command`, `control_command`, `data` (seed), and ensure invalid message rejection.
    -   [ ] **Validation Task 2.1.3**: State Sync Generation `(YYYY-MM-DD)` – Ensure `state_sync` messages emitted only on real changes; version monotonicity enforced.
    -   [ ] **Validation Task 2.1.4**: ACK Logic `(YYYY-MM-DD)` – Verify `ack` processing, outstanding ack tracking. Timeout/heartbeat checks deferred to Milestone 2 (Task 1.19).

### 2.2. Client-Side Services (`shared/services/websocket-base.service.ts`)

-   **Method**: Automated unit tests (Jasmine/Karma).
-   **Validation Tasks**:
    -   [ ] **Validation Task 2.2.1**: Connection Management `(YYYY-MM-DD)` – Test WebSocket connect, register, ack receipt, reconnection backoff, and state replay on reconnect.
    -   [ ] **Validation Task 2.2.2**: Message Serialization `(YYYY-MM-DD)` – Verify correct outbound payload shapes and ack correlation; reject malformed sends.

---

## 3. Per-App Testing (Manual Flows)

These tests are performed manually by running the server and one client application at a time.

### 3.1. TV Application (`apps/tv`)

-   **Objective**: Ensure the TV app is a pure, stateless renderer of the server's FSM.

-   **Flow 1: Initial Connection**
    1.  Start the WebSocket server.
    2.  Launch the TV app.
    3.  **Expected**: App connects and sends a `register` message with `client_type: 'tv'`.
    4.  **Expected**: App receives an `ack` for the registration.
    5.  **Expected**: App receives an initial `state_sync` message and renders the default UI (e.g., "Waiting for Remote...").

-   **Flow 2: Receiving Navigation State**
    1.  (Continuing from Flow 1)
    2.  Use a mock client to send a `navigation_command` to the server.
    3.  **Expected**: Server updates its FSM.
    4.  **Expected**: TV app receives a `state_sync` message with the new navigation state.
    5.  **Expected**: TV app UI updates to display the corresponding view (e.g., a grid of videos).

### 3.2. Remote Application (`apps/remote`)

-   **Objective**: Ensure the Remote app correctly sends commands and reflects server state.

-   **Flow 1: Initial Connection**
    1.  Start the WebSocket server.
    2.  Launch the Remote app.
    3.  **Expected**: App connects and sends a `register` message with `client_type: 'remote'`.
    4.  **Expected**: App receives an `ack` for the registration.
    5.  **Expected**: App receives an initial `state_sync` and renders its default UI.

-   **Flow 2: Sending Navigation Commands**
    1.  (Continuing from Flow 1)
    2.  User clicks a navigation button in the Remote app (e.g., "Scenes").
    3.  **Expected**: Remote app sends a `navigation_command` to the server.
    4.  **Expected**: Remote app receives an `ack` for the command.
    5.  **Expected**: Remote app receives a `state_sync` reflecting the new state and updates its UI if necessary.

---

## 4. Full Integration Testing (`/validation`)

-   **Objective**: Automate end-to-end user stories involving the real server and both client applications.
-   **Method**: Prefer the npm mode scripts (`mode:prod`) for standing up the environment. The legacy `sahar-validation.ps1` tasks remain available (VS Code tasks: Environment Check / Start Applications / Integration Tests) but are being phased out in favor of pure package scripts.

-   **Flow 1: Full System Startup & Navigation**
    1.  `sahar-validation.ps1 start`: Starts the server, TV app, and Remote app.
    2.  **Expected**: Server logs show both clients connect and register successfully.
    3.  `sahar-validation.ps1 test -name "navigation"`: The test driver instructs the Remote app.
    4.  **Action**: Remote test driver simulates a click on the "Videos" navigation button.
    5.  **Expected**: Remote app sends `navigation_command`. Server sends `ack` to Remote. Server sends `state_sync` to both clients.
    6.  **Expected**: TV app test driver verifies the UI now displays the video grid.
    7.  **Expected**: Remote app test driver verifies its UI is in the correct state.

-   **Flow 2: Video Playback Control**
    1.  (Continuing from Flow 1, with video grid displayed)
    2.  `sahar-validation.ps1 test -name "playback"`: The test driver continues the scenario.
    3.  **Action**: Remote driver simulates selecting and playing a video.
    4.  **Expected**: Remote sends `control_command` (e.g., `play_video`). Server sends `ack`. Server sends `state_sync`.
    5.  **Expected**: TV driver verifies the video player is now active and playing the correct video.
    6.  **Action**: Remote driver simulates pausing the video.
    7.  **Expected**: Remote sends `control_command` (`pause_video`). Server sends `ack`. Server sends `state_sync`.
    8.  **Expected**: TV driver verifies the video is paused.

-   **Flow 3: Client Reconnection**
    1.  (Continuing from Flow 2)
    2.  `sahar-validation.ps1 stop -app "tv"`: Manually stop the TV application process.
    3.  **Expected**: Server detects the disconnection and updates its FSM.
    4.  **Expected**: Remote app receives a `state_sync` indicating the TV is disconnected.
    5.  `sahar-validation.ps1 start -app "tv"`: Restart the TV application.
    6.  **Expected**: TV app reconnects, re-registers, and receives the current `state_sync` from the server, displaying the paused video player correctly.

-   **Flow 4: Health & Readiness Preflight**
    1.  GET `/live`.
    2.  **Expected**: JSON heartbeat (e.g., `{ "status": "live" }`).
    3.  GET `/ready`.
    4.  **Expected**: `{ "status": "ready" }` once WebSocket and proxy init are complete.
    5.  GET `/health`.
    6.  **Expected**: Overall OK; in production, includes SSR child status objects (e.g., TV and Remote SSR children reported as healthy with ports).

-   **Flow 5: Dev SSR Proxy Smoke**
    1.  Start Angular SSR dev servers: TV on `4203`, Remote on `4202`.
    2.  Start the Unified Server in dev mode.
    3.  GET `/` (or `/tv`).
    4.  **Expected**: Returns SSR HTML for TV via proxy.
    5.  GET `/remote`.
    6.  **Expected**: Returns SSR HTML for Remote via proxy.
    7.  Request `/assets/...` and `/remote/assets/...`.
    8.  **Expected**: Served by the Unified Server from built browser assets (200 OK, correct content-type).
    9.  Remote connects to `ws(s)://<server>/ws`.
    10. **Expected**: WebSocket upgrade succeeds (101). Registration/ack will be validated in other flows.

-   **Flow 6: Prod SSR Discovery & Children**
    1.  Build apps to produce SSR bundles (TV and Remote) and browser assets.
    2.  **Action**: `ng build` in each app (or orchestrated build) producing `.../dist/.../{browser,server}`.
    3.  Start the Unified Server in production mode.
    4.  **Expected**: Logs show discovered SSR entrypoints for TV and Remote; children spawned with ports.
    5.  GET `/` (or `/tv`) and `/remote`.
    6.  **Expected**: SSR HTML rendered via child processes.
    7.  Request `/assets/...` and `/remote/assets/...`.
    8.  **Expected**: Served by the Unified Server from browser assets.
    9.  GET `/health`.
    10. **Expected**: Includes child status (healthy, port, restart count if applicable).

-   **Flow 7: QR Onboarding**
    1.  TV displays a QR encoding `http(s)://<server-ip>:<port>/remote`.
    2.  **Expected**: URL is reachable from the iPad on the same network.
    3.  Scan QR with the iPad camera and open the detected URL in the browser.
    4.  **Expected**: Remote app loads successfully.
    5.  Remote connects to WebSocket at `/ws` and sends `register`.
    6.  **Expected**: Server responds with `ack`.
    7.  Remote receives `state_sync` and renders initial UI.
    8.  **Expected**: Default Remote screen is displayed and responsive.

---

## 5. Server & SSR Validation (References)

To avoid duplication, Section 4 contains the canonical flow definitions. Use the mappings below:

- 5.1 Health & Readiness Endpoints → see Section 4, Flow 4: Health & Readiness Preflight.
- 5.2 Dev SSR Proxy Smoke → see Section 4, Flow 5: Dev SSR Proxy Smoke.
- 5.3 Prod SSR Discovery & Children → see Section 4, Flow 6: Prod SSR Discovery & Children.
- 5.4 QR Onboarding → see Section 4, Flow 7: QR Onboarding.

---

## 6. App Stubs for Separate Validation (in `/validation`)

Purpose: Provide lightweight, controllable stand-ins for the TV and Remote apps so each real app and the server can be validated independently.

### 6.1. Common Stub Contract

- Transport: Single-origin WebSocket to `/ws` using the shared protocol (`register`, `ack`, `state_sync`, commands).
- Identity: Deterministic `client_id` (e.g., `tv-stub-1`, `remote-stub-1`) included in `register`.
- Reconnection: Exponential backoff with jitter; resumes with `register` and awaits `state_sync`.
- Control API: Each stub exposes a small HTTP server for test drivers.
    - Health: `GET /health` → `{ status: "ok", connected: boolean }`.
    - State: `GET /state` → last known `state_sync` payload and timestamps.
    - Actions (Remote stub only): `POST /command` with `{ type: "navigation_command"|"control_command", payload: {...} }`.
    - Reset: `POST /reset` clears local state/metrics.
- Logging: Structured logs to stdout with timestamps and message type, plus rolling in-memory buffer returned at `GET /logs`.
- Exit codes: Non-zero on uncaught error; zero on SIGINT/SIGTERM.

Locations
- `validation/stubs/tv-stub.ts` — TV renderer stub
- `validation/stubs/remote-stub.ts` — Remote controller stub

### 6.2. TV Stub Specification (`validation/stubs/tv-stub.ts`)

- Registration
    - Sends `register` with `{ client_type: "tv", client_id }` on connect; awaits `ack`.
- State handling
    - On `state_sync`, store payload, expose via `GET /state`, and send `ack`.
- No outbound commands
    - The TV stub never emits navigation/control; it is a pure renderer.
- HTTP control
    - `GET /health`, `GET /state`, `GET /logs`, `POST /reset` as per common contract.
- Configuration
    - Sourced from `validation/config/validation-config.ts` (central stub ports, reconnect/backoff) plus optional CLI overrides: `--server-url` (default built via `buildLocalServerUrl()`), `--http-port` (default TV stub port), `--client-id`.

### 6.3. Remote Stub Specification (`validation/stubs/remote-stub.ts`)

- Registration
    - Sends `register` with `{ client_type: "remote", client_id }`; awaits `ack`.
- Initial data
    - Optionally sends `data` message once after register to seed server FSM when provided via `POST /command` with `{ type: "seed", payload: {...} }`.
- Commands
    - Accepts `POST /command` and immediately emits the mapped WebSocket message (`navigation_command` or `control_command`), then awaits `ack`.
- State handling
    - On `state_sync`, store payload, expose via `GET /state`, and send `ack`.
- Configuration
    - Sourced from `validation/config/validation-config.ts` with same override semantics as TV stub.

---

## 7. Stub-Based Validation Flows (Canonical)

These flows validate components independently using the stubs above. They are canonical; other sections should reference them.

-   **Flow 8: Validate Server in Isolation (TV Stub + Remote Stub)**
        1.  Start Unified Server.
        2.  Start TV Stub (HTTP port 4301) and Remote Stub (HTTP port 4302).
        3.  **Expected**: Server logs show two registrations (tv, remote) with acks sent.
        4.  `POST http://localhost:4302/command` with `{ type: "navigation_command", payload: { view: "videos" } }`.
        5.  **Expected**: Server acks command; emits `state_sync` reflecting videos view.
        6.  `GET http://localhost:4301/state`.
        7.  **Expected**: TV Stub reports `state_sync` with videos view.
        8.  `POST http://localhost:4302/command` with `{ type: "control_command", payload: { action: "play", id: "vid-123" } }`.
        9.  **Expected**: Server acks; emits `state_sync` with playing video id.
        10. `GET http://localhost:4301/state`.
        11. **Expected**: TV Stub reports state with playing video id.

-   **Flow 9: Validate TV App with Remote Stub**
        1.  Start Unified Server.
        2.  Start real TV app (SSR or SPA as applicable).
        3.  Start Remote Stub (HTTP port 4302).
        4.  **Expected**: Server logs show TV register/ack and Remote Stub register/ack.
        5.  `POST http://localhost:4302/command` with `{ type: "navigation_command", payload: { view: "scenes" } }`.
        6.  **Expected**: TV app receives `state_sync` and updates UI to scenes.
        7.  `POST http://localhost:4302/command` with `{ type: "control_command", payload: { action: "pause" } }`.
        8.  **Expected**: TV app reflects paused state (UI asserts via test driver).

-   **Flow 10: Validate Remote App with TV Stub**
        1.  Start Unified Server.
        2.  Start TV Stub (HTTP port 4301).
        3.  Start real Remote app.
        4.  **Expected**: Server logs show both register/ack.
        5.  In Remote app, perform a navigation action (e.g., tap "Scenes").
        6.  **Expected**: Server acks the command and emits `state_sync`.
        7.  `GET http://localhost:4301/state`.
        8.  **Expected**: TV Stub state matches the requested view.
        9.  Perform a playback control in Remote app (e.g., Play video id).
        10. **Expected**: TV Stub `state_sync` shows the correct video/action.

---

## 8. Validation Constants and Configuration Separation (reference)

Use these values unless overridden by test config; they align with ARCHITECTURE.md.

- Shared runtime config (`shared/websocket/websocket-protocol.ts` / `WEBSOCKET_CONFIG`):
    - `SERVER_PORT`, `ACK_TIMEOUT_MS`, `WS_PATH`
- Validation-only config (`validation/config/validation-config.ts` / `VALIDATION_CONFIG`):
    - Stub HTTP ports, reconnect backoff (`RECONNECT_BASE_MS`, `RECONNECT_MAX_MS`, `RECONNECT_JITTER_MS`), helper `buildLocalServerUrl()`
- Timing defaults: ACK_TIMEOUT_MS=3000; reconnect backoff base/max/jitter = 500/5000/100 ms
- WebSocket path: /ws (same-origin)
- Health statuses: ok | degraded | error
- ApplicationState schema: see ARCHITECTURE.md “Server-owned ApplicationState”
- Health payloads: see ARCHITECTURE.md Section 12 (Operational Schemas)

Configuration Separation Rationale:
- Prevent validation-only tuning values from leaking into production bundles.
- Ensure a single source of truth for protocol-critical timing (ACK) while allowing experimental reconnect tuning.

---

## 9. Structured Logging (Server + Stubs)

All runtime components (Unified Server, TV Stub, Remote Stub) emit single-line JSON logs to stdout for deterministic parsing during validation.

### 9.1 Schema

```
{
  ts: string (ISO 8601 UTC),
  level: "info" | "warn" | "error",
  event: string (canonical snake_case or dot.notation identifier),
  msg?: string (short human-friendly message),
  meta?: object (arbitrary structured payload; MUST be JSON-serializable)
}
```

Additional fixed fields may appear inside `meta` when provided via base context:

- component: "server" | "tv_stub" | "remote_stub"
- client_id: (stub only)

### 9.2 Canonical Events (Initial Set)

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

### 9.3 Validation Expectations

Automated and manual validation may assert:
1. Each log line parses as valid JSON and contains required fields (ts, level, event).
2. No raw `console.log` usage for runtime events outside the shared logger (future static check may enforce this).
3. `invalid_message` events include error `code` and `message` inside `meta`.
4. For a successful startup sequence, expected ordered events (subset):
    - server_start → server_status → server_ready
5. For a full registration flow (server + both stubs):
    - client_connected (twice) → client_registered (tv) → client_registered (remote) → state sync events (implicit) → navigation/ control handling events when commands issued.
6. Absence of `websocket_error` and `invalid_message` during happy-path scenarios.

### 9.4 Sampling & Buffering

Stubs retain an in-memory rolling buffer (size 500) of emitted log records surfaced via `GET /logs` for black-box test drivers. The server does not buffer (logs are stream-only) to preserve simplicity—tests should tail stdout or capture process logs.

### 9.5 Extensibility Rules

When adding new events:
- Prefer a stable, machine-oriented event key (snake_case or dotted groups) over free-form text.
- Include only structured data in `meta`; avoid embedding large blobs (>5KB) or circular references.
- Avoid changing semantics of existing event names; introduce a new event instead.

### 9.6 Failure Modes

If JSON serialization of `meta` fails (e.g., circular reference), the logger emits a fallback record:
```
{ "ts": <iso>, "level": <level>, "event": <original_event>, "msg": "logging_failure", "error": <error_message> }
```
Tests treat any `logging_failure` occurrence as a validation warning.

### 9.7 Future Enhancements (Not Yet Implemented)

- Static validation script to scan for disallowed raw console usage.
- Log schema contract test ensuring required fields and allowed level values.
- Correlation IDs (e.g., for multi-step command lifecycles) if/when needed.

---

## 10. Validation Hooks Quick Reference (Task 1.14)

Purpose: Provide a concise, script-friendly map of the smallest actionable checks ("hooks") that higher‑level validation drivers or ad‑hoc manual smoke tests can invoke independently. Each hook is idempotent and has a clearly defined PASS condition. Where a more detailed flow already exists in earlier sections, the hook references it instead of duplicating steps. These hooks are the canonical targets for the future quick‑run workflow (Task 4.2) and integration drivers (Task 4.4).

Legend
- Cmd: Representative command (PowerShell) you could execute manually today. (Future quick‑run will orchestrate.)
- Expected: Minimal success criteria. (Any deviation → FAIL.)
- Ref: Link to the fuller flow/spec section in this document.

 - [x] **Hook A – Server Startup & Health** `(2025-08-14)`
1. Start server (dev static or prod_static mode).
2. GET /live → 200 { status: "live" }
3. GET /ready → 200 { status: "ready" } (after initialization)
4. GET /health → 200 object containing at least { status: "ok" | "degraded" | "error" }
Expected: All three endpoints reachable; no error logs (invalid_message / websocket_error) during startup.
Ref: Section 4, Flow 4.

 - [x] **Hook B – Stub Pair Registration Round Trip** `(2025-08-14)`
Prereq: Server running.
1. Start TV Stub (`npm run stubs -w validation` OR individually `npm run tv-stub -w validation` plus Remote Stub) – both stubs connect.
2. Observe server logs: two client_connected + two client_registered events.
3. GET TV Stub /state → object with version >= 1.
4. GET Remote Stub /state → object with version >= 1.
Expected: Both stubs have received at least one state_sync and acknowledged it (implicit in internal ack logic).
Ref: Section 7, Flow 8 (steps 1–3 plus state assertions).

 - [x] **Hook C – Navigation Command Propagation** `(2025-08-14)`
Prereq: Hook B.
1. POST Remote Stub /command { type: "navigation_command", payload: { view: "videos" } }.
2. Server log sequence: navigation_command_handled (info) → state_broadcast_* events → state_broadcast_complete.
3. GET TV Stub /state shows navigation.view == "videos".
Expected: Single version increment for this command; no duplicate broadcasts (broadcast queue collapsed events allowed but only if other mutations occurred concurrently).
Ref: Section 7, Flow 8 (steps 4–7).

 - [x] **Hook D – Control Command Propagation** `(2025-08-14)`
Prereq: Hook C.
1. POST Remote Stub /command { type: "control_command", payload: { action: "play", id: "vid-123" } }.
2. Server logs control_command_handled + state_broadcast_* then completion.
3. GET TV Stub /state playback.id == "vid-123" AND playback.status == "playing" (naming per ApplicationState schema; adjust if updated).
Expected: Exactly one additional version increment vs previous hook snapshot.
Ref: Section 7, Flow 8 (steps 8–11).

 - [x] **Hook E – Stop-and-Wait (Ack-Gated Broadcast Discipline)** `(2025-08-14)`
Prereq: Hook B.
1. Issue two rapid POST /command navigation_command requests (different views) to Remote Stub without waiting.
2. Inspect server logs: Only one broadcast in-flight (no overlapping state_broadcast* with same version); potential state_broadcast_deferred/state_broadcast_collapsed events appear.
3. Final TV Stub /state reflects the second command's view.
Expected: Intermediate broadcast either skipped or collapsed; final state version advanced by at most 2 (register baseline + collapsed result) since Hook B snapshot.
Ref: Task 1.16 description (IMPLEMENTATION.md) + Section 7 adaptation.

 - [ ] **Hook F – Dev SSR Proxy Smoke** `(YYYY-MM-DD)`
1. Start Angular dev SSR servers (TV 4203, Remote 4202).
2. Start unified server with DEV_SSR=1 (`npm run dev:proxy -w server`).
3. GET / (or /tv) returns HTML containing a root app marker (e.g., `<app-root`).
4. GET /remote returns HTML containing remote root marker.
Expected: 200 responses; no unexpected proxy error logs.
Ref: Section 4, Flow 5.

 - [ ] **Hook G – Prod Bundle Presence (Static Mode)** `(YYYY-MM-DD)`
1. Build Angular apps (browser + server bundles) if present.
2. Start server in prod_static (`npm run start:prod -w server`).
3. Observe startup log SSR_STATUS lines for each app indicating serverDirExists boolean and an entry pick (or absence gracefully noted).
Expected: Log lines present; absence of bundle does not crash; assets served at /assets and /remote/assets.
Ref: Section 4, Flow 6 (initial steps) & Task 1.8 notes.

 - [ ] **Hook H – (Future) SSR Child Process Health** `(YYYY-MM-DD)`
Status: Placeholder until Tasks 1.9 & 1.10 implemented.
Expected (future): /health includes children[].status == "healthy"; server logs child_start + child_ready events.
Ref: Will map to updated Section 4 flows when SSR process manager lands.

 - [x] **Hook I – Data Seeding (Initial Data Handler)** `(2025-08-14)`
1. After Hook B, POST Remote Stub /command { type: "seed", payload: { /* data subset */ } } (stub translates to `data` WS message once).
2. Server logs data_message_handled (or generic message_received + state_broadcast events).
3. TV Stub /state includes data field merged.
Expected: Version increments by 1; subsequent identical seed attempt produces no version change (FSM no-op suppression).
Ref: Task 1.17 acceptance (IMPLEMENTATION.md) + Section 7 adaptation.

 - [x] **Hook J – Reconnection Behavior** `(2025-08-14)`
Prereq: Hook B.
1. Terminate TV Stub process.
2. Server logs client_disconnected + (optionally) state_broadcast reflecting loss of TV client.
3. Restart TV Stub.
4. Server logs client_connected/client_registered for TV again and issues latest state_sync.
5. TV Stub /state version matches current server version (monotonic, >= prior to disconnect).
Expected: No server crash; Remote Stub continuity preserved; version does NOT reset. Note: Heartbeat/ack-timeout enforcement is deferred to Milestone 2; this hook validates reconnect without timeout simulation.
Ref: Section 4, Flow 3 (subset) + Section 7 conceptual extension.

---

Automation Notes
- Hooks A–E & I–J are the minimal set targeted for early integration drivers (Tasks 4.2 & 4.4).
- Hooks F–G are environment/SSR oriented (optional for Milestone 1, but documented here).
- Hook H deferred until SSR child processes are implemented.

Failure Classification
- Immediate FAIL: HTTP non-200, missing expected log event, version regression, duplicate overlapping broadcast, or unexpected invalid_message during happy path.
- WARNING (non-blocking for Milestone 1): Extraneous log noise (to be tightened under future logging tasks) or absence of optional SSR artifacts in prod_static.

This section (10) fulfills Task 1.14 by providing a durable, referenceable contract for validation automation without duplicating full flow narratives.
