import test, { before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import http from 'http';
import { getBestHostIP, server } from '../websocket-server.js';
import { WEBSOCKET_CONFIG } from '@shared/websocket/websocket-protocol.js';

let selectedIp: string;

before(() => {
  selectedIp = getBestHostIP();
});

test('getBestHostIP returns a non-empty string', () => {
  assert.ok(typeof selectedIp === 'string', 'IP should be a string');
  assert.ok(selectedIp.length > 0, 'IP should not be empty');
});

test('getBestHostIP caching returns same value consecutively', () => {
  const second = getBestHostIP();
  assert.equal(selectedIp, second, 'Cached IP should match first call (within TTL window)');
});

test('GET /host-ip returns JSON with ip and port', async () => {
  const body = await new Promise<string>((resolve, reject) => {
    http.get({ hostname: 'localhost', port: WEBSOCKET_CONFIG.SERVER_PORT, path: '/host-ip' }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
  let parsed: any;
  assert.doesNotThrow(() => { parsed = JSON.parse(body); }, 'Response should be valid JSON');
  assert.ok(parsed && typeof parsed === 'object', 'Parsed body should be an object');
  assert.ok(typeof parsed.ip === 'string' && parsed.ip.length > 0, 'ip field should be a non-empty string');
  assert.equal(parsed.port, WEBSOCKET_CONFIG.SERVER_PORT, 'port field should match server port');
});

after(async () => {
  await new Promise<void>((resolve) => {
    try {
      server.close(() => resolve());
    } catch {
      resolve();
    }
  });
});
