#!/usr/bin/env ts-node
/**
 * TV Stub (TypeScript)
 * - Registers as tv, acks all state_sync
 * - HTTP: /health /state /logs /reset
 */
import http, { IncomingMessage, ServerResponse } from 'http';
import WebSocket from 'ws';
import { createLogger } from 'shared';
import { WEBSOCKET_CONFIG } from 'shared';
import { VALIDATION_CONFIG, buildLocalServerUrl } from '../config/validation-config';

interface StubState {
  connected: boolean;
  lastStateSync: any | null;
  lastAckAt: number | null;
  wsReady: boolean;
}

const DEFAULTS = {
  serverUrl: buildLocalServerUrl(),
  httpPort: VALIDATION_CONFIG.STUB_PORTS.tv,
  clientId: 'tv-stub-1',
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
const logger = createLogger({ component: 'tv_stub', client_id: DEFAULTS.clientId }, { onRecord: (r) => {
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

function connect() {
  log('info', 'ws.connect.start', { url: DEFAULTS.serverUrl });
  ws = new WebSocket(DEFAULTS.serverUrl);

  ws.on('open', () => {
    state.connected = true;
    state.wsReady = true;
    reconnectAttempts = 0;
    log('info', 'ws.open');
    const register = {
      msgType: 'register' as const,
      timestamp: Date.now(),
      source: 'tv' as const,
      payload: { clientType: 'tv', deviceId: DEFAULTS.clientId, deviceName: process.env.DEVICE_NAME || 'TV Stub' },
    };
    ws?.send(JSON.stringify(register));
  });

  ws.on('message', (data: WebSocket.RawData) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.msgType === 'ack') {
        state.lastAckAt = Date.now();
        log('info', 'ws.ack', { from: msg.source });
        return;
      }
      if (msg.msgType === 'state_sync') {
        state.lastStateSync = { payload: msg.payload, ts: Date.now() };
        log('info', 'ws.state_sync');
        const ack = { msgType: 'ack', timestamp: Date.now(), source: 'tv', payload: { ack: msg.msgType } };
        ws?.send(JSON.stringify(ack));
        return;
      }
      log('info', 'ws.message', { msgType: msg.msgType });
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
  return sendJson(res, 404, { error: 'Not Found' });
});

server.listen(DEFAULTS.httpPort, () => {
  log('info', 'http.listen', { port: DEFAULTS.httpPort });
  connect();
});
