# SAHAR - Validation Strategy

This document outlines the comprehensive testing and validation strategy for the SAHAR Unified Appliance Model. It defines a series of manual and automated tests to ensure the system is "Always Alive, Always Correct."


## Guiding Principles for Validation

- **Keep the system “Always Alive, Always Correct”** by coupling each implementation task with validation and documentation updates.


---


## Validation Structure

Validation is divided into three primary phases, executed sequentially after any implementation task. A lightweight multi‑mode runner (npm scripts under `validation/`) lets you spin up only the pieces needed per phase.

1.  **Unit Testing**: Focused, automated tests for individual components.
2.  **Functional Testing**: Above unit, below app-level — focuses on services and protocols.
3.  **Per-App Testing**: Manual, flow-based tests for each application against a mock server.
4.  **Full Integration Testing**: Automated, end-to-end tests of the complete system.


---

## Validation folder content

The `validation/` folder contains scripts and configurations for running the validation phases. It includes:
- **npm scripts**: For quick setup and execution of validation flows.
- **Stubs**: Lightweight, controllable stand-ins for the TV and Remote apps to validate server functionality independently.
- **Hooks**: Scripts to automate the setup and teardown of validation environments.

### Validation folder Structure
- `validation/validate.js`: Main validation orchestrator.
- `validation/config/validation-config.ts`: Central configuration for validation, including stub ports and server URLs.
- `validation/stubs/`: Contains stub implementations for the TV and Remote applications.
- `validation/README.md`: Documentation for running validation flows and modes.

### validation directory structure
```plaintext
validation/
├── validate.js
├── shared/
│   ├── models/
│   │   ├── application-state.ts
|   ├── services/
│   │   ├── websocket-base.service.ts
│   ├── websocket/
│   │   └── websocket-protocol.ts
│   └── utils/│       
│       └── logging.ts
├── config/
│   └── validation-config.ts
├── stubs/
│   ├── tv-stub.ts
│   └── remote-stub.ts
└── README.md
```

### Validation Modes

These are the supported integrated run modes driven by the validation workspace.

Mode | Description | Angular Builds | Processes | Integration Type
-----|-------------|----------------|-----------| ----------
prod | Both TV & Remote as production builds | tv + remote | server | full
tv-stub | Remote prod UI, TV simulated | remote only | server + tv stub | partial
remote-stub | TV prod UI, Remote simulated | tv only | server + remote stub | partial
stubs | Both simulated stubs (fast loop) | none | server + tv stub + remote stub | Stub only

Run examples (from repo root or inside the `validation/` folder):
```powershell
npm run mode:prod -w validation
npm run tv-stub   -w validation
npm run remote-stub -w validation
npm run stubs     -w validation
```

---

## Per-App Testing (Manual Flows)

These tests are performed manually by running the server and one client application at a time.

### TV Application (`apps/tv`)

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

### Remote Application (`apps/remote`)

-   **Objective**: Ensure the Remote app correctly sends commands and reflects server state.

-   **Flow 1: Initial Connection**
    1.  Start the WebSocket server.
    2.  Launch the Remote app.
    3.  **Expected**: App connects and sends a `register` message with `client_type: 'remote'`.
    4.  **Expected**: App receives an `ack` for the registration.
    5.  **Expected**: App receives an initial `state_sync` and renders its default UI.

-   **Flow 2: Sending `navigation_command`**
    1.  (Continuing from Flow 1)
    2.  User clicks a navigation button in the Remote app (e.g., "Scenes").
    3.  **Expected**: Remote app sends a `navigation_command` to the server.
    4.  **Expected**: Remote app receives an `ack` for the command.
    5.  **Expected**: Remote app receives a `state_sync` reflecting the new state and updates its UI if necessary.

---

## Full Integration Testing (`/validation`)

-   **Objective**: Automate end-to-end user stories involving the real server and both client applications.
-   **Method**: Prefer the npm mode scripts (`mode:prod`) for standing up the environment. The legacy `sahar-validation.ps1` tasks remain available (VS Code tasks: Environment Check / Start Applications / Integration Tests) but are being phased out in favor of pure package scripts.

