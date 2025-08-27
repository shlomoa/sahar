import express, { Request, Response, NextFunction } from 'express';
import { existsSync, readdirSync } from 'fs';
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
} from 'shared';
import { SaharFsm } from '../fsm';
import { networkInterfaces } from 'os';
import { createLogger } from 'shared';

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
logInfo('startup', { dir: __dirname }, 'Server starting up');

// Create Express application
const app = express();

// ---------------------------------------------------------------------------------
// Host IP Selection (integrated from validation/tests/get_host_ip/host-ip.ts)
// Provides a best-effort externally usable IP for QR codes / remote pairing.
// ---------------------------------------------------------------------------------
type _Family = 'IPv4' | 'IPv6';
interface _Addr { address: string; family: _Family | number; internal: boolean; cidr?: string | null }

function _isLoopback(addr: string): boolean { return addr === '::1' || addr.startsWith('127.'); }
function _isLinkLocal(addr: string): boolean { return addr.startsWith('169.254.') || addr.toLowerCase().startsWith('fe80:'); }
function _isPrivateIPv4(addr: string): boolean {
  return addr.startsWith('10.') || addr.startsWith('192.168.') || /^172\.(1[6-9]|2\d|3[0-1])\./.test(addr);
}
function _isGlobalIPv6(addr: string): boolean {
  const lower = addr.toLowerCase();
  return !lower.startsWith('fe80:') && !(lower.startsWith('fc') || lower.startsWith('fd')) && addr.includes(':');
}
function _normalizeFamily(f: _Family | number): _Family { return (f === 6 || f === 'IPv6') ? 'IPv6' : 'IPv4'; }

let _cachedHostIP: { ip: string; ts: number } | null = null;
const HOST_IP_CACHE_TTL_MS = 30_000; // refresh every 30s at most

export function getBestHostIP(): string {
  const now = Date.now();
  if (_cachedHostIP && (now - _cachedHostIP.ts) < HOST_IP_CACHE_TTL_MS) {
    return _cachedHostIP.ip;
  }
  const nets = networkInterfaces();
  const candidates: { iface: string; addr: _Addr; score: number }[] = [];
  for (const [ifname, infos] of Object.entries(nets)) {
    for (const info of (infos ?? []) as _Addr[]) {
      const fam = _normalizeFamily(info.family);
      const address = info.address;
      if (info.internal || _isLoopback(address) || _isLinkLocal(address)) continue;
      let score = 0;
      if (fam === 'IPv4') {
        score += 5;
        if (_isPrivateIPv4(address)) score += 5; // prefer private LAN over public/other
      } else if (fam === 'IPv6') {
        if (_isGlobalIPv6(address)) score += 3; else continue; // skip ULA / link-local
      }
      if (/^(en|eth|wlan|wifi|lan|Ethernet|Wi-?Fi)/i.test(ifname)) score += 1;
      candidates.push({ iface: ifname, addr: info, score });
    }
  }
  if (candidates.length === 0) {
    _cachedHostIP = { ip: '127.0.0.1', ts: now };
    return _cachedHostIP.ip;
  }
  candidates.sort((a, b) => b.score - a.score);
  _cachedHostIP = { ip: candidates[0].addr.address, ts: now };
  return _cachedHostIP.ip;
}

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
// Broadcast discipline tracking (Task 1.16)
let lastBroadcastVersion = 0; // last fully ACKed broadcast version
let currentBroadcastVersion: number | null = null; // version currently awaiting ACKs
let pendingBroadcastVersion: number | null = null; // queued latest version while waiting
let outstandingAckClients: Set<WebSocket> | null = null; // clients yet to ACK current broadcast

// Track client connections and their type (plus last ACKed state version for observability)
const clients = new Map<WebSocket, { clientType: ClientType; deviceId: string; deviceName: string; lastStateAckVersion?: number }>();

// Readiness flag (infrastructure readiness: HTTP + WS initialized)
let isReady = false;
const markReady = () => { isReady = true; };

// --- Message helpers ---
const makeAck = (source: 'server'): AckMessage => ({ msgType: 'ack', timestamp: Date.now(), source, payload: {msgType: 'any'} });
const makeStateSync = (source: 'server'): StateSyncMessage => ({ msgType: 'state_sync', timestamp: Date.now(), source, payload: {msgType: 'any', ...fsm.getSnapshot() }});
const makeError = (source: 'server', code: string, message: string): ErrorMessage => ({ msgType: 'error', timestamp: Date.now(), source, payload: {msgType: 'error', code, message }});

