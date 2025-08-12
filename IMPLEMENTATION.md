# SAHAR TV Remote - Implementation Plan

This document outlines the development and implementation plan for refactoring the SAHAR TV Remote system into the Unified Appliance Model, as defined in `ARCHITECTURE.md`.

## 1. Implementation Guidelines

-   **Code Style**: Adhere to existing code styles. Use Prettier and ESLint where configured.
-   **Testing**: All new components must have corresponding unit tests. Integration tests will be updated as part of the final phase.
-   **Documentation**: All important features, classes, methods, and variables must be documented in detail.
-   **Completion**: You (GitHub Copilot) are responsible for checking the box and adding the completion date when a task is completed.

---

## 2. Phase 1: Server-Side Refactoring (Unified Server + SSR Host)

Goal: Evolve `server/websocket-server.ts` into the Unified Server and SSR host. In dev, proxy to Angular SSR servers. In prod, discover and run SSR bundles in child processes, proxy routes to them, and serve browser assets directly. Keep a single-origin WebSocket gateway at `/ws` and provide health endpoints.

Prerequisites
- TV/Remote dev: When developing with SSR, each app runs `ng serve --ssr` on its own dev port (TV: 4203, Remote: 4202).
- TV/Remote prod: `ng build` produces `apps/<app>/dist/<name>/{browser,server}`.

Detailed tasks

-   [x] **Task 1.1**: Serve TV static files from `apps/tv/dist/sahar-tv` (2025-08-07)
-   [x] **Task 1.2**: Serve Remote static files from `apps/remote/dist/sahar-remote` (2025-08-07)
-   [x] **Task 1.3**: Create HTTP server, attach `ws` WebSocket server (2025-08-07)
-   [x] **Task 1.4**: Protocol doc updates in ARCHITECTURE.md and VALIDATION.md (2025-08-07)
-   [ ] **Task 1.5**: Centralized server config `(YYYY-MM-DD)`
	-   Description: Add a config module to read environment variables and expose typed settings: PORT, DEV_SSR, TV_DEV_URL, REMOTE_DEV_URL, TV_SSR_PORT, REMOTE_SSR_PORT, SSL_CERT_FILE, SSL_KEY_FILE, LOG_LEVEL.
	-   Files: `server/config.ts` (new), use in `server/websocket-server.ts`.
	-   Acceptance: Server branches dev/prod behavior off config; values logged at startup.
	-   Defaults (unless overridden by env):
		- `PORT=3000`
		- `DEV_SSR=false` (true proxies `/` and `/remote` to Angular SSR dev servers)
		- `TV_DEV_URL=http://localhost:4203` (used when DEV_SSR=true)
		- `REMOTE_DEV_URL=http://localhost:4202` (used when DEV_SSR=true)
		- `TV_SSR_PORT=5101` (child port for TV SSR in prod)
		- `REMOTE_SSR_PORT=5102` (child port for Remote SSR in prod)
		- `SSL_CERT_FILE` / `SSL_KEY_FILE` unset by default (HTTP only)
		- `LOG_LEVEL=info`
		- Protocol timing (fallbacks aligning with ARCHITECTURE.md): `ACK_TIMEOUT_MS=3000`, `RECONNECT_BASE_MS=500`, `RECONNECT_MAX_MS=5000`, `RECONNECT_JITTER_MS=100`, `WS_PATH=/ws`
-   [ ] **Task 1.6**: Dev reverse proxies (SSR dev) `(YYYY-MM-DD)`
	-   Description: Reverse proxy SSR HTML:
		-   `/` (or `/tv`) → TV dev SSR at 4203
		-   `/remote` → Remote dev SSR at 4202
	-   Keep `/health` and WebSocket (`/ws`) on the main origin.
	-   Files: `server/websocket-server.ts` (proxy middleware).
	-   Acceptance: With SSR dev servers running, GET `/` (or `/tv`) and `/remote` via the Unified Server return SSR HTML; `/health` OK; WS unaffected.
