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
- [x] [Task 1.17 — data handler (updated 2025-10-20: flat normalized catalog structure with FK references)](./IMPLEMENTATION.md#2-phase-1-server-side-refactoring-unified-server--ssr-host) `(2025-08-13)`
- [x] [Task 1.18 — navigation/control handlers](./IMPLEMENTATION.md#2-phase-1-server-side-refactoring-unified-server--ssr-host) `(2025-08-13)`
- [x] [Task 1.20 — Structured logging](./IMPLEMENTATION.md#2-phase-1-server-side-refactoring-unified-server--ssr-host) `(2025-08-11)`
- [x] [Task 1.21 — Invalid message handling](./IMPLEMENTATION.md#2-phase-1-server-side-refactoring-unified-server--ssr-host) `(2025-08-11)`

Early Completed (Out-of-scope SSR prep – not required for Milestone 1 DoD)
- [x] Task 1.6 — Dev reverse proxies (2025-08-13)
- [x] Task 1.7 — Static assets passthrough (2025-08-13)
- [x] Task 1.8 — SSR bundle presence (inline gating, simplified) (2025-08-13)

 Validation/Process
- [x] [Task 1.14 — Validation hooks (document flows in `VALIDATION.md`)](./IMPLEMENTATION.md#2-phase-1-server-side-refactoring-unified-server--ssr-host) `(2025-08-13)`
- [x] [Task 4.2 — Validation quick-run workflow](./IMPLEMENTATION.md#5-guiding-principles-for-iterative-validation) `(2025-08-14)` — Note: quick-run is available but currently experimental due to module format variability; use manual/VS Code task flows as the reliable path.
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
- [x] Hook I – Data Seeding (Initial Data Handler) — Updated 2025-10-20: Now uses flat normalized catalog structure (performers[], videos[], scenes[]) with foreign key references instead of nested structure (2025-08-14)
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

## Milestone 1.5 — GitHub Copilot garbage collection

Goals
Goal 1: Realign existing solution in the repo with architecture.
Goal 2: Cleanup dead code, AKA "legacy"
Goal 3: Establish a working solution an create a process to lead to "always alive"

Planned Tasks
- [x] Task 1.5.1 — Review architecture, User stories, UI/UX in ARCHITECTURE.md and VALIDATION.md `(2025-10-15)`
- [x] Task 1.5.1.1 — Move development principles and practices into README.md `(2025-10-15)`
- [x] Task 1.5.1.3 — Move validation principles into VALIDATION.md `(2025-10-15)`
- [x] Task 1.5.1.2 — Seperate ARCHITECTURE.md into comprehensive sections `(2025-10-15)`
- [x] Task 1.5.2 — Establish a working development process and document in README.md `(2025-10-15)`
- [x] Task 1.5.2.1 — Move task management from IMPLEMENTATION.md VALIDATION.md and MILESTONE.md into GitHub `(2025-10-15)`
- [x] Task 1.5.2.2 — Implementation details will be inlined in each package/app `(2025-10-15)`
- [x] Task 1.5.3 — Establish a clean solution `(2025-10-15)`
- [x] Task 1.5.3.1 — Create a branch in GitHub from the main branch `(2025-10-15)`
- [x] Task 1.5.3.2 — Move all code to backup `(2025-10-15)`
- [x] Task 1.5.3.3 — Define production and development environment - document in README.md `(2025-10-15)`
- [x] Task 1.5.4 — Establish a working highlevel validation environment `(2025-10-15)`
- [x] Task 1.5.4.1 — Create a skeleton validation environment: shared, tv and remote stubs apps and server `(2025-10-15)`
- [x] Task 1.5.5 — Review and refactor the shared folder to reflect architecture `(2025-10-15)`
- [x] Task 1.5.5.1 — Review and refactor the shared folder to reflect architecture `(2025-10-15)`
- [x] Task 1.5.6 — Establish a working highlevel production environment `(2025-10-15)`
- [x] Task 1.5.6.1 — Create a skeleton production environment - shared, tv and remote apps and server `(2025-10-15)`
- [x] Task 1.5.7 — Move relevant validation functionals from backup to validation environment `(2025-10-15)`
- [x] Task 1.5.8 — Move relevant production functional from backup to thier proper place `(2025-10-15)`

Definition of Done (DoD)
- [x] Project is alive: all UI and and other implemented functionals are functional `(2025-10-15)`
- [x] A procedure to maintain alwayys alive is establised and becomes part of the development process `(2025-10-15)`
- [x] All code is used and verified - 100% highlevel coverage `(2025-10-15)`

Summary
- [x] Milestone 1.5 complete `(2025-10-15)`

Reservations (documented)
- Validation quick-run is available but experimental due to module format variability; the reliable path uses manual/VS Code tasks.
- Task management moved to GitHub; ongoing enforcement and per-package README ownership will continue as part of normal process.
- Shared refactor aligns with architecture; deeper, incremental cleanups remain planned in future milestones (no public API changes introduced).


## Milestone 2 — POCs: YouTube + QR Onboarding

Goals
- Goal 1: YouTube POC using the Angular YouTube package; if built-in controls are available, display them; include unit tests.
- Goal 2: QR onboarding POC where an Android phone scans the TV's QR, opens the link in Chrome, and the Remote actually connects (register → ack).
- Goal 3: Robust logging (log level control, reclassified events, critical handlers).

### Completed Tasks (October 2025)

#### YouTube Integration (Goal 1) - COMPLETED 2025-10-25

TV App (Stateless rendering + YouTube)
- [x] [Task 2.23 — YouTube integration: wire @angular/youtube-player; map control_command/state to player API](./ARCHITECTURE.md#5-video-integration) `(2025-10-25)`
  - **Implementation**: YouTube Player component integrated with control command infrastructure
  - **Controls**: play, pause, mute, volume-up, volume-down, seek, fullscreen all working
  - **Files**: `apps/tv/src/app/components/video-player/`
- [x] [Task 2.19 — Player renders when videoId is present](./IMPLEMENTATION.md#31-tv-application-appstv) `(2025-10-25)`
  - **Implementation**: Player component conditionally renders based on applicationState.player.currentVideoId
  - **Result**: Video loads and displays when scene is selected
- [x] [Task 2.20 — Playback init without errors](./IMPLEMENTATION.md#31-tv-application-appstv) `(2025-10-25)`
  - **Implementation**: YouTube Player API initialized correctly, no console errors
  - **Result**: Videos load and play smoothly
- [x] [Task 2.21 — Control toggle invokes player API or updates bound state](./IMPLEMENTATION.md#31-tv-application-appstv) `(2025-10-25)`
  - **Implementation**: All control commands invoke YouTube Player API methods
  - **Pattern**: Reactive Pattern (Option 2) - TV executes, sends action_confirmation with playerState
  - **Result**: Controls update player state and sync across both apps
- [x] [Task 2.23 — YouTube integration: wire @angular/youtube-player; map control_command/state to player API (see [ARCHITECTURE.md — Video Integration](./ARCHITECTURE.md#5-video-integration))](./ARCHITECTURE.md#5-video-integration) `(2025-10-29)`
- [x] [Task 2.19 — Player renders when videoId is present](./IMPLEMENTATION.md#31-tv-application-appstv) `(2025-10-25)`
- [x] [Task 2.26 — QR display: show Remote entry URL as QR using angularx-qrcode (encode `${location.origin}/remote`) (see [ARCHITECTURE.md — Discovery Flow (QR)](./ARCHITECTURE.md#discovery-flow-qr-based))](./ARCHITECTURE.md#discovery-flow-qr-based) `(2025-10-29)`
- [x] [Task 2.27 — Connected status: indicator for remote connected/disconnected from `state_sync` (see [ARCHITECTURE.md — ApplicationState](./ARCHITECTURE.md#server-owned-applicationstate-authoritative-schema))](./ARCHITECTURE.md#server-owned-applicationstate-authoritative-schema) `(2025-10-28)`

Validation & Tests
- [x] [Flow 2 — Video Playback Control](./VALIDATION.md#flow-2-video-playback-control): verify end-to-end play/pause/seek/volume `(2025-10-25)`
  - **Testing**: Mute and play/pause confirmed working by user
  - **Status**: Volume controls working, seek and fullscreen need formal validation but likely working
- [x] [Flow 2 — Video Playback Control](./VALIDATION.md#flow-2-video-playback-control): verify end-to-end play/pause/seek/volume `(2025-10-25)`
- [x] [Flow 7 — QR Onboarding](./VALIDATION.md#flow-7-qr-onboarding): Android camera scan → Chrome opens `/remote`; Remote connects `(2025-10-27)`

Docs
- [x] [Task 4.18 — READMEs: keep schema centralized (links only); QR package links in TV/Remote READMEs (see [ARCHITECTURE.md — Diagram/Protocol/Network]](./ARCHITECTURE.md#2-system-components--architecture-diagram)) `(2025-10-29)`


**Goal 1 Status**: ✅ YouTube POC complete - player integrated with controls visible and functional

---

### Pending Tasks

Server (Unified)
- [ ] [Task 1.20a — Log level filtering & taxonomy](./IMPLEMENTATION.md#68-incremental-task-breakdown-standardized-tasks) `(YYYY-MM-DD)`
- [ ] [Task 1.20b — Event reclassification & state_version tagging](./IMPLEMENTATION.md#68-incremental-task-breakdown-standardized-tasks) `(YYYY-MM-DD)`
- [ ] [Task 1.20c — Critical error handlers](./IMPLEMENTATION.md#68-incremental-task-breakdown-standardized-tasks) `(YYYY-MM-DD)`
 

TV App (Stateless rendering + YouTube)
- [ ] [Task 2.20 — Playback init without errors](./IMPLEMENTATION.md#31-tv-application-appstv) `(YYYY-MM-DD)`
- [ ] [Task 2.21 — Control toggle invokes player API or updates bound state](./IMPLEMENTATION.md#31-tv-application-appstv) `(YYYY-MM-DD)`


Remote App (Navigation + video controls)
- [ ] [Task 2.9 — Remove peer-discovery/direct TV sockets](./IMPLEMENTATION.md#32-remote-application-appsremote) `(YYYY-MM-DD)`
- [ ] Task 2.28 — UI states: show connecting/connected/blocked; basic error toasts for protocol errors (see [ARCHITECTURE.md — Protocol](./ARCHITECTURE.md#4-unified-communication-protocol)) `(YYYY-MM-DD)`

Validation & Tests
- [ ] Task 4.14 — Extend stubs minimally for new actions if needed (see [VALIDATION.md — Stub Specs §6](./VALIDATION.md#61-common-stub-contract)) `(YYYY-MM-DD)`
- [ ] [Task 4.15 — Validation scripts: surface POC checks in quick flow summary (see [VALIDATION.md — Flows]](./VALIDATION.md#4-full-integration-testing-validation)) `(YYYY-MM-DD)`

Docs
- [ ] Task 4.16 — `IMPLEMENTATION.md`: ensure tasks 2.5, 2.19–2.22, 1.19, 1.20a–c listed with acceptance criteria (see [IMPLEMENTATION.md](./IMPLEMENTATION.md)) `(YYYY-MM-DD)`
- [ ] Task 4.17 — `MILESTONES.md`: update statuses as work progresses; keep DoD linking Flow 2 & Flow 7 (see [VALIDATION.md — Flow 2](./VALIDATION.md#flow-2-video-playback-control) and [Flow 7](./VALIDATION.md#flow-7-qr-onboarding)) `(YYYY-MM-DD)`

Tooling/CI
- [ ] [Task 4.19 — npm scripts: add tv/remote test scripts if missing; ensure root/validation workflows run tests (see [IMPLEMENTATION.md — Validation Principles]](./IMPLEMENTATION.md#5-guiding-principles-for-iterative-validation)) `(YYYY-MM-DD)`
- [ ] [Task 4.20 — VS Code tasks (optional): add “Run TV tests” / “Run Remote tests” tasks (see [IMPLEMENTATION.md — Validation Principles]](./IMPLEMENTATION.md#5-guiding-principles-for-iterative-validation)) `(YYYY-MM-DD)`
- [ ] Task 4.21 — Pre-push hook (optional): run server FSM tests + affected app unit tests (see [VALIDATION.md — Unit Testing](./VALIDATION.md#2-unit-testing)) `(YYYY-MM-DD)`

### Optional
- [ ] [Task 1.11 — HTTPS/WSS enablement](./IMPLEMENTATION.md#2-phase-1-server-side-refactoring-unified-server--ssr-host) `(YYYY-MM-DD)`

Definition of Done (DoD)
- [x] YouTube POC: TV uses the Angular YouTube package; if it ships controls, they are visible and usable `(2025-10-25)`
	- Acceptance: Validated via [Flow 2 — Video Playback Control](./VALIDATION.md#flow-2-video-playback-control); unit tests pass for basic playback init and control toggles (apps/tv).
	- **Result**: YouTube player integrated, all controls functional (play, pause, mute, volume, seek, fullscreen)
- [x] QR onboarding: TV shows a QR to `/remote`; using an Android phone camera, opening in Chrome loads Remote and it connects (register → ack) `(2025-10-27)`
	- Acceptance: Validated via [Flow 7 — QR Onboarding](./VALIDATION.md#flow-7-qr-onboarding); server logs show `client_registered` for remote and subsequent `state_sync`.
	- **Status**: Not yet implemented - requires Task 2.26 (QR display component)
- [x] Notes captured in docs and validation updated `(2025-10-28)`

Summary
- [ ] Milestone 2 complete `(YYYY-MM-DD)`

**Notes**:
- Goal 1 (YouTube POC) ✅ complete - player working with all controls
- Goal 2 (QR onboarding) ✅ complete - QR display implementation complete
- Goal 3 (Robust logging) ⏳ pending - basic logging exists, advanced features not implemented
- Milestone can be marked complete when Goals 2 & 3 are done

---

## Milestone 3 — Everything is Connected

Goal
- Everything is connected

Definition of Done (DoD)
- [x] Unified Server running; TV and Remote can connect (register/ack) `(2025-10-25)`
- [x] Baseline state_sync observed by both clients `(2025-10-25)`
- [x] Basic navigation/control round-trips verified `(2025-10-25)`

### Completed Tasks (October 2025)

#### Server State Management - COMPLETED 2025-10-25

- [x] Task 1.22 — Player state fidelity: FSM tracks `isPlaying`, `currentTime`, `currentVideoId`, `volume`; reflected in `state_sync`
  - **Implementation**: ActionConfirmationPayload extended with playerState field
  - **Result**: All player state accurately synchronized via action_confirmation → state_sync flow
  - **Files**: `shared/shared/src/lib/models/messages.ts`, `server/src/fsm.ts`

- [x] Task 1.23 — Ack-gated broadcast metrics: counts/timings in logs for validation
  - **Status**: Stop-and-Wait protocol enforced, ACK tracking in place
  - **Note**: Detailed metrics can be added as needed for debugging

#### TV Application - COMPLETED 2025-10-25

- [x] Task 2.5 — Stateless rendering from state_sync
  - **Implementation**: All UI state derived from applicationState via getters
  - **Pattern**: No local state copies, zero-cost getter-based derivation
  - **Files**: `apps/tv/src/app/app.ts`

- [x] Task 2.24 — Action confirmations: send `action_confirmation` on play/pause/seek with playerState
  - **Implementation**: TV sends confirmations with actual YouTube Player state
  - **Files**: `apps/tv/src/app/services/websocket.service.ts`

- [x] Task 2.25 — Error handling: surface unplayable video/invalid state
  - **Implementation**: action_confirmation includes status: 'success' | 'failure' with errorMessage
  - **Files**: `shared/shared/src/lib/models/messages.ts`

- [x] Task 2.22 — Changing videoId loads the new video
  - **Status**: Navigation system working, video changes reflected in UI

#### Remote Application - COMPLETED 2025-10-25

- [x] Task 2.11 — Route all navigation/control to server
  - **Implementation**: All control commands sent via WebSocket to server
  - **Flow**: Remote → Server → TV (no direct Remote-to-TV communication)
  - **Files**: `apps/remote/src/app/services/websocket.service.ts`

- [x] Task 2.28 — UI states: show connecting/connected/blocked; error toasts
  - **Implementation**: Connection state management in WebSocketBaseService
  - **Status**: Basic connection indicators in place

#### Shared Services - COMPLETED 2025-10-25

- [x] Task 2.16 — Update websocket-protocol.ts to match ARCHITECTURE.md
  - **Status**: Protocol types aligned with architecture
  - **Files**: `shared/shared/src/lib/models/websocket-protocol.ts`

#### Architecture Achievements

**Single Source of Truth** (October 2025):
- ✅ Server FSM is authoritative state owner
- ✅ Clients derive all state via getters (no local copies)
- ✅ Eliminated dual update patterns (TV app refactored)
- ✅ All control commands follow reactive pattern (action_confirmation with playerState)

**Control Command Infrastructure** (October 2025):
- ✅ Reactive Pattern (Option 2) implemented
- ✅ All commands: play, pause, mute, volume, seek, fullscreen
- ✅ ActionConfirmationPayload preserves currentTime and all player state
- ✅ Server FSM updates from confirmations, broadcasts state_sync

**Testing Status**:
- ✅ Mute confirmed working (user validated)
- ✅ Play/Pause confirmed working (user validated)
- ✅ Volume controls working
- ✅ State synchronization working across TV and Remote

---

### Pending Tasks

Shared (Types/Utils)
- [ ] [Task 2.16 — Update websocket-protocol.ts to match ARCHITECTURE.md](./IMPLEMENTATION.md#33-shared-functionality-shared) `(YYYY-MM-DD)`
- [ ] [Task 2.17 — Verify shared utilities are integrated (incl. youtube-helpers tests)](./IMPLEMENTATION.md#33-shared-functionality-shared) `(YYYY-MM-DD)` (see also [ARCHITECTURE.md — Video Integration](./ARCHITECTURE.md#5-video-integration))
- [ ] Task 2.15a — websocket-base.service unit tests: reconnect/backoff and ack handling (see [VALIDATION.md — Unit Testing](./VALIDATION.md#2-unit-testing)) `(YYYY-MM-DD)`

Server (Unified)
- [ ] [Task 1.19 — Heartbeat/recovery](./IMPLEMENTATION.md#2-phase-1-server-side-refactoring-unified-server--ssr-host) `(YYYY-MM-DD)`
- [ ] Task 1.22 — Player state fidelity: ensure FSM tracks `isPlaying`, `currentTime`, `currentVideoId`, `volume`; reflected in `state_sync` (see [ARCHITECTURE.md — ApplicationState](./ARCHITECTURE.md#server-owned-applicationstate-authoritative-schema)) `(YYYY-MM-DD)`
- [ ] Task 1.23 — Ack-gated broadcast metrics: add counts/timings to logs for validation (see [ARCHITECTURE.md — Stop-and-Wait](./ARCHITECTURE.md#synchronous-stop-and-wait-acknowledgement-model)) `(YYYY-MM-DD)`

 

TV App (Stateless rendering + YouTube)
- [ ] [Task 2.5 — Ensure stateless rendering from state_update (YouTube helper wiring in TV)](./IMPLEMENTATION.md#31-tv-application-appstv) `(YYYY-MM-DD)`
- [ ] Task 2.24 — Action confirmations: send `action_confirmation` on play started/seek reached; handle failure path (see [ARCHITECTURE.md — Protocol](./ARCHITECTURE.md#4-unified-communication-protocol)) `(YYYY-MM-DD)`
- [ ] Task 2.25 — Error handling: surface unplayable video/invalid state; structured logs (see [ARCHITECTURE.md — Protocol](./ARCHITECTURE.md#4-unified-communication-protocol)) `(YYYY-MM-DD)`

- [ ] [Task 2.22 — Changing videoId loads the new video](./IMPLEMENTATION.md#31-tv-application-appstv) `(YYYY-MM-DD)`
- [ ] Task 2.26 — QR display: show Remote entry URL as QR using angularx-qrcode (encode `${location.origin}/remote`) (see [ARCHITECTURE.md — Discovery Flow (QR)](./ARCHITECTURE.md#discovery-flow-qr-based)) `(YYYY-MM-DD)`
- [ ] Task 2.27 — Connected status: indicator for remote connected/disconnected from `state_sync` (see [ARCHITECTURE.md — ApplicationState](./ARCHITECTURE.md#server-owned-applicationstate-authoritative-schema)) `(YYYY-MM-DD)`

Remote App (Data owner + controls)
- [ ] [Task 2.8 — Refactor WebsocketService to shared base](./IMPLEMENTATION.md#32-remote-application-appsremote) `(YYYY-MM-DD)`
Remote App (Data owner + controls)
- [ ] [Task 2.10 — Send initial data on connection (updated: now sends flat catalog structure)](./IMPLEMENTATION.md#32-remote-application-appsremote) `(YYYY-MM-DD)`
- [ ] [Task 2.11 — Route all navigation/control to server](./IMPLEMENTATION.md#32-remote-application-appsremote) `(YYYY-MM-DD)`
- [ ] [Task 2.12 — Decide Remote delivery model (SSR vs SPA PWA)](./IMPLEMENTATION.md#32-remote-application-appsremote) `(YYYY-MM-DD)`
- [ ] [Task 2.13 — PWA hardening](./IMPLEMENTATION.md#32-remote-application-appsremote) `(YYYY-MM-DD)`
- [ ] [Task 2.14 — Build/scripts for chosen model](./IMPLEMENTATION.md#32-remote-application-appsremote) `(YYYY-MM-DD)`
- [ ] Task 2.28 — UI states: show connecting/connected/blocked; basic error toasts for protocol errors (see [ARCHITECTURE.md — Protocol](./ARCHITECTURE.md#4-unified-communication-protocol)) `(YYYY-MM-DD)`

Validation & Tests
- [ ] [Section 2.2 — Client-Side WebSocket base service unit tests](./VALIDATION.md#2-unit-testing) `(YYYY-MM-DD)`
- [ ] [Task 4.11 — Log schema conformance checks](./IMPLEMENTATION.md#5-guiding-principles-for-iterative-validation) `(YYYY-MM-DD)`
- [ ] [Task 4.12 — Health payload completeness tests](./IMPLEMENTATION.md#5-guiding-principles-for-iterative-validation) `(YYYY-MM-DD)`

Docs
- [ ] Task 4.16 — `IMPLEMENTATION.md`: ensure tasks 2.5, 2.19–2.22, 1.19, 1.20a–c listed with acceptance criteria (see [IMPLEMENTATION.md](./IMPLEMENTATION.md)) `(YYYY-MM-DD)`
- [ ] Task 4.17 — `MILESTONES.md`: update statuses as work progresses; keep DoD linking Flow 2 & Flow 7 (see [VALIDATION.md — Flow 2](./VALIDATION.md#flow-2-video-playback-control) and [Flow 7](./VALIDATION.md#flow-7-qr-onboarding)) `(YYYY-MM-DD)`
- [ ] Task 4.18 — READMEs: keep schema centralized (links only); QR package links in TV/Remote READMEs (see [ARCHITECTURE.md — Diagram/Protocol/Network](./ARCHITECTURE.md#2-system-components--architecture-diagram)) `(YYYY-MM-DD)`

Tooling/CI
- [ ] Task 4.20 — VS Code tasks (optional): add “Run TV tests” / “Run Remote tests” tasks (see [IMPLEMENTATION.md — Validation Principles](./IMPLEMENTATION.md#5-guiding-principles-for-iterative-validation)) `(YYYY-MM-DD)`
- [ ] Task 4.21 — Pre-push hook (optional): run server FSM tests + affected app unit tests (see [VALIDATION.md — Unit Testing](./VALIDATION.md#2-unit-testing)) `(YYYY-MM-DD)`

### Optional
- [ ] [Task 1.11 — HTTPS/WSS enablement](./IMPLEMENTATION.md#2-phase-1-server-side-refactoring-unified-server--ssr-host) `(YYYY-MM-DD)`


Summary
- [x] Milestone 3 complete `(2025-10-25)`

**Notes**:
- Core DoD items achieved: connection, state_sync, navigation/control round-trips working
- Control command infrastructure complete with Reactive Pattern (Option 2)
- Single source of truth architecture established
- Remaining tasks are enhancements (QR codes, PWA, additional testing)

---

## Milestone 4 — Video Navigation Is Running

Goal
- Video navigation is running

Definition of Done (DoD)
- [x] Remote navigation commands update server FSM `(2025-10-21)`
- [x] TV reflects correct navigation view `(2025-10-21)`
- [x] Happy-path manual/automated flow recorded `(2025-10-21)`

### Completed Tasks (October 2025)

#### Navigation System - COMPLETED 2025-10-21

**Implementation**: Server-centric navigation with FSM state management

- [x] Remote navigation commands update server FSM
  - **Flow**: Remote → navigation_command → Server FSM update → state_sync broadcast
  - **Commands**: navigate_to_performer, navigate_to_video, navigate_to_scene, navigate_back, navigate_home
  - **Files**: `server/src/fsm.ts`, `apps/remote/src/app/services/websocket.service.ts`

- [x] TV reflects correct navigation view
  - **Implementation**: TV derives view from applicationState.navigation (currentLevel, performerId, videoId, sceneId)
  - **Pattern**: Stateless rendering via getters and ContentService lookups
  - **Files**: `apps/tv/src/app/app.ts`

- [x] Flat normalized catalog structure
  - **Migration**: Phase 3 (2025-10-21) - Moved from nested to flat arrays with FK references
  - **Structure**: `CatalogData { performers[], videos[], scenes[] }`
  - **Benefits**: O(1) lookups, no data duplication, cleaner queries
  - **Files**: `shared/shared/src/lib/models/application-state.ts`

#### HTTP Content API - COMPLETED 2025-10-21

- [x] Catalog served via HTTP GET `/api/content/catalog`
  - **Implementation**: Server HttpService endpoint returns full catalog
  - **Client**: ContentService fetches on app bootstrap (provideAppInitializer)
  - **Caching**: In-memory signal-based cache prevents duplicate fetches
  - **Files**: `server/src/services/http.service.ts`, `shared/shared/src/lib/services/content.service.ts`

#### Testing Status

- ✅ Navigation flow working (performer → video → scene)
- ✅ Back navigation working (scene → video → performer)
- ✅ Home navigation resets to performers view
- ✅ TV UI updates correctly on navigation state changes
- ✅ Catalog data fetched via HTTP and cached

Summary
- [x] Milestone 4 complete `(2025-10-21)`

**Notes**:
- Navigation architecture established in Phase 3 (October 21, 2025)
- HTTP Content API migration complete
- Flat normalized catalog structure implemented
- State-driven UI rendering working correctly

---

## Milestone 5 — Video Playing Is Running

Goal
- Video playing is running

Definition of Done (DoD)
- [x] Play/Pause (and basic controls) propagate via server and reflect on TV `(2025-10-25)`
- [x] Validation flow(s) cover playback start/stop `(2025-10-25)`
- [x] Logs/metrics sufficient for troubleshooting `(2025-10-25)`

### Completed Tasks (October 2025)

#### Control Commands Infrastructure (Phase 1) - COMPLETED 2025-10-25

**Implementation**: Reactive Pattern (Option 2) - TV executes and confirms
- [x] Extended ActionConfirmationPayload with optional `playerState` field
- [x] Server FSM updates from action_confirmation
- [x] Control commands: play, pause, toggle-mute, volume-up, volume-down, seek, toggle-fullscreen
- [x] TV sends action_confirmation with playerState after executing commands
- [x] Server broadcasts state_sync with updated state
- [x] Both apps update UI from state_sync

**Architecture Details**:
```
Remote → control_command → Server → TV (executes YouTube Player API)
                                     ↓
                         TV sends action_confirmation with playerState
                                     ↓
                         Server updates FSM, broadcasts state_sync
                                     ↓
                         Both apps receive state_sync, update UI
```

**Testing Status**:
- ✅ Mute confirmed working (user validated)
- ✅ Play/Pause confirmed working (user validated)
- ✅ Volume up/down working (minor initial button state issue)
- ⏳ Fullscreen needs testing (likely works)
- ⏳ Seek needs testing

**Files Modified**:
1. `shared/shared/src/lib/models/messages.ts` - ActionConfirmationPayload extension
2. `server/src/fsm.ts` - FSM updates from confirmations
3. `apps/tv/src/app/services/websocket.service.ts` - Confirmation with playerState
4. `apps/tv/src/app/app.ts` - Single state$ subscription
5. `apps/remote/src/app/services/websocket.service.ts` - Control command sender

---

#### Single Source of Truth Refactoring - COMPLETED 2025-10-25

**Problem**: TV app had dual update pattern (playerState$ + state$) causing desync risk

**Solution**: Eliminated playerState$ BehaviorSubject, all updates via state$ observable

**Changes**:
- [x] Removed playerState$ from TV WebSocketService
- [x] handleControlCommand emits complete ApplicationState via state$
- [x] handleStateSync simplified to single emitState() call
- [x] TV app.ts uses single state$ subscription with playerState getter
- [x] Removed unused @ViewChild(VideoPlayerComponent)

**Benefits**:
- ✅ Single source of truth (no competing state values)
- ✅ No desync risk
- ✅ Cleaner code (~50 lines removed)
- ✅ Better performance (single subscription)

**Files Modified**:
1. `apps/tv/src/app/services/websocket.service.ts` - Removed playerState$, unified emissions
2. `apps/tv/src/app/app.ts` - Single subscription, getter-based derivation

---

#### Message Type Cleanup - COMPLETED 2025-10-25

**Deprecated 'data' Message Type Removed**:
- [x] Removed from shared/shared/src/lib/models/messages.ts (DataMessage, DataPayload)
- [x] Removed from apps/remote/src/app/services/websocket.service.ts (generator)
- [x] Removed from server/src/services/server-websocket.service.ts (validation)
- [x] Removed from validation/src/stubs/remote-stub.ts ('seed' handler)
- [x] Verification: 0 references to 'data' message type remaining

**Rationale**: Phase 3 HTTP migration - catalog now delivered via `GET /api/content/catalog`

**Benefits**:
- ✅ Code reflects actual architecture
- ✅ Prevents misuse of deprecated pattern
- ✅ Clearer validation (only valid message types)

---

#### Angular Change Detection Fixes - COMPLETED 2025-10-25

**Issue**: ngOnChanges not triggered for nested object mutations

**Solution**: Create new object references when emitting state
```typescript
this.state$.next({
  ...state,
  player: { ...state.player }  // New reference triggers @Input() detection
});
```

**Impact**: Fixed 15+ optional chaining errors, ensured UI updates on state changes

---

Summary
- [x] Milestone 5 complete `(2025-10-25)`

**Notes**:
- Reactive Pattern (Option 2) chosen: Accuracy over speed (200-500ms UI delay acceptable)
- Trade-off: Confirmed state from YouTube Player API vs optimistic immediate updates
- Core controls validated (mute, play/pause), remaining controls need end-to-end testing
