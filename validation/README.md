# SAHAR Validation Suite

Comprehensive validation and testing framework for the SAHAR TV-Remote communication system.

## 🚀 Quick Start

```bash
# Install dependencies
cd validation
npm install

# Run full validation
npm run validate

# Start WebSocket test server
npm start
```

## 📋 Available Commands

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

## 📁 Structure

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

## 🔧 Dependencies

- **ws**: WebSocket implementation for testing
- **concurrently**: Run multiple validation processes
- **nodemon**: Development server with auto-reload

## 📖 Usage

This validation suite is completely self-contained and independent of the Angular applications in `apps/`. Run validation from this directory to test the entire SAHAR system.
