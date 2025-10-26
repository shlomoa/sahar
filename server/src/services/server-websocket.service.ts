import { WebSocketServer, WebSocket, RawData } from 'ws';
import {
  createLogger,
  WebSocketMessage,
  RegisterMessage,
  NavigationCommandMessage,
  ControlCommandMessage,
  ActionConfirmationMessage,
  StateSyncMessage,
  AckMessage,
  ErrorMessage,
  ControlCommandPayload,
  WEBSOCKET_CONFIG,
  ERROR_CODES,
  NAVIGATION_ACTION_SET,
  CONTROL_ACTION_SET,
  ClientType
} from 'shared';
import { Fsm } from '../fsm';

const logger = createLogger({ component: 'server-websocket' });
const logInfo = (event: string, meta?: any, msg?: string) => logger.info(event, meta, msg);
const logWarn = (event: string, meta?: any, msg?: string) => logger.warn(event, meta, msg);
const logError = (event: string, meta?: any, msg?: string) => logger.error(event, meta, msg);

export interface ClientMetadata {
  clientType: ClientType;
  deviceId: string;
  lastHeartbeat?: number;
}

/**
 * ServerWebSocketService
 * 
 * Mirrors WebSocketBaseService structure (internal BKM) but for server-side.
 * Does NOT inherit from WebSocketBaseService (different responsibilities).
 * 
 * Handles:
 * - Connection lifecycle (accept, track, disconnect)
 * - Message routing (receive from clients, dispatch to handlers)
 * - State broadcasting (send to all connected clients with strict ACK discipline)
 * - Protocol enforcement (registration, validation, error handling)
 * 
 * ACK Policy: "Perform or Exit"
 * - All clients MUST acknowledge state_sync broadcasts within timeout period
 * - Clients that fail to ACK are forcibly disconnected (WebSocket close code 1008: Policy Violation)
 * - No retry attempts, no graceful degradation
 * - Disconnected clients must reconnect and re-register to resume participation
 * 
 * Broadcast Queue:
 * - ACK-gated: waits for all clients to ACK before sending next broadcast
 * - Pending mechanism: collapses intermediate state changes during in-flight broadcast
 * - Version tracking: ensures clients converge to latest authoritative state
 */
export class ServerWebSocketService {
  // Broadcast state tracking (ACK-gated queue)
  private currentBroadcastVersion: number | null = null;
  private lastBroadcastVersion = -1;
  private pendingBroadcastVersion: number | null = null;
  private outstandingAckClients: Set<WebSocket> | null = null;
  private broadcastAckTimer: NodeJS.Timeout | null = null;

  constructor(
    private wss: WebSocketServer,
    private fsm: Fsm,
    private clients: Map<WebSocket, ClientMetadata>
  ) {    
  }

  public initialize(): void {
    this.setupConnectionHandling();
  }

  // --- Connection Management ---

