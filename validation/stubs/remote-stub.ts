#!/usr/bin/env ts-node
/**
 * Remote Stub (TypeScript)
 * - Registers as remote
 * - HTTP control: /health /state /logs /reset /command
 */
import http, { IncomingMessage, ServerResponse } from 'http';
import WebSocket from 'ws';
import { createLogger } from '../shared/shared/src/lib/utils/logging.js';
import { WEBSOCKET_CONFIG } from '../shared/shared/src/lib/models/websocket-protocol.js';
import { NavigationCommandPayload, ControlCommandPayload } from '../shared/shared/src/lib/models/messages.js';
import { VALIDATION_CONFIG, buildLocalServerUrl } from '../config/validation-config.js';

interface StubState {
  connected: boolean;
  lastStateSync: any | null;
  lastAckAt: number | null;
  wsReady: boolean;
}

// Merge centralized validation config with minimal per-stub adjustable fields.
const DEFAULTS = {
  serverUrl: buildLocalServerUrl(),
  httpPort: VALIDATION_CONFIG.STUB_PORTS.remote,
  clientId: 'remote-stub-1',
  ackTimeoutMs: WEBSOCKET_CONFIG.ACK_TIMEOUT,
  backoffBaseMs: VALIDATION_CONFIG.RECONNECT.BASE_MS,
  backoffMaxMs: VALIDATION_CONFIG.RECONNECT.MAX_MS,
  backoffJitterMs: VALIDATION_CONFIG.RECONNECT.JITTER_MS,
};

const state: StubState = {
  connected: false,
  lastStateSync: null,
  lastAckAt: null,
  wsReady: false,
};

const logBuffer: any[] = [];
const logger = createLogger({ component: 'remote_stub', client_id: DEFAULTS.clientId }, { onRecord: (r) => {
  logBuffer.push(r);
  if (logBuffer.length > 500) logBuffer.shift();
}});
const log = (level: 'info' | 'warn' | 'error' | 'debug', event: string, detail?: any) => {
  if (level === 'warn') return logger.warn(event, detail);
  if (level === 'error') return logger.error(event, detail);
  return logger.info(event, detail);
};

let ws: WebSocket | undefined;
let reconnectAttempts = 0;
let pendingAckResolve: (() => void) | null = null;

function connect() {
  log('info', 'ws.connect.start', { url: DEFAULTS.serverUrl });
  ws = new WebSocket(DEFAULTS.serverUrl);

  ws.on('open', () => {
    state.connected = true;
    state.wsReady = true;
    reconnectAttempts = 0;
    log('info', 'ws.open');
    const register = {
      type: 'register' as const,
      timestamp: Date.now(),
      source: 'remote' as const,
      payload: { clientType: 'remote', deviceId: DEFAULTS.clientId, deviceName: process.env.DEVICE_NAME || 'Remote Stub' },
    };
    ws?.send(JSON.stringify(register));
  });

  ws.on('message', (data: WebSocket.RawData) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'ack') {
        state.lastAckAt = Date.now();
        log('info', 'ws.ack', { from: msg.source });
        if (pendingAckResolve) { pendingAckResolve(); pendingAckResolve = null; }
        return;
      }
      if (msg.type === 'state_sync') {
        state.lastStateSync = { payload: msg.payload, ts: Date.now() };
        log('info', 'ws.state_sync');
        const ack = { type: 'ack', timestamp: Date.now(), source: 'remote', payload: { ack: msg.type } };
        ws?.send(JSON.stringify(ack));
        return;
      }
      log('info', 'ws.message', { type: msg.type });
    } catch (e: any) {
      log('error', 'ws.message.parse_error', { error: e.message });
    }
  });

  ws.on('close', (code: number, reason: Buffer) => {
    state.connected = false;
    state.wsReady = false;
    log('warn', 'ws.close', { code, reason: reason?.toString() });
    scheduleReconnect();
  });
  ws.on('error', (err: Error) => {
    log('error', 'ws.error', { error: err.message });
  });
}

function scheduleReconnect() {
  reconnectAttempts++;
  const exp = Math.min(DEFAULTS.backoffMaxMs, DEFAULTS.backoffBaseMs * Math.pow(2, reconnectAttempts - 1));
  const jitter = Math.floor((Math.random() * 2 - 1) * DEFAULTS.backoffJitterMs);
  const delay = Math.max(0, exp + jitter);
  log('info', 'ws.reconnect.schedule', { attempts: reconnectAttempts, delay });
  setTimeout(connect, delay);
}

function waitForAck(timeoutMs: number) {
  return new Promise<void>((resolve, reject) => {
    pendingAckResolve = resolve;
    setTimeout(() => {
      if (pendingAckResolve) {
        pendingAckResolve = null;
        reject(new Error('ACK timeout'));
      }
    }, timeoutMs);
  });
}

function parseBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    let buffer = '';
    req.on('data', (c) => (buffer += c));
    req.on('end', () => {
      try { resolve(buffer ? JSON.parse(buffer) : {}); } catch { resolve({}); }
    });
  });
}

function sendJson(res: ServerResponse, code: number, body: any) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url || '/', 'http://localhost');
  const pathname = u.pathname;
  if (req.method === 'GET' && pathname === '/health') return sendJson(res, 200, { status: 'ok', connected: state.connected, wsReady: state.wsReady });
  if (req.method === 'GET' && pathname === '/state') return sendJson(res, 200, { lastStateSync: state.lastStateSync });
  if (req.method === 'GET' && pathname === '/logs') return sendJson(res, 200, logBuffer);
  if (req.method === 'POST' && pathname === '/reset') {
    state.lastStateSync = null;
    state.lastAckAt = null;
    log('info', 'http.reset');
    return sendJson(res, 200, { ok: true });
  }
  if (req.method === 'POST' && pathname === '/command') {
    const body = await parseBody(req);
    try {
      if (body.type === 'seed') {
        const msg = { type: 'data', timestamp: Date.now(), source: 'remote', payload: body.payload || {} };
        ws?.send(JSON.stringify(msg));
        log('info', 'http.command.seed', { size: JSON.stringify(body.payload || {}).length });
        return sendJson(res, 200, { ok: true });
      }
      if (body.type !== 'navigation_command' && body.type !== 'control_command') {
        return sendJson(res, 400, { error: 'Invalid type' });
      }
      // Narrow payload types
      const payload = body.payload || {};
      if (body.type === 'navigation_command') {
        const navPayload = payload as Partial<NavigationCommandPayload>;
        if (!navPayload.action) return sendJson(res, 400, { error: 'Missing navigation action' });
      } else if (body.type === 'control_command') {
        const ctlPayload = payload as Partial<ControlCommandPayload>;
        if (!ctlPayload.action) return sendJson(res, 400, { error: 'Missing control action' });
      }
      const msg = { type: body.type, timestamp: Date.now(), source: 'remote', payload };
      ws?.send(JSON.stringify(msg));
      log('info', 'http.command.sent', { type: body.type });
      await waitForAck(DEFAULTS.ackTimeoutMs);
      return sendJson(res, 200, { ok: true });
    } catch (e: any) {
      log('error', 'http.command.error', { error: e.message });
      return sendJson(res, 500, { error: e.message });
    }
  }
  return sendJson(res, 404, { error: 'Not Found' });
});

server.listen(DEFAULTS.httpPort, () => {
  log('info', 'http.listen', { port: DEFAULTS.httpPort });
  connect();
});
