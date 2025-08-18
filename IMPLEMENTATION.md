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
-   [x] **Task 1.5**: Centralized server config (Retired – 2025-08-12)
	-   Original Description: Provide unified config module (ports, SSR flags, cert paths, log level, protocol timing).
	-   Rationale: Avoid premature abstraction. Minimal runtime protocol constants kept in `WEBSOCKET_CONFIG`; validation/backoff & stub settings moved to `validation/config/validation-config.ts` (Task 5.1.1). Remaining env-driven settings (SSR child ports, HTTPS cert paths, log level) will be added alongside Tasks 1.6–1.11 & 1.13.
	-   Outcome: Task retired; configuration will accrete feature-by-feature.
-   [x] **Task 1.6**: Dev reverse proxies (SSR dev) (2025-08-13)
	-   Description: Reverse proxy SSR HTML:
		-   `/` (or `/tv`) → TV dev SSR at 4203
		-   `/remote` → Remote dev SSR at 4202
	-   Keep `/health` and WebSocket (`/ws`) on the main origin.
	-   Files: `server/websocket-server.ts` (proxy middleware).
	-   Acceptance: With SSR dev servers running, GET `/` (or `/tv`) and `/remote` via the Unified Server return SSR HTML; `/health` OK; WS unaffected.
-   [x] **Task 1.7**: Static assets passthrough (2025-08-13)
	-   Description: Serve browser assets directly from built outputs while SSR HTML comes from SSR entries.
	-   Mounts: `/assets` → `apps/tv/dist/sahar-tv/browser/assets`; `/remote/assets` → `apps/remote/dist/sahar-remote/browser/assets`.
	-   Files: `server/websocket-server.ts` (express.static mounts, order-safe).
	-   Acceptance: Static assets load from main server; SSR HTML remains correct in both dev and prod.
-   [x] **Task 1.8**: SSR bundle presence (inline gating) (2025-08-13)
	-   Modified Scope: Replaced planned filesystem “discovery” module with minimal inline directory existence + heuristic entry pick (first main*/index* .mjs|.js) inside `websocket-server.ts`.
	-   Reasoning: Milestone 1 does not require full SSR hosting; avoiding extra abstraction (`ssr-discovery.ts`) keeps surface small while still emitting telemetry (`ssr_dir_status`) needed for future Tasks 1.9/1.10.
	-   Implementation: Added `SSR_STATUS` export with booleans & picked paths; logs one line per app at startup in prod-static mode (not in dev proxy).
	-   Acceptance (met): On prod-static startup, logs indicate existence of `server` dirs for TV/Remote and (if present) a representative entry file; absence does not crash.
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
-   [x] **Task 1.12**: Health/readiness/logging (2025-08-12)
	-   Description: `/live`, `/ready`, `/health` implemented; structured JSON logger in place.
	-   Acceptance: Endpoints return JSON; logs show lifecycle events. Validation Hooks: A.
-   [x] **Task 1.13**: Scripts and environment (2025-08-13)
	-   Description: Added standardized scripts for clear dev vs prod flows:
		- `dev` – hot-reload server only (no SSR proxy) for fast iteration on server logic.
		- `dev:proxy` – enables SSR HTML proxying (`DEV_SSR=1`) to Angular dev servers at `TV_DEV_PORT` / `REMOTE_DEV_PORT`.
		- `build` – compile TypeScript (server only) with path alias rewrites.
		- `start` – run previously built artifacts.
		- `start:prod` – build then launch in prod-like mode (static assets; future SSR child processes will hook here).
		- `typecheck` – TS compile with `--noEmit` for CI/lint gates.
	-   Files: `server/package.json` (scripts), `server/websocket-server.ts` (mode banner log `mode_banner`).
	-   Acceptance: Each script runs successfully; `dev:proxy` shows `mode_banner` with `mode=dev_proxy`; `start:prod` emits `mode_banner` with `mode=prod_static` after build; WebSocket path logged as `/ws`. Validation Hooks: A (startup context for server modes), F (dev proxy smoke), G (prod bundle presence – partial until SSR processes).