  private setupConnectionHandling(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      this.handleNewConnection(ws);
    });
  }

  private handleNewConnection(ws: WebSocket): void {
    logInfo('client_connected');

    ws.on('message', (data: RawData) => {
      this.handleMessage(ws, data);
    });

    ws.on('close', () => {
      this.handleDisconnect(ws);
    });

    ws.on('error', (error: Error) => {
      logError('websocket_error', { error: error.message });
    });
  }

  private handleDisconnect(ws: WebSocket): void {
    logInfo('client_disconnected');
    const info = this.clients.get(ws);
    if (info) {
      this.clients.delete(ws);
      // Treat disconnect as implicit ACK if waiting
      if (this.currentBroadcastVersion !== null && this.outstandingAckClients && this.outstandingAckClients.has(ws)) {
        this.outstandingAckClients.delete(ws);
        if (this.outstandingAckClients.size === 0) {
          this.lastBroadcastVersion = this.currentBroadcastVersion;
          logInfo('state_broadcast_complete_client_disconnect', { version: this.currentBroadcastVersion });
          this.currentBroadcastVersion = null;
          this.outstandingAckClients = null;
          // Clear ACK timeout timer since broadcast completed (client loss accounted for)
          if (this.broadcastAckTimer) {
            clearTimeout(this.broadcastAckTimer);
            this.broadcastAckTimer = null;
          }
          this.flushPending();
        }
      }
      this.fsm.deregisterClient(info.clientType);
      this.broadcastStateIfChanged();
    }
  }

  // --- Message Routing ---

  private handleMessage(ws: WebSocket, data: RawData): void {
    const isRegistered = this.clients.has(ws);
    let parsed: any;
    const rawText = typeof data === 'string' ? data : data.toString();
    
    try {
      parsed = JSON.parse(rawText);
    } catch (e) {
      this.sendError(ws, ERROR_CODES.INVALID_MESSAGE_FORMAT, 'Invalid JSON', { 
        close: !isRegistered, 
        meta: { preRegistered: !isRegistered, rawMessage: rawText.slice(0, 2000) } 
      });
      return;
    }

    const v = this.validateMessage(parsed, isRegistered);
    if (!v.ok) {
      const incomingType = parsed && typeof (parsed as any).msgType === 'string' ? (parsed as any).msgType : null;
      const rawTextTrunc = rawText.slice(0, 2000);
      this.sendError(ws, v.code, v.reason, { 
        close: !!v.close, 
        meta: { preRegistered: !isRegistered, incomingMsgType: incomingType, rawMessage: rawTextTrunc } 
      });
      return;
    }

    const msg = v.msg;
    logInfo('message_received', { msgType: msg.msgType });

    // Handle registration separately (before registered check)
    if (!isRegistered && msg.msgType === 'register') {
      this.handleRegister(ws, msg as RegisterMessage);
      return;
    }

    // Dispatch registered client messages
    switch (msg.msgType) {
      case 'navigation_command':
        this.handleNavigationCommand(ws, msg as NavigationCommandMessage);
        break;
      case 'control_command':
        this.handleControlCommand(ws, msg as ControlCommandMessage);
        break;
      case 'action_confirmation':
        this.handleActionConfirmation(ws, msg as ActionConfirmationMessage);
        break;
      case 'ack':
        this.handleAck(ws, msg as AckMessage);
        break;
      case 'heartbeat':
        this.handleHeartbeat(ws);
        break;
      case 'register':
        this.sendError(ws, ERROR_CODES.INVALID_MESSAGE_FORMAT, 'Duplicate register attempt');
        break;
      default:
        this.sendError(ws, ERROR_CODES.INVALID_MESSAGE_FORMAT, 'Unhandled type after validation');
    }
  }

  // --- Protocol Handlers ---

  private handleRegister(ws: WebSocket, reg: RegisterMessage): void {
    const { clientType, deviceId } = reg.payload;
    
    // Enforce single TV / Remote uniqueness
    const snapshot = this.fsm.getSnapshot();
    if (clientType === 'tv' && snapshot.clientsConnectionState.tv === 'connected') {
      this.sendError(ws, ERROR_CODES.CLIENT_TYPE_MISMATCH, 'A TV client is already connected.', { 
        close: true, 
        meta: { attempted: 'tv' } 
      });
      return;
    }
    if (clientType === 'remote' && snapshot.clientsConnectionState.remote === 'connected') {
      this.sendError(ws, ERROR_CODES.CLIENT_TYPE_MISMATCH, 'A Remote client is already connected.', { 
        close: true, 
        meta: { attempted: 'remote' } 
      });
      return;
    }

    this.clients.set(ws, { 
      clientType, 
      deviceId
    });
    this.fsm.registerClient(clientType, deviceId);

    // Ack the registration and send an immediate authoritative state_sync
    ws.send(JSON.stringify(this.makeAck('server')));
    try {
      ws.send(JSON.stringify(this.makeStateSync('server')));
      logInfo('state_sync_sent_direct', { to: deviceId, clientType });
    } catch (e) {
      logWarn('state_sync_direct_failed', { to: deviceId, clientType, error: String(e) });
    }

    // Continue with the regular broadcast pipeline for all clients
    this.broadcastStateIfChanged();
    logInfo('client_registered', { clientType, deviceId });
  }

  private handleNavigationCommand(ws: WebSocket, nav: NavigationCommandMessage): void {
    logInfo('navigation_command_received', { from: this.clients.get(ws)?.deviceId, payload: nav.payload });
    
    try {
      // Only Remote clients should issue navigation commands
      const meta = this.clients.get(ws);
      if (!meta || meta.clientType !== 'remote') {
        logWarn('navigation_command_from_non_remote', { from: meta?.deviceId, clientType: meta?.clientType });
        this.sendError(ws, ERROR_CODES.CLIENT_TYPE_MISMATCH, 'Only remote may send navigation_command');
        return;
      }

      const before = this.fsm.getSnapshot();
      logInfo('fsm_before_navigation', { version: before.version, navigation: before.navigation });

      // Validate target existence for authoritative navigation commands
      const action = nav.payload.action;
      const targetId = nav.payload.targetId;
      
      // Phase 3: Get catalog from FSM's getCatalogData(), not from state
      const catalogData = this.fsm.getCatalogData();
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
          validTarget = true;
      }

      if (!validTarget) {
        logWarn('navigation_command_invalid_target', { action, targetId });
        this.sendError(ws, ERROR_CODES.INVALID_COMMAND, `Unknown or missing targetId for action ${action}`);
        return;
      }

      this.fsm.navigationCommand(nav.payload.action, nav.payload.targetId);
      const after = this.fsm.getSnapshot();
      logInfo('fsm_after_navigation', { version: after.version, navigation: after.navigation });
      ws.send(JSON.stringify(this.makeAck('server')));
      this.broadcastStateIfChanged();
      logInfo('navigation_command_handled', { 
        action: nav.payload.action, 
        targetId: nav.payload.targetId, 
        newVersion: after.version 
      });
    } catch (e: any) {
      logError('navigation_command_error', { error: e?.message || String(e), stack: e?.stack });
      ws.send(JSON.stringify(this.makeError('server', ERROR_CODES.INVALID_MESSAGE_FORMAT, 'navigation_command_failed')));
    }
  }

  private handleControlCommand(ws: WebSocket, ctl: ControlCommandMessage): void {
    // Verify sender is Remote client
    const senderMeta = this.clients.get(ws);
    if (!senderMeta || senderMeta.clientType !== 'remote') {
      this.sendError(ws, ERROR_CODES.CLIENT_TYPE_MISMATCH, 'Only remote may send control_command');
      logError('control_command_from_non_remote', { from: senderMeta?.deviceId, clientType: senderMeta?.clientType });
      throw new Error('Only remote may send control_command');
    }
    
    // Find TV client to forward the command
    const tvClient = this.findTvClient();
    
    if (!tvClient) {
      logError('control_command_no_tv', {          
        from: senderMeta.deviceId,
        tvConnectionState: this.fsm.getSnapshot().clientsConnectionState.tv
      });
      this.sendError(ws, ERROR_CODES.INVALID_COMMAND, 'TV client not connected - cannot execute control command');
      return;
    }
    
    // Ack the Remote client
    ws.send(JSON.stringify(this.makeAck('server')));
    
    // Forward the control command to TV
    tvClient.send(JSON.stringify(this.makeControlCommand('server', ctl.payload)));
    logInfo('control_command_forwarded_to_tv', {       
      from: senderMeta.deviceId,
      to: this.clients.get(tvClient)?.deviceId
    });
  }

  private handleActionConfirmation(ws: WebSocket, confirm: ActionConfirmationMessage): void {
    this.fsm.actionConfirmation(confirm.payload.status, confirm.payload.errorMessage);
    ws.send(JSON.stringify(this.makeAck('server')));
    this.broadcastStateIfChanged();
    logInfo('action_confirmation_received', { status: confirm.payload.status });
  }

  private handleAck(ws: WebSocket, _ackMsg: AckMessage): void {
    try {
      if (this.currentBroadcastVersion !== null && this.outstandingAckClients && this.outstandingAckClients.has(ws)) {
        this.outstandingAckClients.delete(ws);
        logInfo('state_broadcast_ack_progress', { 
          version: this.currentBroadcastVersion, 
          remaining: this.outstandingAckClients.size 
        });
        
        if (this.outstandingAckClients.size === 0) {
          this.lastBroadcastVersion = this.currentBroadcastVersion;
          logInfo('state_broadcast_complete', { version: this.currentBroadcastVersion });
          this.currentBroadcastVersion = null;
          this.outstandingAckClients = null;
          if (this.broadcastAckTimer) {
            clearTimeout(this.broadcastAckTimer);
            this.broadcastAckTimer = null;
          }
          this.flushPending();
        }
      }
    } catch (e) {
      logError('ack_handling_error', { error: String(e) });
    }
  }

  private handleHeartbeat(ws: WebSocket): void {
    const meta = this.clients.get(ws);
    if (meta) meta.lastHeartbeat = Date.now();
    ws.send(JSON.stringify(this.makeAck('server')));
    logInfo('heartbeat_received', { from: meta?.clientType, deviceId: meta?.deviceId });
  }

  // --- Helper Methods ---

  private sendError(ws: WebSocket, code: string, message: string, opts: { close?: boolean; meta?: any } = {}): void {
    logError('invalid_message', { code, message, ...(opts.meta || {}) });
    ws.send(JSON.stringify(this.makeError('server', code, message)));
    if (opts.close) {
      try {
        ws.close();
      } catch {
        logError('Failed to close ws');
      }
    }
  }

  private findTvClient(): WebSocket | null {
    for (const [socket, meta] of this.clients.entries()) {
      if (meta.clientType === 'tv' && socket.readyState === WebSocket.OPEN) {
        return socket;
      }
    }
    return null;
  }

  // --- Message Factories ---

  private makeAck(source: 'server'): AckMessage {
    return { msgType: 'ack', timestamp: Date.now(), source, payload: { msgType: 'ack' } };
  }

  private makeStateSync(source: 'server'): StateSyncMessage {
    return { 
      msgType: 'state_sync', 
      timestamp: Date.now(), 
      source, 
      payload: { msgType: 'ack', ...this.fsm.getSnapshot() } 
    };
  }

  private makeControlCommand(source: 'server', payload: ControlCommandPayload): ControlCommandMessage {
    return { msgType: 'control_command', timestamp: Date.now(), source, payload };
  }

  private makeError(source: 'server', code: string, message: string): ErrorMessage {
    return { 
      msgType: 'error', 
      timestamp: Date.now(), 
      source, 
      payload: { msgType: 'error', code, message } 
    };
  }

  // --- Broadcast Logic (ACK-gated queue) ---

  private broadcastStateIfChanged(): void {
    logInfo('broadcast_state_if_changed');
    const snap = this.fsm.getSnapshot();
    const v = snap.version;

    if (v === this.lastBroadcastVersion) {
      logInfo('state_broadcast_skipped', { version: v, reason: 'version_unchanged' });
      return;
    }
    
    if (this.currentBroadcastVersion !== null) {
      // A broadcast in flight – queue newest version (collapse older pending)
      if (!this.pendingBroadcastVersion || v > this.pendingBroadcastVersion) {
        this.pendingBroadcastVersion = v;
        logInfo('state_broadcast_deferred', { version: v, current: this.currentBroadcastVersion });
      }
      return;
    }
    
    this.performBroadcast(v);
  }

  private performBroadcast(version: number): void {
    logInfo('perform_broadcast', { version });
    const stateMsg = JSON.stringify(this.makeStateSync('server'));
    this.outstandingAckClients = new Set();
    let sent = 0;
    
    for (const client of this.wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(stateMsg);
        this.outstandingAckClients.add(client);
        sent++;
      }
    }
    
    this.currentBroadcastVersion = version;
    logInfo('state_broadcast', { version, clients: sent });
    
    // Clear any previous ACK timer
    if (this.broadcastAckTimer) {
      clearTimeout(this.broadcastAckTimer);
      this.broadcastAckTimer = null;
    }
    
    // Start ACK timeout enforcement: "Perform or Exit" policy
    // Clients MUST ACK within WEBSOCKET_CONFIG.ACK_TIMEOUT or face forced disconnect (1008)
    if (sent > 0) {
      this.broadcastAckTimer = setTimeout(() => {
        try {
          const stuckSockets = this.outstandingAckClients ? [...this.outstandingAckClients] : [];
          const stuckDevices = stuckSockets.map(c => {
            const meta = this.clients.get(c);
            return meta ? `${meta.clientType}:${meta.deviceId}` : '(unknown)';
          });
          
          // Critical error: ACK policy violation
          logError('state_broadcast_ack_timeout_policy_violation', { 
            version: this.currentBroadcastVersion, 
            stuckClients: stuckDevices,
            count: stuckSockets.length,
            timeoutMs: WEBSOCKET_CONFIG.ACK_TIMEOUT
          }, 'CRITICAL: Clients failed to ACK within timeout - forcing disconnect per "Perform or Exit" policy');

          // Force disconnect all unresponsive clients (Policy Violation)
          for (const stuckSocket of stuckSockets) {
            const meta = this.clients.get(stuckSocket);
            if (meta) {
              logError('force_disconnect_ack_timeout', { 
                deviceId: meta.deviceId, 
                clientType: meta.clientType,
                version: this.currentBroadcastVersion,
                policy: 'Clients MUST ACK state_sync broadcasts within timeout period'
              });
            }
            try {
              stuckSocket.close(1008, 'Policy Violation: Failed to ACK state_sync within timeout');
            } catch (e) {
              logError('force_disconnect_failed', { deviceId: meta?.deviceId, error: String(e) });
            }
          }

          // Broadcast marked complete - handleDisconnect will clean up remaining state
          // Note: We don't manually update state here because the disconnect events will trigger cleanup
        } finally {
          if (this.broadcastAckTimer) {
            clearTimeout(this.broadcastAckTimer);
            this.broadcastAckTimer = null;
          }
        }
      }, WEBSOCKET_CONFIG.ACK_TIMEOUT);
    } else {
      this.lastBroadcastVersion = version;
      this.currentBroadcastVersion = null;
      this.outstandingAckClients = null;
      this.flushPending();
    }
  }

  private flushPending(): void {
    if (this.currentBroadcastVersion !== null) {
      logInfo('flush_pending', {}, 'Current broadcast in flight, cannot flush yet');
      return;
    }
    
    if (this.pendingBroadcastVersion && this.pendingBroadcastVersion > this.lastBroadcastVersion) {
      logInfo('flush_pending', { 
        pending: this.pendingBroadcastVersion, 
        last: this.lastBroadcastVersion 
      }, 'Flushing pending broadcast');
      const snap = this.fsm.getSnapshot();
      const latest = snap.version;
      this.pendingBroadcastVersion = null;
      if (latest > this.lastBroadcastVersion) this.performBroadcast(latest);
    }
  }

  // --- Validation ---

  private validateMessage(raw: any, isRegistered: boolean): 
    { ok: true; msg: WebSocketMessage } | 
    { ok: false; code: string; reason: string; close?: boolean } 
  {
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

    // Helpers
    const asString = (v: any, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : undefined);
    const asNumber = (v: any) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
    const asBoolean = (v: any) => (typeof v === 'boolean' ? v : undefined);
    const isPlainObject = (v: any) => !!v && typeof v === 'object' && !Array.isArray(v);

    // Generic deep sanitizer (Phase 3: data messages deprecated, kept for compatibility)
    const sanitizeAny = (obj: any, depth = 0): any => {
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
          if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
          out[k] = sanitizeAny(obj[k], depth + 1);
        }
        return out;
      }
      logWarn('sanitizeAny: unsupported type', { type: typeof obj });
      return undefined;
    };

    const base: any = { msgType };
    if (typeof (raw as any).timestamp === 'number' && Number.isFinite((raw as any).timestamp)) {
      base.timestamp = (raw as any).timestamp;
    }

    // Registration must be first for unregistered clients
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

    // For registered clients, validate known types
    switch (msgType) {
      case 'register':
        logError('invalid_message', { code: ERROR_CODES.INVALID_MESSAGE_FORMAT, reason: 'Duplicate register' });
        return { ok: false, code: ERROR_CODES.INVALID_MESSAGE_FORMAT, reason: 'Duplicate register' };

      case 'data': {
        const payload = (raw as any).payload;
        if (!isPlainObject(payload)) {
          return { ok: false, code: ERROR_CODES.INVALID_MESSAGE_FORMAT, reason: 'Invalid data payload' };
        }
        base.payload = sanitizeAny(payload);
        return { ok: true, msg: base as WebSocketMessage };
      }

      case 'navigation_command': {
        const payload = (raw as any).payload;
        if (!isPlainObject(payload)) {
          return { ok: false, code: ERROR_CODES.INVALID_MESSAGE_FORMAT, reason: 'Invalid navigation payload' };
        }
        const action = asString(payload.action, 100);
        if (!action || !NAVIGATION_ACTION_SET.has(action as any)) {
          return { ok: false, code: ERROR_CODES.INVALID_COMMAND, reason: 'Invalid navigation action' };
        }
        const targetId = payload.targetId !== undefined ? asString(payload.targetId, 200) : undefined;
        base.payload = { action, targetId };
        return { ok: true, msg: base as WebSocketMessage };
      }

      case 'control_command': {
        const payload = (raw as any).payload;
        if (!isPlainObject(payload)) {
          return { ok: false, code: ERROR_CODES.INVALID_MESSAGE_FORMAT, reason: 'Invalid control payload' };
        }
        const action = asString(payload.action, 100);
        if (!action || !CONTROL_ACTION_SET.has(action as any)) {
          return { ok: false, code: ERROR_CODES.INVALID_COMMAND, reason: 'Invalid control action' };
        }
        const sanitized: any = { action };
        if (payload.seekTime !== undefined) sanitized.seekTime = asNumber(payload.seekTime);
        if (payload.volumeLevel !== undefined) sanitized.volumeLevel = asNumber(payload.volumeLevel);
        if (payload.isMuted !== undefined) sanitized.isMuted = asBoolean(payload.isMuted);
        if (payload.isFullscreen !== undefined) sanitized.isFullscreen = asBoolean(payload.isFullscreen);
        base.payload = sanitized;
        return { ok: true, msg: base as WebSocketMessage };
      }

      case 'action_confirmation': {
        const payload = (raw as any).payload;
        if (!isPlainObject(payload)) {
          return { ok: false, code: ERROR_CODES.INVALID_MESSAGE_FORMAT, reason: 'Invalid confirmation payload' };
        }
        const status = asString(payload.status, 100);
        if (status !== 'success' && status !== 'failure') {
          return { ok: false, code: ERROR_CODES.INVALID_MESSAGE_FORMAT, reason: 'Invalid status' };
        }
        const errorMessage = payload.errorMessage ? asString(payload.errorMessage, 500) : undefined;
        base.payload = { status, errorMessage };
        return { ok: true, msg: base as WebSocketMessage };
      }

      case 'ack': {
        const payload = (raw as any).payload;
        base.payload = isPlainObject(payload) ? sanitizeAny(payload) : {};
        return { ok: true, msg: base as WebSocketMessage };
      }

      case 'heartbeat': {
        base.payload = {};
        return { ok: true, msg: base as WebSocketMessage };
      }

      case 'state_sync':
        logError('invalid_message', { code: ERROR_CODES.INVALID_MESSAGE_FORMAT, reason: 'Client cannot send server-only type: state_sync', close: true });
        return { ok: false, code: ERROR_CODES.INVALID_MESSAGE_FORMAT, reason: 'Client cannot send server-only type: state_sync', close: true };

      case 'error':
        logError('invalid_message', { code: ERROR_CODES.INVALID_MESSAGE_FORMAT, reason: 'Client cannot send server-only type: error' });
        return { ok: false, code: ERROR_CODES.INVALID_MESSAGE_FORMAT, reason: 'Client cannot send server-only type: error' };

      default:
        logError('invalid_message', { code: ERROR_CODES.INVALID_MESSAGE_FORMAT, reason: 'Unsupported message type' });
        return { ok: false, code: ERROR_CODES.INVALID_MESSAGE_FORMAT, reason: 'Unsupported message type' };
    }
  }
}