-   [ ] **Task 1.7**: Static assets passthrough `(YYYY-MM-DD)`
	-   Description: Serve browser assets directly from built outputs while SSR HTML comes from SSR entries.
	-   Mounts: `/assets` → `apps/tv/dist/sahar-tv/browser/assets`; `/remote/assets` → `apps/remote/dist/sahar-remote/browser/assets`.
	-   Files: `server/websocket-server.ts` (express.static mounts, order-safe).
	-   Acceptance: Static assets load from main server; SSR HTML remains correct in both dev and prod.
-   [ ] **Task 1.8**: SSR bundle discovery (prod) `(YYYY-MM-DD)`
	-   Description: On startup, discover SSR entry files without hard-coding names:
		-   TV: `apps/tv/dist/sahar-tv/server/main*.mjs|js`
		-   Remote: `apps/remote/dist/sahar-remote/server/main*.mjs|js`
	-   Files: `server/ssr-discovery.ts` (new), used by server.
	-   Acceptance: Discovered paths logged; clear error if missing.
-   [ ] **Task 1.9**: SSR process manager (prod) `(YYYY-MM-DD)`
	-   Description: Spawn each SSR bundle in a child process with env (dedicated PORTs, base paths). Add health checks and auto-restart with backoff.
	-   Files: `server/ssr-manager.ts` (new), integrate in server lifecycle.
	-   Acceptance: Children started and healthy; restarts on crash; status exposed via `/health`.
-   [ ] **Task 1.10**: Prod proxy to SSR children `(YYYY-MM-DD)`
	-   Description: Proxy `/` (or `/tv`) and `/remote` to the respective SSR child ports in production.
	-   Files: `server/websocket-server.ts` (proxy rules, prod branch).
	-   Acceptance: SSR HTML returned from children; WS stays on main origin.
-   [ ] **Task 1.11**: HTTPS/WSS enablement `(YYYY-MM-DD)`
	-   Description: If `SSL_CERT_FILE` and `SSL_KEY_FILE` are present, start HTTPS and WSS; otherwise start HTTP and WS.
	-   Note: WS path fixed at `/ws`.
	-   Files: `server/websocket-server.ts` (http/https server creation), `server/config.ts`.
	-   Acceptance: Remote PWA can install over HTTPS; WSS used automatically when HTTPS on.
--   [x] **Task 1.12**: Health/readiness/logging (2025-08-12)
	-   Description: `/live`, `/ready`, `/health` implemented; structured JSON logger in place.
	-   Acceptance: Endpoints return JSON; logs show lifecycle events.
-   [ ] **Task 1.13**: Scripts and environment `(YYYY-MM-DD)`
	-   Description: Scripts: `dev` (proxies; assumes dev SSR servers), `start:prod` (assumes built bundles/assets; starts process manager).
	-   Files: `server/package.json` (scripts), `README.md` notes if needed.
	-   Acceptance: One-command dev and prod flows.
-   [ ] **Task 1.14**: Validation hooks `(YYYY-MM-DD)`
	-   Description: Document validation steps for SSR proxy smoke, bundle discovery, child health, and WS register→ack→state_update.
	-   Files: `VALIDATION.md` (add flows).
	-   Acceptance: Clear validation instructions exist and can be executed independently from `/validation`.
-   [ ] **Task 1.15**: FSM core `(YYYY-MM-DD)`
	-   Description: Implement authoritative FSM for application state (clients, navigation/video state) on the server.
	-   Files: `server/fsm.ts` (new), server integration.
	-   Acceptance: Server maintains and exposes state transitions.
-   [ ] **Task 1.16**: state_update broadcast `(YYYY-MM-DD)`
	-   Description: Broadcast `state_update` on any state change to all clients with ack tracking.
	-   Files: `server/websocket-server.ts`, `server/fsm.ts`.
	-   Acceptance: All clients receive updates; stop-and-wait discipline enforced.
-   [ ] **Task 1.17**: data handler `(YYYY-MM-DD)`
	-   Description: Handle initial `data` from Remote; normalize/store in FSM.
	-   Files: `server/websocket-server.ts`, `server/fsm.ts`.
	-   Acceptance: After Remote connects and sends data, TV can render from server state.
