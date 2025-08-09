# SAHAR TV Remote — Deployment Guide

This guide is the single source of truth for deploying and running the SAHAR system in different environments. It favors minimal instructions and references to authoritative docs to avoid duplication.

- Architecture and protocol: see [ARCHITECTURE.md](./ARCHITECTURE.md)
- Implementation plan and packaging work: see [IMPLEMENTATION.md](./IMPLEMENTATION.md)
- End-to-end validation flows and tasks: see [VALIDATION.md](./VALIDATION.md)

## 1) Prerequisites
- Node.js 18+
- Angular CLI 20+
- Local network (same subnet) for devices

## 2) Environments

### A. Development (per-app UI)
Use this for local UI development only. Integrated behavior is validated separately.
- TV App: see [README.md](./README.md) Quick Start (ng serve)
- Remote App: see [README.md](./README.md) Quick Start (ng serve)

### B. Integrated / Validation
Use the validation flows to run the system end-to-end.
- Follow the flows and tasks in [VALIDATION.md](./VALIDATION.md) (Environment Check, Start Applications, Integration Tests)

### C. Production
Deploy the Angular apps as static assets and run the Unified Server.
- Build artifacts (minimal):
  - apps/tv → production build
  - apps/remote → production build
- Unified Server:
  - The server serves static files and manages WebSocket protocol with a server-owned FSM.
  - Packaging/run steps will be finalized under [IMPLEMENTATION.md](./IMPLEMENTATION.md) Task 3.1. Refer there for the authoritative procedure.

## 3) Post-deployment Validation
- After any deployment, validate with the flows in [VALIDATION.md](./VALIDATION.md) to ensure connectivity, state sync, and control paths are working.

## 4) Troubleshooting
- Protocol rules, message types, and the Stop-and-Wait model: see [ARCHITECTURE.md](./ARCHITECTURE.md) (Unified Communication Protocol)
- Canonical message and state types: [shared/websocket/websocket-protocol.ts](./shared/websocket/websocket-protocol.ts)
- Implementation tasks and current status: [IMPLEMENTATION.md](./IMPLEMENTATION.md)

## 5) Notes
- Ports and low-level network details are intentionally not duplicated here; see [ARCHITECTURE.md](./ARCHITECTURE.md) and [shared/websocket/websocket-protocol.ts](./shared/websocket/websocket-protocol.ts) when needed.
