# SAHAR – Milestones

This document tracks major milestones, their definitions of done (DoD), and the exact tasks and flows required to complete them. Check off items as they’re delivered and add completion dates.

Conventions
- Dates use `(YYYY-MM-DD)` until completed.
- Task references point to `IMPLEMENTATION.md`, architecture references point to `ARCHITECTURE.md`, and flow/spec references point to `VALIDATION.md`.

---

## Milestone 1 — Skeleton Solution

Goal: Establish a working baseline of the unified system with a production-ready server core and validation stubs, proving end-to-end integration using stubs (no real Angular apps required yet).

Definition of Done (DoD)
- [ ] Functional, unit-tested production server (core FSM + WebSocket gateway) `(YYYY-MM-DD)`
- [x] TV and Remote stubs implemented in `/validation` and controllable via HTTP `(2025-08-11)`
- [ ] Validation infrastructure in place (health/readiness checks, quick-run) `(YYYY-MM-DD)`
- [ ] Integrated solution: production server + TV stub + Remote stub working together `(YYYY-MM-DD)`
- [ ] Integration tests for the solution pass locally via validation harness `(YYYY-MM-DD)`

Key Deliverables
- Unified server core that handles register/ack, data ingestion, navigation/control, state updates, and reconnection.
- TV and Remote stubs: deterministic client_id, WS `/ws` protocol, HTTP control surface.
- Canonical validation flows and test drivers to run server+stubs end-to-end.

Scope Notes
- Angular SSR hosting for TV/Remote apps is not required for this milestone; it will be targeted in a later milestone.
- Real TV/Remote Angular apps are not required; stubs are used for integration.

### 1. Required Tasks (from `IMPLEMENTATION.md`)

