// Simple WebSocket Test Server for TV-Remote Communication
// Run with: node websocket-test-server.js

const WebSocket = require('ws');
const http = require('http');

const PORT = 8000;

// Create HTTP server for WebSocket upgrade
const server = http.createServer();

// Create WebSocket server
const wss = new WebSocket.Server({ 
  server,
  path: '/' 
});

console.log(`WebSocket Test Server starting on ws://localhost:${PORT}`);

// Track connected clients
const clients = new Map();

wss.on('connection', (ws, req) => {
  const clientId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const clientInfo = {
    id: clientId,
    ip: req.socket.remoteAddress,
    userAgent: req.headers['user-agent'],
    connectedAt: new Date(),
    deviceType: 'unknown',
    deviceName: 'Unknown Device'
  };

  clients.set(ws, clientInfo);
  
  console.log(`\n[${new Date().toISOString()}] New connection:`);
  console.log(`  Client ID: ${clientId}`);
  console.log(`  IP: ${clientInfo.ip}`);
  console.log(`  Total clients: ${clients.size}`);

  // Send welcome message
  const welcomeMessage = {
    type: 'status',
    timestamp: Date.now(),
    payload: {
      message: 'Connected to test server',
      clientId: clientId,
      serverInfo: {
        name: 'WebSocket Test Server',
        version: '1.0.0',
        capabilities: ['echo', 'broadcast', 'discovery']
      }
    }
  };

  ws.send(JSON.stringify(welcomeMessage));

  // Handle incoming messages
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      
      console.log(`\n[${new Date().toISOString()}] Message from ${clientInfo.deviceName || clientId}:`);
      console.log(`  Type: ${message.type}`);
      console.log(`  Data:`, JSON.stringify(message, null, 2));

      // Update client info if it's a discovery message
      if (message.type === 'discovery' && message.payload) {
        const payload = message.payload;
        clientInfo.deviceType = payload.deviceType || 'unknown';
        clientInfo.deviceName = payload.deviceName || 'Unknown Device';
        
        console.log(`  Updated client info: ${clientInfo.deviceType} - ${clientInfo.deviceName}`);
        
        // Send discovery response
        const discoveryResponse = {
          type: 'discovery',
          timestamp: Date.now(),
          payload: {
            deviceType: 'server',
            deviceId: 'test-server',
            deviceName: 'WebSocket Test Server',
            capabilities: ['echo', 'broadcast', 'navigation', 'control'],
            networkInfo: {
              ip: 'localhost',
              port: PORT
            }
          }
        };
        
        ws.send(JSON.stringify(discoveryResponse));
      }

      // Echo the message back to sender (for testing)
      const echoMessage = {
        type: 'echo',
        timestamp: Date.now(),
        payload: {
          originalMessage: message,
          echoedAt: new Date().toISOString(),
          clientId: clientId
        }
      };

      ws.send(JSON.stringify(echoMessage));

      // Broadcast to other clients (excluding sender)
      const broadcastMessage = {
        type: 'broadcast',
        timestamp: Date.now(),
        payload: {
          fromClient: clientId,
          fromDevice: clientInfo.deviceName,
          originalMessage: message
        }
      };

      clients.forEach((info, client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(broadcastMessage));
        }
      });

    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error parsing message:`, error);
      
      const errorMessage = {
        type: 'error',
        timestamp: Date.now(),
        payload: {
          error: 'Invalid JSON message',
          originalData: data.toString()
        }
      };
      
      ws.send(JSON.stringify(errorMessage));
    }
  });

  // Handle client disconnect
  ws.on('close', (code, reason) => {
    console.log(`\n[${new Date().toISOString()}] Client disconnected:`);
    console.log(`  Client ID: ${clientId}`);
    console.log(`  Device: ${clientInfo.deviceName}`);
    console.log(`  Code: ${code}`);
    console.log(`  Reason: ${reason || 'No reason provided'}`);
    console.log(`  Total clients: ${clients.size - 1}`);
    
    clients.delete(ws);
  });

  // Handle connection errors
  ws.on('error', (error) => {
    console.error(`[${new Date().toISOString()}] WebSocket error for ${clientId}:`, error);
    clients.delete(ws);
  });
});

// Handle server errors
server.on('error', (error) => {
  console.error('Server error:', error);
});

// Start the server
server.listen(PORT, () => {
  console.log(`✅ WebSocket Test Server running on ws://localhost:${PORT}`);
  console.log(`\nTest the connection with:`);
  console.log(`  - Browser: Open developer console and connect with WebSocket`);
  console.log(`  - TV App: Should auto-connect to localhost:8000`);
  console.log(`  - Remote App: Configure to connect to this server`);
  console.log(`\nServer capabilities:`);
  console.log(`  - Echo messages back to sender`);
  console.log(`  - Broadcast messages to all connected clients`);
  console.log(`  - Handle discovery protocol`);
  console.log(`  - Log all communication for debugging`);
  console.log(`\nPress Ctrl+C to stop the server\n`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down WebSocket Test Server...');
  
  // Close all client connections
  clients.forEach((info, ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.close(1000, 'Server shutting down');
    }
  });
  
  // Close the server
  server.close(() => {
    console.log('✅ Server shut down gracefully');
    process.exit(0);
  });
});

// Export for potential use as module
module.exports = { server, wss, clients };
