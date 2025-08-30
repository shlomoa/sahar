Integration test: POST /seed

This directory contains an integration test `seed.test.ts` that verifies the server's `/seed` endpoint applies data and broadcasts state_sync to connected WebSocket clients.

How to run locally (recommended - uses the project build):

1. From the repository root, ensure dependencies are installed:

```powershell
npm install
```

2. Build the server (Angular build + TypeScript compile):

```powershell
cd server
npm run build
```

3. Run the integration test:

```powershell
npm run test:integration
```

Alternatively, the validation harness will perform the necessary builds and runs; from the repository root:

```powershell
cd validation
node validate.js hook I --debug
```

Notes:
- The test is an integration test and expects the server build artifacts and peer dependencies (Angular packages) to be resolvable at runtime. Use CI or the validation harness for consistent results.
- If you need a fast unit-style test that doesn't require Angular, ask and we'll add a lightweight mock-based test variant.
