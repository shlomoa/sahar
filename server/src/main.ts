import express, { Request, Response, NextFunction } from 'express';
import { existsSync, readdirSync } from 'fs';
import httpProxy from 'http-proxy';
import { createServer } from 'http';
import { WebSocketServer, WebSocket, RawData } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  createLogger,
  WebSocketMessage,
  RegisterMessage,
  NavigationCommandMessage,
  ControlCommandMessage,
  ControlCommandPayload,
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
import { Fsm } from './fsm';
import { getBestHostIP } from './utils/host-ip';
import { HttpService } from './services/http.service';

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
// dev dir name: "<repo_root>/server/src"
logInfo('server_starting', { dir: __dirname }, 'Server starting up');

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
  logInfo('devProxy created', { target });
  return (req: Request, res: Response, next: NextFunction) => {
    if (!DEV_SSR) return next();
    proxy.web(req, res, { target });
  };
}

// Create HTTP server from the express app
const server = createServer(app);

// Create and attach WebSocket server on configured path
logInfo('websocket_config', { config: WEBSOCKET_CONFIG });
const wss = new WebSocketServer({ server, path: WEBSOCKET_CONFIG.WS_PATH });
logInfo('websocket_server', { server: server.address(), path: WEBSOCKET_CONFIG.WS_PATH });

// --- Finite State Machine (FSM) ---

// ClientType now imported from protocol single-source-of-truth

// FSM encapsulating authoritative state (now versioned)
const fsm = new Fsm();
// Broadcast discipline tracking (Task 1.16)
let lastBroadcastVersion = 0; // last fully ACKed broadcast version
let currentBroadcastVersion: number | null = null; // version currently awaiting ACKs
let pendingBroadcastVersion: number | null = null; // queued latest version while waiting
let outstandingAckClients: Set<WebSocket> | null = null; // clients yet to ACK current broadcast
// Timer for ack timeout enforcement
let broadcastAckTimer: ReturnType<typeof setTimeout> | null = null;

// Track client connections and their type (plus last ACKed state version and heartbeat for observability)
const clients = new Map<WebSocket, { clientType: ClientType; deviceId: string; lastStateAckVersion?: number; lastHeartbeat?: number; missedAckVersions?: Set<number>; ackRetryCount?: number }>();

// Readiness flag (infrastructure readiness: HTTP + WS initialized)
let isReady = false;
const markReady = () => { isReady = true; };

// --- Message helpers ---
const makeAck = (source: 'server'): AckMessage => ({ msgType: 'ack', timestamp: Date.now(), source, payload: {msgType: 'ack'} });
const makeStateSync = (source: 'server'): StateSyncMessage => ({ msgType: 'state_sync', timestamp: Date.now(), source, payload: {msgType: 'ack', ...fsm.getSnapshot() }});
const makeControlCommand = (source: 'server', payload: ControlCommandPayload): ControlCommandMessage => ({ msgType: 'control_command', timestamp: Date.now(), source, payload });
const makeError = (source: 'server', code: string, message: string): ErrorMessage => ({ msgType: 'error', timestamp: Date.now(), source, payload: {msgType: 'error', code, message }});

// --- Error sending helper ---
function sendError(ws: WebSocket, code: string, message: string, opts: { close?: boolean; meta?: any } = {}) {
  logError('invalid_message', { code, message, ...(opts.meta || {}) });
  ws.send(JSON.stringify(makeError('server', code, message)));  
  if (opts.close) {
    try { 
      ws.close(); 
    } catch {
      logError('Failed to close ws');
    }
  }
}

// --- Validation ---

