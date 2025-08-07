# SAHAR - Validation Strategy

This document outlines the comprehensive testing and validation strategy for the SAHAR Unified Appliance Model. It serves as a living document to track the implementation and verification status of all testable components.

## 1. Core Principles

-   **Always Alive, Always Correct**: Testing is not a final phase but an integral part of development. After each implementation task, relevant validation actions will be triggered.
-   **Automation First**: Where possible, tests will be automated to ensure repeatability and consistency.
-   **Clarity and Traceability**: All tests should be clearly documented, and their results should be easily traceable to requirements in `ARCHITECTURE.md`.

---

## 2. Unit Testing

### 2.1 Critical Server-Side Components

-   **Target**: Server-side Finite State Machine (FSM).
-   **Method**: Automated unit tests.
-   **Scope & Status**:
    -   [ ] Verify all valid state transitions. `Implementation: [ ] (YYYY-MM-DD) | Validation: [ ] (Pass/Fail)`
    -   [ ] Verify rejection of invalid state transitions. `Implementation: [ ] (YYYY-MM-DD) | Validation: [ ] (Pass/Fail)`
    -   [ ] Test `state_update` message generation logic. `Implementation: [ ] (YYYY-MM-DD) | Validation: [ ] (Pass/Fail)`
    -   [ ] Test handlers for `navigation`, `control`, and `data` messages. `Implementation: [ ] (YYYY-MM-DD) | Validation: [ ] (Pass/Fail)`

### 2.2 Critical Client-Side Components

-   **Target**: Shared `WebsocketService` (`shared/services/websocket-base.service.ts`).
-   **Method**: Automated unit tests (Jasmine/Karma).
-   **Scope & Status**:
    -   [ ] Test WebSocket connection and reconnection logic. `Implementation: [ ] (YYYY-MM-DD) | Validation: [ ] (Pass/Fail)`
    -   [ ] Test client-side message handling with mock server responses. `Implementation: [ ] (YYYY-MM-DD) | Validation: [ ] (Pass/Fail)`
    -   [ ] Verify correct message formatting before sending. `Implementation: [ ] (YYYY-MM-DD) | Validation: [ ] (Pass/Fail)`

---

## 3. Hybrid Testing (Manual + Automated)

-   **Target**: Video Player and Controls.
-   **Scope & Status**:
    -   [ ] Verify player controls (play, pause, seek) work as expected. `Implementation: [ ] (YYYY-MM-DD) | Validation: [ ] (Pass/Fail)`
    -   [ ] Confirm that UI elements correctly reflect application state. `Implementation: [ ] (YYYY-MM-DD) | Validation: [ ] (Pass/Fail)`

---

## 4. Per-App Testing

### 4.1 TV Application (`apps/tv`)

-   **Method**: End-to-end testing using a mock WebSocket server.
-   **Scope & Status**:
    -   [ ] Verify UI renders correctly for each state received from the server. `Implementation: [ ] (YYYY-MM-DD) | Validation: [ ] (Pass/Fail)`
    -   [ ] Confirm app is fully stateless and driven by server messages. `Implementation: [ ] (YYYY-MM-DD) | Validation: [ ] (Pass/Fail)`

### 4.2 Remote Application (`apps/remote`)

-   **Method**: End-to-end testing using a mock WebSocket server.
-   **Scope & Status**:
    -   [ ] Verify the app sends the initial `data` message on connect. `Implementation: [ ] (YYYY-MM-DD) | Validation: [ ] (Pass/Fail)`
    -   [ ] Verify `navigation` and `control` messages are sent correctly. `Implementation: [ ] (YYYY-MM-DD) | Validation: [ ] (Pass/Fail)`
    -   [ ] Verify the UI updates based on `state_update` messages from the server. `Implementation: [ ] (YYYY-MM-DD) | Validation: [ ] (Pass/Fail)`

---

## 5. Full Integration Testing

-   **Target**: The complete, deployed Unified Appliance system.
-   **Method**: Automated integration tests in `/validation`.
-   **Scope & Status**:
    -   [ ] Test the full system lifecycle from connection to navigation. `Implementation: [ ] (YYYY-MM-DD) | Validation: [ ] (Pass/Fail)`