-   [x] **Task 1.14**: Validation hooks (2025-08-13)
	-   Description: Document validation steps for SSR proxy smoke, bundle discovery, child health (placeholder), WS register→ack→state_update, data seeding, navigation/control propagation, reconnection, and broadcast discipline as discrete, idempotent hooks.
	-   Files: `VALIDATION.md` (Section 10 added: "Validation Hooks Quick Reference").
	-   Acceptance: Section 10 enumerates hook identifiers A–J with prerequisites, minimal PASS criteria, and references to detailed flows; coverage spans Milestone 1 required behaviors (server startup/health, registration, data, navigation, control, ack-gated broadcast, reconnection). SSR child hook placeholder included for future Tasks 1.9/1.10. Validation Hooks Defined: A–J.
-   [x] **Task 1.15**: FSM core (2025-08-13)
	-   Description: Implemented authoritative FSM owning `ApplicationState` with guarded mutations for clients, navigation, playback, and action confirmations.
	-   Enhancements: Dirty tracking + no-op detection (version only increments on real changes), defensive snapshot cloning, invariant-aware `recalcFsm` (preserves error state), granular navigation & control mutations (avoid redundant version bumps).
	-   Files: `server/fsm.ts` (enhanced), integrated already via `websocket-server.ts` handlers.
	-   Acceptance: Register/deregister, navigation, control, and action confirmation mutate state and increment version only on change; snapshot returns defensive copy; broadcast logic (Task 1.16) observes advancing versions. Validation Hooks Supported: B (registration state), C (navigation), D (control), E (broadcast discipline), I (data – structural support), J (reconnection – pending heartbeat Task 1.19).
-   [x] **Task 1.16**: state_sync broadcast discipline (2025-08-13)
	-   Description: Implemented ack-gated queued broadcasts. Only one `state_sync` in-flight; additional state changes collapse into a single pending version until all ACKs (or disconnects) received.
	-   Files: `server/websocket-server.ts` (broadcast queue, ack handling), `server/fsm.ts` (unchanged interface leveraged).
	-   Implementation: Added tracking vars (`currentBroadcastVersion`, `lastBroadcastVersion`, `pendingBroadcastVersion`, `outstandingAckClients`), per-client `lastStateAckVersion`, and new log events (`state_broadcast_deferred`, `state_broadcast_collapsed`, `state_broadcast_ack_progress`, `state_broadcast_complete`, `state_broadcast_complete_client_loss`). Updated validation to allow incoming `ack` messages.
	-   Acceptance: Verified manual flows: rapid successive commands emit only final coalesced broadcast after ACK of prior; no overlapping broadcasts observed; skipped log when no state change. Validation Hooks: B (ack of initial sync), C/D (broadcast sequencing), E (stop-and-wait collapse), J (reconnect broadcast continuity).
-   [x] **Task 1.17**: data handler (2025-08-13)
	-   Description: Handle initial `data` from Remote; normalize/store in FSM (shallow merge, one-shot or incremental). Added `data` message type, `seedData` in FSM, validation & broadcast on change.
	-   Files: `server/websocket-server.ts`, `server/fsm.ts`, protocol updates.
	-   Acceptance: Remote stub sending `type: data` seeds FSM `data` field and triggers state_sync (observed via logs and stub state). Validation Hooks: I.
-   [x] **Task 1.18**: navigation/control handlers (2025-08-13)
	-   Description: Remote `navigation_command` & `control_command` messages validated, acked immediately, FSM mutators invoked (`navigationCommand`, `controlCommand`) with no-op suppression, and resulting state changes broadcast via queued ack-gated `state_sync` (Task 1.16).
	-   Files: `server/websocket-server.ts` (switch cases), `server/fsm.ts` (mutation methods).
	-   Acceptance: Manual stub tests confirm: (1) ack precedes broadcast, (2) version only increments on real change, (3) navigation stack updates correctly (breadcrumb, level transitions), (4) control actions mutate player state (play/pause/seek/volume/mute) with broadcast. Validation Hooks: C (navigation), D (control), E (ack-gated ordering), J (post-reconnect command resilience).
-   [ ] **Task 1.19**: Heartbeat/recovery — Deferred to Milestone 2 `(deferred 2025-08-18)`
	-   Description: Detect dead connections via ack timeouts and optional pings; handle reconnection.
	-   Files: `server/websocket-server.ts`, `server/fsm.ts`.
	-   Acceptance: Disconnections are detected and recovered gracefully. Validation Hook Target: J (currently partial – functional reconnect without heartbeat timeouts).
