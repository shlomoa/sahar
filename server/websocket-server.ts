import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import {
    ApplicationState,
    ClientType,
    SaharMessage,
    createAckMessage,
    createErrorMessage,
    createStateSyncMessage
} from '../shared/websocket/websocket-protocol';

/**
 * SAHAR Unified Server
 * Serves static files for TV and Remote apps and manages WebSocket communication
 */

// Create Express application
const app = express();
const PORT = process.env.PORT || 8080;

// Create HTTP server from the express app
const server = createServer(app);

// Create and attach WebSocket server
const wss = new WebSocketServer({ server });

// --- Finite State Machine (FSM) ---

// The single source of truth for the application state
let applicationState: ApplicationState = {
    tv_client_online: false,
    remote_client_online: false,
    active_video_id: null,
    video_player_state: 'stopped',
    current_view: 'videos_grid',
};

// Map to store client connections and their types
const clients = new Map<WebSocket, ClientType>();

/**
 * Broadcasts the current application state to all connected clients.
 */
const broadcastState = () => {
    const stateSyncMessage = createStateSyncMessage(applicationState);
    const messageString = JSON.stringify(stateSyncMessage);
    
    if (clients.size > 0) {
        console.log(`ℹ️  Broadcasting state to ${clients.size} client(s):`, applicationState);
        clients.forEach((_clientType, client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(messageString);
            }
        });
    }
};

wss.on('connection', (ws: WebSocket) => {
    console.log('ℹ️  New client connected');

    ws.on('message', (message: string) => {
        try {
            const parsedMessage: SaharMessage = JSON.parse(message);
            console.log('➡️  Received message:', parsedMessage);

            // The first message from any client MUST be 'register'
            if (!clients.has(ws)) {
                if (parsedMessage.message_type === 'register') {
                    const clientType = parsedMessage.payload.client_type;
                    clients.set(ws, clientType);

                    // Update application state based on which client registered
                    if (clientType === 'tv') {
                        applicationState.tv_client_online = true;
                    } else if (clientType === 'remote') {
                        applicationState.remote_client_online = true;
                    }
                    
                    console.log(`✅ Client registered as '${clientType}'`);
                    
                    // Acknowledge the registration
                    ws.send(JSON.stringify(createAckMessage(parsedMessage.message_id)));

                    // Broadcast the new state to all clients
                    broadcastState();
                } else {
                    // If the first message is not 'register', it's a protocol violation.
                    console.error('❌ Error: First message from client was not "register". Closing connection.');
                    ws.send(JSON.stringify(createErrorMessage('Protocol violation: First message must be a "register" message.')));
                    ws.terminate();
                }
                return; // End processing for this message
            }

            // --- Handle other message types for already registered clients ---
            // (This will be implemented in subsequent steps)
            // For now, just acknowledge any other message
            if ('message_id' in parsedMessage) {
                ws.send(JSON.stringify(createAckMessage(parsedMessage.message_id)));
            }

        } catch (error) {
            console.error('❌ Error: Failed to parse message or handle client logic.', error);
            ws.send(JSON.stringify(createErrorMessage('Invalid message format or server error.')));
        }
    });

    ws.on('close', () => {
        console.log('ℹ️  Client disconnected');
        if (clients.has(ws)) {
            const clientType = clients.get(ws);
            clients.delete(ws);

            // Update application state
            if (clientType === 'tv') {
                applicationState.tv_client_online = false;
            } else if (clientType === 'remote') {
                applicationState.remote_client_online = false;
            }
            
            console.log(`🔌 Client '${clientType}' unregistered.`);
            // Broadcast the state change to remaining clients
            broadcastState();
        }
    });

    ws.on('error', (error: Error) => {
        console.error('❌ WebSocket error:', error);
    });
});


// Middleware for parsing JSON and serving static files
app.use(express.json());
app.use(express.static('public'));

// Define path to the TV app build.
// The path is relative to the output directory (`dist/server`).
const tvAppPath = path.join(__dirname, '../../apps/tv/dist/sahar-tv');
const remoteAppPath = path.join(__dirname, '../../apps/remote/dist/sahar-remote');

// Serve the TV app, with a catch-all to redirect to index.html for Angular routing.
app.use('/tv', express.static(tvAppPath));
app.get('/tv/*', (req: Request, res: Response) => {
    res.sendFile(path.join(tvAppPath, 'index.html'));
});

// Serve the Remote app, with a catch-all to redirect to index.html for Angular routing.
app.use('/remote', express.static(remoteAppPath));
app.get('/remote/*', (req: Request, res: Response) => {
    res.sendFile(path.join(remoteAppPath, 'index.html'));
});

// Basic health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`✅ SAHAR Unified Server running on http://localhost:${PORT}`);
  console.log('📊 Server Status:');
  console.log('  ✅ Express app initialized');
  console.log('  ✅ HTTP server listening');
  console.log('  ✅ TV app being served from /tv');
  console.log('  ✅ Remote app being served from /remote');
  console.log('  ✅ WebSocket server attached');
  console.log('\n🚀 Next Steps:');
  console.log('  1. Implement FSM and message handling (Task 1.8)');
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
