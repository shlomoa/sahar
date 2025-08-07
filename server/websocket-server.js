// WebSocket Gateway Server for SAHAR TV-Remote Communication
// Run with: node websocket-server.js

const WebSocket = require('ws');
const http = require('http');

// Port Configuration:
// Ports 5544-5547 are the primary discovery range for the applications.
const PORTS = [5544, 5545, 5546, 5547];
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
          message: `Connected to gateway server on port ${port}`,
          clientId: clientId,
          serverInfo: {
            name: 'SAHAR WebSocket Gateway',
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

          // Handle different message types with proper responses
          if (message.type === 'discovery' && message.payload) {
            clientInfo.deviceType = message.payload.deviceType || 'unknown';
            clientInfo.deviceName = message.payload.deviceName || 'Unknown Device';
            console.log(`  Updated device info: ${clientInfo.deviceType} - ${clientInfo.deviceName}`);
            
            // Send back server discovery info for Remote devices
            if (message.payload.deviceType === 'remote') {
              const serverDiscovery = {
                type: 'discovery',
                timestamp: Date.now(),
                payload: {
                  deviceType: 'tv',
                  deviceId: `tv-server-${port}`,
                  deviceName: `SAHAR TV (Port ${port})`,
                  capabilities: ['navigation', 'playback', 'status'],
                  networkInfo: {
                    ip: 'localhost',
                    port: port
                  }
                }
              };
              ws.send(JSON.stringify(serverDiscovery));
            }
          }
          
          // Handle navigation commands with proper status responses
          if (message.type === 'navigation') {
            const navAction = message.payload.action;
            console.log(`  Processing navigation: ${navAction}`);
            
            // Send status update based on navigation command
            let statusResponse = {
              type: 'status',
              timestamp: Date.now(),
              payload: {
                message: `Navigation to ${navAction} completed`,
                currentState: {
                  level: 'performers',
                  breadcrumb: ['Performers'],
                  canGoBack: false
                }
              }
            };
            
            // Customize status based on navigation action
            if (navAction === 'go_to_performers') {
              statusResponse.payload.currentState.level = 'performers';
            } else if (navAction === 'select_performer') {
              statusResponse.payload.currentState = {
                level: 'videos',
                breadcrumb: ['Performers', 'Videos'],
                canGoBack: true,
                selectedPerformerId: message.payload.performerId || 1
              };
            } else if (navAction === 'select_video') {
              statusResponse.payload.currentState = {
                level: 'scenes',
                breadcrumb: ['Performers', 'Videos', 'Scenes'],
                canGoBack: true,
                selectedPerformerId: message.payload.performerId || 1,
                selectedVideoId: message.payload.videoId || 1
              };
            }
            
            ws.send(JSON.stringify(statusResponse));
          }
          
          // Handle control commands
          if (message.type === 'control') {
            const controlAction = message.payload.action;
            console.log(`  Processing control: ${controlAction}`);
            
            const controlResponse = {
              type: 'status',
              timestamp: Date.now(),
              payload: {
                message: `Control ${controlAction} executed`,
                playerState: {
                  isPlaying: controlAction === 'play' ? true : controlAction === 'pause' ? false : true,
                  currentTime: 0,
                  duration: 300,
                  volume: message.payload.value || 50
                }
              }
            };
            
            ws.send(JSON.stringify(controlResponse));
          }
          
          // Echo for other message types
          if (!['discovery', 'navigation', 'control'].includes(message.type)) {
            const response = {
              type: 'echo',
              timestamp: Date.now(),
              original: message,
              serverPort: port
            };
            ws.send(JSON.stringify(response));
          }

          // Broadcast to other clients
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
      console.log(`✅ WebSocket Gateway running on ws://localhost:${port}`);
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
console.log('🚀 SAHAR Communication Server');
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
  console.log('\n🔗 CONNECTION ENDPOINTS:');
  PORTS.forEach(port => {
    if (servers.has(port)) {
      console.log(`  ✅ ws://localhost:${port}`);
    } else {
      console.log(`  ❌ ws://localhost:${port} (failed)`);
    }
  });
  console.log('\n🚀 USAGE:');
  console.log('  1. Open Remote app: http://localhost:4202');
  console.log('  2. Open TV app: http://localhost:4203');
  console.log('  3. Both apps will connect to this server.');
  console.log('  4. The server will relay messages between them.');
  console.log('\nPress Ctrl+C to stop all servers');
}, 1000);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down WebSocket Gateway Server...');
  
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
