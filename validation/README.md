# SAHAR Validation Suite

Validation and testing framework for the SAHAR TV-Remote communication system.

> **📖 For complete testing procedures and validation strategy, see [DEPLOYMENT.md](../DEPLOYMENT.md)**  
> **🔧 For technical implementation details, see [ARCHITECTURE.md](../ARCHITECTURE.md)**  
> **📋 For current validation status, see [VERIFICATION-RESULTS.md](../VERIFICATION-RESULTS.md)**

## 🚀 Quick Start

```bash
# Install dependencies
cd validation
npm install

# Run full validation (see DEPLOYMENT.md for details)
npm run validate

# Start WebSocket test server
npm start
```

## 📋 Available Commands

All validation procedures are documented in [DEPLOYMENT.md](../DEPLOYMENT.md). Available npm scripts:

### Validation Scripts
```bash
npm run validate              # Full system validation
npm run validate:env          # Environment check only
npm run validate:services     # Service validation only
npm run validate:integration  # Integration tests only
```

### Testing Scripts
```bash
npm run test:integration      # TV app integration tests
npm run test:websocket        # WebSocket mock server tests
npm run test:connection       # Connection flow tests
npm run test:server           # Start WebSocket test server
npm run test:server:dev       # Start test server with auto-reload
```

## 📁 File Structure

```
validation/
├── validate.js               # Main validation script
├── connection-flow.js        # Connection flow testing
├── websocket-mock-server.js  # Mock WebSocket server
├── websocket-test-server.js  # WebSocket test server
├── websocket-communication.js # WebSocket communication tests
└── test-drivers/
    └── tv-app-test-driver.js # TV application test driver
```

> **Note**: This validation suite is self-contained and independent of the Angular applications in `apps/`. For complete testing strategy and procedures, refer to [DEPLOYMENT.md](../DEPLOYMENT.md).
