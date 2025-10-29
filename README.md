# SAHAR TV Remote Control System 📺

*Real-time synchronized TV and Remote controlled by a unified Node.js server (Express + ws) with a server-owned FSM.*

## 🎯 Overview

A centralized, server-driven system where a Unified Server (Node.js + Express + ws) serves the Angular apps and owns all application state via a server-side FSM. Communication follows Protocol v3.0 using a synchronous Stop-and-Wait model; clients are stateless and render based on server `state_sync` updates.

For complete architecture and protocol details, see the single source of truth: [ARCHITECTURE.md](./ARCHITECTURE.md).

### Key Features
- **Unified Server**: Server-side FSM owns state; clients are stateless
- **QR code based Discovery**: Remote connects using a QR code provided by the TV application
- **Real-time Sync**: Navigation and playback state synchronized between devices
- **YouTube Integration**: Scene-based video playbook with automatic seeking and dynamic thumbnail calculation
- **Material Design**: Modern, responsive interfaces optimized for each device
- **Dynamic Thumbnails**: YouTube video thumbnails calculated dynamically using @angular/youtube-player

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ (Node 24 recommended for local runs shown in this repo)
- Angular CLI 20+ (only needed for direct `ng serve` / manual builds or local production builds)
- Local WiFi network

### Install Dependencies
You can either install per-package or install from the monorepo root. Examples:

Per-package (same as before):
```powershell
cd apps/tv && npm install
cd ../remote && npm install
cd ../../server && npm install
cd ../validation && npm install
```

From the repo root (preferred for a fresh workspace):
```powershell
# run once at repo root - this will populate each package's node_modules where package.json scripts expect them
npm install
```

### Integration Run Modes
The validation workspace provides four explicit modes (no extra scripts files required):

Mode | Description | Angular Builds | Processes | Integration Type
-----|-------------|----------------|-----------| ----------
prod | Both TV & Remote as production builds | tv + remote | server | full
tv-stub | Remote prod UI, TV simulated | remote only | server + tv stub | partial
remote-stub | TV prod UI, Remote simulated | tv only | server + remote stub | partial
stubs | Both simulated stubs (fast loop) | none | server + tv stub + remote stub | Stub only

Run examples (from repo root with workspace flag or inside `validation`):
```powershell
npm run mode:prod -w validation
npm run tv-stub   -w validation
npm run remote-stub -w validation
npm run stubs     -w validation
```


Classic direct Angular dev (hot reload) remains available:
```bash
cd apps/tv && ng serve
# in another terminal
cd apps/remote && ng serve
```

Integrated validation flows: see [VALIDATION.md](./VALIDATION.md).

##  Applications

