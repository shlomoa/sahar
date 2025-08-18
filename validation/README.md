# SAHAR Validation Suite

Scripts and modes to validate the Unified Appliance Model quickly and consistently.

> Canonical architecture:
> - [System Components & Architecture Diagram](../ARCHITECTURE.md#2-system-components--architecture-diagram)
> - [Unified Communication Protocol](../ARCHITECTURE.md#4-unified-communication-protocol)
> - [Network Architecture & Discovery](../ARCHITECTURE.md#6-network-architecture--discovery)
> For implementation tasks, see [IMPLEMENTATION.md](../IMPLEMENTATION.md)
> For flows and hooks, see [VALIDATION.md](../VALIDATION.md)

## 🚀 Quick Start

Install once:
```powershell
cd validation
npm install
```

Run canonical quick flow:
```powershell
npm run quick:dev -w validation
```
This runs Hooks A, B, I, C, D, E, J end-to-end via `validation/validate.js`.

## 🔀 Modes

Choose the lightest mode that exercises the layer you’re changing:

Mode | Purpose | Angular Builds | Processes
-----|---------|----------------|----------
mode:prod | Full stack (both real UIs) | tv + remote | server
tv-stub | Real Remote UI, simulated TV | remote | server + tv stub
remote-stub | Real TV UI, simulated Remote | tv | server + remote stub
stubs | Protocol/server only (fast loop) | none | server + both stubs

Examples:
```powershell
npm run mode:prod -w validation
npm run tv-stub -w validation
npm run remote-stub -w validation
npm run stubs -w validation
```

## 🧪 Flows

See [../VALIDATION.md](../VALIDATION.md) Section 4 (Full Integration Testing) and Section 7 (Stub-Based Flows) for details.

Key references:
- Flow 2 — Video Playback Control
- Flow 7 — QR Onboarding
