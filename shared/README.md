# Shared Library Workspace

This workspace contains the `shared` Angular library package that provides common models, services, components, and utilities used by the SAHAR TV Remote system applications (TV app, Remote app, and server).

## Overview

The shared library is built as an npm package and consumed by:
- **TV App** (`apps/tv`) - Display interface
- **Remote App** (`apps/remote`) - Control interface  
- **Server** (`server`) - WebSocket and HTTP server with FSM

## Structure

```
shared/
├── README.md (this file)
├── angular.json
├── package.json
└── shared/
    ├── README.md (library documentation)
    ├── ng-package.json
    ├── package.json
    └── src/
        ├── public-api.ts
        └── lib/
            ├── models/        # Shared TypeScript interfaces
            ├── services/      # Shared Angular services
            ├── components/    # Shared Angular components
            └── utils/         # Utility functions
```

## Building the Library

Build the shared library from the workspace root:

```bash
npm run build:shared
```

Or from this directory:

```bash
ng build shared
```

Build artifacts are placed in `dist/shared/` and installed as a file dependency in consuming projects via:

```json
{
  "dependencies": {
    "shared": "file:../shared/dist/shared"
  }
}
```

## Development Workflow

1. **Make changes** to library code in `shared/src/lib/`
2. **Rebuild** the library: `npm run build:shared`
3. **Reinstall** in consuming apps/server: `npm install` (in their directories)
4. **Restart** dev servers or rebuild consuming applications

## Key Exports

See `shared/README.md` for detailed documentation of:
- **Models**: ApplicationState, PlayerState, Messages, WebSocket Protocol
- **Services**: WebSocketBaseService, ContentService, VideoNavigationService
- **Components**: Device connection, grid displays (performers, videos, scenes)
- **Utilities**: Logging, WebSocket utilities, YouTube helpers

## Protocol

The shared library defines Protocol v3.0 (Stop-and-Wait with ACK) for WebSocket communication between server and clients.

## Architecture

For system architecture details, see the root-level `ARCHITECTURE.md` and `IMPLEMENTATION.md` files.
