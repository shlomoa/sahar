import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';

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

wss.on('connection', (ws) => {
    console.log('ℹ️  New client connected');

    ws.on('message', (message) => {
        console.log('received: %s', message);
        // This is a simple broadcast for now. It will be replaced by the FSM.
        wss.clients.forEach(client => {
            if (client !== ws && client.readyState === ws.OPEN) {
                client.send(message);
            }
        });
    });

    ws.on('close', () => {
        console.log('ℹ️  Client disconnected');
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
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
app.get('/tv/*', (req, res) => {
    res.sendFile(path.join(tvAppPath, 'index.html'));
});

// Serve the Remote app, with a catch-all to redirect to index.html for Angular routing.
app.use('/remote', express.static(remoteAppPath));
app.get('/remote/*', (req, res) => {
    res.sendFile(path.join(remoteAppPath, 'index.html'));
});

// Basic health check endpoint
app.get('/health', (req, res) => {
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