-   [ ] **Task 1.18**: navigation/control handlers `(YYYY-MM-DD)`
	-   Description: Process Remote commands, update FSM, and drive TV via downstream messages with ack.
	-   Files: `server/websocket-server.ts`, `server/fsm.ts`.
	-   Acceptance: Commands update state and propagate correctly.
-   [ ] **Task 1.19**: Heartbeat/recovery `(YYYY-MM-DD)`
	-   Description: Detect dead connections via ack timeouts and optional pings; handle reconnection.
	-   Files: `server/websocket-server.ts`, `server/fsm.ts`.
	-   Acceptance: Disconnections are detected and recovered gracefully.
-   [ ] **Task 1.20**: Structured logging `(YYYY-MM-DD)`
	-   Description: Standardize logs (JSON or leveled text) including connection IDs, message types, timing, and proxy/child status.
	-   Files: `server/logger.ts`, integration across server.
	-   Acceptance: Logs support debugging and audits.
--   [x] **Task 1.21**: Invalid message handling (2025-08-12)
	-   Implemented error response & logging path; invalid messages rejected without state mutation.

---

## 3. Phase 2: Client-Side Refactoring (TV & Remote Apps)

**Goal**: Refactor the client applications to communicate exclusively with the Unified Server, leveraging shared services and components.

### 3.1 TV Application (`apps/tv/`)

Detailed tasks

-   [ ] **Task 2.1**: Enable SSR in-place `(YYYY-MM-DD)`
	-   Description: Add Angular Universal server entry (e.g., `main.server.ts`/`server.ts`) and builder config so `ng serve --ssr` and SSR build work for TV.
	-   Files: `apps/tv/src/main.server.ts`, `apps/tv/server.ts` (or Angular equivalent), `apps/tv/angular.json` builder config.
	-   Acceptance: `ng serve --ssr` for TV runs and serves SSR HTML.
-   [ ] **Task 2.2**: Make TV code SSR-safe `(YYYY-MM-DD)`
	-   Description: Guard all browser-only APIs (window/document); use `isPlatformBrowser`; lazy-load browser-only code.
	-   Files: TV components/services using browser APIs.
	-   Acceptance: SSR render succeeds without reference errors; hydration works in browser.
-   [ ] **Task 2.3**: Refactor `WebsocketService` to use the shared base `(YYYY-MM-DD)`
	-   Description: Replace TV-specific WebSocket code with composition over `websocket-base.service.ts`.
	-   Files: `apps/tv/src/app/services/websocket.service.ts` (or equivalent path); imports from `shared/services/websocket-base.service.ts`.
	-   Acceptance: TV app compiles and connects through the shared base; no direct socket management remains.
-   [ ] **Task 2.4**: Remove peer-discovery and direct-connection logic `(YYYY-MM-DD)`
	-   Description: Delete or disable any code that discovers peers or opens direct TV↔Remote sockets; rely solely on Unified Server.
	-   Files: `apps/tv/src/app/services/websocket.service.ts` and related discovery modules.
	-   Acceptance: TV only uses relative `/ws` via the shared base; no configuration for peer IPs remains.
-   [ ] **Task 2.5**: Ensure stateless rendering from `state_update` `(YYYY-MM-DD)`
	-   Description: TV renders UI based exclusively on server-driven `state_update` messages; remove local authority. Integrate `shared/utils/youtube-helpers.ts` where YouTube playback is required.
	-   Files: TV components that render navigation/video state; `shared/utils/youtube-helpers.ts` (consumed by TV where applicable).
	-   Acceptance: Manual flows confirm correct UI rendering after server state changes; no divergence on refresh/reconnect. YouTube helper is wired in TV and duplicate logic removed.
-   [ ] **Task 2.6**: Remove outbound `status` messages `(YYYY-MM-DD)`
	-   Description: Eliminate TV-originated `status`; server FSM owns status.
	-   Files: `apps/tv/src/app/services/websocket.service.ts` and any emitters.
	-   Acceptance: No `status` messages sent from TV; protocol logs verify.
