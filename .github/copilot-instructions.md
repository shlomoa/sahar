# Copilot Instructions — SAHAR TV Remote

Quick-start operating manual for this repo. Keep it stupid simple (KISS), respect single sources of truth, follow the collaboration rules (CHAT_RULES.md) to the letter.

## Big picture
- Architecture: Unified Node.js server (Express + ws) owns the Finite State Machine (FSM) and serves Angular apps (TV, Remote). Clients are stateless and render authoritative `state_sync` snapshots.
- Transport/protocol: WebSocket, Stop‑and‑Wait, Protocol v3.0. Endpoint: `/ws` on the same origin/port.
- Key files
  - Server: `server/src/main.ts` (WS + HTTP), `server/src/fsm.ts` (ApplicationState, mutations)
  - Shared single-source types/services: `shared/shared/src/lib/models/{messages.ts,websocket-protocol.ts,application-state.ts}`, `shared/shared/src/lib/services/websocket-base.service.ts`, `shared/shared/src/lib/utils/{logging.ts,websocket-utils.ts}`
  - Apps: `apps/tv/src/app/services/websocket.service.ts`, `apps/remote/src/app/services/websocket.service.ts`

## Collaboration rules (repo‑specific)
- Read `CHAT_RULES.md`. Plan first, then wait for explicit approval before performing actions that modify files, run commands, or start processes.
- Follow “Delta‑only” edits, re‑open files before editing, and keep a clear, numbered plan. Use SA’s “go "<step-id>"” approval format.

## References
- Architecture/protocol: `ARCHITECTURE.md` (authoritative), implementation: `IMPLEMENTATION.md`, validation flows: `VALIDATION.md`, deployment: `DEPLOYMENT.md`.

Questions or ambiguity: prefer updating the canonical shared files and server FSM, cite exact paths/symbols, and propose a minimal plan before changes.