-   [ ] **Task 1.20**: Structured logging `(YYYY-MM-DD)`
	-   Description: Standardize logs (JSON or leveled text) including connection IDs, message types, timing, and proxy/child status.
	-   Files: `server/logger.ts`, integration across server.
	-   Acceptance: Logs support debugging and audits.
-   [x] **Task 1.21**: Invalid message handling (2025-08-12)
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
-   [x] **Task 4.2**: Validation quick-run workflow `(2025-08-14)`
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
-   [x] **Task 4.5**: Documentation sync `(2025-08-14)`
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
-   [ ] **Task 5.2.1**: Migrate PowerShell validation flows to Node drivers `(YYYY-MM-DD)`
	-   Description: Replace remaining PowerShell orchestration pieces with cross-platform NodeJS driver scripts invoking existing validation modes (stubs, mode:prod) to enable CI portability.
	-   Files: `validation/validate.js`, `validation/test-drivers/*.js`, remove or deprecate PowerShell-only segments in `sahar-validation.ps1` (commented reference kept).
	-   Acceptance: A single Node invocation reproduces flows previously dependent on PowerShell; Windows/Linux run parity confirmed.
-   [ ] **Task 5.2.2**: Build artifact hashing & skip logic `(YYYY-MM-DD)`
	-   Description: Introduce content hash check on Angular app source (ts/html/scss) to skip redundant rebuilds between validation mode switches, reducing end-to-end validation time.
	-   Files: `validation/utils/build-cache.ts` (new), hooks in `validation/validate.js`.
	-   Acceptance: Second consecutive validation run with no source changes skips Angular rebuild (log event `build_skip`); modifying a file triggers rebuild.
-   [ ] **Task 5.2.3**: Expanded FSM & handler unit tests `(YYYY-MM-DD)`
	-   Description: Add deeper coverage beyond Task 4.13: invalid transitions, duplicate register, sequential navigation commands, broadcast gating, and ack-before-broadcast ordering.
	-   Files: `server/tests/fsm-extended.test.ts`, `server/tests/handlers.test.ts` (or combined), test harness config.
	-   Acceptance: Added tests pass; coverage reports show new suites; failure injection (invalid action) yields expected rejection behavior.

---

## 6. Logging Enhancements Plan (Robust Logging)

Context: Initial structured logging (Task 1.12 / 1.20) provides JSON-esque event logs (event name + meta). The next iteration introduces controllable verbosity, consistent schema, and resilience-focused critical logging. This plan is documentation-only until individual tasks are scheduled (target: Milestone 2 "Robust logging" goal).

### 6.1 Objectives
- Provide runtime-configurable log level filtering (reduce noise in normal operation).
- Standardize level taxonomy and event classification for predictable observability.
- Improve incident forensics with correlation identifiers and state version tagging.
- Capture and surface unrecoverable failures distinctly ("critical").
- Enable automated schema validation (Task 4.11) without brittle parsing.

### 6.2 Level Taxonomy
| Level | Purpose | Typical Events |
|-------|---------|----------------|
| debug | High-volume diagnostic detail (development / deep troubleshooting) | message_received, state_broadcast_skipped, internal transition metrics |
| info  | Normal life-cycle & material state changes | server_start, client_registered, state_broadcast, navigation_command_handled |
| warn  | Client / environmental anomalies requiring attention but auto-recoverable | invalid_message (non-fatal), duplicate register attempts, slow_ack (future) |
| error | Operation failed or data rejected with impact to current request/interaction | websocket_error, failed_action_confirmation |
| critical | System integrity risk / process about to exit / invariant breach | uncaught_exception, unhandled_rejection, fatal_config_missing |

### 6.3 Configuration Mechanism
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

### 6.4 Event Reclassification (Current → Target)
- message_received: info → debug
- state_broadcast_skipped: info → debug
- client_connected/client_disconnected: info (keep)
- navigation_command_handled/control_command_handled/action_confirmation_received: info (retain), add `state_version`
- invalid_message: warn (with code)
- websocket_error: error
- server_start / server_ready: info
- future fatal events: critical

### 6.5 Metadata Schema (Incremental)
Mandatory base fields per log line (flat JSON object):
- ts (epoch ms)
- level
- event
- message (optional human-readable)
- state_version (if related to FSM change or broadcast)
- client_type / device_id (when related to a specific client)
- error_code (when applicable)
- stack (on error/critical when available)