-   [ ] **Task 2.7**: Build/scripts for SSR `(YYYY-MM-DD)`
	-   Description: Add `build:ssr`/`dev:ssr` scripts; ensure outputs at `apps/tv/dist/sahar-tv/{browser,server}`.
	-   Files: `apps/tv/package.json` (scripts), Angular builders.
	-   Acceptance: `ng build` produces TV SSR/browser bundles at the expected paths.

### 3.2 Remote Application (`apps/remote/`)

Detailed tasks

-   [ ] **Task 2.8**: Refactor `WebsocketService` to use the shared base `(YYYY-MM-DD)`
	-   Description: Replace Remote-specific WebSocket code with the shared base service.
	-   Files: `apps/remote/src/app/services/websocket.service.ts` (or equivalent path); imports from `shared/services/websocket-base.service.ts`.
	-   Acceptance: Remote app compiles and connects via the shared base; tests cover register/ack.
-   [ ] **Task 2.9**: Remove peer-discovery and direct-connection logic `(YYYY-MM-DD)`
	-   Description: Delete or disable any discovery/direct socket code; rely solely on Unified Server.
	-   Files: `apps/remote/src/app/services/websocket.service.ts` and related modules.
	-   Acceptance: Remote only uses relative `/ws`; no peer IP settings remain.
-   [ ] **Task 2.10**: Send initial `data` on connection `(YYYY-MM-DD)`
	-   Description: On successful register/ack, send initial `data` payload to populate server FSM.
	-   Files: `apps/remote/src/app/services/websocket.service.ts`; models under `shared/models` as needed.
	-   Acceptance: Server receives and stores initial data; TV renders accordingly.
-   [ ] **Task 2.11**: Route all navigation/control to server `(YYYY-MM-DD)`
	-   Description: Ensure navigation and control commands are sent to the server (not to TV); handle ack and subsequent `state_update`.
	-   Files: Remote components/services emitting commands; `shared/websocket-protocol.ts`.
	-   Acceptance: Manual flows confirm commands update server state and propagate to TV; no direct TV calls remain.
-   [ ] **Task 2.12**: Decide Remote delivery model (SSR vs SPA PWA) `(YYYY-MM-DD)`
	-   Description: Choose between SPA PWA (recommended) or enabling SSR similar to TV if SEO/first paint needed; document the decision.
	-   Files: `apps/remote/angular.json` (builder config), `apps/remote/package.json` (scripts), `apps/remote/README.md` (decision and rationale).
	-   Acceptance: Decision recorded; config and scripts match the chosen model.
-   [ ] **Task 2.13**: PWA hardening `(YYYY-MM-DD)`
	-   Description: Add/verify manifest, service worker/offline strategy, icons, and caching; run Lighthouse.
	-   Files: `apps/remote/src/manifest.webmanifest`, service worker or `ngsw-config.json`, app icons/assets, related module wiring.
	-   Acceptance: Lighthouse PWA category passes with solid scores; offline route renders basic shell; installable over HTTPS.
-   [ ] **Task 2.14**: Build/scripts for chosen model `(YYYY-MM-DD)`
	-   Description: If SSR chosen, add `build:ssr`/`dev:ssr`; else ensure PWA build emits correct assets and service worker.
	-   Files: `apps/remote/package.json` (scripts), Angular builders/config.
	-   Acceptance: Build artifacts match the chosen model; outputs verified in `apps/remote/dist/sahar-remote`.

### 3.3 Shared Functionality (`/shared`)

Detailed tasks

-   [ ] **Task 2.15**: Refactor `websocket-base.service.ts` to centralize WebSocket logic `(YYYY-MM-DD)`
	-   Description: Unify connection, registration, reconnection/backoff, message send/receive with ack handling, and stop-and-wait queueing. WebSocket URL should derive from window location (single-origin) and honor `/ws` path.
	-   Files: `shared/services/websocket-base.service.ts`; integrate into both apps.
	-   Acceptance: Both apps compile using the shared base; unit tests for connect/register/ack pass; connects to `/ws` and handles reconnection.