// --- Error sending helper ---
function sendError(ws: WebSocket, code: string, message: string, opts: { close?: boolean; meta?: any } = {}) {
  ws.send(JSON.stringify(makeError('server', code, message)));
  logWarn('invalid_message', { code, message, ...(opts.meta || {}) });
  if (opts.close) {
    try { ws.close(); } catch {/* ignore */}
  }
}

// --- Validation ---

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
    case 'data': {
      // Accept any JSON object payload; silently ignore non-object
      if (!payload || typeof payload !== 'object') return { ok: false, code: ERROR_CODES.INVALID_MESSAGE_FORMAT, reason: 'Data missing payload' };
      return { ok: true, msg: raw as WebSocketMessage };
    }
    case 'navigation_command': {
      if (!payload || typeof payload !== 'object') return { ok: false, code: ERROR_CODES.INVALID_MESSAGE_FORMAT, reason: 'Navigation missing payload' };
      if (!NAVIGATION_ACTION_SET.has(payload.action)) return { ok: false, code: ERROR_CODES.INVALID_MESSAGE_FORMAT, reason: 'Invalid navigation action' };
      if (payload.targetId && typeof payload.targetId !== 'string') return { ok: false, code: ERROR_CODES.INVALID_MESSAGE_FORMAT, reason: 'Invalid targetId' };
      return { ok: true, msg: raw as WebSocketMessage };
    }
    case 'control_command': {
      if (!payload || typeof payload !== 'object') return { ok: false, code: ERROR_CODES.INVALID_MESSAGE_FORMAT, reason: 'Control missing payload' };
      if (!CONTROL_ACTION_SET.has(payload.action)) return { ok: false, code: ERROR_CODES.INVALID_MESSAGE_FORMAT, reason: 'Invalid control action' };
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
    case 'ack': {
      // Allow bare ack (payload optional)
      return { ok: true, msg: raw as WebSocketMessage };
    }
    case 'state_sync':
    case 'error':
      return { ok: false, code: ERROR_CODES.INVALID_MESSAGE_FORMAT, reason: 'Client cannot send server-only type' };
    default:
      return { ok: false, code: ERROR_CODES.INVALID_MESSAGE_FORMAT, reason: 'Unsupported message type' };
  }
}

// ---- Ack‑gated broadcast queue (Task 1.16) -----------------------------------------------
function performBroadcast(version: number) {
  const stateMsg = JSON.stringify(makeStateSync('server'));
  outstandingAckClients = new Set();
  let sent = 0;
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(stateMsg);
      outstandingAckClients.add(client);
      sent++;
    }
  }
  currentBroadcastVersion = version;
  logInfo('state_broadcast', { version, clients: sent });
  if (sent === 0) {
    // Nothing to wait for – mark complete immediately
    lastBroadcastVersion = version;
    currentBroadcastVersion = null;
    outstandingAckClients = null;
    flushPending();
  }
}

function flushPending() {
  if (currentBroadcastVersion !== null) return; // busy
  if (pendingBroadcastVersion && pendingBroadcastVersion > lastBroadcastVersion) {
    const snap = fsm.getSnapshot();
    // Use latest snapshot version (could have advanced further than pending) to collapse bursts
    const latest = snap.version;
    pendingBroadcastVersion = null;
    if (latest > lastBroadcastVersion) performBroadcast(latest);
  }
}

