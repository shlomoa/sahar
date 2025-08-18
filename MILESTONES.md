# SAHAR – Milestones

This document tracks major milestones, their definitions of done (DoD), and the exact tasks and flows required to complete them. Check off items as they’re delivered and add completion dates.

Conventions
- Dates use `(YYYY-MM-DD)` until completed.
- Task references point to `IMPLEMENTATION.md`, architecture references point to `ARCHITECTURE.md`, and flow/spec references point to `VALIDATION.md`.

---

## Milestone 1 — Skeleton Solution

Goal: Establish a working baseline of the unified system with a production-ready server core and validation stubs, proving end-to-end integration using stubs (no real Angular apps required yet).

Definition of Done (DoD)
- [x] Functional, unit-tested production server (core FSM + WebSocket gateway) `(2025-08-18)`
- [x] TV and Remote stubs implemented in `/validation` and controllable via HTTP `(2025-08-11)`
- [x] Validation infrastructure in place (health/readiness checks, quick-run) `(2025-08-14)`
- [x] Integrated solution: production server + TV stub + Remote stub working together `(2025-08-14)`
- [x] Integration tests for the solution pass locally via validation harness `(2025-08-14)`

Key Deliverables
- Unified server core that handles register/ack, data ingestion, navigation/control, state updates, and reconnection.
- TV and Remote stubs: deterministic client_id, WS `/ws` protocol, HTTP control surface.
- Canonical validation flows and test drivers to run server+stubs end-to-end.

Scope Notes
- Angular SSR hosting for TV/Remote apps is not required for this milestone; it will be targeted in a later milestone.
- Real TV/Remote Angular apps are not required; stubs are used for integration.

### 1. Required Tasks (from `IMPLEMENTATION.md`)