function validateMessage(raw: any, isRegistered: boolean): { ok: true; msg: WebSocketMessage } | { ok: false; code: string; reason: string; close?: boolean } {
  // Basic shape checks
  if (typeof raw !== 'object' || raw === null) {
    logError('invalid_message', { code: ERROR_CODES.INVALID_MESSAGE_FORMAT, reason: 'Non-object message', close: !isRegistered });
    return { ok: false, code: ERROR_CODES.INVALID_MESSAGE_FORMAT, reason: 'Non-object message', close: !isRegistered };
  }
  const { msgType } = raw as { msgType?: unknown };
  if (typeof msgType !== 'string') {
    logError('invalid_message', { code: ERROR_CODES.INVALID_MESSAGE_FORMAT, reason: 'Missing type', close: !isRegistered });
    return { ok: false, code: ERROR_CODES.INVALID_MESSAGE_FORMAT, reason: 'Missing type', close: !isRegistered };
  }

  // Helpers: shallow sanitizers and guards
  const asString = (v: any, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : undefined);
  const asNumber = (v: any) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
  const asBoolean = (v: any) => (typeof v === 'boolean' ? v : undefined);
  const isPlainObject = (v: any) => !!v && typeof v === 'object' && !Array.isArray(v);

  // Generic deep sanitizer for arbitrary payloads used by 'data' messages.
  // Limits depth and keys per object to avoid memory/CPU abuse from large/recursive payloads.
  function sanitizeAny(obj: any, depth = 0): any {
    if (depth > 3) return undefined;
    if (obj === null) return null;
    if (typeof obj === 'string') return asString(obj, 1000);
    if (typeof obj === 'number') return asNumber(obj);
    if (typeof obj === 'boolean') return asBoolean(obj);
    if (Array.isArray(obj)) {
      if (obj.length > 200) return undefined;
      return obj.slice(0, 200).map(i => sanitizeAny(i, depth + 1)).filter(() => true);
    }
    if (isPlainObject(obj)) {
      logInfo('sanitizeAny: object', { depth, keys: Object.keys(obj).length });
      const out: any = {};
      const keys = Object.keys(obj).slice(0, 200);
      for (const k of keys) {
        // skip prototype pollution attempts
        if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
        out[k] = sanitizeAny(obj[k], depth + 1);
      }
      return out;
    }
    logWarn('sanitizeAny: unsupported type', { type: typeof obj });
    return undefined;
  }

  // Build sanitized message per type. Always return an object shaped: { msgType, timestamp?, payload? }
  const base: any = { msgType };

  // Preserve timestamp only if it's a finite number
  if (typeof (raw as any).timestamp === 'number' && Number.isFinite((raw as any).timestamp)) base.timestamp = (raw as any).timestamp;

  // Registration must be the first message for unregistered clients
  if (!isRegistered) {
    if (msgType !== 'register') {
      logError('invalid_message', { code: ERROR_CODES.INVALID_REGISTRATION, reason: 'First message not register', close: true });
      return { ok: false, code: ERROR_CODES.INVALID_REGISTRATION, reason: 'First message must be register', close: true };
    }
    const payload = (raw as any).payload;
    if (!isPlainObject(payload)) {
      logError('invalid_message', { code: ERROR_CODES.INVALID_MESSAGE_FORMAT, reason: 'Register missing payload', close: true });
      return { ok: false, code: ERROR_CODES.INVALID_MESSAGE_FORMAT, reason: 'Register missing payload', close: true };
    }
    const clientType = asString(payload.clientType, 10);
    if (clientType !== 'tv' && clientType !== 'remote') {
      logError('invalid_message', { code: ERROR_CODES.INVALID_MESSAGE_FORMAT, reason: 'Invalid clientType', close: true });
      return { ok: false, code: ERROR_CODES.INVALID_MESSAGE_FORMAT, reason: 'Invalid clientType', close: true };
    }
    const deviceId = asString(payload.deviceId, 200);
    if (!deviceId) {
      logError('invalid_message', { code: ERROR_CODES.INVALID_MESSAGE_FORMAT, reason: 'Invalid deviceId', close: true });
      return { ok: false, code: ERROR_CODES.INVALID_MESSAGE_FORMAT, reason: 'Invalid deviceId', close: true };
    }
    const deviceName = asString(payload.deviceName, 200) || '';
    base.payload = { clientType, deviceId, deviceName };
    logInfo('register_message', { clientType, deviceId, deviceName: deviceName || '(unnamed)' });
    return { ok: true, msg: base as WebSocketMessage };
  }

  // For registered clients, accept and sanitize known types only
  switch (msgType) {
    case 'register':
      logError('invalid_message', { code: ERROR_CODES.INVALID_MESSAGE_FORMAT, reason: 'Duplicate register' });
      return { ok: false, code: ERROR_CODES.INVALID_MESSAGE_FORMAT, reason: 'Duplicate register' };

    case 'data': {
      const payload = (raw as any).payload;
      if (!isPlainObject(payload)) {
        logError('invalid_message', { code: ERROR_CODES.INVALID_MESSAGE_FORMAT, reason: 'Data missing payload' });
        return { ok: false, code: ERROR_CODES.INVALID_MESSAGE_FORMAT, reason: 'Data missing payload' };
      }
      base.payload = sanitizeAny(payload, 0);
      logInfo('data_message', { keys: Object.keys(base.payload || {}).length });
      return { ok: true, msg: base as WebSocketMessage };
    }

    case 'navigation_command': {
      const payload = (raw as any).payload;
      if (!isPlainObject(payload)) {
        logError('invalid_message', { code: ERROR_CODES.INVALID_MESSAGE_FORMAT, reason: 'Navigation missing payload' });
        return { ok: false, code: ERROR_CODES.INVALID_MESSAGE_FORMAT, reason: 'Navigation missing payload' };
      }
      const action = asString(payload.action, 50);
      if (!action || !NAVIGATION_ACTION_SET.has(action as any)) {
        logError('invalid_message', { code: ERROR_CODES.INVALID_MESSAGE_FORMAT, reason: 'Invalid navigation action'});
        return { ok: false, code: ERROR_CODES.INVALID_MESSAGE_FORMAT, reason: 'Invalid navigation action' };
      }
      const targetId = payload.targetId ? asString(payload.targetId, 200) : undefined;
      base.payload = { action, ...(targetId ? { targetId } : {}) };
      logInfo('navigation_command', { action, targetId });
      return { ok: true, msg: base as WebSocketMessage };
    }

    case 'control_command': {
      logInfo('validating control_command');
      const payload = (raw as any).payload;
      if (!isPlainObject(payload)) {
        logError('invalid_message', { code: ERROR_CODES.INVALID_MESSAGE_FORMAT, reason: 'Control missing payload' });
        return { ok: false, code: ERROR_CODES.INVALID_MESSAGE_FORMAT, reason: 'Control missing payload' };
      }
      const action = asString(payload.action, 50);
      if (!action || !CONTROL_ACTION_SET.has(action as any)) {
        logError('invalid_message', { code: ERROR_CODES.INVALID_MESSAGE_FORMAT, reason: 'Invalid control action' });
        return { ok: false, code: ERROR_CODES.INVALID_MESSAGE_FORMAT, reason: 'Invalid control action' };
      }

      const currentTime = typeof payload.currentTime === 'number' ? payload.currentTime : undefined;
      if (currentTime !== undefined && currentTime < 0) {
        logError('invalid_message', { code: ERROR_CODES.INVALID_MESSAGE_FORMAT, reason: 'Invalid currentTime' });
        return { ok: false, code: ERROR_CODES.INVALID_MESSAGE_FORMAT, reason: 'Invalid currentTime' };
      }
      const volume = typeof payload.volume === 'number' ? payload.volume : undefined;
      if (volume !== undefined && (volume < 0 || volume > 100)) {
        logError('invalid_message', { code: ERROR_CODES.INVALID_MESSAGE_FORMAT, reason: 'Invalid volume' });
        return { ok: false, code: ERROR_CODES.INVALID_MESSAGE_FORMAT, reason: 'Invalid volume' };
      }

      logInfo('validated control_command', { action, ...payload });
      const controlMsg = { ...base, action, source: 'server', timestamp: Date.now(), payload: payload } as ControlCommandMessage;
      return { ok: true, msg: controlMsg as WebSocketMessage };
    }

    case 'action_confirmation': {
      const payload = (raw as any).payload;
      if (!isPlainObject(payload)) {
        logError('invalid_message', { code: ERROR_CODES.INVALID_MESSAGE_FORMAT, reason: 'Confirmation missing payload' });
        return { ok: false, code: ERROR_CODES.INVALID_MESSAGE_FORMAT, reason: 'Confirmation missing payload' };
      }
      const status = asString(payload.status, 20);
      if (status !== 'success' && status !== 'failure') {
        logError('invalid_message', { code: ERROR_CODES.INVALID_MESSAGE_FORMAT, reason: 'Invalid confirmation status' });
        return { ok: false, code: ERROR_CODES.INVALID_MESSAGE_FORMAT, reason: 'Invalid confirmation status' };
      }
      const errorMessage = payload.errorMessage ? asString(payload.errorMessage, 1000) : undefined;
      base.payload = { status, ...(errorMessage ? { errorMessage } : {}) };
      logInfo('action_confirmation', { status, ...(errorMessage ? { errorMessage } : {}) });
      return { ok: true, msg: base as WebSocketMessage };
    }

    case 'heartbeat': {
      // Allow small heartbeat payloads (sanitized) for liveness checks
      const payload = (raw as any).payload;
      base.payload = isPlainObject(payload) ? sanitizeAny(payload, 0) : undefined;
      logInfo('heartbeat', { ...(base.payload ? { payload: base.payload } : {}) });
      return { ok: true, msg: base as WebSocketMessage };
    }

    case 'ack': {
      // Allow ack with optional small payload (sanitized)
      const payload = (raw as any).payload;
      base.payload = isPlainObject(payload) ? sanitizeAny(payload, 0) : undefined;
      logInfo('ack', { ...(base.payload ? { payload: base.payload } : {}) });
      return { ok: true, msg: base as WebSocketMessage };
    }

    case 'state_sync': {
      // 'state_sync' is a server-originated, authoritative snapshot and
      // must never be sent by a client. Treat this as a protocol violation
      // and close the connection to aid debugging and keep the FSM authoritative.
      logError('invalid_message', { code: ERROR_CODES.INVALID_MESSAGE_FORMAT, reason: 'Client cannot send server-only type: state_sync', close: true });
      return { ok: false, code: ERROR_CODES.INVALID_MESSAGE_FORMAT, reason: 'Client cannot send server-only type: state_sync', close: true };
    }
    case 'error': {
      // Clients may send an 'error' payload in some diagnostic/testing flows,
      // but in production we treat it as a protocol violation when unsolicited.
      logError('invalid_message', { code: ERROR_CODES.INVALID_MESSAGE_FORMAT, reason: 'Client cannot send server-only type: error' });
      return { ok: false, code: ERROR_CODES.INVALID_MESSAGE_FORMAT, reason: 'Client cannot send server-only type: error' };
    }

    default:
      logError('invalid_message', { code: ERROR_CODES.INVALID_MESSAGE_FORMAT, reason: 'Unsupported message type' });
      return { ok: false, code: ERROR_CODES.INVALID_MESSAGE_FORMAT, reason: 'Unsupported message type' };
  }
}

