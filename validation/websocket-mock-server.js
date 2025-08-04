// Enhanced WebSocket Test Server with Real SAHAR Data
// Run with: node websocket-server-with-real-data.js

const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Port Configuration (same as multiport server)
const PORTS = [8000, 5544, 5545, 5546, 5547];
const servers = new Map();
const wsServers = new Map();
const clients = new Map();

// Load real performer data from shared models
// Real YouTube video IDs updated to match shared/models/video-navigation.ts
const performersData = [
  {
    id: "yuval",
    name: "Yuval",
    thumbnail: "/assets/performers/yuval.jpg",
    description: "Children's music and educational content",
    videos: [
      {
        id: "yuval-birthday-song",
        title: "Happy Birthday Song",
        thumbnail: "/assets/videos/yuval-birthday-song.jpg",
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        duration: 240,
        description: "A fun birthday celebration song",
        likedScenes: [
          {
            id: "scene-1",
            title: "Opening & Intro",
            startTime: 0,
            endTime: 45,
            description: "Introduction and welcome"
          },
          {
            id: "scene-2",
            title: "Birthday Song",
            startTime: 45,
            endTime: 180,
            description: "The main birthday song"
          },
          {
            id: "scene-3",
            title: "Celebration & Goodbye",
            startTime: 180,
            endTime: 240,
            description: "Party celebration and farewell"
          }
        ]
      },
      {
        id: "yuval-abc-song",
        title: "ABC Learning Song",
        thumbnail: "/assets/videos/yuval-abc-song.jpg", 
        url: "https://www.youtube.com/watch?v=L_jWHffIx5E",
        duration: 180,
        description: "Learn the alphabet with fun music",
        likedScenes: [
          {
            id: "scene-1",
            title: "A to H",
            startTime: 0,
            endTime: 60,
            description: "First part of alphabet"
          },
          {
            id: "scene-2",
            title: "I to Q",
            startTime: 60,
            endTime: 120,
            description: "Middle letters"
          },
          {
            id: "scene-3",
            title: "R to Z",
            startTime: 120,
            endTime: 180,
            description: "Final letters and recap"
          }
        ]
      },
      {
        id: "yuval-counting-fun",
        title: "Counting 1-10 Fun",
        thumbnail: "/assets/videos/yuval-counting-fun.jpg",
        url: "https://www.youtube.com/watch?v=kffacxfA7G4",
        duration: 150,
        description: "Interactive counting with colorful animations",
        likedScenes: [
          {
            id: "scene-1",
            title: "Numbers 1-5",
            startTime: 0,
            endTime: 75,
            description: "Learning first five numbers"
          },
          {
            id: "scene-2",
            title: "Numbers 6-10",
            startTime: 75,
            endTime: 150,
            description: "Learning numbers six through ten"
          }
        ]
      }
    ]
  },
  {
    id: "little-michal",
    name: "Little Michal",
    thumbnail: "/assets/performers/little-michal.jpg",
    description: "Young performer with creative content",
    videos: [
      {
        id: "michal-story-time",
        title: "Story Time Adventures",
        thumbnail: "/assets/videos/michal-story-time.jpg",
        url: "https://www.youtube.com/watch?v=YQHsXMglC9A",
        duration: 360,
        description: "Exciting adventure stories for children",
        likedScenes: [
          {
            id: "scene-1",
            title: "Forest Adventure",
            startTime: 0,
            endTime: 120,
            description: "Journey through magical forest"
          },
          {
            id: "scene-2", 
            title: "Meeting New Friends",
            startTime: 120,
            endTime: 240,
            description: "Making friends with forest animals"
          },
          {
            id: "scene-3",
            title: "Happy Ending",
            startTime: 240,
            endTime: 360,
            description: "Wonderful conclusion to adventure"
          }
        ]
      },
      {
        id: "michal-art-class",
        title: "Art & Craft Class",
        thumbnail: "/assets/videos/michal-art-class.jpg",
        url: "https://www.youtube.com/watch?v=Ct6BUPvE2sM",
        duration: 300,
        description: "Creative arts and crafts tutorial",
        likedScenes: [
          {
            id: "scene-1",
            title: "Gathering Materials",
            startTime: 0,
            endTime: 60,
            description: "What we need for our project"
          },
          {
            id: "scene-2",
            title: "Creating Together",
            startTime: 60,
            endTime: 240,
            description: "Step by step crafting"
          },
          {
            id: "scene-3",
            title: "Show & Tell",
            startTime: 240,
            endTime: 300,
            description: "Showing off our creations"
          }
        ]
      },
      {
        id: "michal-dance-party",
        title: "Dance Party Fun",
        thumbnail: "/assets/videos/michal-dance-party.jpg",
        url: "https://www.youtube.com/watch?v=y6120QOlsfU",
        duration: 240,
        description: "Fun dance moves and music",
        likedScenes: [
          {
            id: "scene-1",
            title: "Warm Up Dance",
            startTime: 0,
            endTime: 80,
            description: "Getting ready to dance"
          },
          {
            id: "scene-2",
            title: "Main Dance Routine",
            startTime: 80,
            endTime: 200,
            description: "Learning the full dance"
          },
          {
            id: "scene-3",
            title: "Dance Party Finale",
            startTime: 200,
            endTime: 240,
            description: "Big dance celebration"
          }
        ]
      }
    ]
  },
  {
    id: "roy-boy", 
    name: "Roy Boy",
    thumbnail: "/assets/performers/roy-boy.jpg",
    description: "Energetic performer with action-packed content",
    videos: [
      {
        id: "roy-superhero-training",
        title: "Superhero Training Academy",
        thumbnail: "/assets/videos/roy-superhero-training.jpg",
        url: "https://www.youtube.com/watch?v=d1YBv2mWll0",
        duration: 420,
        description: "Train like a superhero with Roy Boy",
        likedScenes: [
          {
            id: "scene-1",
            title: "Superhero Basics",
            startTime: 0,
            endTime: 120,
            description: "Learning superhero fundamentals"
          },
          {
            id: "scene-2",
            title: "Strength Training",
            startTime: 120,
            endTime: 280,
            description: "Building superhero strength"
          },
          {
            id: "scene-3",
            title: "Final Test",
            startTime: 280,
            endTime: 420,
            description: "Putting skills to the test"
          }
        ]
      },
      {
        id: "roy-sports-day",
        title: "Ultimate Sports Day",
        thumbnail: "/assets/videos/roy-sports-day.jpg",
        url: "https://www.youtube.com/watch?v=ZjjvFP2-PKs",
        duration: 300,
        description: "Fun sports activities and games",
        likedScenes: [
          {
            id: "scene-1",
            title: "Opening Ceremony",
            startTime: 0,
            endTime: 60,
            description: "Starting sports day with excitement"
          },
          {
            id: "scene-2",
            title: "Competition Events",
            startTime: 60,
            endTime: 240,
            description: "Various sports competitions"
          },
          {
            id: "scene-3",
            title: "Victory Celebration",
            startTime: 240,
            endTime: 300,
            description: "Celebrating everyone's efforts"
          }
        ]
      }
    ]
  },
  {
    id: "uncle-haim",
    name: "Uncle Haim",
    thumbnail: "/assets/performers/uncle-haim.jpg", 
    description: "Wise and entertaining storyteller",
    videos: [
      {
        id: "haim-bedtime-stories",
        title: "Magical Bedtime Stories",
        thumbnail: "/assets/videos/haim-bedtime-stories.jpg",
        url: "https://www.youtube.com/watch?v=rTgj1HxmUbg",
        duration: 450,
        description: "Calming bedtime stories with life lessons",
        likedScenes: [
          {
            id: "scene-1",
            title: "The Brave Little Mouse",
            startTime: 0,
            endTime: 150,
            description: "Story about courage and friendship"
          },
          {
            id: "scene-2",
            title: "The Magic Garden",
            startTime: 150,
            endTime: 300,
            description: "Tale of growth and patience"
          },
          {
            id: "scene-3",
            title: "Goodnight Wishes",
            startTime: 300,
            endTime: 450,
            description: "Peaceful ending and sweet dreams"
          }
        ]
      },
      {
        id: "haim-cooking-adventure",
        title: "Cooking Adventures with Uncle Haim",
        thumbnail: "/assets/videos/haim-cooking-adventure.jpg",
        url: "https://www.youtube.com/watch?v=SLMJpHihykI",
        duration: 360,
        description: "Learn to cook simple, healthy meals",
        likedScenes: [
          {
            id: "scene-1",
            title: "Kitchen Safety",
            startTime: 0,
            endTime: 90,
            description: "Important kitchen safety tips"
          },
          {
            id: "scene-2",
            title: "Making the Recipe",
            startTime: 90,
            endTime: 270,
            description: "Step by step cooking instructions"
          },
          {
            id: "scene-3",
            title: "Enjoying Together",
            startTime: 270,
            endTime: 360,
            description: "Sharing and enjoying our meal"
          }
        ]
      },
      {
        id: "haim-life-lessons",
        title: "Life Lessons with Uncle Haim",
        thumbnail: "/assets/videos/haim-life-lessons.jpg",
        url: "https://www.youtube.com/watch?v=hFcLyDb7niM",
        duration: 480,
        description: "Important life lessons through stories and examples",
        likedScenes: [
          {
            id: "scene-1",
            title: "Being Kind",
            startTime: 0,
            endTime: 160,
            description: "The importance of kindness"
          },
          {
            id: "scene-2",
            title: "Working Together",
            startTime: 160,
            endTime: 320,
            description: "Learning about teamwork"
          },
          {
            id: "scene-3",
            title: "Being Yourself",
            startTime: 320,
            endTime: 480,
            description: "The value of being authentic"
          }
        ]
      }
    ]
  }
];

