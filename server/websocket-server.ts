import express, { Request, Response, NextFunction } from 'express';
import httpProxy from 'http-proxy';
import { createServer } from 'http';
import { WebSocketServer, WebSocket, RawData } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  WebSocketMessage,
  RegisterMessage,
  NavigationCommandMessage,
  ControlCommandMessage,
  ActionConfirmationMessage,
  StateSyncMessage,
  AckMessage,
  ErrorMessage,
  WEBSOCKET_CONFIG,
  ERROR_CODES,
  NAVIGATION_ACTION_SET,
  CONTROL_ACTION_SET,
  ClientType
} from './shared/websocket/websocket-protocol.js';
import { SaharFsm } from './fsm.js';
import { createLogger } from './shared/utils/logging.js';

// --- Structured Logger (shared) ---------------------------------------------------------------
const logger = createLogger({ component: 'server' });
const logInfo = (event: string, meta?: any, msg?: string) => logger.info(event, meta, msg);
const logWarn = (event: string, meta?: any, msg?: string) => logger.warn(event, meta, msg);
const logError = (event: string, meta?: any, msg?: string) => logger.error(event, meta, msg);

/**
 * SAHAR Unified Server
 * Serves static files for TV and Remote apps and manages WebSocket communication
 */

// ESM-safe __dirname/__filename
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express application
const app = express();

// ----------------------------------------------------------------------------
// Task 1.6 / 1.7 Support: Dev reverse proxies & static asset passthrough
// ----------------------------------------------------------------------------
// Mode detection: if SSR dev servers are expected to be running we proxy HTML.
// Simple heuristic/env control: DEV_SSR=1 enables proxy behavior.
const DEV_SSR = process.env.DEV_SSR === '1' || process.env.DEV_SSR === 'true';
// Ports for running Angular SSR dev servers (defaults align with plan)

// Lazy http-proxy instances (created only if needed)
const proxy = httpProxy.createProxyServer({ changeOrigin: true, ws: false });
proxy.on('error', (err: Error, _req: any, res: any) => {
  logError('proxy_error', { message: err.message });
  if (res && !res.headersSent) {
    res.statusCode = 502;
    res.end('Upstream dev server unavailable');
  }
});

function devProxy(target: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!DEV_SSR) return next();
    proxy.web(req, res, { target });
  };
}

// Create HTTP server from the express app
const server = createServer(app);

// Create and attach WebSocket server on configured path
const wss = new WebSocketServer({ server, path: WEBSOCKET_CONFIG.WS_PATH });
logInfo('websocket_path_bound', { path: WEBSOCKET_CONFIG.WS_PATH });

// --- Finite State Machine (FSM) ---

// ClientType now imported from protocol single-source-of-truth

// FSM encapsulating authoritative state (now versioned)
const fsm = new SaharFsm();
// Track last broadcast version to enforce broadcast discipline (Task 1.16)
let lastBroadcastVersion = 0;

// Track client connections and their type
const clients = new Map<WebSocket, { clientType: ClientType; deviceId: string; deviceName: string }>();

// Readiness flag (infrastructure readiness: HTTP + WS initialized)
let isReady = false;
const markReady = () => { isReady = true; };

// --- Message helpers ---
const makeAck = (source: 'server'): AckMessage => ({ type: 'ack', timestamp: Date.now(), source, payload: {} });
const makeStateSync = (source: 'server'): StateSyncMessage => ({ type: 'state_sync', timestamp: Date.now(), source, payload: fsm.getSnapshot() });
const makeError = (source: 'server', code: string, message: string): ErrorMessage => ({ type: 'error', timestamp: Date.now(), source, payload: { code, message } });

// --- Error sending helper ---
function sendError(ws: WebSocket, code: string, message: string, opts: { close?: boolean; meta?: any } = {}) {
  ws.send(JSON.stringify(makeError('server', code, message)));
  logWarn('invalid_message', { code, message, ...(opts.meta || {}) });
  if (opts.close) {
    try { ws.close(); } catch {/* ignore */}
  }
}

// --- Validation ---
// Use canonical action sets from shared protocol
const NAV_ACTIONS = NAVIGATION_ACTION_SET;
const CTRL_ACTIONS = CONTROL_ACTION_SET;