// ---- Ack‑gated broadcast queue (Task 1.16) -----------------------------------------------
function performBroadcast(version: number) {
  logInfo('perform_broadcast', { version });
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
  // Clear any previous ACK timer
  if (broadcastAckTimer) {
    clearTimeout(broadcastAckTimer);
    broadcastAckTimer = null;
  }
  // Start ACK timeout enforcement so a single unresponsive client doesn't stall broadcasts
  if (sent > 0) {
    logInfo('setting a broadcast ack timeout timer');
    broadcastAckTimer = setTimeout(() => {
      try {
        // Identify stuck sockets and log for diagnostics
        const stuckSockets = outstandingAckClients ? [...outstandingAckClients] : [];
        const stuck = stuckSockets.map(c => clients.get(c)?.deviceId || '(unknown)');
        logWarn('state_broadcast_ack_timeout', { version: currentBroadcastVersion, stuckClients: stuck });

        // For each unresponsive client, record the missed version and attempt a targeted resend
        for (const stuckSocket of stuckSockets) {
          const meta = clients.get(stuckSocket);
          if (!meta) continue;
          const v = currentBroadcastVersion as number;
          if (!meta.missedAckVersions) meta.missedAckVersions = new Set<number>();
          meta.missedAckVersions.add(v);
          meta.ackRetryCount = (meta.ackRetryCount || 0) + 1;
          logInfo('state_broadcast_mark_missed', { to: meta.deviceId, version: v, retry: meta.ackRetryCount });

          // Attempt a lightweight targeted resend to the client (best-effort)
          if (stuckSocket.readyState === WebSocket.OPEN) {
            try {
              stuckSocket.send(JSON.stringify(makeStateSync('server')));
              logInfo('state_resend_attempt', { to: meta.deviceId });
            } catch (e) {
              logWarn('state_resend_failed', { to: meta.deviceId, err: String(e) });
            }
          }
        }

        // Consider the broadcast complete despite missing acks to avoid indefinite stalls
        lastBroadcastVersion = currentBroadcastVersion as number;
        currentBroadcastVersion = null;
        outstandingAckClients = null;
        // Continue with any pending broadcasts
        flushPending();
      } finally {
        if (broadcastAckTimer) { 
          clearTimeout(broadcastAckTimer);
          broadcastAckTimer = null; 
        }
      }
    }, WEBSOCKET_CONFIG.ACK_TIMEOUT);
  } else {
    // Nothing to wait for – mark complete immediately
    lastBroadcastVersion = version;
    currentBroadcastVersion = null;
    outstandingAckClients = null;
    flushPending();
  }
}