-   [ ] **Task 2.16**: Update `websocket-protocol.ts` to match ARCHITECTURE.md `(YYYY-MM-DD)`
	-   Description: Align message types (register, navigation_command, control_command, state_sync, ack), enums, and payload shapes with the protocol; document ack semantics and timeouts.
	-   Files: `shared/websocket/websocket-protocol.ts`; adjust usages in `shared/services/websocket-base.service.ts` and apps.
	-   Acceptance: Type-safe across repo; no `any` placeholders; protocol docs and implementation match.
-   [ ] **Task 2.17**: Verify shared utilities are integrated `(YYYY-MM-DD)`
	-   Description: Ensure shared utilities are imported and used consistently; remove dead code or add missing wiring.
	-   Files: `shared/utils/*` used across apps.
	-   Acceptance: Builds/lint pass; duplicate logic removed or centralized.
-   [ ] **Task 2.18**: Define `ApplicationState` interface `(YYYY-MM-DD)`
	-   Description: Add a shared TypeScript interface for the authoritative server-owned application state, matching ARCHITECTURE.md (version, clients, navigation, playback, optional data).
	-   Files: `shared/models/application-state.ts` (new), referenced by server and tests; optional `.d.ts` for JS-based validation stubs if needed.
	-   Acceptance: Type-safe usage in server code and any TS consumers; shape matches ARCHITECTURE.md; exported for reuse.
---

## 4. Phase 3: Production Readiness

**Goal**: To prepare the Unified Server for standalone deployment and improve maintainability.

Detailed tasks

-   [ ] **Task 3.1**: Standalone `server` package `(YYYY-MM-DD)`
	-   Description: Create a standalone `package.json` for the `server` directory with scripts (`dev`, `start`, `start:prod`, `typecheck`, `build`), engines, and dependencies; ensure it runs independently.
	-   Files: `server/package.json` (new or updated), `server/README.md` notes, adjust `server/tsconfig.json` if needed.
	-   Acceptance: From `server/`, `npm run dev` starts dev mode and `npm run start:prod` starts prod with built assets/SSR; repository root remains unaffected.

---

## 5. Guiding Principles for Iterative Validation

Goal: Keep the system “Always Alive, Always Correct” by coupling each implementation task with validation and documentation updates.

Detailed tasks

-   [ ] **Task 4.1**: Definition of Done (DoD) checklist for PRs `(YYYY-MM-DD)`
	-   Description: Introduce a PR checklist that enforces validation and docs updates for every task (VALIDATION.md updated, tests updated/passing, docs updated, build/lint clean).
	-   Files: `.github/pull_request_template.md` (new); reference this DoD at the top of `IMPLEMENTATION.md` if needed.
	-   Acceptance: All new PRs show the DoD checklist; reviewers can gate merges on it.
-   [ ] **Task 4.2**: Validation quick-run workflow `(YYYY-MM-DD)`
	-   Description: Provide a single command to run environment check and integration tests locally.
	-   Files: `validation/package.json` (add `scripts`: `quick` to run `node validate.js check && node validate.js test` or invoke the existing PowerShell harness); project `README.md` (usage snippet).
	-   Acceptance: One command runs preflight plus core integration flows; documented in README.
-   [ ] **Task 4.3**: Update VALIDATION.md per completed task `(YYYY-MM-DD)`
	-   Description: For any change impacting behavior, add/adjust flows in `VALIDATION.md` (Section 4) and reference them from Section 5. Keep format consistent with numbered steps and explicit Expected lines.
	-   Files: `VALIDATION.md`.
	-   Acceptance: Each merged task that changes behavior includes a corresponding validation flow update.
-   [ ] **Task 4.4**: Update/create integration tests in `/validation` `(YYYY-MM-DD)`
	-   Description: Extend test drivers or add new ones to automate new flows (navigation/control, reconnection, SSR preflights). Reuse existing `sahar-validation.ps1` orchestration.
	-   Files: `validation/test-drivers/*`, `validation/validate.js`, `validation/websocket-communication.js`.
	-   Acceptance: Updated tests pass locally via the quick-run and via the VS Code tasks.