Canonical driver (Milestone 1, Path B)
- Use `npm run quick -w validation` as the canonical automation entrypoint. For verbose debug logs, use `npm run quick:dev -w validation`. This executes Hooks A, B, I, C, D, E, J end-to-end using the existing `validation/validate.js` orchestrator. Optional artifact capture and schema checks are planned for Milestone 2.

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
    2.  Using an Android phone on the same Wi‑Fi, open the Camera app and scan the QR.
    3.  Tap the prompt to open the link in Chrome.
    4.  **Expected**: Remote loads in Chrome at `/remote`.
    5.  Remote connects to WebSocket at `/ws` and sends `register`.
    6.  **Expected**: Server responds with `ack`.
    7.  Remote receives `state_sync` and renders initial UI.
    8.  **Expected**: Default Remote screen is displayed and responsive.

    Verification Procedure
    - Preconditions: Server is reachable from the phone (same network); firewall allows inbound to server port.
    - Observe server logs: look for `client_registered` with `client_type: "remote"` and subsequent `state_broadcast`.
    - On the phone: confirm `/remote` loads without mixed‑content errors; UI interactive after initial `state_sync`.
    - Optional: From Remote, trigger a simple navigation command and verify TV reflects it (see Flow 1/2 expectations).

---

## Server & SSR Validation (References)

To avoid duplication, Section 4 contains the canonical flow definitions. Use the mappings below:

- 5.1 Health & Readiness Endpoints → see Section 4, Flow 4: Health & Readiness Preflight.
- 5.2 Dev SSR Proxy Smoke → see Section 4, Flow 5: Dev SSR Proxy Smoke.
- 5.3 Prod SSR Discovery & Children → see Section 4, Flow 6: Prod SSR Discovery & Children.
- 5.4 QR Onboarding → see Section 4, Flow 7: QR Onboarding.

---

## App Stubs for Separate Validation (in `/validation`)

Purpose: Provide lightweight, controllable stand-ins for the TV and Remote apps so each real app and the server can be validated independently.

### Common Stub Contract

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

### TV Stub Specification (`validation/stubs/tv-stub.ts`)

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

### Remote Stub Specification (`validation/stubs/remote-stub.ts`)

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

## Stub-Based Validation Flows (Canonical)

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

-   **Flow 11: Accessibility Features (Hebrew Narration & Descriptions)**
        1.  Start Unified Server.
        2.  Start Remote app (production build or `ng serve`).
        3.  Navigate to video controls (select a performer → video → scene).
        4.  **Expected**: Video remote control panel displays with 10 buttons.
        
        **Keyboard Navigation Test**:
        5.  Press Tab key to navigate between buttons.
        6.  **Expected**: Each button receives visible focus indicator.
        7.  **Expected**: Fixed bottom banner appears showing Hebrew description.
        8.  **Expected**: Hebrew text-to-speech narration plays automatically.
        9.  Press Tab again to move to next button.
        10. **Expected**: Previous description disappears, new description appears.
        11. **Expected**: New Hebrew narration plays.
        
        **Mouse Interaction Test**:
        12. Hover mouse over a button (without clicking).
        13. **Expected**: Description banner appears (no speech).
        14. Move mouse away from button.
        15. **Expected**: Description banner disappears.
        
        **Touch Interaction Test** (on tablet/touch device):
        16. Long-press button for 700ms (touch and hold).
        17. **Expected**: Description banner appears after 700ms.
        18. **Expected**: Hebrew narration plays.
        19. Release touch before 700ms elapsed.
        20. **Expected**: No description or narration (timer cancelled).
        
        **Dynamic Descriptions Test**:
        21. Focus on Play/Pause button when video is paused.
        22. **Expected**: Hebrew text "נַגֵּן אֶת הַוִּידֵאוֹ" (Play the video).
        23. Click to play video, then focus Play/Pause button again.
        24. **Expected**: Hebrew text "הַשְׁהֵה אֶת הַוִּידֵאוֹ" (Pause the video).
        25. Focus on Mute button when audio is unmuted.
        26. **Expected**: Hebrew text "השתקת הקול" (Mute).
        27. Click to mute, then focus Mute button again.
        28. **Expected**: Hebrew text "ביטול השתקה" (Unmute).
        29. Focus on Fullscreen button when not fullscreen.
        30. **Expected**: Hebrew text "מעבר למסך מלא" (Enter fullscreen).
        31. Click to enter fullscreen, then focus Fullscreen button again.
        32. **Expected**: Hebrew text "יציאה ממסך מלא" (Exit fullscreen).
        
        **All Buttons Coverage**:
        33. Tab through all 10 buttons and verify each has Hebrew description:
            - Home: "מעבר לדף הבית"
            - Fullscreen: "מעבר למסך מלא" / "יציאה ממסך מלא"
            - Exit: "חזרה לרשימת סצנות"
            - Previous: "סצנה קודמת"
            - Play/Pause: "נַגֵּן אֶת הַוִּידֵאוֹ" / "הַשְׁהֵה אֶת הַוִּידֵאוֹ"
            - Next: "סצנה הבאה"
            - Volume Down: "הנמכת עוצמת הקול"
            - Mute: "השתקת הקול" / "ביטול השתקה"
            - Volume Up: "הַגְּבֶּר אֶת עוצְמַת הַקוֹל"
        
        **Visual Verification**:
        34. Verify description panel styling:
            - **Position**: Fixed at bottom of screen
            - **Font Size**: Responsive (18-28px range)
            - **Background**: Dark semi-transparent (rgba(0,0,0,.85))
            - **Animation**: Slides up from bottom smoothly
            - **Text**: White, centered, readable
        
        **ARIA Verification** (using browser DevTools):
        35. Inspect description panel element.
        36. **Expected**: `role="status"` attribute present.
        37. **Expected**: `aria-live="polite"` when visible.
        38. **Expected**: `aria-hidden="true"` when empty.
        
        **Voice Selection Test** (Chrome only):
        39. Open Chrome DevTools → Application → Speech Synthesis.
        40. Trigger narration on any button.
        41. **Expected**: Voice used is Google Hebrew (if available) or system Hebrew.
        42. **Expected**: No English or other language voices used.
        
        **Niqqud Processing Verification**:
        43. Inspect network/console logs (if available).
        44. **Expected**: Text sent to Web Speech API has niqqud removed.
        45. **Expected**: Visual description panel shows text WITH niqqud.
        
        **Error Handling**:
        46. Test in browser without Web Speech API support (older browsers).
        47. **Expected**: Visual descriptions still work (no crash).
        48. **Expected**: `isSupported` signal returns `false`.
        49. **Expected**: No console errors related to speech synthesis.

