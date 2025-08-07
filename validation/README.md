# SAHAR Validation Suite

This suite contains scripts and tools for testing the SAHAR "Unified Appliance Model".

> **🔧 For technical implementation details, see [ARCHITECTURE.md](../ARCHITECTURE.md)**  
> **� For the step-by-step plan, see [IMPLEMENTATION.md](../IMPLEMENTATION.md)**  
> **✅ For testing strategies and status, see [VALIDATION.md](../VALIDATION.md)**

## 🚀 Quick Start

All validation tasks are executed via the `sahar-validation.ps1` script.

```powershell
# Install dependencies (run from this directory)
npm install

# Run a full system check
.\\sahar-validation.ps1 full
```

## 📋 Available Commands

Use the `sahar-validation.ps1` script with one of the following arguments:

-   `check`: Performs an environment check to ensure all required tools and dependencies are available.
-   `start`: Builds the client applications and starts the Unified Server.
-   `test`: Runs the integration test suite against the running applications.
-   `full`: Executes `check`, `start`, and `test` in sequence.

## 📁 File Structure

```
validation/
├── sahar-validation.ps1      # Main validation script
├── package.json              # Node.js dependencies
├── README.md                 # This file
├── websocket-communication.js # WebSocket communication tests
└── test-drivers/
    └── tv-app-test-driver.js # TV application test driver
```
