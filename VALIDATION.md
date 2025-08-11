# SAHAR - Validation Strategy

This document outlines the comprehensive testing and validation strategy for the SAHAR Unified Appliance Model. It defines a series of manual and automated tests to ensure the system is "Always Alive, Always Correct."

---

## 1. Validation Structure

Validation is divided into three primary phases, executed sequentially after any implementation task.

1.  **Unit Testing**: Focused, automated tests for individual components.
2.  **Per-App Testing**: Manual, flow-based tests for each application against a mock server.
3.  **Full Integration Testing**: Automated, end-to-end tests of the complete system.

---

## 2. Unit Testing

### 2.1. Server-Side FSM (`server/websocket-server.ts`)

-   **Method**: Automated unit tests.
-   **Scope**:
    -   [ ] **State Transitions**: Verify all valid and invalid state transitions.
    -   [ ] **Message Handling**: Test handlers for `register`, `navigation_command`, and `control_command`.
    -   [ ] **State Sync**: Ensure `state_sync` messages are correctly generated and sent.
    -   [ ] **ACK Logic**: Verify `ack` messages are correctly handled and timeouts are managed.

### 2.2. Client-Side Services (`shared/services/websocket-base.service.ts`)

-   **Method**: Automated unit tests (Jasmine/Karma).
-   **Scope**:
    -   [ ] **Connection Management**: Test WebSocket connection, registration, and reconnection logic.
    -   [ ] **Message Serialization**: Verify correct message formatting and `ack` handling.

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
-   **Method**: The `sahar-validation.ps1` script orchestrates the tests using custom test drivers.

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

Planned locations
- `validation/stubs/tv-stub.js` — TV renderer stub
- `validation/stubs/remote-stub.js` — Remote controller stub

### 6.2. TV Stub Specification (`validation/stubs/tv-stub.js`)

- Registration
    - Sends `register` with `{ client_type: "tv", client_id }` on connect; awaits `ack`.
- State handling
    - On `state_sync`, store payload, expose via `GET /state`, and send `ack`.
- No outbound commands
    - The TV stub never emits navigation/control; it is a pure renderer.
- HTTP control
    - `GET /health`, `GET /state`, `GET /logs`, `POST /reset` as per common contract.
- Configuration
    - Env/flags: `--server-url` (default `ws://localhost:3000/ws`), `--http-port` (default `4301`), `--client-id`.

### 6.3. Remote Stub Specification (`validation/stubs/remote-stub.js`)

- Registration
    - Sends `register` with `{ client_type: "remote", client_id }`; awaits `ack`.
- Initial data
    - Optionally sends `data` message once after register to seed server FSM when provided via `POST /command` with `{ type: "seed", payload: {...} }`.
- Commands
    - Accepts `POST /command` and immediately emits the mapped WebSocket message (`navigation_command` or `control_command`), then awaits `ack`.
- State handling
    - On `state_sync`, store payload, expose via `GET /state`, and send `ack`.
- Configuration
    - Env/flags: `--server-url` (default `ws://localhost:3000/ws`), `--http-port` (default `4302`), `--client-id`.

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

## 8. Validation constants and schemas (reference)

Use these values unless overridden by test config; they align with ARCHITECTURE.md.

- Timing defaults: ACK_TIMEOUT_MS=3000; reconnect backoff base/max/jitter = 500/5000/100 ms
- WebSocket path: /ws (same-origin)
- Health statuses: ok | degraded | error
- ApplicationState schema: see ARCHITECTURE.md “Server-owned ApplicationState”
- Health payloads: see ARCHITECTURE.md Section 12 (Operational Schemas)