-   **Flow 12: Accessibility Regression Tests** (Quick validation after changes)
        1.  Start Remote app.
        2.  Navigate to video controls.
        3.  Tab to Play button.
        4.  **Expected**: Description appears + Hebrew speech plays.
        5.  Mouse hover Volume Up button.
        6.  **Expected**: Description appears (no speech).
        7.  Long-press Mute button on tablet (if available).
        8.  **Expected**: After 700ms, description + speech appear.
        9.  **Pass Criteria**: All 3 interaction modes work without errors.

---

## Validation Constants and Configuration Separation (reference)

Use these values unless overridden by test config; they align with ARCHITECTURE.md.

- Shared runtime config (`shared/websocket/websocket-protocol.ts` / `WEBSOCKET_CONFIG`):
    - `SERVER_PORT`, `ACK_TIMEOUT`, `WS_PATH`, `TV_DEV_PORT`, `REMOTE_DEV_PORT`
- Validation-only config (`validation/config/validation-config.ts` / `VALIDATION_CONFIG`):
    - Stub HTTP ports, reconnect backoff (`RECONNECT_BASE_MS`, `RECONNECT_MAX_MS`, `RECONNECT_JITTER_MS`), helper `buildLocalServerUrl()`
- Timing defaults: ACK_TIMEOUT=5000; reconnect backoff base/max/jitter = 500/5000/100 ms
- WebSocket path: /ws (same-origin)
- Health statuses: ok | degraded | error (not currently implemented in code)
- ApplicationState schema: see ARCHITECTURE.md “Server-owned ApplicationState”
- Health payloads: see ARCHITECTURE.md Section 12 (Operational Schemas)

**Note:** All constant names in documentation match those in code. Health status is referenced for future work.

---

## Validation Hooks Quick Reference (Task 1.14)

Purpose: Provide a concise, script-friendly map of the smallest actionable checks ("hooks") that higher‑level validation drivers or ad‑hoc manual smoke tests can invoke independently. Each hook is idempotent and has a clearly defined PASS condition. Where a more detailed flow already exists in earlier sections, the hook references it instead of duplicating steps. These hooks are the canonical targets for the future quick‑run workflow (Task 4.2) and integration drivers (Task 4.4).

Legend
- Cmd: Representative command (PowerShell) you could execute manually today. (Future quick‑run will orchestrate.)
- Expected: Minimal success criteria. (Any deviation → FAIL.)
- Ref: Link to the fuller flow/spec section in this document.


Automation Notes
- Hooks A–E & I–J are the minimal set targeted for early integration drivers (Tasks 4.2 & 4.4).
- Hooks F–G are environment/SSR oriented (optional for Milestone 1, but documented here).
- Hook H will be implemented when SSR child processes are available.

Failure Classification
- Immediate FAIL: HTTP non-200, missing expected log event, version regression, duplicate overlapping broadcast, or unexpected invalid_message during happy path.
- WARNING (non-blocking for Milestone 1): Extraneous log noise (to be tightened under future logging tasks) or absence of optional SSR artifacts in prod_static.

This section (10) fulfills Task 1.14 by providing a durable, referenceable contract for validation automation without duplicating full flow narratives.

---
