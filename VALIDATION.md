# SAHAR - Validation Strategy

This document outlines the comprehensive testing and validation strategy for the SAHAR Unified Appliance Model. It defines a series of manual and automated tests to ensure the system is "Always Alive, Always Correct."

---

## 1. Validation Structure

Validation is divided into three primary phases, executed sequentially after any implementation task.

1.  **Unit Testing**: Focused, automated tests for individual components.
2.  **Per-App Testing**: Manual, flow-based tests for each application against a mock server.
3.  **Full Integration Testing**: Automated, end-to-end tests of the complete system.

---

## 2. Unit Testing

### 2.1. Server-Side FSM (`server/websocket-server.ts`)

-   **Method**: Automated unit tests.
-   **Scope**:
    -   [ ] **State Transitions**: Verify all valid and invalid state transitions.
    -   [ ] **Message Handling**: Test handlers for `register`, `navigation_command`, and `control_command`.
    -   [ ] **State Sync**: Ensure `state_sync` messages are correctly generated and sent.
    -   [ ] **ACK Logic**: Verify `ack` messages are correctly handled and timeouts are managed.

### 2.2. Client-Side Services (`shared/services/websocket-base.service.ts`)

-   **Method**: Automated unit tests (Jasmine/Karma).
-   **Scope**:
    -   [ ] **Connection Management**: Test WebSocket connection, registration, and reconnection logic.
    -   [ ] **Message Serialization**: Verify correct message formatting and `ack` handling.

---

## 3. Per-App Testing (Manual Flows)

These tests are performed manually by running the server and one client application at a time.

### 3.1. TV Application (`apps/tv`)

-   **Objective**: Ensure the TV app is a pure, stateless renderer of the server's FSM.

-   **Flow 1: Initial Connection**
    1.  Start the WebSocket server.
    2.  Launch the TV app.
    3.  **Expected**: App connects and sends a `register` message with `client_type: 'tv'`.
    4.  **Expected**: App receives an `ack` for the registration.
    5.  **Expected**: App receives an initial `state_sync` message and renders the default UI (e.g., "Waiting for Remote...").

-   **Flow 2: Receiving Navigation State**
    1.  (Continuing from Flow 1)
    2.  Use a mock client to send a `navigation_command` to the server.
    3.  **Expected**: Server updates its FSM.
    4.  **Expected**: TV app receives a `state_sync` message with the new navigation state.
    5.  **Expected**: TV app UI updates to display the corresponding view (e.g., a grid of videos).

### 3.2. Remote Application (`apps/remote`)

-   **Objective**: Ensure the Remote app correctly sends commands and reflects server state.

-   **Flow 1: Initial Connection**
    1.  Start the WebSocket server.
    2.  Launch the Remote app.
    3.  **Expected**: App connects and sends a `register` message with `client_type: 'remote'`.
    4.  **Expected**: App receives an `ack` for the registration.
    5.  **Expected**: App receives an initial `state_sync` and renders its default UI.

-   **Flow 2: Sending Navigation Commands**
    1.  (Continuing from Flow 1)
    2.  User clicks a navigation button in the Remote app (e.g., "Scenes").
    3.  **Expected**: Remote app sends a `navigation_command` to the server.
    4.  **Expected**: Remote app receives an `ack` for the command.
    5.  **Expected**: Remote app receives a `state_sync` reflecting the new state and updates its UI if necessary.

---

## 4. Full Integration Testing (`/validation`)

-   **Objective**: Automate end-to-end user stories involving the real server and both client applications.
-   **Method**: The `sahar-validation.ps1` script orchestrates the tests using custom test drivers.

-   **Flow 1: Full System Startup & Navigation**
    1.  `sahar-validation.ps1 start`: Starts the server, TV app, and Remote app.
    2.  **Expected**: Server logs show both clients connect and register successfully.
    3.  `sahar-validation.ps1 test -name "navigation"`: The test driver instructs the Remote app.
    4.  **Action**: Remote test driver simulates a click on the "Videos" navigation button.
    5.  **Expected**: Remote app sends `navigation_command`. Server sends `ack` to Remote. Server sends `state_sync` to both clients.
    6.  **Expected**: TV app test driver verifies the UI now displays the video grid.
    7.  **Expected**: Remote app test driver verifies its UI is in the correct state.

-   **Flow 2: Video Playback Control**
    1.  (Continuing from Flow 1, with video grid displayed)
    2.  `sahar-validation.ps1 test -name "playback"`: The test driver continues the scenario.
    3.  **Action**: Remote driver simulates selecting and playing a video.
    4.  **Expected**: Remote sends `control_command` (e.g., `play_video`). Server sends `ack`. Server sends `state_sync`.
    5.  **Expected**: TV driver verifies the video player is now active and playing the correct video.
    6.  **Action**: Remote driver simulates pausing the video.
    7.  **Expected**: Remote sends `control_command` (`pause_video`). Server sends `ack`. Server sends `state_sync`.
    8.  **Expected**: TV driver verifies the video is paused.

-   **Flow 3: Client Reconnection**
    1.  (Continuing from Flow 2)
    2.  `sahar-validation.ps1 stop -app "tv"`: Manually stop the TV application process.
    3.  **Expected**: Server detects the disconnection and updates its FSM.
    4.  **Expected**: Remote app receives a `state_sync` indicating the TV is disconnected.
    5.  `sahar-validation.ps1 start -app "tv"`: Restart the TV application.
    6.  **Expected**: TV app reconnects, re-registers, and receives the current `state_sync` from the server, displaying the paused video player correctly.