function validateMessage(raw: any, isRegistered: boolean): { ok: true; msg: WebSocketMessage } | { ok: false; code: string; reason: string; close?: boolean } {
  if (typeof raw !== 'object' || raw === null) {
    return { ok: false, code: ERROR_CODES.INVALID_MESSAGE_FORMAT, reason: 'Non-object message', close: !isRegistered };
  }
  const { type, payload } = raw as { type?: string; payload?: any };
  if (typeof type !== 'string') {
    return { ok: false, code: ERROR_CODES.INVALID_MESSAGE_FORMAT, reason: 'Missing type', close: !isRegistered };
  }
  if (!isRegistered) {
    if (type !== 'register') {
      return { ok: false, code: ERROR_CODES.INVALID_REGISTRATION, reason: 'First message must be register', close: true };
    }
    // register payload checks
    if (!payload || typeof payload !== 'object') {
      return { ok: false, code: ERROR_CODES.INVALID_MESSAGE_FORMAT, reason: 'Register missing payload', close: true };
    }
    if (payload.clientType !== 'tv' && payload.clientType !== 'remote') {
      return { ok: false, code: ERROR_CODES.INVALID_MESSAGE_FORMAT, reason: 'Invalid clientType', close: true };
    }
    if (typeof payload.deviceId !== 'string' || !payload.deviceId) {
      return { ok: false, code: ERROR_CODES.INVALID_MESSAGE_FORMAT, reason: 'Invalid deviceId', close: true };
    }
    if (typeof payload.deviceName !== 'string' || !payload.deviceName) {
      return { ok: false, code: ERROR_CODES.INVALID_MESSAGE_FORMAT, reason: 'Invalid deviceName', close: true };
    }
    return { ok: true, msg: raw as WebSocketMessage };
  }
  // Already registered client
  switch (type) {
    case 'register':
      return { ok: false, code: ERROR_CODES.INVALID_MESSAGE_FORMAT, reason: 'Duplicate register' }; // no close
    case 'navigation_command': {
      if (!payload || typeof payload !== 'object') return { ok: false, code: ERROR_CODES.INVALID_MESSAGE_FORMAT, reason: 'Navigation missing payload' };
      if (!NAV_ACTIONS.has(payload.action)) return { ok: false, code: ERROR_CODES.INVALID_MESSAGE_FORMAT, reason: 'Invalid navigation action' };
      if (payload.targetId && typeof payload.targetId !== 'string') return { ok: false, code: ERROR_CODES.INVALID_MESSAGE_FORMAT, reason: 'Invalid targetId' };
      return { ok: true, msg: raw as WebSocketMessage };
    }
    case 'control_command': {
      if (!payload || typeof payload !== 'object') return { ok: false, code: ERROR_CODES.INVALID_MESSAGE_FORMAT, reason: 'Control missing payload' };
      if (!CTRL_ACTIONS.has(payload.action)) return { ok: false, code: ERROR_CODES.INVALID_MESSAGE_FORMAT, reason: 'Invalid control action' };
      if (payload.startTime && typeof payload.startTime !== 'number') return { ok: false, code: ERROR_CODES.INVALID_MESSAGE_FORMAT, reason: 'Invalid startTime' };
      if (payload.seekTime && typeof payload.seekTime !== 'number') return { ok: false, code: ERROR_CODES.INVALID_MESSAGE_FORMAT, reason: 'Invalid seekTime' };
      if (payload.volume && (typeof payload.volume !== 'number' || payload.volume < 0 || payload.volume > 1)) return { ok: false, code: ERROR_CODES.INVALID_MESSAGE_FORMAT, reason: 'Invalid volume' };
      return { ok: true, msg: raw as WebSocketMessage };
    }
    case 'action_confirmation': {
      if (!payload || typeof payload !== 'object') return { ok: false, code: ERROR_CODES.INVALID_MESSAGE_FORMAT, reason: 'Confirmation missing payload' };
      if (payload.status !== 'success' && payload.status !== 'failure') return { ok: false, code: ERROR_CODES.INVALID_MESSAGE_FORMAT, reason: 'Invalid confirmation status' };
      return { ok: true, msg: raw as WebSocketMessage };
    }
    case 'ack':
    case 'state_sync':
    case 'error':
      return { ok: false, code: ERROR_CODES.INVALID_MESSAGE_FORMAT, reason: 'Client cannot send server-only type' };
    default:
      return { ok: false, code: ERROR_CODES.INVALID_MESSAGE_FORMAT, reason: 'Unsupported message type' };
  }
}

/**
 * Broadcast the current application state to all connected clients only if
 * the version advanced since the last broadcast (ack discipline Step 2).
 */
