# SAHAR TV Remote — Deployment Guide

This guide is the single source of truth for deploying SAHAR system in its final  environment.


## 1) Requirements

### SW requirements
- Linux-based OS (Ubuntu 20.04+ recommended)
- Node.js 18+
- Angular CLI 20+
- Local network (same subnet) for devices

### HW requirements
- Raspberry Pi 4 or Orange Pi 3 LTS with 4GB+ RAM (for server and TV app)
- HDMI cable to connect to TV
- Power supply for the SBC
- Case/enclosure for the SBC

## 2) Production environment

- Unified Server:
  - Firewall: Allow inbound traffic on HTTP (80/8080) and WebSocket ports
- Remote client Device:
  - Smartphone or iPad - capable of running the Remote Angular app via browser
  - Browser: Modern browser (Chrome, Safari, Firefox)
  - Network: Both devices must be on the same local network as the server for WebSocket connectivity

## 3) Deployment Steps
Deploy the Angular apps as static assets and run the Unified Server.
- Build artifacts (minimal):
  - shared library -> production build
  - Server app -> production build
  - apps/tv → production build
  - apps/remote → production build
- Package everything into the Unified Server
  - Steps TBD 

## 4) Post-deployment Validation
- After any deployment, validate with the flows in [VALIDATION.md](./VALIDATION.md) to ensure connectivity, state sync, and control paths are working.

## 5) Troubleshooting
- Protocol rules, message types, and the Stop-and-Wait model: see [ARCHITECTURE.md](./ARCHITECTURE.md) (Unified Communication Protocol)
- Canonical message and state types: [shared/websocket/websocket-protocol.ts](./shared/websocket/websocket-protocol.ts)
- Implementation tasks and current status: [IMPLEMENTATION.md](./IMPLEMENTATION.md)

## 6) Notes
- Ports and low-level network details are intentionally not duplicated here; see [ARCHITECTURE.md](./ARCHITECTURE.md) and [shared/websocket/websocket-protocol.ts](./shared/websocket/websocket-protocol.ts) when needed.
