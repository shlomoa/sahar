import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket, RawData } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  ApplicationState,
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
  CONTROL_ACTION_SET
} from './shared/websocket/websocket-protocol.js';
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
// Single source of truth for port from shared protocol config
const PORT = WEBSOCKET_CONFIG.SERVER_PORT;

// Create HTTP server from the express app
const server = createServer(app);

// Create and attach WebSocket server
const wss = new WebSocketServer({ server });

// --- Finite State Machine (FSM) ---

type ClientType = 'tv' | 'remote';

// The single source of truth for the application state
let applicationState: ApplicationState = {
  fsmState: 'initializing',
  connectedClients: {},
  navigation: {
    currentLevel: 'performers',
    breadcrumb: []
  },
  player: {
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    muted: false
  }
};

// Track client connections and their type
const clients = new Map<WebSocket, { clientType: ClientType; deviceId: string; deviceName: string }>();

// Readiness flag (infrastructure readiness: HTTP + WS initialized)
let isReady = false;
const markReady = () => { isReady = true; };

// --- Message helpers ---
const makeAck = (source: 'server'): AckMessage => ({ type: 'ack', timestamp: Date.now(), source, payload: {} });
const makeStateSync = (source: 'server'): StateSyncMessage => ({ type: 'state_sync', timestamp: Date.now(), source, payload: applicationState });
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
 * Broadcasts the current application state to all connected clients.
 */
const broadcastState = () => {
  const stateMsg = JSON.stringify(makeStateSync('server'));
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(stateMsg);
    }
  }
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
      if (clientType === 'tv' && applicationState.connectedClients.tv) {
        sendError(ws, ERROR_CODES.CLIENT_TYPE_MISMATCH, 'A TV client is already connected.', { close: true, meta: { attempted: 'tv' } });
        return;
      }
      if (clientType === 'remote' && applicationState.connectedClients.remote) {
        sendError(ws, ERROR_CODES.CLIENT_TYPE_MISMATCH, 'A Remote client is already connected.', { close: true, meta: { attempted: 'remote' } });
        return;
      }
      clients.set(ws, { clientType, deviceId, deviceName });
      applicationState.connectedClients[clientType] = { deviceId, deviceName };
      if (applicationState.connectedClients.remote && applicationState.connectedClients.tv) {
        applicationState.fsmState = 'ready';
      }
      ws.send(JSON.stringify(makeAck('server')));
      broadcastState();
      logInfo('client_registered', { clientType, deviceId });
      return;
    }
    // Already registered normal messages
    switch (msg.type) {
      case 'navigation_command': {
        const nav = msg as NavigationCommandMessage;
        handleNavigationCommand(nav);
        ws.send(JSON.stringify(makeAck('server')));
        broadcastState();
        logInfo('navigation_command_handled', { action: nav.payload.action });
        break;
      }
      case 'control_command': {
        const ctl = msg as ControlCommandMessage;
        handleControlCommand(ctl);
        ws.send(JSON.stringify(makeAck('server')));
        broadcastState();
        logInfo('control_command_handled', { action: ctl.payload.action });
        break;
      }
      case 'action_confirmation': {
        const confirm = msg as ActionConfirmationMessage;
        handleActionConfirmation(confirm);
        ws.send(JSON.stringify(makeAck('server')));
        broadcastState();
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
      if (info.clientType === 'tv') delete applicationState.connectedClients.tv;
      if (info.clientType === 'remote') delete applicationState.connectedClients.remote;
      // If no clients, go back to initializing; if only remote, still initializing; if both, ready
      if (applicationState.connectedClients.tv && applicationState.connectedClients.remote) {
        applicationState.fsmState = 'ready';
      } else {
        applicationState.fsmState = 'initializing';
      }
      broadcastState();
    }
  });

  ws.on('error', (error: Error) => {
    logError('websocket_error', { error: error.message });
  });
});