Server Core
- [ ] [Task 1.5 — Centralized server config](./IMPLEMENTATION.md#2-phase-1-server-side-refactoring-unified-server--ssr-host) `(YYYY-MM-DD)`
- [ ] [Task 1.12 — Health/readiness/logging endpoints](./IMPLEMENTATION.md#2-phase-1-server-side-refactoring-unified-server--ssr-host) `(YYYY-MM-DD)`
- [ ] [Task 1.13 — Scripts and environment (dev/prod entry points)](./IMPLEMENTATION.md#2-phase-1-server-side-refactoring-unified-server--ssr-host) `(YYYY-MM-DD)`
- [ ] [Task 1.15 — FSM core](./IMPLEMENTATION.md#2-phase-1-server-side-refactoring-unified-server--ssr-host) `(YYYY-MM-DD)`
- [ ] [Task 1.16 — state_update broadcast](./IMPLEMENTATION.md#2-phase-1-server-side-refactoring-unified-server--ssr-host) `(YYYY-MM-DD)`
- [ ] [Task 1.17 — data handler](./IMPLEMENTATION.md#2-phase-1-server-side-refactoring-unified-server--ssr-host) `(YYYY-MM-DD)`
- [ ] [Task 1.18 — navigation/control handlers](./IMPLEMENTATION.md#2-phase-1-server-side-refactoring-unified-server--ssr-host) `(YYYY-MM-DD)`
- [ ] [Task 1.19 — Heartbeat/recovery](./IMPLEMENTATION.md#2-phase-1-server-side-refactoring-unified-server--ssr-host) `(YYYY-MM-DD)`
- [x] [Task 1.20 — Structured logging](./IMPLEMENTATION.md#2-phase-1-server-side-refactoring-unified-server--ssr-host) `(2025-08-11)`
- [x] [Task 1.21 — Invalid message handling](./IMPLEMENTATION.md#2-phase-1-server-side-refactoring-unified-server--ssr-host) `(2025-08-11)`

Nice-to-have for Milestone 1 (optional)
- [ ] [Task 1.11 — HTTPS/WSS enablement](./IMPLEMENTATION.md#2-phase-1-server-side-refactoring-unified-server--ssr-host) `(YYYY-MM-DD)`

Validation/Process
- [ ] [Task 1.14 — Validation hooks (document flows in `VALIDATION.md`)](./IMPLEMENTATION.md#2-phase-1-server-side-refactoring-unified-server--ssr-host) `(YYYY-MM-DD)`
- [ ] [Task 4.2 — Validation quick-run workflow](./IMPLEMENTATION.md#5-guiding-principles-for-iterative-validation) `(YYYY-MM-DD)`
- [ ] [Task 4.4 — Update/create integration tests in `/validation`](./IMPLEMENTATION.md#5-guiding-principles-for-iterative-validation) `(YYYY-MM-DD)`
- [ ] [Task 4.5 — Documentation sync](./IMPLEMENTATION.md#5-guiding-principles-for-iterative-validation) `(YYYY-MM-DD)`
- [x] [Task 4.6 — Implement TV Stub](./IMPLEMENTATION.md#5-guiding-principles-for-iterative-validation) `(2025-08-11)`
- [x] [Task 4.7 — Implement Remote Stub](./IMPLEMENTATION.md#5-guiding-principles-for-iterative-validation) `(2025-08-11)`
- [x] [Task 4.8 — Stub runner scripts](./IMPLEMENTATION.md#5-guiding-principles-for-iterative-validation) `(2025-08-11)`
- [ ] [Task 4.9 — Integration drivers for stub flows](./IMPLEMENTATION.md#5-guiding-principles-for-iterative-validation) `(YYYY-MM-DD)`
- [ ] [Task 4.10 — Stop-and-wait enforcement tests](./IMPLEMENTATION.md#5-guiding-principles-for-iterative-validation) `(YYYY-MM-DD)`
- [ ] [Task 4.11 — Log schema conformance checks](./IMPLEMENTATION.md#5-guiding-principles-for-iterative-validation) `(YYYY-MM-DD)`
- [ ] [Task 4.12 — Health payload completeness tests](./IMPLEMENTATION.md#5-guiding-principles-for-iterative-validation) `(YYYY-MM-DD)`
- [ ] [Task 4.13 — Server FSM unit tests](./IMPLEMENTATION.md#5-guiding-principles-for-iterative-validation) `(YYYY-MM-DD)`

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
- [ ] [Section 2.1 — Server-Side FSM unit tests](./VALIDATION.md#2-unit-testing) `(YYYY-MM-DD)`
- [ ] [Section 2.2 — Client-Side WebSocket base service unit tests](./VALIDATION.md#2-unit-testing) `(YYYY-MM-DD)`

### 3. Integration Assembly Checklist

Server bring-up
- [x] Build and start the production server ([Task 1.13](./IMPLEMENTATION.md#2-phase-1-server-side-refactoring-unified-server--ssr-host)) `(2025-08-11)`
- [ ] Verify `/live`, `/ready`, `/health` respond ([Task 1.12](./IMPLEMENTATION.md#2-phase-1-server-side-refactoring-unified-server--ssr-host), [Flow 4](./VALIDATION.md#4-full-integration-testing-validation)) `(YYYY-MM-DD)`

Stubs bring-up
- [ ] Start TV Stub (`validation/stubs/tv-stub.ts`, [Section 6.2](./VALIDATION.md#62-tv-stub-specification-validationstubstv-stubts)) `(YYYY-MM-DD)`
- [ ] Start Remote Stub (`validation/stubs/remote-stub.ts`, [Section 6.3](./VALIDATION.md#63-remote-stub-specification-validationstubsremote-stubts)) `(YYYY-MM-DD)`
- [ ] Both stubs register and receive ack ([Flow 8](./VALIDATION.md#7-stub-based-validation-flows-canonical)) `(YYYY-MM-DD)`

End-to-end with stubs
- [ ] Navigation command via Remote Stub reflects on TV Stub state ([Flow 8](./VALIDATION.md#7-stub-based-validation-flows-canonical)) `(YYYY-MM-DD)`
- [ ] Control command via Remote Stub reflects on TV Stub state ([Flow 8](./VALIDATION.md#7-stub-based-validation-flows-canonical)) `(YYYY-MM-DD)`
- [ ] Reconnection logic verified (stop/start one stub) `(YYYY-MM-DD)`

Automation
- [ ] Quick-run or VS Code tasks execute stub-based flows ([Task 4.2](./IMPLEMENTATION.md#5-guiding-principles-for-iterative-validation)/[Task 4.4](./IMPLEMENTATION.md#5-guiding-principles-for-iterative-validation)) `(YYYY-MM-DD)`
- [ ] Validation logs and artifacts captured ([Task 4.5](./IMPLEMENTATION.md#5-guiding-principles-for-iterative-validation)) `(YYYY-MM-DD)`

### 4. Milestone Completion

Milestone 1 is complete when all DoD items and all required tasks/specs/flows above are checked with dates.

Summary
- [ ] Milestone 1 complete `(YYYY-MM-DD)`

---

Future milestones will build on this baseline to add Angular SSR hosting, real TV/Remote apps, and production deployment hardening.

---

## Milestone 2 — POCs: YouTube + QR Onboarding

Goals
- Goal 1: POC for YouTube
- Goal 2: POC for QR code enabling

Definition of Done (DoD)
- [ ] Basic YouTube playback demonstrated in the TV context (helper wired; minimal controls) `(YYYY-MM-DD)`
- [ ] TV shows a QR that opens `/remote` on same network and loads Remote app `(YYYY-MM-DD)`
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