const broadcastStateIfChanged = (force = false) => {
  const snapshot = fsm.getSnapshot();
  if (!force && snapshot.version === lastBroadcastVersion) {
    logInfo('state_broadcast_skipped', { version: snapshot.version, reason: 'version_unchanged' });
    return;
  }
  lastBroadcastVersion = snapshot.version;
  const stateMsg = JSON.stringify(makeStateSync('server'));
  let sent = 0;
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(stateMsg);
      sent++;
    }
  }
  logInfo('state_broadcast', { version: snapshot.version, clients: sent, forced: force });
};

wss.on('connection', (ws: WebSocket) => {
  logInfo('client_connected');

  ws.on('message', (data: RawData) => {
    const isRegistered = clients.has(ws);
    let parsed: any;
    try {
      const text = typeof data === 'string' ? data : data.toString();
      parsed = JSON.parse(text);
    } catch (e) {
      sendError(ws, ERROR_CODES.INVALID_MESSAGE_FORMAT, 'Invalid JSON', { close: !isRegistered, meta: { preRegistered: !isRegistered } });
      return;
    }
    const v = validateMessage(parsed, isRegistered);
    if (!v.ok) {
      sendError(ws, v.code, v.reason, { close: !!v.close, meta: { preRegistered: !isRegistered } });
      return;
    }
    const msg = v.msg;
    logInfo('message_received', { type: msg.type });
    if (!isRegistered && msg.type === 'register') {
      const reg = msg as RegisterMessage;
      const { clientType, deviceId, deviceName } = reg.payload;
      // Enforce single TV / Remote uniqueness
  const snapshot = fsm.getSnapshot();
  if (clientType === 'tv' && snapshot.connectedClients.tv) {
        sendError(ws, ERROR_CODES.CLIENT_TYPE_MISMATCH, 'A TV client is already connected.', { close: true, meta: { attempted: 'tv' } });
        return;
      }
  if (clientType === 'remote' && snapshot.connectedClients.remote) {
        sendError(ws, ERROR_CODES.CLIENT_TYPE_MISMATCH, 'A Remote client is already connected.', { close: true, meta: { attempted: 'remote' } });
        return;
      }
      clients.set(ws, { clientType, deviceId, deviceName });
  fsm.registerClient(clientType, deviceId, deviceName);
  ws.send(JSON.stringify(makeAck('server'))); // Ack first, then broadcast new state
  broadcastStateIfChanged();
      logInfo('client_registered', { clientType, deviceId });
      return;
    }
    // Already registered normal messages
    switch (msg.type) {
      case 'navigation_command': {
  const nav = msg as NavigationCommandMessage;
  fsm.navigationCommand(nav.payload.action, nav.payload.targetId);
  ws.send(JSON.stringify(makeAck('server'))); // Ack before broadcast
  broadcastStateIfChanged();
        logInfo('navigation_command_handled', { action: nav.payload.action });
        break;
      }
      case 'control_command': {
  const ctl = msg as ControlCommandMessage;
  fsm.controlCommand(ctl.payload);
  ws.send(JSON.stringify(makeAck('server')));
  broadcastStateIfChanged();
        logInfo('control_command_handled', { action: ctl.payload.action });
        break;
      }
      case 'action_confirmation': {
  const confirm = msg as ActionConfirmationMessage;
  fsm.actionConfirmation(confirm.payload.status, confirm.payload.errorMessage);
  ws.send(JSON.stringify(makeAck('server')));
  broadcastStateIfChanged();
        logInfo('action_confirmation_received', { status: confirm.payload.status });
        break;
      }
      case 'register': {
        // Should not reach here due to validation, but guard anyway
        sendError(ws, ERROR_CODES.INVALID_MESSAGE_FORMAT, 'Duplicate register attempt');
        break;
      }
      default: {
        // Should not happen (validated earlier)
        sendError(ws, ERROR_CODES.INVALID_MESSAGE_FORMAT, 'Unhandled type after validation');
      }
    }
  });

  ws.on('close', () => {
    logInfo('client_disconnected');
    const info = clients.get(ws);
    if (info) {
      clients.delete(ws);
  fsm.deregisterClient(info.clientType);
  broadcastStateIfChanged();
    }
  });

  ws.on('error', (error: Error) => {
    logError('websocket_error', { error: error.message });
  });
});

// --- Handlers ---
// Legacy handler functions removed; FSM methods now used directly.

// Middleware for parsing JSON and serving static files