Enhancement: Ensure creation of lightweight helpers to append `state_version` lazily (`fsm.getSnapshot().version`). Avoid multiple snapshot calls inside loops.

### 6.6 Critical Error Handling
Attach once (idempotent guard) in server bootstrap:
```ts
process.on('uncaughtException', err => logger.critical('uncaught_exception', { message: err.message, stack: err.stack }));
process.on('unhandledRejection', (reason:any) => logger.critical('unhandled_rejection', { reason: reason?.message || String(reason) }));
```
Option: configurable auto-exit on critical vs continue (env: `EXIT_ON_CRITICAL=true|false`, default true in prod, false in dev).

### 6.7 Validation Alignment
- Task 4.11 (Log schema conformance) will target this schema; implement AFTER logger changes land.
- Add sample fixture logs under `validation/samples/logs/*.jsonl` for test harness golden comparison (optional).

### 6.8 Incremental Task Breakdown (Standardized Tasks)

-   [ ] **Task 1.20a**: Log level filtering & taxonomy `(YYYY-MM-DD)`
	-   Description: Implement log level precedence (debug, info, warn, error, critical) with env (`LOG_LEVEL`) and CLI (`--log-level`) overrides and early filtering.
	-   Files: `server/shared/utils/logging.ts` (enhanced), `server/package.json` (start scripts), `server/websocket-server.ts` (integration).
	-   Acceptance: Running with `LOG_LEVEL=warn` excludes debug/info events; `--log-level=debug` shows all levels; sample run demonstrates filtered output.
-   [ ] **Task 1.20b**: Event reclassification & state_version tagging `(YYYY-MM-DD)`
	-   Description: Reclassify existing events per taxonomy; add `state_version` meta to all FSM mutation & broadcast events; downgrade noisy events to debug.
	-   Files: `server/websocket-server.ts`, `server/fsm.ts`, logging helper.
	-   Acceptance: Log lines for a navigation command include `state_version`; `message_received` absent at info but present at debug level.
-   [ ] **Task 1.20c**: Critical error handlers `(YYYY-MM-DD)`
	-   Description: Add process handlers for `uncaughtException` & `unhandledRejection` emitting `critical` events with stack/reason and conditional process exit.
	-   Files: `server/websocket-server.ts` (bootstrap), logging helper.
	-   Acceptance: Simulated thrown error logs a `critical` event; exit behavior toggled via `EXIT_ON_CRITICAL` env.
-   [ ] **Task 1.20d**: Log schema validation harness `(YYYY-MM-DD)`
	-   Description: Implement validation utility parsing JSONL logs to assert required fields (ts, level, event; plus conditional fields) and integrate into validation flow (Task 4.11 linkage).
	-   Files: `validation/utils/log-assert.ts`, `validation/test-drivers/log-schema-check.js`.
	-   Acceptance: Harness passes on compliant logs; intentional malformed line triggers descriptive failure.
-   [ ] **Task 1.20e**: Documentation synchronization `(YYYY-MM-DD)`
	-   Description: Update `ARCHITECTURE.md` (logging section), `VALIDATION.md` (schema & sample), and this plan to reflect implemented logging features.
	-   Files: `ARCHITECTURE.md`, `VALIDATION.md`, `IMPLEMENTATION.md` (this section update upon completion).
	-   Acceptance: Docs list current events, levels, schema fields, configuration knobs; internal links valid.

Scheduling: Bundle 1.20a–1.20c inside Milestone 2 ("Robust logging"). Tasks 1.20d–1.20e can trail with validation expansion.

### 6.9 Non-Goals (For Now)
- Log shipping / external aggregation connectors.
- Sampling / rate limiting strategies.
- Metrics extraction (separate future observability pass).

### 6.10 Risks & Mitigations
- Risk: Overhead from frequent snapshot calls. Mitigation: cache version inside handler prior to logging multiple events.
- Risk: Inconsistent meta fields. Mitigation: central normalizeMeta helper enforcing schema defaults.
- Risk: Developer drift on event naming. Mitigation: document event registry table inside ARCHITECTURE.md (future doc task).

### 6.11 Success Criteria
- Ability to reduce normal log volume to high-signal info/warn/error in production.
- Debug mode surfaces skipped broadcasts & granular message receipt without code changes.
- Critical failures always produce a final structured log line before exit.
- Validation task (future) can parse and assert schema with <2% false positives.

---