-   [ ] **Task 4.5**: Documentation sync `(YYYY-MM-DD)`
	-   Description: Reflect behavioral or architectural changes in `ARCHITECTURE.md` and usage/setup notes in `README.md`.
	-   Files: `ARCHITECTURE.md`, `README.md` (and app-level READMEs if affected).
	-   Acceptance: Docs accurately describe current behavior; links/ports/paths verified.
-   [x] **Task 4.6**: Implement TV Stub (2025-08-12)
	-   Stub present at `validation/stubs/tv-stub.ts`; implements contract & endpoints.

-   [x] **Task 4.7**: Implement Remote Stub (2025-08-12)
	-   Stub present at `validation/stubs/remote-stub.ts`; command + seed path implemented.

-   [x] **Task 4.8**: Stub runner scripts (2025-08-12)
	-   Implemented via consolidated mode scripts: `stubs`, `tv-stub`, `remote-stub`, `mode:prod` in `validation/package.json`.

-   [ ] **Task 4.9**: Integration drivers for stub flows `(YYYY-MM-DD)`
	-   Description: Add test drivers to automate VALIDATION.md Flows 8–10: drive Remote Stub via HTTP, assert TV Stub state via HTTP.
	-   Files: `validation/test-drivers/stubs-flows.js` (new), `validation/validate.js` (wire driver).
	-   Acceptance: "navigation" updates TV Stub `/state`; "playback" reflects correct action; non-zero exit on assertion failures.

-   [ ] **Task 4.10**: Stop-and-wait enforcement tests `(YYYY-MM-DD)`
	-   Description: Verify that a second command is only accepted after ack of the first, exercising Remote→Server and Server→TV directions.
	-   Files: `validation/test-drivers/stubs-flows.js` (extend) or dedicated driver.
	-   Acceptance: Back-to-back POSTs result in serialized handling; timestamps/logs prove no out-of-order processing.

-   [ ] **Task 4.11**: Log schema conformance checks `(YYYY-MM-DD)`
	-   Description: Validate emitted logs include required structured fields (ts, level, event, client_type/id, message_type when relevant, state_version for broadcasts).
	-   Files: `validation/utils/log-assert.js` (new), invoked by drivers.
	-   Acceptance: Sample events (register, ack, broadcast) pass schema checks; failures report missing fields.

-   [ ] **Task 4.12**: Health payload completeness tests `(YYYY-MM-DD)`
	-   Description: Assert `/live`, `/ready`, `/health` payloads match ARCHITECTURE.md operational schemas (fields and types), with conditional children in prod SSR.
	-   Files: `validation/test-drivers/health-check.js` (new).
	-   Acceptance: All endpoints return expected shapes; children absent in non-SSR mode; driver exits non-zero on mismatch.

-   [ ] **Task 4.13**: Server FSM unit tests `(YYYY-MM-DD)`

### 5.1 New Completed (Untracked) Work
-   [x] **Task 5.1.1**: Protocol/validation config separation (2025-08-12)
	-   Moved validation-only timing & stub port config to `validation/config/validation-config.ts`; kept shared runtime essentials in `WEBSOCKET_CONFIG`.
-   [x] **Task 5.1.2**: Multi-mode validation scripts (2025-08-12)
	-   Added `mode:prod`, `tv-stub`, `remote-stub`, `stubs` scripts enabling selective process composition without helper JS files.

### 5.2 Follow-ups
- Convert legacy PowerShell validation flows to pure Node drivers invoking mode scripts.
- Add hashing/skip logic to avoid rebuilding unchanged Angular apps between mode switches.
	-   Description: Unit-test FSM transitions (valid/invalid), message handlers (register/navigation/control), `state_sync` generation, and ack timeout behavior.
	-   Files: Server-side test files under `server/` test setup (framework of choice) or lightweight harness.
	-   Acceptance: Tests cover the listed scopes and pass locally.