const broadcastStateIfChanged = (force = false) => {
  const snap = fsm.getSnapshot();
  const v = snap.version;
  if (!force && v === lastBroadcastVersion) {
    logInfo('state_broadcast_skipped', { version: v, reason: 'version_unchanged' });
    return;
  }
  if (currentBroadcastVersion !== null) {
    // A broadcast in flight – queue newest version (collapse older pending)
    if (!pendingBroadcastVersion || v > pendingBroadcastVersion) {
      pendingBroadcastVersion = v;
      logInfo('state_broadcast_deferred', { version: v, current: currentBroadcastVersion });
    } else {
      logInfo('state_broadcast_collapsed', { version: v, pending: pendingBroadcastVersion });
    }
    return;
  }
  performBroadcast(v);
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
    logInfo('message_received', { msgType: msg.msgType });
    if (!isRegistered && msg.msgType === 'register') {
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
    switch (msg.msgType) {
      case 'data': {
        // Only Remote should seed data (ignore if TV attempts)
        const meta = clients.get(ws);
        if (meta?.clientType !== 'remote') {
          sendError(ws, ERROR_CODES.INVALID_MESSAGE_FORMAT, 'Only remote can send data');
          break;
        }
        fsm.seedData((msg as any).payload);
        ws.send(JSON.stringify(makeAck('server')));
        broadcastStateIfChanged();
        logInfo('data_seed_handled');
        break;
      }
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
      case 'ack': {
        if (currentBroadcastVersion !== null && outstandingAckClients && outstandingAckClients.has(ws)) {
          outstandingAckClients.delete(ws);
          const meta = clients.get(ws);
          if (meta) meta.lastStateAckVersion = currentBroadcastVersion;
          logInfo('state_broadcast_ack_progress', { version: currentBroadcastVersion, remaining: outstandingAckClients.size });
          if (outstandingAckClients.size === 0) {
            lastBroadcastVersion = currentBroadcastVersion;
            logInfo('state_broadcast_complete', { version: currentBroadcastVersion });
            currentBroadcastVersion = null;
            outstandingAckClients = null;
            flushPending();
          }
        }
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
      // Treat disconnect as implicit ACK if waiting
      if (currentBroadcastVersion !== null && outstandingAckClients && outstandingAckClients.has(ws)) {
        outstandingAckClients.delete(ws);
        if (outstandingAckClients.size === 0) {
          lastBroadcastVersion = currentBroadcastVersion;
          logWarn('state_broadcast_complete_client_loss', { version: currentBroadcastVersion });
          currentBroadcastVersion = null;
          outstandingAckClients = null;
          flushPending();
        }
      }
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

// Health endpoints must be registered early so they are not captured by Angular catch-all routes
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

// Host IP endpoint for clients needing a resolvable LAN address (e.g., QR generation)
app.get('/host-ip', (_req: Request, res: Response) => {
  const ip = getBestHostIP();
  res.json({ ip, port: WEBSOCKET_CONFIG.SERVER_DEFAULT_PORT });
});

app.use('/.well-known', express.static('public/.well-known', { dotfiles: 'allow' }))
app.use(express.static('public'));

// Define path to the TV and Remote app builds (relative to output directory)
// NOTE: Angular build output directory names are the project name (tv, remote)
// not 'sahar-tv' / 'sahar-remote'. Adjusted to match actual dist structure.
const tvAppPath = path.join(__dirname, '../../server/dist/tv');
const remoteAppPath = path.join(__dirname, '../../server/dist/remote/');
const tvIndexPath = path.join(tvAppPath, 'browser/index.html');
const remoteIndexPath = path.join(remoteAppPath, 'browser/index.html');

// Pre-flight existence checks (helpful diagnostics when static serving fails)
if (!existsSync(tvIndexPath)) {
  logWarn('tv_index_missing', { expected: path.relative(__dirname, tvIndexPath) });
} else {
  logInfo('tv_index_found', { path: path.relative(__dirname, tvIndexPath) });
}

if (!existsSync(remoteIndexPath)) {
  logWarn('remote_index_missing', { expected: path.relative(__dirname, remoteIndexPath) });
} else {
  logInfo('remote_index_found', { path: path.relative(__dirname, remoteIndexPath) });
}

// Inline SSR status object (Milestone 1 minimal gating – log only, no fail-fast)
export let SSR_STATUS: { tv: boolean; remote: boolean; tvPath: string; remotePath: string } = {
  tv: false,
  remote: false,
  tvPath: '',
  remotePath: ''
};


// Quick compatibility fix: serve the TV browser build at the server root so
// root-relative asset paths emitted by the Angular build (base href '/')
// resolve correctly during local/dev runs without rebuilding with a base-href.
// This mirrors the built app's browser folder and is intentionally permissive
// (fallthrough) so health/static routes still take precedence.
app.use('/tv', express.static(path.join(tvAppPath, 'browser'), { fallthrough: true }));
app.use('/remote', express.static(path.join(remoteAppPath, 'browser'), { fallthrough: true }));

// Task 1.7: Static asset passthrough (served regardless of DEV_SSR if they exist)
// We serve browser asset folders directly so dev/prod share URL shape.
app.use('/remote/assets', express.static(path.join(remoteAppPath, 'browser/assets'), { fallthrough: true }));
app.use('/tv/assets', express.static(path.join(tvAppPath, 'browser/assets'), { fallthrough: true }));

// Task 1.6: Dev reverse proxies for SSR HTML (when DEV_SSR=1) else fall back to built assets
// TV base route: '/' (root) and '/tv'
app.get(['/','/tv'], (req: Request, res: Response, next: NextFunction) => {
  if (DEV_SSR) return devProxy(`http://${getBestHostIP()}:${WEBSOCKET_CONFIG.SERVER_DEFAULT_PORT}`)(req, res, next);
  // Fallback to built index.html (prod-like)
  res.sendFile(tvIndexPath);
});

// Remote base route '/remote'
app.get('/remote', (req: Request, res: Response, next: NextFunction) => {
  if (DEV_SSR) return devProxy(`http://${getBestHostIP()}:${WEBSOCKET_CONFIG.SERVER_DEFAULT_PORT}`)(req, res, next);
  res.sendFile(remoteIndexPath);
});

// Catch-all deep links for Angular routing (non-asset) for TV
app.get(['/tv/*splat','/*splat'], (req: Request, res: Response, next: NextFunction) => {
  // Ignore if request looks like a file (has an extension) to avoid hijacking static/health
  if (/\.[a-zA-Z0-9]+$/.test(req.path)) return next();
  if (DEV_SSR) return devProxy(`http://${getBestHostIP()}:${WEBSOCKET_CONFIG.SERVER_DEFAULT_PORT}`)(req, res, next);
  res.sendFile(tvIndexPath);
});

// Catch-all deep links for Remote
app.get('/remote/*splat', (req: Request, res: Response, next: NextFunction) => {
  if (/\.[a-zA-Z0-9]+$/.test(req.path)) return next();
  if (DEV_SSR) return devProxy(`http://localhost:${WEBSOCKET_CONFIG.SERVER_DEFAULT_PORT}`)(req, res, next);
  res.sendFile(remoteIndexPath);
});

// (health routes moved earlier)

// Start the server
server.listen(WEBSOCKET_CONFIG.SERVER_DEFAULT_PORT, () => {
  logInfo('server_start', { port: WEBSOCKET_CONFIG.SERVER_DEFAULT_PORT });
  logInfo('host_ip_selected', { hostIp: getBestHostIP() });
  logInfo('server_status', { express: true, httpListening: true, tvRoute: '/tv', remoteRoute: '/remote', websocket: true, devSsr: DEV_SSR, tvDevPort: WEBSOCKET_CONFIG.SERVER_DEFAULT_PORT, remoteDevPort: WEBSOCKET_CONFIG.SERVER_DEFAULT_PORT });
  markReady();
  logInfo('server_ready');
  logInfo('mode_banner', {
    mode: DEV_SSR ? 'dev_proxy' : 'prod_static',
    wsPath: WEBSOCKET_CONFIG.WS_PATH,
    serverPort: WEBSOCKET_CONFIG.SERVER_DEFAULT_PORT,
    tvDevPort: WEBSOCKET_CONFIG.SERVER_DEFAULT_PORT,
    remoteDevPort: WEBSOCKET_CONFIG.SERVER_DEFAULT_PORT
  });
  // Minimal inline SSR gating (no discovery abstraction). Only in non-dev-proxy mode.
  if (!DEV_SSR) {
    const tvServerDir = path.join(tvAppPath, 'server');
    const remoteServerDir = path.join(remoteAppPath, 'server');
    const tvDirExists = existsSync(tvServerDir);
    const remoteDirExists = existsSync(remoteServerDir);
    // Try to pick a representative entry file (first .mjs or .js) if directory exists
    const pickEntry = (dir: string) => {
      try {
        const files = readdirSync(dir);
        const cand = files.find(f => /^(main|index).*\.(mjs|js)$/i.test(f)) || files.find(f => /\.(mjs|js)$/i.test(f));
        return cand ? path.join(dir, cand) : '';
      } catch {        
        logError('ssr_dir_read_error', { dir: path.relative(__dirname, dir) });
        return '';
      }
    };
    const tvEntry = tvDirExists ? pickEntry(tvServerDir) : '';
    const remoteEntry = remoteDirExists ? pickEntry(remoteServerDir) : '';
    SSR_STATUS = { tv: tvDirExists, remote: remoteDirExists, tvPath: tvEntry, remotePath: remoteEntry };
    logInfo('ssr_dir_status', { app: 'tv', dir: path.relative(__dirname, tvServerDir), exists: tvDirExists, pickedEntry: tvEntry ? path.relative(__dirname, tvEntry) : null });
    logInfo('ssr_dir_status', { app: 'remote', dir: path.relative(__dirname, remoteServerDir), exists: remoteDirExists, pickedEntry: remoteEntry ? path.relative(__dirname, remoteEntry) : null });
  }
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