Server Core
- [x] [Task 1.5 — Centralized server config (Retired)](./IMPLEMENTATION.md#2-phase-1-server-side-refactoring-unified-server--ssr-host) `(2025-08-12)`
- [x] [Task 1.12 — Health/readiness/logging endpoints](./IMPLEMENTATION.md#2-phase-1-server-side-refactoring-unified-server--ssr-host) `(2025-08-12)`
- [x] [Task 1.13 — Scripts and environment (dev/prod entry points)](./IMPLEMENTATION.md#2-phase-1-server-side-refactoring-unified-server--ssr-host) `(2025-08-13)`
- [x] [Task 1.15 — FSM core](./IMPLEMENTATION.md#2-phase-1-server-side-refactoring-unified-server--ssr-host) `(2025-08-13)`
- [x] [Task 1.16 — state_sync broadcast discipline](./IMPLEMENTATION.md#2-phase-1-server-side-refactoring-unified-server--ssr-host) `(2025-08-13)`
- [x] [Task 1.17 — data handler](./IMPLEMENTATION.md#2-phase-1-server-side-refactoring-unified-server--ssr-host) `(2025-08-13)`
- [x] [Task 1.18 — navigation/control handlers](./IMPLEMENTATION.md#2-phase-1-server-side-refactoring-unified-server--ssr-host) `(2025-08-13)`
- [x] [Task 1.20 — Structured logging](./IMPLEMENTATION.md#2-phase-1-server-side-refactoring-unified-server--ssr-host) `(2025-08-11)`
- [x] [Task 1.21 — Invalid message handling](./IMPLEMENTATION.md#2-phase-1-server-side-refactoring-unified-server--ssr-host) `(2025-08-11)`

Early Completed (Out-of-scope SSR prep – not required for Milestone 1 DoD)
- [x] Task 1.6 — Dev reverse proxies (2025-08-13)
- [x] Task 1.7 — Static assets passthrough (2025-08-13)
- [x] Task 1.8 — SSR bundle presence (inline gating, simplified) (2025-08-13)

 Validation/Process
- [x] [Task 1.14 — Validation hooks (document flows in `VALIDATION.md`)](./IMPLEMENTATION.md#2-phase-1-server-side-refactoring-unified-server--ssr-host) `(2025-08-13)`
- [x] [Task 4.2 — Validation quick-run workflow](./IMPLEMENTATION.md#5-guiding-principles-for-iterative-validation) `(2025-08-14)`
- [x] [Task 4.4 — Update/create integration tests in `/validation`](./IMPLEMENTATION.md#5-guiding-principles-for-iterative-validation) `(2025-08-18)` — Path B (doc-only: canonical quick-run)
- [x] [Task 4.5 — Documentation sync](./IMPLEMENTATION.md#5-guiding-principles-for-iterative-validation) `(2025-08-14)`
- [x] [Task 4.6 — Implement TV Stub](./IMPLEMENTATION.md#5-guiding-principles-for-iterative-validation) `(2025-08-11)`
- [x] [Task 4.7 — Implement Remote Stub](./IMPLEMENTATION.md#5-guiding-principles-for-iterative-validation) `(2025-08-11)`
- [x] [Task 4.8 — Stub runner scripts](./IMPLEMENTATION.md#5-guiding-principles-for-iterative-validation) `(2025-08-11)`
- [x] [Task 4.9 — Integration drivers for stub flows](./IMPLEMENTATION.md#5-guiding-principles-for-iterative-validation) `(2025-08-18)` — Path B (covered by validate.js hooks)
- [x] [Task 4.10 — Stop-and-wait enforcement tests](./IMPLEMENTATION.md#5-guiding-principles-for-iterative-validation) `(2025-08-18)` — Path B (Hook E)
- [x] [Task 4.13 — Server FSM unit tests](./IMPLEMENTATION.md#5-guiding-principles-for-iterative-validation) `(2025-08-18)`

### 2. Required Specs & Flows (from `VALIDATION.md`)

Stub Specifications
- [x] [Section 6.1 — Common Stub Contract](./VALIDATION.md#61-common-stub-contract) `(2025-08-11)`
- [x] [Section 6.2 — TV Stub Specification](./VALIDATION.md#62-tv-stub-specification-validationstubstv-stubjs) `(2025-08-11)`
- [x] [Section 6.3 — Remote Stub Specification](./VALIDATION.md#63-remote-stub-specification-validationstubsremote-stubjs) `(2025-08-11)`

Canonical Flows (stubs-based)
- [x] [Flow 8 — Validate Server in Isolation (TV Stub + Remote Stub)](./VALIDATION.md#7-stub-based-validation-flows-canonical) `(2025-08-11)`
- [x] [Flow 9 — Validate TV App with Remote Stub](./VALIDATION.md#7-stub-based-validation-flows-canonical) `(2025-08-11)`
- [x] [Flow 10 — Validate Remote App with TV Stub](./VALIDATION.md#7-stub-based-validation-flows-canonical) `(2025-08-11)`

Preflight/Health (for quick smoke)
- [x] [Flow 4 — Health & Readiness Preflight](./VALIDATION.md#4-full-integration-testing-validation) `(2025-08-11)`

Unit Testing (recommended coverage for server/stubs)
- [x] [Section 2.1 — Server-Side FSM unit tests](./VALIDATION.md#2-unit-testing) `(2025-08-18)`

### 3. Integration Assembly Checklist

Server bring-up
- [x] Build and start the production server ([Task 1.13](./IMPLEMENTATION.md#2-phase-1-server-side-refactoring-unified-server--ssr-host)) `(2025-08-11)`
- [x] Verify `/live`, `/ready`, `/health` respond ([Task 1.12](./IMPLEMENTATION.md#2-phase-1-server-side-refactoring-unified-server--ssr-host), [Flow 4](./VALIDATION.md#4-full-integration-testing-validation)) `(2025-08-14)`

Stubs bring-up
- [x] Start TV Stub (`validation/stubs/tv-stub.ts`, [Section 6.2](./VALIDATION.md#62-tv-stub-specification-validationstubstv-stubts)) `(2025-08-14)`
- [x] Start Remote Stub (`validation/stubs/remote-stub.ts`, [Section 6.3](./VALIDATION.md#63-remote-stub-specification-validationstubsremote-stubts)) `(2025-08-14)`
- [x] Both stubs register and receive ack ([Flow 8](./VALIDATION.md#7-stub-based-validation-flows-canonical)) `(2025-08-14)`

End-to-end with stubs
- [x] Navigation command via Remote Stub reflects on TV Stub state ([Flow 8](./VALIDATION.md#7-stub-based-validation-flows-canonical)) `(2025-08-14)`
- [x] Control command via Remote Stub reflects on TV Stub state ([Flow 8](./VALIDATION.md#7-stub-based-validation-flows-canonical)) `(2025-08-14)`
- [x] Reconnection logic verified (stop/start one stub) `(2025-08-14)`

Automation
- [x] Quick-run or VS Code tasks execute stub-based flows ([Task 4.2](./IMPLEMENTATION.md#5-guiding-principles-for-iterative-validation)/[Task 4.4](./IMPLEMENTATION.md#5-guiding-principles-for-iterative-validation)) `(2025-08-14)`


### 4. Milestone Completion

Milestone 1 is complete when all DoD items and all required tasks/specs/flows above are checked with dates.

#### 4.1 Validation Hook Progress (Section 10 in VALIDATION.md)

Status of discrete hook tasks (A–J) underpinning Milestone 1 integration confidence:

- [x] Hook A – Server Startup & Health `(2025-08-14)`
- [x] Hook B – Stub Pair Registration Round Trip `(2025-08-14)`
- [x] Hook C – Navigation Command Propagation (2025-08-14)
- [x] Hook D – Control Command Propagation (2025-08-14)
- [x] Hook E – Stop-and-Wait (Ack-Gated Broadcast Discipline) (2025-08-14)
- [x] Hook I – Data Seeding (Initial Data Handler) (2025-08-14)
- [x] Hook J – Reconnection Behavior (2025-08-14)

Guidance:
- For strict Milestone 1 closure, prioritize A, B, C, D, E, I, J.
- F and G document early SSR readiness but are not gate criteria.
- H will be implemented alongside the SSR process manager (Tasks 1.9/1.10).

Summary
- [x] Milestone 1 complete `(2025-08-18)`

---

Future milestones will build on this baseline to add Angular SSR hosting, real TV/Remote apps, and production deployment hardening.

---

## Milestone 2 — POCs: YouTube + QR Onboarding

Goals
- Goal 1: YouTube POC using the Angular YouTube package; if built-in controls are available, display them; include unit tests.
- Goal 2: QR onboarding POC where an Android phone scans the TV’s QR, opens the link in Chrome, and the Remote actually connects (register → ack).
- Goal 3: Robust logging (log level control, reclassified events, critical handlers).

### Planned Tasks

Server (Unified)
- [ ] [Task 1.19 — Heartbeat/recovery](./IMPLEMENTATION.md#2-phase-1-server-side-refactoring-unified-server--ssr-host) `(YYYY-MM-DD)`
- [ ] [Task 1.20a — Log level filtering & taxonomy](./IMPLEMENTATION.md#68-incremental-task-breakdown-standardized-tasks) `(YYYY-MM-DD)`
- [ ] [Task 1.20b — Event reclassification & state_version tagging](./IMPLEMENTATION.md#68-incremental-task-breakdown-standardized-tasks) `(YYYY-MM-DD)`
- [ ] [Task 1.20c — Critical error handlers](./IMPLEMENTATION.md#68-incremental-task-breakdown-standardized-tasks) `(YYYY-MM-DD)`
- [ ] [Task 4.12 — Health payload completeness tests](./IMPLEMENTATION.md#5-guiding-principles-for-iterative-validation) `(YYYY-MM-DD)`
- [ ] Task 1.22 — Player state fidelity: ensure FSM tracks `isPlaying`, `currentTime`, `currentVideoId`, `volume`; reflected in `state_sync` (see [ARCHITECTURE.md — ApplicationState](./ARCHITECTURE.md#server-owned-applicationstate-authoritative-schema)) `(YYYY-MM-DD)`
- [ ] Task 1.23 — Ack-gated broadcast metrics: add counts/timings to logs for validation (see [ARCHITECTURE.md — Stop-and-Wait](./ARCHITECTURE.md#synchronous-stop-and-wait-acknowledgement-model)) `(YYYY-MM-DD)`

Shared (Types/Utils)
- [ ] [Task 2.16 — Update websocket-protocol.ts to match ARCHITECTURE.md](./IMPLEMENTATION.md#33-shared-functionality-shared) `(YYYY-MM-DD)`
- [ ] [Task 2.17 — Verify shared utilities are integrated (incl. youtube-helpers tests)](./IMPLEMENTATION.md#33-shared-functionality-shared) `(YYYY-MM-DD)` (see also [ARCHITECTURE.md — Video Integration](./ARCHITECTURE.md#5-video-integration))
- [ ] Task 2.15a — websocket-base.service unit tests: reconnect/backoff and ack handling (see [VALIDATION.md — Unit Testing](./VALIDATION.md#2-unit-testing)) `(YYYY-MM-DD)`

TV App (Stateless rendering + YouTube)
- [ ] [Task 2.5 — Ensure stateless rendering from state_update (YouTube helper wiring in TV)](./IMPLEMENTATION.md#31-tv-application-appstv) `(YYYY-MM-DD)`
- [ ] Task 2.23 — YouTube integration: wire @angular/youtube-player; map control_command/state to player API (see [ARCHITECTURE.md — Video Integration](./ARCHITECTURE.md#5-video-integration)) `(YYYY-MM-DD)`
- [ ] Task 2.24 — Action confirmations: send `action_confirmation` on play started/seek reached; handle failure path (see [ARCHITECTURE.md — Protocol](./ARCHITECTURE.md#4-unified-communication-protocol)) `(YYYY-MM-DD)`
- [ ] Task 2.25 — Error handling: surface unplayable video/invalid state; structured logs (see [ARCHITECTURE.md — Protocol](./ARCHITECTURE.md#4-unified-communication-protocol)) `(YYYY-MM-DD)`
- [ ] [Task 2.19 — Player renders when videoId is present](./IMPLEMENTATION.md#31-tv-application-appstv) `(YYYY-MM-DD)`
- [ ] [Task 2.20 — Playback init without errors](./IMPLEMENTATION.md#31-tv-application-appstv) `(YYYY-MM-DD)`
- [ ] [Task 2.21 — Control toggle invokes player API or updates bound state](./IMPLEMENTATION.md#31-tv-application-appstv) `(YYYY-MM-DD)`
- [ ] [Task 2.22 — Changing videoId loads the new video](./IMPLEMENTATION.md#31-tv-application-appstv) `(YYYY-MM-DD)`
- [ ] Task 2.26 — QR display: show Remote entry URL as QR using angularx-qrcode (encode `${location.origin}/remote`) (see [ARCHITECTURE.md — Discovery Flow (QR)](./ARCHITECTURE.md#discovery-flow-qr-based)) `(YYYY-MM-DD)`
- [ ] Task 2.27 — Connected status: indicator for remote connected/disconnected from `state_sync` (see [ARCHITECTURE.md — ApplicationState](./ARCHITECTURE.md#server-owned-applicationstate-authoritative-schema)) `(YYYY-MM-DD)`

Remote App (Data owner + controls)
- [ ] [Task 2.8 — Refactor WebsocketService to shared base](./IMPLEMENTATION.md#32-remote-application-appsremote) `(YYYY-MM-DD)`
- [ ] [Task 2.9 — Remove peer-discovery/direct TV sockets](./IMPLEMENTATION.md#32-remote-application-appsremote) `(YYYY-MM-DD)`
- [ ] [Task 2.10 — Send initial data on connection](./IMPLEMENTATION.md#32-remote-application-appsremote) `(YYYY-MM-DD)`
- [ ] [Task 2.11 — Route all navigation/control to server](./IMPLEMENTATION.md#32-remote-application-appsremote) `(YYYY-MM-DD)`
- [ ] [Task 2.12 — Decide Remote delivery model (SSR vs SPA PWA)](./IMPLEMENTATION.md#32-remote-application-appsremote) `(YYYY-MM-DD)`
- [ ] [Task 2.13 — PWA hardening](./IMPLEMENTATION.md#32-remote-application-appsremote) `(YYYY-MM-DD)`
- [ ] [Task 2.14 — Build/scripts for chosen model](./IMPLEMENTATION.md#32-remote-application-appsremote) `(YYYY-MM-DD)`
- [ ] Task 2.28 — UI states: show connecting/connected/blocked; basic error toasts for protocol errors (see [ARCHITECTURE.md — Protocol](./ARCHITECTURE.md#4-unified-communication-protocol)) `(YYYY-MM-DD)`

Validation & Tests
- [ ] [Flow 2 — Video Playback Control](./VALIDATION.md#flow-2-video-playback-control): verify end-to-end play/pause/seek/volume `(YYYY-MM-DD)`
- [ ] [Flow 7 — QR Onboarding](./VALIDATION.md#flow-7-qr-onboarding): Android camera scan → Chrome opens `/remote`; Remote connects `(YYYY-MM-DD)`
- [ ] [Section 2.2 — Client-Side WebSocket base service unit tests](./VALIDATION.md#2-unit-testing) `(YYYY-MM-DD)`
- [ ] [Task 4.11 — Log schema conformance checks](./IMPLEMENTATION.md#5-guiding-principles-for-iterative-validation) `(YYYY-MM-DD)`
- [ ] [Task 4.12 — Health payload completeness tests](./IMPLEMENTATION.md#5-guiding-principles-for-iterative-validation) `(YYYY-MM-DD)`
- [ ] Task 4.14 — Extend stubs minimally for new actions if needed (see [VALIDATION.md — Stub Specs §6](./VALIDATION.md#61-common-stub-contract)) `(YYYY-MM-DD)`
- [ ] Task 4.15 — Validation scripts: surface POC checks in quick flow summary (see [VALIDATION.md — Flows](./VALIDATION.md#4-full-integration-testing-validation)) `(YYYY-MM-DD)`

Docs
- [ ] Task 4.16 — `IMPLEMENTATION.md`: ensure tasks 2.5, 2.19–2.22, 1.19, 1.20a–c listed with acceptance criteria (see [IMPLEMENTATION.md](./IMPLEMENTATION.md)) `(YYYY-MM-DD)`
- [ ] Task 4.17 — `MILESTONES.md`: update statuses as work progresses; keep DoD linking Flow 2 & Flow 7 (see [VALIDATION.md — Flow 2](./VALIDATION.md#flow-2-video-playback-control) and [Flow 7](./VALIDATION.md#flow-7-qr-onboarding)) `(YYYY-MM-DD)`
- [ ] Task 4.18 — READMEs: keep schema centralized (links only); QR package links in TV/Remote READMEs (see [ARCHITECTURE.md — Diagram/Protocol/Network](./ARCHITECTURE.md#2-system-components--architecture-diagram)) `(YYYY-MM-DD)`

Tooling/CI
- [ ] Task 4.19 — npm scripts: add tv/remote test scripts if missing; ensure root/validation workflows run tests (see [IMPLEMENTATION.md — Validation Principles](./IMPLEMENTATION.md#5-guiding-principles-for-iterative-validation)) `(YYYY-MM-DD)`
- [ ] Task 4.20 — VS Code tasks (optional): add “Run TV tests” / “Run Remote tests” tasks (see [IMPLEMENTATION.md — Validation Principles](./IMPLEMENTATION.md#5-guiding-principles-for-iterative-validation)) `(YYYY-MM-DD)`
- [ ] Task 4.21 — Pre-push hook (optional): run server FSM tests + affected app unit tests (see [VALIDATION.md — Unit Testing](./VALIDATION.md#2-unit-testing)) `(YYYY-MM-DD)`

### Optional
- [ ] [Task 1.11 — HTTPS/WSS enablement](./IMPLEMENTATION.md#2-phase-1-server-side-refactoring-unified-server--ssr-host) `(YYYY-MM-DD)`

Definition of Done (DoD)
- [ ] YouTube POC: TV uses the Angular YouTube package; if it ships controls, they are visible and usable `(YYYY-MM-DD)`
	- Acceptance: Validated via [Flow 2 — Video Playback Control](./VALIDATION.md#flow-2-video-playback-control); unit tests pass for basic playback init and control toggles (apps/tv).
- [ ] QR onboarding: TV shows a QR to `/remote`; using an Android phone camera, opening in Chrome loads Remote and it connects (register → ack) `(YYYY-MM-DD)`
	- Acceptance: Validated via [Flow 7 — QR Onboarding](./VALIDATION.md#flow-7-qr-onboarding); server logs show `client_registered` for remote and subsequent `state_sync`.
- [ ] Notes captured in docs and validation updated `(YYYY-MM-DD)`

Summary
- [ ] Milestone 2 complete `(YYYY-MM-DD)`

---

## Milestone 3 — Everything Is Connected

Goal
- Everything is connected

Definition of Done (DoD)
- [ ] Unified Server running; TV and Remote can connect (register/ack) `(YYYY-MM-DD)`
- [ ] Baseline state_sync observed by both clients `(YYYY-MM-DD)`
- [ ] Basic navigation/control round-trips verified `(YYYY-MM-DD)`

Summary
- [ ] Milestone 3 complete `(YYYY-MM-DD)`

---

## Milestone 4 — Video Navigation Is Running

Goal
- Video navigation is running

Definition of Done (DoD)
- [ ] Remote navigation commands update server FSM `(YYYY-MM-DD)`
- [ ] TV reflects correct navigation view `(YYYY-MM-DD)`
- [ ] Happy-path manual/automated flow recorded `(YYYY-MM-DD)`

Summary
- [ ] Milestone 4 complete `(YYYY-MM-DD)`

---

## Milestone 5 — Video Playing Is Running

Goal
- Video playing is running

Definition of Done (DoD)
- [ ] Play/Pause (and basic controls) propagate via server and reflect on TV `(YYYY-MM-DD)`
- [ ] Validation flow(s) cover playback start/stop `(YYYY-MM-DD)`
- [ ] Logs/metrics sufficient for troubleshooting `(YYYY-MM-DD)`

Summary
- [ ] Milestone 5 complete `(YYYY-MM-DD)`