app.use(express.json());
app.use('/.well-known', express.static('public/.well-known', { dotfiles: 'allow' }))
app.use(express.static('public'));

// Define path to the TV and Remote app builds (relative to output directory)
const tvAppPath = path.join(__dirname, '../../apps/tv/dist/sahar-tv');
const remoteAppPath = path.join(__dirname, '../../apps/remote/dist/sahar-remote');

// Task 1.7: Static asset passthrough (served regardless of DEV_SSR if they exist)
// We serve browser asset folders directly so dev/prod share URL shape.
app.use('/assets', express.static(path.join(tvAppPath, 'browser/assets'), { fallthrough: true }));
app.use('/remote/assets', express.static(path.join(remoteAppPath, 'browser/assets'), { fallthrough: true }));

// Task 1.6: Dev reverse proxies for SSR HTML (when DEV_SSR=1) else fall back to built assets
// TV base route: '/' (root) and '/tv'
app.get(['/','/tv'], (req: Request, res: Response, next: NextFunction) => {
  if (DEV_SSR) return devProxy(`http://localhost:${WEBSOCKET_CONFIG.TV_DEV_PORT}`)(req, res, next);
  // Fallback to built index.html (prod-like)
  res.sendFile(path.join(tvAppPath, 'browser/index.html'));
});

// Remote base route '/remote'
app.get('/remote', (req: Request, res: Response, next: NextFunction) => {
  if (DEV_SSR) return devProxy(`http://localhost:${WEBSOCKET_CONFIG.REMOTE_DEV_PORT}`)(req, res, next);
  res.sendFile(path.join(remoteAppPath, 'browser/index.html'));
});

// Catch-all deep links for Angular routing (non-asset) for TV
app.get(['/tv/*','/*'], (req: Request, res: Response, next: NextFunction) => {
  // Ignore if request looks like a file (has an extension) to avoid hijacking static/health
  if (/\.[a-zA-Z0-9]+$/.test(req.path)) return next();
  if (DEV_SSR) return devProxy(`http://localhost:${WEBSOCKET_CONFIG.TV_DEV_PORT}`)(req, res, next);
  res.sendFile(path.join(tvAppPath, 'browser/index.html'));
});

// Catch-all deep links for Remote
app.get('/remote/*', (req: Request, res: Response, next: NextFunction) => {
  if (/\.[a-zA-Z0-9]+$/.test(req.path)) return next();
  if (DEV_SSR) return devProxy(`http://localhost:${WEBSOCKET_CONFIG.REMOTE_DEV_PORT}`)(req, res, next);
  res.sendFile(path.join(remoteAppPath, 'browser/index.html'));
});

// Liveness endpoint (process up)
app.get('/live', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'live' });
});

// Readiness endpoint (infrastructure ready to accept clients)
app.get('/ready', (_req: Request, res: Response) => {
  if (isReady) return res.status(200).json({ status: 'ready' });
  return res.status(503).json({ status: 'not_ready' });
});

// Enriched health snapshot (debug / monitoring)
app.get('/health', (_req: Request, res: Response) => {
  const wsConnections = [...wss.clients].length;
  const registered = [...clients.values()].map(c => ({ type: c.clientType, deviceId: c.deviceId }));
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptimeSeconds: process.uptime(),
  fsmState: fsm.getSnapshot().fsmState,
    wsConnections,
    registeredClients: registered,
  navigationLevel: fsm.getSnapshot().navigation.currentLevel,
    playerState: {
      isPlaying: fsm.getSnapshot().player.isPlaying,
      currentTime: fsm.getSnapshot().player.currentTime,
      version: fsm.getSnapshot().version
    }
  });
});

// Start the server
server.listen(WEBSOCKET_CONFIG.SERVER_PORT, () => {
  logInfo('server_start', { port: WEBSOCKET_CONFIG.SERVER_PORT });
  logInfo('server_status', { express: true, httpListening: true, tvRoute: '/tv', remoteRoute: '/remote', websocket: true, devSsr: DEV_SSR, tvDevPort: WEBSOCKET_CONFIG.TV_DEV_PORT, remoteDevPort: WEBSOCKET_CONFIG.REMOTE_DEV_PORT });
  markReady();
  logInfo('server_ready');
});

// Graceful shutdown
process.on('SIGINT', () => {
  logWarn('shutdown_signal', { signal: 'SIGINT' });
  server.close(() => {
    logInfo('server_shutdown');
    process.exit(0);
  });
});

export { app, server };
