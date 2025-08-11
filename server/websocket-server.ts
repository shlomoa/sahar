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
  WEBSOCKET_CONFIG
} from '@shared/websocket/websocket-protocol.js';

/**
 * SAHAR Unified Server
 * Serves static files for TV and Remote apps and manages WebSocket communication
 */

// ESM-safe __dirname/__filename
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express application
const app = express();
const PORT = process.env.PORT || WEBSOCKET_CONFIG.SERVER_PORT || 8080;

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

// --- Message helpers ---
const makeAck = (source: 'server'): AckMessage => ({ type: 'ack', timestamp: Date.now(), source, payload: {} });
const makeStateSync = (source: 'server'): StateSyncMessage => ({ type: 'state_sync', timestamp: Date.now(), source, payload: applicationState });
const makeError = (source: 'server', code: string, message: string): ErrorMessage => ({ type: 'error', timestamp: Date.now(), source, payload: { code, message } });

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
  console.log('ℹ️  New client connected');

  ws.on('message', (data: RawData) => {
    try {
      const text = typeof data === 'string' ? data : data.toString();
      const msg: WebSocketMessage = JSON.parse(text);
      console.log('➡️  Received message:', msg);

      // Enforce registration first
      const isRegistered = clients.has(ws);
      if (!isRegistered) {
        if (msg.type !== 'register') {
          ws.send(JSON.stringify(makeError('server', 'INVALID_REGISTRATION', 'First message must be a register message.')));
          ws.close();
          return;
        }
        // Handle register
        const reg = msg as RegisterMessage;
        const { clientType, deviceId, deviceName } = reg.payload;

        // Enforce single TV and single Remote
        if (clientType === 'tv' && applicationState.connectedClients.tv) {
          ws.send(JSON.stringify(makeError('server', 'CLIENT_TYPE_MISMATCH', 'A TV client is already connected.')));
          ws.close();
          return;
        }
        if (clientType === 'remote' && applicationState.connectedClients.remote) {
          ws.send(JSON.stringify(makeError('server', 'CLIENT_TYPE_MISMATCH', 'A Remote client is already connected.')));
          ws.close();
          return;
        }

        clients.set(ws, { clientType, deviceId, deviceName });
        applicationState.connectedClients[clientType] = { deviceId, deviceName };

        // Update FSM readiness
        if (applicationState.connectedClients.remote && applicationState.connectedClients.tv) {
          applicationState.fsmState = 'ready';
        }

        // Ack and state
        ws.send(JSON.stringify(makeAck('server')));
        broadcastState();
        return;
      }

      // Handle registered clients' messages
      switch (msg.type) {
        case 'navigation_command': {
          const nav = msg as NavigationCommandMessage;
          handleNavigationCommand(nav);
          ws.send(JSON.stringify(makeAck('server')));
          broadcastState();
          break;
        }
        case 'control_command': {
          const ctl = msg as ControlCommandMessage;
          handleControlCommand(ctl);
          ws.send(JSON.stringify(makeAck('server')));
          broadcastState();
          break;
        }
        case 'action_confirmation': {
          const confirm = msg as ActionConfirmationMessage;
          handleActionConfirmation(confirm);
          ws.send(JSON.stringify(makeAck('server')));
          broadcastState();
          break;
        }
        case 'register': {
          // Already registered, ignore or error
          ws.send(JSON.stringify(makeError('server', 'INVALID_MESSAGE_FORMAT', 'Client already registered.')));
          break;
        }
        default: {
          ws.send(JSON.stringify(makeError('server', 'INVALID_MESSAGE_FORMAT', `Unsupported message type: ${msg.type}`)));
        }
      }
    } catch (error) {
      console.error('❌ Error: Failed to parse/handle message.', error);
      ws.send(JSON.stringify(makeError('server', 'INVALID_MESSAGE_FORMAT', 'Invalid JSON or message.')));
    }
  });

  ws.on('close', () => {
    console.log('ℹ️  Client disconnected');
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
    console.error('❌ WebSocket error:', error);
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

// Basic health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start the server
server.listen(PORT, () => {
  console.log(`✅ SAHAR Unified Server running on http://localhost:${PORT}`);
  console.log('📊 Server Status:');
  console.log('  ✅ Express app initialized');
  console.log('  ✅ HTTP server listening');
  console.log('  ✅ TV app served at /tv');
  console.log('  ✅ Remote app served at /remote');
  console.log('  ✅ WebSocket server attached');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down SAHAR Unified Server...');
  server.close(() => {
    console.log('✅ Server shut down gracefully');
    process.exit(0);
  });
});

export { app, server };