function flushPending() {
  if (currentBroadcastVersion !== null) {
    logInfo('flush_pending', {}, 'Current broadcast in flight, cannot flush yet');
    return; // busy
  }
  if (pendingBroadcastVersion && pendingBroadcastVersion > lastBroadcastVersion) {
    logInfo('flush_pending', { pending: pendingBroadcastVersion, last: lastBroadcastVersion }, 'Flushing pending broadcast');
    const snap = fsm.getSnapshot();
    // Use latest snapshot version (could have advanced further than pending) to collapse bursts
    const latest = snap.version;
    pendingBroadcastVersion = null;
    if (latest > lastBroadcastVersion) performBroadcast(latest);
  }
}

const broadcastStateIfChanged = (force = false) => {
  logInfo('broadcast_state_if_changed', { force });
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
    const rawText = typeof data === 'string' ? data : data.toString();
    try {
      parsed = JSON.parse(rawText);
    } catch (e) {
      sendError(ws, ERROR_CODES.INVALID_MESSAGE_FORMAT, 'Invalid JSON', { close: !isRegistered, meta: { preRegistered: !isRegistered, rawMessage: rawText.slice(0,2000) } });
      return;
    }
    const v = validateMessage(parsed, isRegistered);
    if (!v.ok) {
      // Include a truncated raw message and any incoming msgType for easier debugging
      const incomingType = parsed && typeof (parsed as any).msgType === 'string' ? (parsed as any).msgType : null;
      const rawTextTrunc = rawText.slice(0, 2000);
      sendError(ws, v.code, v.reason, { close: !!v.close, meta: { preRegistered: !isRegistered, incomingMsgType: incomingType, rawMessage: rawTextTrunc } });
      return;
    }
    const msg = v.msg;
    logInfo('message_received', { msgType: msg.msgType });
    if (!isRegistered && msg.msgType === 'register') {
      const reg = msg as RegisterMessage;
      const { clientType, deviceId } = reg.payload;
      // Enforce single TV / Remote uniqueness
      const snapshot = fsm.getSnapshot();
      if (clientType === 'tv' && snapshot.clientsConnectionState.tv === 'connected') {
        sendError(ws, ERROR_CODES.CLIENT_TYPE_MISMATCH, 'A TV client is already connected.', { close: true, meta: { attempted: 'tv' } });
        return;
      }
      if (clientType === 'remote' && snapshot.clientsConnectionState.remote === 'connected') {
        sendError(ws, ERROR_CODES.CLIENT_TYPE_MISMATCH, 'A Remote client is already connected.', { close: true, meta: { attempted: 'remote' } });
        return;
      }
      clients.set(ws, { clientType, deviceId, missedAckVersions: new Set<number>(), ackRetryCount: 0 });
      fsm.registerClient(clientType, deviceId);
      // Ack the registration and send an immediate authoritative state_sync
      // directly to the registering client. This guarantees newly-joined
      // clients receive the current snapshot even if a broadcast is
      // currently in-flight or deferred by ack-gating.
      ws.send(JSON.stringify(makeAck('server')));
      try {
        ws.send(JSON.stringify(makeStateSync('server')));
        logInfo('state_sync_sent_direct', { to: deviceId, clientType });
      } catch (e) {
        logWarn('state_sync_direct_failed', { to: deviceId, clientType, error: String(e) });
      }
      // Continue with the regular broadcast pipeline for all clients
      broadcastStateIfChanged();
      logInfo('client_registered', { clientType, deviceId });
      return;
    }
    // Already registered normal messages
    switch (msg.msgType) {
      case 'data': {
        // Phase 3: 'data' message type no longer supported - catalog served via HTTP
        const meta = clients.get(ws);
        if (meta?.clientType !== 'remote') {
          sendError(ws, ERROR_CODES.INVALID_MESSAGE_FORMAT, 'data message type no longer supported');
          break;
        }
        // fsm.seedData((msg as any).payload); // Phase 3: removed
        sendError(ws, ERROR_CODES.INVALID_MESSAGE_FORMAT, 'data message type no longer supported - use HTTP /api/content/catalog');
        logWarn('data_message_deprecated', { from: meta.deviceId });
        break;
      }
      case 'navigation_command': {
        const nav = msg as NavigationCommandMessage;
        logInfo('navigation_command_received', { from: clients.get(ws)?.deviceId, payload: nav.payload });
        try {
          // Only Remote clients should issue navigation commands
          const meta = clients.get(ws);
          if (!meta || meta.clientType !== 'remote') {
            logWarn('navigation_command_from_non_remote', { from: meta?.deviceId, clientType: meta?.clientType });
            sendError(ws, ERROR_CODES.CLIENT_TYPE_MISMATCH, 'Only remote may send navigation_command');
            break;
          }

          const before = fsm.getSnapshot();
          // lightweight debug
          logInfo('fsm_before_navigation', { version: before.version, navigation: before.navigation });

          // Validate target existence for authoritative navigation commands.
          const action = nav.payload.action;
          const targetId = nav.payload.targetId;
          
          // Phase 3: Get catalog from FSM's getCatalogData(), not from state
          const catalogData = fsm.getCatalogData();
          const performers = catalogData.performers || [];
          const videos = catalogData.videos || [];
          const scenes = catalogData.scenes || [];

          const existsPerformer = (id?: string) => !!id && performers.some((p: any) => p.id === id);
          const existsVideo = (id?: string) => !!id && videos.some((v: any) => v.id === id);
          const existsScene = (id?: string) => !!id && scenes.some((s: any) => s.id === id);

          let validTarget = true;
          switch (action) {
            case 'navigate_to_performer':
              validTarget = existsPerformer(targetId);
              break;
            case 'navigate_to_video':
              validTarget = existsVideo(targetId);
              break;
            case 'navigate_to_scene':
              validTarget = existsScene(targetId);
              break;
            default:
              // actions like navigate_back / navigate_home don't require a target
              validTarget = true;
          }

          if (!validTarget) {
            logWarn('navigation_command_invalid_target', { action, targetId });
            sendError(ws, ERROR_CODES.INVALID_COMMAND, `Unknown or missing targetId for action ${action}`);
            break;
          }

          fsm.navigationCommand(nav.payload.action, nav.payload.targetId);
          const after = fsm.getSnapshot();
          logInfo('fsm_after_navigation', { version: after.version, navigation: after.navigation });
          ws.send(JSON.stringify(makeAck('server'))); // Ack before broadcast
          broadcastStateIfChanged();
          logInfo('navigation_command_handled', { action: nav.payload.action, targetId: nav.payload.targetId, newVersion: after.version });
        } catch (e: any) {
          logError('navigation_command_error', { error: e?.message || String(e), stack: e?.stack });
          ws.send(JSON.stringify(makeError('server', ERROR_CODES.INVALID_MESSAGE_FORMAT, 'navigation_command_failed')));
        }
        break;
      }
      case 'control_command': {
        const ctl = msg as ControlCommandMessage;
        
        // Verify sender is Remote client
        const senderMeta = clients.get(ws);
        if (!senderMeta || senderMeta.clientType !== 'remote') {
          sendError(ws, ERROR_CODES.CLIENT_TYPE_MISMATCH, 'Only remote may send control_command');
          logError('control_command_from_non_remote', { from: senderMeta?.deviceId, clientType: senderMeta?.clientType });
          throw new Error('Only remote may send control_command');
        }
        
        // Find TV client to forward the command
        let tvClient: WebSocket | null = null;
        for (const [socket, meta] of clients.entries()) {
          if (meta.clientType === 'tv' && socket.readyState === WebSocket.OPEN) {
            tvClient = socket;
            break;
          }
        }
        
        if (!tvClient) {
          // TV is not connected - this is a validation error by the Remote client
          // The Remote should have checked applicationState.clientsConnectionState.tv before sending
          logError('control_command_no_tv', { 
            action: ctl.payload.action, 
            from: senderMeta.deviceId,
            tvConnectionState: fsm.getSnapshot().clientsConnectionState.tv
          });
          sendError(ws, ERROR_CODES.INVALID_COMMAND, 'TV client not connected - cannot execute control command');
          break;
        }
        
        // Ack the Remote client
        ws.send(JSON.stringify(makeAck('server')));
        
        // Forward the control command to TV using the helper
        tvClient.send(JSON.stringify(makeControlCommand('server', ctl.payload)));
        logInfo('control_command_forwarded_to_tv', { 
          action: ctl.payload.action,
          from: senderMeta.deviceId,
          to: clients.get(tvClient)?.deviceId
        });
        
        // TODO: Wait for action_confirmation from TV before updating FSM
        // For now, keeping current behavior for compatibility
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
        // Accept optional ack payload.version for precise reconciliation
        try {
          const ackMsg = msg as AckMessage;
          const ackPayloadVersion = ackMsg.payload && typeof (ackMsg.payload as any).version === 'number' ? (ackMsg.payload as any).version : null;
          // If ack refers to a specific version, clear that version from missed set if present
          const meta = clients.get(ws);
          if (meta && ackPayloadVersion !== null) {
            meta.lastStateAckVersion = ackPayloadVersion;
            if (meta.missedAckVersions && meta.missedAckVersions.has(ackPayloadVersion)) {
              meta.missedAckVersions.delete(ackPayloadVersion);
              logInfo('client_ack_cleared_missed', { deviceId: meta.deviceId, version: ackPayloadVersion });
            }
            // Reset retry count on successful ack
            meta.ackRetryCount = 0;
          }

          if (currentBroadcastVersion !== null && outstandingAckClients && outstandingAckClients.has(ws)) {
            outstandingAckClients.delete(ws);
            if (meta && meta.lastStateAckVersion === null) meta.lastStateAckVersion = currentBroadcastVersion;
            logInfo('state_broadcast_ack_progress', { version: currentBroadcastVersion, remaining: outstandingAckClients.size });
            if (outstandingAckClients.size === 0) {
              lastBroadcastVersion = currentBroadcastVersion;
              logInfo('state_broadcast_complete', { version: currentBroadcastVersion });
              currentBroadcastVersion = null;
              outstandingAckClients = null;
              // Clear ACK timeout timer since broadcast completed successfully
              if (broadcastAckTimer) { 
                clearTimeout(broadcastAckTimer);
                broadcastAckTimer = null; 
              }
              flushPending();
            }
          }
        } catch (e) {
          logError('ack_handling_error', { error: String(e) });
        }
        break;
      }
      case 'register': {
        // Should not reach here due to validation, but guard anyway
        sendError(ws, ERROR_CODES.INVALID_MESSAGE_FORMAT, 'Duplicate register attempt');
        break;
      }    
      case 'heartbeat': {
        // Record last heartbeat timestamp for observability and reply with an ack
        const meta = clients.get(ws);
        if (meta) meta.lastHeartbeat = Date.now();
        ws.send(JSON.stringify(makeAck('server')));
        logInfo('heartbeat_received', { from: meta?.clientType, deviceId: meta?.deviceId });
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
          // Clear ACK timeout timer since broadcast completed (client loss accounted for)
          if (broadcastAckTimer) { 
            clearTimeout(broadcastAckTimer); 
            broadcastAckTimer = null; 
          }
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
// HTTP Service handles: /live, /ready, /health, /host-ip, /api/content/catalog
const httpService = new HttpService(fsm, wss, clients, () => isReady);
httpService.setupRoutes(app);

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

app.use('/', express.static(path.join(tvAppPath, 'browser'), { fallthrough: true }));

// Task 1.6: Dev reverse proxies for SSR HTML (when DEV_SSR=1) else fall back to built assets
// TV base route: '/' (root) and '/tv'
app.get(['/','/tv'], (req: Request, res: Response, next: NextFunction) => {
  logInfo('http_request', { path: req.path, method: req.method, route: 'root_or_tv' });
  if (DEV_SSR) return devProxy(`http://${getBestHostIP()}:${WEBSOCKET_CONFIG.SERVER_DEFAULT_PORT}`)(req, res, next);
  // Fallback to built index.html (prod-like)
  res.sendFile(tvIndexPath);
});

// Remote base route '/remote'
app.get('/remote', (req: Request, res: Response, next: NextFunction) => {
  logInfo('http_request', { path: req.path, method: req.method });
  if (DEV_SSR) return devProxy(`http://${getBestHostIP()}:${WEBSOCKET_CONFIG.SERVER_DEFAULT_PORT}`)(req, res, next);
  res.sendFile(remoteIndexPath);
});

// Catch-all deep links for Angular routing (non-asset) for TV
app.get(['/tv/*splat','/*splat'], (req: Request, res: Response, next: NextFunction) => {
  logInfo('http_request', { path: req.path, method: req.method, route: 'tv_or_root_catchall' });
  // Ignore if request looks like a file (has an extension) to avoid hijacking static/health
  if (/\.[a-zA-Z0-9]+$/.test(req.path)) return next();
  if (DEV_SSR) return devProxy(`http://${getBestHostIP()}:${WEBSOCKET_CONFIG.SERVER_DEFAULT_PORT}`)(req, res, next);
  res.sendFile(tvIndexPath);
});

// Catch-all deep links for Remote
app.get('/remote/*splat', (req: Request, res: Response, next: NextFunction) => {
  logInfo('http_request', { path: req.path, method: req.method, route: 'remote_catchall' });
  if (/\.[a-zA-Z0-9]+$/.test(req.path)) return next();
  if (DEV_SSR) return devProxy(`http://${getBestHostIP()}:${WEBSOCKET_CONFIG.SERVER_DEFAULT_PORT}`)(req, res, next);
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
  // Phase 3: Catalog initialization moved to FSM constructor, no longer part of state
  // Catalog is served via HTTP GET /api/content/catalog, not via WebSocket state_sync
  logInfo('catalog_initialization', { 
    mode: 'http_only',
    message: 'Catalog served via HTTP /api/content/catalog'
  });
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
        const cand = files.find(f => /^(main|index).*.\.(mjs|js)$/i.test(f)) || files.find(f => /\.(mjs|js)$/i.test(f));
        return cand ? path.join(dir, cand) : '';
      } catch {        
        logError('ssr_dir_read_error', { dir: path.relative(__dirname, dir) });
        return '';
      }
    };
    const tvEntry = tvDirExists ? pickEntry(tvServerDir) : '';
    const remoteEntry = remoteDirExists ? pickEntry(remoteServerDir) : '';
    SSR_STATUS = { tv: tvDirExists, remote: remoteDirExists, tvPath: tvEntry, remotePath: remoteEntry };

    // Phase 3: POST /seed endpoint deprecated - catalog is read-only via HTTP GET /api/content/catalog
    app.post('/seed', (req: Request, res: Response) => {
      logInfo('http_request', { path: req.path, method: req.method });
      logWarn('seed_endpoint_deprecated', { message: 'POST /seed is deprecated - catalog served via HTTP GET /api/content/catalog' });
      res.status(410).json({ 
        ok: false, 
        error: 'POST /seed endpoint is deprecated. Catalog is now read-only via HTTP GET /api/content/catalog' 
      });
    });

    logInfo('ssr_dir_status', { app: 'tv', dir: path.relative(__dirname, tvServerDir), exists: tvDirExists, pickedEntry: tvEntry ? path.relative(__dirname, tvEntry) : null });
    logInfo('ssr_dir_status', { app: 'remote', dir: path.relative(__dirname, remoteServerDir), exists: remoteDirExists, pickedEntry: remoteEntry ? path.relative(__dirname, remoteEntry) : null });
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  logWarn('shutdown_signal', { signal: 'SIGINT' });
  server.close(() => {
    logWarn('server_shutdown');
    process.exit(0);
  });
});

export { app, server };