// --- Handlers ---
function handleNavigationCommand(msg: NavigationCommandMessage) {
  const { action, targetId } = msg.payload;
  switch (action) {
    case 'navigate_home':
      applicationState.navigation = { currentLevel: 'performers', breadcrumb: [] };
      break;
    case 'navigate_back': {
      const bc = applicationState.navigation.breadcrumb;
      bc.pop();
      if (applicationState.navigation.currentLevel === 'scenes') {
        applicationState.navigation.currentLevel = 'videos';
        delete applicationState.navigation.sceneId;
      } else if (applicationState.navigation.currentLevel === 'videos') {
        applicationState.navigation.currentLevel = 'performers';
        delete applicationState.navigation.videoId;
      }
      break;
    }
    case 'navigate_to_performer':
      applicationState.navigation.currentLevel = 'videos';
      applicationState.navigation.performerId = targetId;
      applicationState.navigation.breadcrumb.push(`performer:${targetId}`);
      break;
    case 'navigate_to_video':
      applicationState.navigation.currentLevel = 'scenes';
      applicationState.navigation.videoId = targetId;
      applicationState.navigation.breadcrumb.push(`video:${targetId}`);
      break;
    case 'navigate_to_scene':
      applicationState.navigation.sceneId = targetId;
      applicationState.navigation.breadcrumb.push(`scene:${targetId}`);
      break;
  }
}

function handleControlCommand(msg: ControlCommandMessage) {
  const { action, youtubeId, startTime, seekTime, volume } = msg.payload;
  switch (action) {
    case 'play':
      if (youtubeId) applicationState.player.youtubeId = youtubeId;
      applicationState.player.isPlaying = true;
      if (typeof startTime === 'number') applicationState.player.currentTime = startTime;
      applicationState.fsmState = 'playing';
      break;
    case 'pause':
      applicationState.player.isPlaying = false;
      applicationState.fsmState = 'paused';
      break;
    case 'seek':
      if (typeof seekTime === 'number') applicationState.player.currentTime = seekTime;
      break;
    case 'set_volume':
      if (typeof volume === 'number') applicationState.player.volume = Math.max(0, Math.min(1, volume));
      break;
    case 'mute':
      applicationState.player.muted = true;
      break;
    case 'unmute':
      applicationState.player.muted = false;
      break;
  }
}

function handleActionConfirmation(msg: ActionConfirmationMessage) {
  const { status, errorMessage } = msg.payload;
  if (status === 'failure') {
    applicationState.error = { code: 'COMMAND_FAILED', message: errorMessage || 'Unknown failure' };
    applicationState.fsmState = 'error';
  } else {
    // On success, clear error if any
    if (applicationState.error) delete applicationState.error;
  }
}

// Middleware for parsing JSON and serving static files

app.use(express.json());
app.use('/.well-known', express.static('public/.well-known', { dotfiles: 'allow' }))
app.use(express.static('public'));

// Define path to the TV and Remote app builds (relative to output directory)
const tvAppPath = path.join(__dirname, '../../apps/tv/dist/sahar-tv');
const remoteAppPath = path.join(__dirname, '../../apps/remote/dist/sahar-remote');

// Serve the TV app, with a catch-all to redirect to index.html for Angular routing.
app.use('/tv', express.static(tvAppPath));
app.get('/tv/*splat', (req: Request, res: Response) => {
  res.sendFile(path.join(tvAppPath, 'index.html'));
});

// Serve the Remote app, with a catch-all to redirect to index.html for Angular routing.
app.use('/remote', express.static(remoteAppPath));
app.get('/remote/*splat', (req: Request, res: Response) => {
  res.sendFile(path.join(remoteAppPath, 'index.html'));
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
    fsmState: applicationState.fsmState,
    wsConnections,
    registeredClients: registered,
    navigationLevel: applicationState.navigation.currentLevel,
    playerState: {
      isPlaying: applicationState.player.isPlaying,
      currentTime: applicationState.player.currentTime
    }
  });
});

// Start the server
server.listen(PORT, () => {
  logInfo('server_start', { port: PORT });
  logInfo('server_status', { express: true, httpListening: true, tvRoute: '/tv', remoteRoute: '/remote', websocket: true });
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