### 📺 TV Application (`apps/tv/`)
**Role**: Display and Video Player
- **Technology**: Angular 20+ with Material Design
- **Summary**:
  - Displays synchronized performers → videos → scenes grids
  - Stateless client that renders UI from server `state_sync` messages
  - YouTube video player integration (@angular/youtube-player) and dynamic thumbnails
  - Large-screen optimized Material Design interface
  - No on-device user controls; all control comes from the Remote
  - See details: [ARCHITECTURE.md — TV Application](./ARCHITECTURE.md#tv-application-appstv)

### 📱 Remote Application (`apps/remote/`)  
**Role**: Control Interface and Data Owner
- **Technology**: Angular 20+ with Material Design
- **Summary**:
  - Owns performers/videos/scenes data and provides it to the server on connection
  - Navigates performers → videos → scenes; touch-optimized UI
  - Sends navigation and control commands to the server and provides all playback controls
  - Enhanced video controls during playback and dynamic thumbnail integration
  - **Accessibility Features**: Hebrew-language text-to-speech narration and visual button descriptions for users with hearing, mobility, and vision impairments
  - See details: [ARCHITECTURE.md — Remote Application](./ARCHITECTURE.md#remote-application-appsremote)

---

## ♿ Accessibility Features

SAHAR includes comprehensive accessibility features designed for users with hearing, mobility, and vision impairments:

### Hebrew Text-to-Speech Narration
- **Web Speech API Integration**: Native browser speech synthesis
- **Hebrew Language Support**: Configured for `he-IL` locale with smart voice selection
- **Niqqud Handling**: Accurate pronunciation of Hebrew text with vowel point processing
- **Voice Selection**: Prefers Google Hebrew voice, falls back to system voices

### Visual Button Descriptions
- **Fixed Bottom Banner**: Large, high-contrast description panel
- **Responsive Sizing**: `clamp(18px, 2.6vw, 28px)` for optimal readability
- **ARIA Live Regions**: Screen reader announcements for accessibility
- **Slide Animation**: Smooth appearance/disappearance of descriptions

### Multi-Modal Interaction
- **Keyboard Navigation**: Full functionality via Tab and Enter keys
- **Mouse Hover**: Shows descriptions without speech
- **Touch Long-Press**: 700ms threshold for description + narration
- **Focus Management**: Clear visual focus indicators

### Implementation
- **Signal-Based Architecture**: Modern Angular 20 reactive patterns
- **Standalone Components**: Tree-shakeable, optimized bundles
- **Shared Library**: Reusable across TV and Remote apps
- **10 Control Buttons**: All video controls with Hebrew descriptions

**Example Hebrew Text** (with niqqud):
- Play: "נַגֵּן אֶת הַוִּידֵאוֹ"
- Pause: "הַשְׁהֵה אֶת הַוִּידֵאוֹ"
- Volume Up: "הַגְּבֶּר אֶת עוצְמַת הַקוֹל"

For complete technical details, see:
- [ARCHITECTURE.md — Accessibility & Narration Features](./ARCHITECTURE.md#accessibility--narration-features)
- [IMPLEMENTATION.md — Accessibility Features](./IMPLEMENTATION.md#accessibility-features-narration--button-descriptions)

### Unified Server (`server/`)
**Role**: Centralized Node.js Server
- **Technology**: Node.js 18+ with Express and ws
- **Summary**:
  - Serves static assets for both TV and Remote applications
  - Manages WebSocket connections and owns the server-side FSM
  - Implements the Stop-and-Wait protocol for reliable message delivery
  - Handles all state synchronization and message routing between clients
- **See details**: [ARCHITECTURE.md — Unified Server](./ARCHITECTURE.md#server-app-unified-nodejs-server)

## 🎬 Content Structure

### Hierarchical Data Model
- **4 Performers**: Top-level content creators
- **11 Videos**: Video collections per performer  
- **44 Scenes**: Individual scenes within videos with timestamps
- **Enhanced Controls**: Additional navigation during video playback

### Video Integration
Authoritative types and details live in IMPLEMENTATION.md. See:
- Video interfaces and shape: IMPLEMENTATION.md → "Video Integration"
- YouTube helpers used for thumbnails: `shared/utils/youtube-helpers.ts`

## 🛠 Communication Protocol & Configuration

Protocol v3.0 (Stop-and-Wait), centralized server-owned FSM; clients are stateless and render from `state_sync`.

Authoritative definitions: [shared/websocket/websocket-protocol.ts](./shared/websocket/websocket-protocol.ts)

**Message Types (high-level):**
`register`, `data`, `navigation_command`, `control_command`, `action_confirmation`, `ack`, `state_sync`, `error`, `heartbeat`.

Configuration Separation:
- `WEBSOCKET_CONFIG` (shared, runtime essentials): port, ack timeout, websocket path.
- Validation-only tuning (`validation/config/validation-config.ts`): stub HTTP ports, reconnect/backoff, helper `buildLocalServerUrl`.

Logging & Health:
- Structured JSON logs with component metadata.
- `/live`, `/ready`, `/health` endpoints for liveness, readiness, and deep status.

Single Source of Truth:
- Protocol file surfaced via symlinks in app/server folders; edit only the canonical shared file.
 - The `server/shared` directory is a filesystem symlink to the root `shared/` directory, ensuring models & protocol types are physically single-source (avoid accidental parallel edits).

## 🛠️ Implementation plan & progress

For the authoritative implementation tasks and current progress, see [IMPLEMENTATION.md](./IMPLEMENTATION.md).

## 🌐 Network Architecture
See the authoritative flow and details in: [ARCHITECTURE.md — Network Architecture & Discovery](./ARCHITECTURE.md#6-network-architecture--discovery).

## 🧪 Testing & Validation

Canonical flows, commands, and hook references live in [VALIDATION.md](./VALIDATION.md). Refer there for environment checks, modes, and end-to-end scenarios.

Manual Angular build verification and production notes:

- Important: the server serves the TV app at `/tv` and the Remote app at `/remote`.
  When producing a production build you must set the Angular base-href to match those paths so asset URLs resolve correctly.

Example production builds (recommended):
```powershell
# TV production build with matching base href
cd apps/tv
ng build --configuration production --output-hashing none

# Remote production build with matching base href
cd ../remote
ng build --configuration production  --output-hashing none
```

Or use `npm run build` if your package.json scripts already encapsulate the above.

Server-side dev workaround (dev only): the server can be configured to mirror the TV/Remote browser folders at the site root so root-relative asset paths resolve without rebuilding. This is a convenience for local debugging and is not recommended for production deployments.

Stub HTTP endpoints:
- `/health`, `/state`, `/logs`, `/reset` (both)
- `/command` (remote stub only: send navigation/control test messages)

Reconnect/backoff parameters centralized in validation config.

## 📖 Documentation

### Complete Documentation Suite
- **[ARCHITECTURE.md](./ARCHITECTURE.md)**: Complete technical architecture and implementation details
- **Unified Communication Protocol (in ARCHITECTURE.md)**: [Protocol v3.0 — Stop-and-Wait](./ARCHITECTURE.md#4-unified-communication-protocol)  
- **[DEPLOYMENT.md](./DEPLOYMENT.md)**: Deployment guide, testing procedures, and troubleshooting
- **[VALIDATION.md](./VALIDATION.md)**: Validation flows, checks, and testing guidance
 - **[GRAPHICS.md](./GRAPHICS.md)**: Authoritative UI graphics and layout spec for the Remote video controls

## 🛠️ Development

### Technology Stack
- **Frontend**: Angular 20+ with Standalone Components
- **UI Framework**: Angular Material 20.1.3
- **Shared Components**: Reusable UI components (navigation grids, toolbars, accessibility features)
- **Communication**: Native WebSocket API
- **Video**: YouTube Player API (@angular/youtube-player)
- **Reactive Programming**: RxJS for async operations, Angular Signals for state management
- **Styling**: SCSS with Material Design theming

### Development Workflow
```bash
# Fastest: simulate both sides (no Angular build)
npm run stubs -w validation

# Mixed: one real UI, one stub
npm run tv-stub -w validation

# Full production experience
npm run mode:prod -w validation

# Direct Angular hot reload (optional)
cd apps/tv && ng serve
cd ../remote && ng serve
```

## 🔧 System Requirements

### Minimum Requirements
- **Network**: Local WiFi (TV and Remote on same subnet)
- **Browser**: Modern WebSocket support (Chrome 88+, Firefox 85+, Safari 14+)
- **TV Device**: Any device capable of running Angular web application
- **Remote Device**: Tablet or smartphone with touch interface

### Recommended Setup
- **TV**: Large screen display (32"+ recommended)
- **Remote**: iPad or Android tablet (10"+ recommended)  
- **Network**: 5GHz WiFi for optimal performance
- **Bandwidth**: Minimal (1-10KB per WebSocket message)

## 🚀 Production Deployment

### Cross-Platform Deployment
SAHAR is designed for cross-platform deployment with portable relative paths:

**Deployment Structure:**
```
sahar-deployment/
├── main.js              # Server executable
├── tv/
│   └── browser/         # TV app (Angular production build)
└── remote/
    └── browser/         # Remote app (Angular production build)
```

**Key Features:**
- ✅ **Platform Independent**: Works on Windows, Linux, macOS
- ✅ **No Hardcoded Paths**: Uses runtime path resolution
- ✅ **Simple Deployment**: Copy directory structure and run
- ✅ **Automatic Discovery**: Server finds Angular apps via relative paths

### Quick Deploy
```bash
# Build all components
npm run rebuild:all

# Create deployment package (see DEPLOYMENT.md for details)
mkdir sahar-deployment
cp server/dist/main.js sahar-deployment/
cp -r apps/tv/dist/tv/browser sahar-deployment/tv/
cp -r apps/remote/dist/remote/browser sahar-deployment/remote/

# Deploy to target server
scp -r sahar-deployment/ user@target-server:/path/to/deployment/

# Run on target
cd /path/to/deployment/sahar-deployment
node main.js
```

### Runtime Mode Selection Guidelines:
1. `mode:prod`: UI integration, end-to-end visual verification.
2. `tv-stub` / `remote-stub`: Focused testing when iterating on one UI.
3. `stubs`: Rapid protocol / FSM / server iteration.

Pick the lightest mode that still exercises the layer you are changing.

**Complete deployment guide**: [DEPLOYMENT.md](./DEPLOYMENT.md)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**SAHAR TV Remote** - Transforming smart TV control with real-time synchronization 🚀

*For detailed technical information, see the complete documentation suite in [ARCHITECTURE.md](./ARCHITECTURE.md), [IMPLEMENTATION.md](./IMPLEMENTATION.md), [DEPLOYMENT.md](./DEPLOYMENT.md), and [VALIDATION.md](./VALIDATION.md)*
