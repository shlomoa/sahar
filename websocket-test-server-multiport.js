// Enhanced WebSocket Test Server for TV-Remote Communication with Multi-Port Support
// Run with: node websocket-test-server-multiport.js

const WebSocket = require('ws');
const http = require('http');

// Port Configuration:
// - Ports 5544-5547: Primary discovery range (per user story requirements)  
// - Port 8000: Development fallback (for testing compatibility)
const PORTS = [8000, 5544, 5545, 5546, 5547]; // Development fallback + Specified range
const servers = new Map();
const wsServers = new Map();

// Track connected clients across all ports
const clients = new Map();

// Function to create server on a specific port
function createServerOnPort(port) {
  try {
    const server = http.createServer();
    
    const wss = new WebSocket.Server({ 
      server,
      path: '/' 
    });

    console.log(`🚀 WebSocket Server starting on ws://localhost:${port}`);

    wss.on('connection', (ws, req) => {
      const clientId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const clientInfo = {
        id: clientId,
        ip: req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        connectedAt: new Date(),
        deviceType: 'unknown',
        deviceName: 'Unknown Device',
        port: port
      };

      clients.set(ws, clientInfo);
      
      console.log(`\n[${new Date().toISOString()}] New connection on port ${port}:`);
      console.log(`  Client ID: ${clientId}`);
      console.log(`  IP: ${clientInfo.ip}`);
      console.log(`  Total clients: ${clients.size}`);

      // Send welcome message
      const welcomeMessage = {
        type: 'status',
        timestamp: Date.now(),
        payload: {
          message: `Connected to test server on port ${port}`,
          clientId: clientId,
          serverInfo: {
            name: 'WebSocket Test Server',
            version: '1.0.0',
            port: port,
            capabilities: ['echo', 'broadcast', 'discovery']
          }
        }
      };

      ws.send(JSON.stringify(welcomeMessage));

      // Handle incoming messages
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          console.log(`\n[${new Date().toISOString()}] Message from ${clientId} on port ${port}:`);
          console.log(JSON.stringify(message, null, 2));

          // Update client info based on message
          if (message.type === 'discovery' && message.payload) {
            clientInfo.deviceType = message.payload.deviceType || 'unknown';
            clientInfo.deviceName = message.payload.deviceName || 'Unknown Device';
            console.log(`  Updated device info: ${clientInfo.deviceType} - ${clientInfo.deviceName}`);
          }

          // Echo the message back to sender
          const response = {
            type: 'echo',
            timestamp: Date.now(),
            original: message,
            serverPort: port
          };

          ws.send(JSON.stringify(response));

          // Broadcast to other clients (optional)
          if (message.type === 'navigation' || message.type === 'control') {
            broadcastToOthers(ws, message);
          }

        } catch (error) {
          console.error(`❌ Error parsing message from ${clientId}:`, error);
          const errorResponse = {
            type: 'error',
            timestamp: Date.now(),
            payload: {
              error: 'Invalid JSON message',
              details: error.message
            }
          };
          ws.send(JSON.stringify(errorResponse));
        }
      });

      // Handle client disconnect
      ws.on('close', (code, reason) => {
        console.log(`\n[${new Date().toISOString()}] Client disconnected from port ${port}:`);
        console.log(`  Client ID: ${clientId}`);
        console.log(`  Code: ${code}, Reason: ${reason}`);
        console.log(`  Total clients: ${clients.size - 1}`);
        clients.delete(ws);
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error(`❌ WebSocket error for ${clientId}:`, error);
        clients.delete(ws);
      });
    });

    // Start server
    server.listen(port, () => {
      console.log(`✅ WebSocket Test Server running on ws://localhost:${port}`);
    });

    // Store references
    servers.set(port, server);
    wsServers.set(port, wss);

  } catch (error) {
    console.error(`❌ Failed to start server on port ${port}:`, error.message);
  }
}

// Function to broadcast message to all clients except sender
function broadcastToOthers(senderWs, message) {
  const broadcastMessage = {
    type: 'broadcast',
    timestamp: Date.now(),
    original: message
  };

  clients.forEach((info, ws) => {
    if (ws !== senderWs && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(broadcastMessage));
    }
  });
}

// Start servers on all ports
console.log('🧪 SAHAR TV REMOTE TEST SERVER SUITE');
console.log('=====================================');
console.log(`Starting WebSocket servers on ports: ${PORTS.join(', ')}`);
console.log('');

PORTS.forEach(port => {
  createServerOnPort(port);
});

// Show status after startup
setTimeout(() => {
  console.log('\n📊 SERVER STATUS:');
  console.log(`✅ ${servers.size}/${PORTS.length} servers started successfully`);
  console.log('\n🔗 TEST CONNECTIONS:');
  PORTS.forEach(port => {
    if (servers.has(port)) {
      console.log(`  ✅ ws://localhost:${port}`);
    } else {
      console.log(`  ❌ ws://localhost:${port} (failed)`);
    }
  });
  console.log('\n🧪 INTEGRATION TESTING:');
  console.log('  1. Open Remote app: http://localhost:4202');
  console.log('  2. Open TV app: http://localhost:4203');
  console.log('  3. Remote should discover TV devices automatically');
  console.log('  4. Test connection and navigation sync');
  console.log('\nPress Ctrl+C to stop all servers');
}, 1000);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down all WebSocket Test Servers...');
  
  // Close all client connections
  clients.forEach((info, ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.close(1000, 'Server shutting down');
    }
  });
  
  // Close all servers
  let closedCount = 0;
  servers.forEach((server, port) => {
    server.close(() => {
      console.log(`✅ Server on port ${port} shut down`);
      closedCount++;
      if (closedCount === servers.size) {
        console.log('✅ All servers shut down gracefully');
        process.exit(0);
      }
    });
  });
});

// Export for potential use as module
module.exports = { servers, wsServers, clients };
