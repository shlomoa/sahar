# Copilot Instructions — SAHAR TV Remote

Use this as your quick-start operating manual for this repo. Keep edits tight, respect single sources of truth, and follow the protocol and validation flows.

## Big picture
- Architecture: Unified Node.js server (Express + ws) owns the Finite State Machine (FSM) and serves Angular apps (TV, Remote). Clients are stateless and render authoritative `state_sync` snapshots.
- Transport/protocol: WebSocket, Stop‑and‑Wait, Protocol v3.0. Endpoint: `/ws` on the same origin/port.
- Key files
  - Server: `server/src/main.ts` (WS + HTTP), `server/src/fsm.ts` (ApplicationState, mutations)
  - Shared single-source types/services: `shared/shared/src/lib/models/{messages.ts,websocket-protocol.ts,application-state.ts}`, `shared/shared/src/lib/services/websocket-base.service.ts`, `shared/shared/src/lib/utils/{logging.ts,websocket-utils.ts}`
  - Apps: `apps/tv/src/app/services/websocket.service.ts`, `apps/remote/src/app/services/websocket.service.ts`

## Single source of truth (critical)
- Edit canonical models/protocol/services only under `shared/shared/src/lib/**`. The `validation/shared/**` copies are for tests; don’t change them to alter runtime.
- Server imports the built shared package via `server/package.json` dependency `"shared": "file:../shared/dist/shared"`. If you change shared code, rebuild shared before server.

## Protocol rules you must follow
- First message must be `register` with `{ clientType: 'tv'|'remote', deviceId }`.
- Server acks every client message with `ack`. Clients must not send `state_sync` or unsolicited `error`.
- On every `state_sync`, clients should ack and include the version: payload `{ msgType: 'ack', version }`. See handlers in both apps’ `websocket.service.ts`.
- Allowed actions are enforced by the server using the canonical sets from `shared/.../models/messages.ts`:
  - `NAVIGATION_ACTION_SET` and `CONTROL_ACTION_SET`. Don’t invent new strings without updating these sets and server validation.
- Error codes live in `shared/.../models/websocket-protocol.ts` `ERROR_CODES`. Reuse these for consistency.

## App patterns (Angular 20 standalone)
- Material components must be imported as standalone where used (no NgModules). See `IMPLEMENTATION.md` “Standalone Material Components”.
- Both apps extend `WebSocketBaseService` and use `sendByType(...)`; register generators/handlers via `registerGenerators/Handlers`.
- TV is display-only (receives commands and sends `action_confirmation`). Remote seeds data (optional) and emits navigation/control commands.

## Logging & health
- Use `createLogger` from `shared/.../utils/logging.ts` with canonical event keys (e.g., `server_start`, `client_registered`, `state_broadcast`). Logs are single‑line JSON to stdout.
- Health endpoints from server: `/live`, `/ready`, `/health`. LAN pairing helper: `/host-ip`.

## Build, run, validate (preferred)
- Root install: `npm install` (populates package node_modules). Then use validation modes:
  - `npm run mode:prod -w validation` (server + prod builds)
  - `npm run tv-stub -w validation` / `remote-stub` / `stubs`
- Classic dev: `ng serve` in `apps/tv` (4203) and `apps/remote` (4202). VS Code tasks exist to start these.

## When changing protocol/state
- Update only canonical shared files. Keep unions and action sets in sync with server validators in `server/src/main.ts`.
- If you add new state fields: define in `ApplicationState`, mutate via `Fsm`, and ensure clients reconcile in their `handleStateSync` with defensive checks.

## Collaboration rules (repo‑specific)
- Read `CHAT_RULES.md`. Plan first, then wait for explicit approval before performing actions that modify files, run commands, or start processes.
- Follow “Delta‑only” edits, re‑open files before editing, and keep a clear, numbered plan. Use SA’s “go "<step-id>"” approval format.

## References
- Architecture/protocol: `ARCHITECTURE.md` (authoritative), implementation: `IMPLEMENTATION.md`, validation flows: `VALIDATION.md`, deployment: `DEPLOYMENT.md`.

Questions or ambiguity: prefer updating the canonical shared files and server FSM, cite exact paths/symbols, and propose a minimal plan before changes.
