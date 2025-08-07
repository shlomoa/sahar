# SAHAR TV Remote - Implementation Plan

This document outlines the development and implementation plan for refactoring the SAHAR TV Remote system into the Unified Appliance Model, as defined in `ARCHITECTURE.md`.

## 1. Implementation Guidelines

-   **Code Style**: Adhere to existing code styles. Use Prettier and ESLint where configured.
-   **Testing**: All new components must have corresponding unit tests. Integration tests will be updated as part of the final phase.
-   **Documentation**: All important features, classes, methods, and variables must be documented in detail.
-   **Completion**: You (GitHub Copilot) are responsible for checking the box and adding the completion date when a task is completed.

---

## 2. Phase 1: Server-Side Refactoring (Unified Server)

**Goal**: Adapt the existing `server/websocket-server.ts` to function as the Unified Server, serving static files and managing the WebSocket gateway.

***Prerequisite Note:*** *Before starting the server, the Angular applications must be built using `ng build` to ensure the `apps/tv/dist/` and `apps/remote/dist/` directories exist.*

-   [x] **Task 1.1**: Set up the server development environment by installing dependencies. In the `/validation` directory, run `npm install` to get `express` and `ws`, and run `npm install --save-dev typescript ts-node @types/node @types/express @types/ws` for the TypeScript toolchain. `(2025-08-07)`
-   [x] **Task 1.2**: Create a `tsconfig.json` file in the `server` directory to configure the TypeScript compiler options for the Node.js server. `(2025-08-07)`
-   [ ] **Task 1.3**: Modify `server/websocket-server.ts` to create an `express` app. `(YYYY-MM-DD)`
-   [ ] **Task 1.4**: Configure the `express` app to serve the static files for the TV app from `apps/tv/dist/sahar-tv`. `(YYYY-MM-DD)`
-   [ ] **Task 1.5**: Configure the `express` app to serve the static files for the Remote app from `apps/remote/dist/sahar-remote`. `(YYYY-MM-DD)`
-   [ ] **Task 1.6**: Create an HTTP server from the `express` app and have it listen on a designated port (e.g., 8080). `(YYYY-MM-DD)`
-   [ ] **Task 1.7**: Attach the `ws` WebSocket server to the new HTTP server. `(YYYY-MM-DD)`
-   [ ] **Task 1.8**: Refactor the existing WebSocket connection logic to align with the new FSM and protocol defined in `ARCHITECTURE.md`. `(YYYY-MM-DD)`
-   [ ] **Task 1.9**: Implement the server-side Finite State Machine (FSM) for managing application state. `(YYYY-MM-DD)`
-   [ ] **Task 1.10**: Implement the `state_update` message broadcast to all clients on state change. `(YYYY-MM-DD)`
-   [ ] **Task 1.11**: Implement the `data` message handler to receive and store data from the Remote app. `(YYYY-MM-DD)`
-   [ ] **Task 1.12**: Implement the `navigation` and `control` message handlers to update the FSM. `(YYYY-MM-DD)`
-   [ ] **Task 1.13**: Implement the heartbeat mechanism for connection monitoring and recovery. `(YYYY-MM-DD)`
-   [ ] **Task 1.14**: Add comprehensive logging for all server events, messages, and errors. `(YYYY-MM-DD)`

---

## 3. Phase 2: Client-Side Refactoring (TV & Remote Apps)

**Goal**: Refactor the client applications to communicate exclusively with the Unified Server, leveraging shared services and components.

### 2.1 Shared Client Components (`/shared`)
-   [ ] **Task 2.1.1**: Refactor the shared `websocket-base.service.ts` to handle the core logic of connecting to the Unified Server's WebSocket. `(YYYY-MM-DD)`
-   [ ] **Task 2.1.2**: Update the shared `websocket-protocol.ts` to match the final, unified protocol definition in `ARCHITECTURE.md`. `(YYYY-MM-DD)`
-   [ ] **Task 2.1.3**: Verify that shared utilities like `youtube-helpers.ts` are correctly integrated and used by both client apps. `(YYYY-MM-DD)`

### 2.2 TV Application (`apps/tv/`)
-   [ ] **Task 2.2.1**: Refactor the TV app's `WebsocketService` to use the shared base service for its connection. `(YYYY-MM-DD)`
-   [ ] **Task 2.2.2**: Remove all peer-discovery and direct-connection logic from the TV app. `(YYYY-MM-DD)`
-   [ ] **Task 2.2.3**: Ensure the TV app is fully stateless and renders its entire UI based on `state_update` messages from the server. `(YYYY-MM-DD)`
-   [ ] **Task 2.2.4**: Remove all logic for sending `status` messages, as this is now managed by the server's FSM. `(YYYY-MM-DD)`

### 2.3 Remote Application (`apps/remote/`)
-   [ ] **Task 2.3.1**: Refactor the Remote app's `WebsocketService` to use the shared base service for its connection. `(YYYY-MM-DD)`
-   [ ] **Task 2.3.2**: Remove all peer-discovery and direct-connection logic from the Remote app. `(YYYY-MM-DD)`
-   [ ] **Task 2.3.3**: Implement the logic to send the initial `data` message to the server upon connection. `(YYYY-MM-DD)`
-   [ ] **Task 2.3.4**: Ensure all navigation and control commands are sent to the server, not directly to the TV. `(YYYY-MM-DD)`

---

## 4. Guiding Principles for Iterative Validation

**Goal**: To ensure the system remains robust, tested, and documented *throughout* the refactoring process. After completing each task in Phase 1 and 2, the following actions will be considered and applied as guided by the project lead, maintaining an "always alive and always correct" state.

-   **Action A**: Update the `VALIDATION.md` document with new testing strategies relevant to the completed task.
-   **Action B**: Update or create integration tests in the `/validation` directory.
-   **Action C**: Update project documentation (`README.md`, `ARCHITECTURE.md`) to reflect changes.
