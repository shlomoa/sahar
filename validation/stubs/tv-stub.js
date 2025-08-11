#!/usr/bin/env node

/**
 * TV Stub
 * - Registers as tv, acks all state_sync
 * - Exposes HTTP: /health, /state, /logs, /reset
 * - Reconnects with backoff
 */

const http = require('http');
const url = require('url');
const WebSocket = require('ws');

const DEFAULTS = {
  serverUrl: process.env.SERVER_URL || 'ws://localhost:3000/ws',
  httpPort: parseInt(process.env.HTTP_PORT || '4301', 10),
  clientId: process.env.CLIENT_ID || 'tv-stub-1',
  ackTimeoutMs: parseInt(process.env.ACK_TIMEOUT_MS || '3000', 10),
  backoffBaseMs: parseInt(process.env.RECONNECT_BASE_MS || '500', 10),
  backoffMaxMs: parseInt(process.env.RECONNECT_MAX_MS || '5000', 10),
  backoffJitterMs: parseInt(process.env.RECONNECT_JITTER_MS || '100', 10),
};

let state = {
  connected: false,
  lastStateSync: null,
  lastAckAt: null,
  wsReady: false,
};

const logBuffer = [];
function log(level, event, detail) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    event,
    source: 'stub',
    client_type: 'tv',
    client_id: DEFAULTS.clientId,
    detail: detail || {},
  };
  logBuffer.push(entry);
  if (logBuffer.length > 500) logBuffer.shift();
  const line = `[${entry.ts}] ${level.toUpperCase()} ${event} ${JSON.stringify(entry.detail)}\n`;
  process.stdout.write(line);
}

let ws;
let reconnectAttempts = 0;

function connect() {
  log('info', 'ws.connect.start', { url: DEFAULTS.serverUrl });
  ws = new WebSocket(DEFAULTS.serverUrl);

  ws.on('open', () => {
    state.connected = true;
    state.wsReady = true;
    reconnectAttempts = 0;
    log('info', 'ws.open', {});
    const register = {
      type: 'register',
      timestamp: Date.now(),
      source: 'tv',
  payload: { clientType: 'tv', deviceId: DEFAULTS.clientId, deviceName: process.env.DEVICE_NAME || 'TV Stub' },
    };
    ws.send(JSON.stringify(register));
  });

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'ack') {
        state.lastAckAt = Date.now();
        log('info', 'ws.ack', { from: msg.source });
        return;
      }
      if (msg.type === 'state_sync') {
        state.lastStateSync = { payload: msg.payload, ts: Date.now() };
        log('info', 'ws.state_sync', { version: msg.payload?.version });
        const ack = { type: 'ack', timestamp: Date.now(), source: 'tv', payload: { ack: msg.type } };
        ws.send(JSON.stringify(ack));
        return;
      }
      // ignore other types but log
      log('debug', 'ws.message', { type: msg.type });
    } catch (e) {
      log('error', 'ws.message.parse_error', { error: e.message });
    }
  });

  ws.on('close', (code, reason) => {
    state.connected = false;
    state.wsReady = false;
    log('warn', 'ws.close', { code, reason: reason?.toString() });
    scheduleReconnect();
  });

  ws.on('error', (err) => {
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

// HTTP control server
const server = http.createServer((req, res) => {
  const { pathname } = url.parse(req.url, true);
  if (req.method === 'GET' && pathname === '/health') {
    const body = { status: 'ok', connected: state.connected, wsReady: state.wsReady };
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(body));
  }
  if (req.method === 'GET' && pathname === '/state') {
    const body = { lastStateSync: state.lastStateSync };
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(body));
  }
  if (req.method === 'GET' && pathname === '/logs') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(logBuffer));
  }
  if (req.method === 'POST' && pathname === '/reset') {
    let buffer = '';
    req.on('data', (c) => (buffer += c));
    req.on('end', () => {
      state.lastStateSync = null;
      state.lastAckAt = null;
      log('info', 'http.reset', {});
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    });
    return;
  }
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
});

server.listen(DEFAULTS.httpPort, () => {
  log('info', 'http.listen', { port: DEFAULTS.httpPort });
  connect();
});