// Helper function to find performer data
function findPerformer(performerId) {
  return performersData.find(p => p.id === performerId);
}

function findVideo(performerId, videoId) {
  const performer = findPerformer(performerId);
  return performer?.videos.find(v => v.id === videoId);
}

function findScene(performerId, videoId, sceneId) {
  const video = findVideo(performerId, videoId);
  return video?.likedScenes.find(s => s.id === sceneId);
}

// Function to create server on a specific port with real data support
function createServerOnPort(port) {
  try {
    const server = http.createServer();
    
    const wss = new WebSocket.Server({ 
      server,
      path: '/' 
    });

    console.log(`🚀 WebSocket Server with Real Data starting on ws://localhost:${port}`);

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

      // Send welcome message with real data summary
      const welcomeMessage = {
        type: 'status',
        timestamp: Date.now(),
        payload: {
          message: `Connected to SAHAR server on port ${port}`,
          clientId: clientId,
          serverInfo: {
            name: 'SAHAR WebSocket Server',
            version: '2.0.0',
            port: port,
            capabilities: ['echo', 'broadcast', 'discovery', 'real-data'],
            dataStats: {
              performers: performersData.length,
              totalVideos: performersData.reduce((acc, p) => acc + p.videos.length, 0),
              totalScenes: performersData.reduce((acc, p) => 
                acc + p.videos.reduce((vAcc, v) => vAcc + v.likedScenes.length, 0), 0)
            }
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

          // Handle discovery with real server info
          if (message.type === 'discovery' && message.payload) {
            clientInfo.deviceType = message.payload.deviceType || 'unknown';
            clientInfo.deviceName = message.payload.deviceName || 'Unknown Device';
            console.log(`  Updated device info: ${clientInfo.deviceType} - ${clientInfo.deviceName}`);
            
            // Send back real server discovery info for Remote devices
            if (message.payload.deviceType === 'remote') {
              const serverDiscovery = {
                type: 'discovery',
                timestamp: Date.now(),
                payload: {
                  deviceType: 'tv',
                  deviceId: `sahar-tv-${port}`,
                  deviceName: `SAHAR TV (Port ${port})`,
                  capabilities: ['navigation', 'playback', 'status', 'real-data'],
                  networkInfo: {
                    ip: 'localhost',
                    port: port
                  },
                  dataInfo: {
                    performers: performersData.map(p => ({
                      id: p.id,
                      name: p.name,
                      videoCount: p.videos.length
                    }))
                  }
                }
              };
              ws.send(JSON.stringify(serverDiscovery));
            }
          }
          
          // Handle navigation commands with real data responses
          if (message.type === 'navigation') {
            const navAction = message.payload.action;
            console.log(`  Processing navigation: ${navAction}`);
            
            let statusResponse = {
              type: 'status',
              timestamp: Date.now(),
              payload: {
                message: `Navigation to ${navAction} completed`,
                currentState: {}
              }
            };
            
            // Provide real data based on navigation action
            if (navAction === 'go_to_performers') {
              statusResponse.payload.currentState = {
                level: 'performers',
                breadcrumb: ['Performers'],
                canGoBack: false,
                data: performersData.map(p => ({
                  id: p.id,
                  name: p.name,
                  thumbnail: p.thumbnail,
                  description: p.description,
                  videoCount: p.videos.length
                }))
              };
            } 
            
            else if (navAction === 'select_performer') {
              const performerId = message.payload.performerId;
              const performer = findPerformer(performerId);
              
              if (performer) {
                statusResponse.payload.currentState = {
                  level: 'videos',
                  breadcrumb: ['Performers', performer.name],
                  canGoBack: true,
                  selectedPerformerId: performerId,
                  data: performer.videos.map(v => ({
                    id: v.id,
                    title: v.title,
                    thumbnail: v.thumbnail,
                    duration: v.duration,
                    description: v.description,
                    sceneCount: v.likedScenes.length
                  }))
                };
              } else {
                statusResponse.payload.message = `Performer ${performerId} not found`;
                statusResponse.payload.error = true;
              }
            }
            
            else if (navAction === 'select_video') {
              const performerId = message.payload.performerId;
              const videoId = message.payload.videoId;
              const performer = findPerformer(performerId);
              const video = findVideo(performerId, videoId);
              
              if (video && performer) {
                statusResponse.payload.currentState = {
                  level: 'scenes',
                  breadcrumb: ['Performers', performer.name, video.title],
                  canGoBack: true,
                  selectedPerformerId: performerId,
                  selectedVideoId: videoId,
                  data: video.likedScenes.map(s => ({
                    id: s.id,
                    title: s.title,
                    startTime: s.startTime,
                    endTime: s.endTime,
                    description: s.description
                  })),
                  videoInfo: {
                    url: video.url,
                    duration: video.duration,
                    title: video.title
                  }
                };
              } else {
                statusResponse.payload.message = `Video ${videoId} not found for performer ${performerId}`;
                statusResponse.payload.error = true;
              }
            }
            
            else if (navAction === 'select_scene') {
              const performerId = message.payload.performerId;
              const videoId = message.payload.videoId;
              const sceneTimestamp = message.payload.sceneTimestamp;
              
              const performer = findPerformer(performerId);
              const video = findVideo(performerId, videoId);
              const scene = video?.likedScenes.find(s => s.startTime.toString() === sceneTimestamp);
              
              if (scene && video && performer) {
                statusResponse.payload.currentState = {
                  level: 'scene-selected',
                  breadcrumb: ['Performers', performer.name, video.title, scene.title],
                  canGoBack: true,
                  selectedPerformerId: performerId,
                  selectedVideoId: videoId,
                  selectedSceneTimestamp: sceneTimestamp,
                  sceneInfo: {
                    id: scene.id,
                    title: scene.title,
                    startTime: scene.startTime,
                    endTime: scene.endTime,
                    description: scene.description
                  },
                  videoInfo: {
                    url: video.url,
                    duration: video.duration,
                    title: video.title
                  },
                  playbackInfo: {
                    currentTime: scene.startTime,
                    isPlaying: false,
                    volume: 50
                  }
                };
              } else {
                statusResponse.payload.message = `Scene at ${sceneTimestamp}s not found`;
                statusResponse.payload.error = true;
              }
            }
            
            ws.send(JSON.stringify(statusResponse));
          }
          
          // Handle control commands with realistic responses
          if (message.type === 'control') {
            const controlAction = message.payload.action;
            console.log(`  Processing control: ${controlAction}`);
            
            const controlResponse = {
              type: 'status',
              timestamp: Date.now(),
              payload: {
                message: `Control ${controlAction} executed`,
                playerState: {
                  isPlaying: controlAction === 'play',
                  currentTime: message.payload.currentTime || 0,
                  duration: message.payload.duration || 300,
                  volume: message.payload.volume || 50,
                  action: controlAction
                }
              }
            };
            
            ws.send(JSON.stringify(controlResponse));
          }
          
          // Handle data requests
          if (message.type === 'data-request') {
            const requestType = message.payload.requestType;
            console.log(`  Processing data request: ${requestType}`);
            
            let dataResponse = {
              type: 'data-response',
              timestamp: Date.now(),
              payload: {
                requestType: requestType,
                data: null
              }
            };
            
            if (requestType === 'performers') {
              dataResponse.payload.data = performersData;
            } else if (requestType === 'performer') {
              const performerId = message.payload.performerId;
              dataResponse.payload.data = findPerformer(performerId);
            } else if (requestType === 'video') {
              const performerId = message.payload.performerId;
              const videoId = message.payload.videoId;
              dataResponse.payload.data = findVideo(performerId, videoId);
            }
            
            ws.send(JSON.stringify(dataResponse));
          }
          
          // Echo for other message types
          if (!['discovery', 'navigation', 'control', 'data-request'].includes(message.type)) {
            const response = {
              type: 'echo',
              timestamp: Date.now(),
              original: message,
              serverPort: port
            };
            ws.send(JSON.stringify(response));
          }

          // Broadcast navigation and control to other clients
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
      console.log(`✅ SAHAR WebSocket Server with Real Data running on ws://localhost:${port}`);
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
console.log('🎬 SAHAR TV REMOTE SERVER WITH REAL DATA');
console.log('==========================================');
console.log(`Starting WebSocket servers on ports: ${PORTS.join(', ')}`);
console.log('');
console.log('📊 LOADED DATA:');
console.log(`  Performers: ${performersData.length}`);
console.log(`  Total Videos: ${performersData.reduce((acc, p) => acc + p.videos.length, 0)}`);
console.log(`  Total Scenes: ${performersData.reduce((acc, p) => acc + p.videos.reduce((vAcc, v) => vAcc + v.likedScenes.length, 0), 0)}`);
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
  console.log('\n🎬 REAL DATA FEATURES:');
  console.log('  ✅ 4 Performers with real names and descriptions');
  console.log('  ✅ 11 Videos with detailed metadata');
  console.log('  ✅ 30+ Liked Scenes with timestamps');
  console.log('  ✅ Navigation responses with actual data');
  console.log('  ✅ Data request endpoints for direct access');
  console.log('\n🧪 INTEGRATION TESTING:');
  console.log('  1. Open Remote app: http://localhost:4202');
  console.log('  2. Open TV app: http://localhost:4203');
  console.log('  3. Remote should discover TV with real data stats');
  console.log('  4. Test navigation through real performers/videos/scenes');
  console.log('  5. Verify WebSocket sends actual performer data');
  console.log('\nPress Ctrl+C to stop all servers');
}, 1000);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down all SAHAR WebSocket Servers...');
  
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
        console.log('✅ All SAHAR servers shut down gracefully');
        process.exit(0);
      }
    });
  });
});

// Export for potential use as module
module.exports = { servers, wsServers, clients, performersData };
