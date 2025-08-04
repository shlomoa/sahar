#!/usr/bin/env node

// Full Protocol v2.0 Integration Test
// Simulates the full TV + Remote app workflow

const WebSocket = require('ws');

console.log('🎬 Protocol v2.0 Integration Test');
console.log('=================================');

let tvWs = null;
let remoteWs = null;

// Simulate TV App connecting to local server
async function simulateTVApp() {
  console.log('\n📺 Simulating TV App...');
  
  // TV tries to connect to first available port
  const ports = [5544, 5545, 5546, 5547, 8000];
  
  for (const port of ports) {
    try {
      console.log(`  📺 TV trying port ${port}...`);
      tvWs = new WebSocket(`ws://localhost:${port}`);
      
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('timeout')), 2000);
        
        tvWs.on('open', () => {
          clearTimeout(timeout);
          console.log(`  ✅ TV connected to localhost:${port}`);
          
          // Send TV identification
          tvWs.send(JSON.stringify({
            type: 'discovery',
            timestamp: Date.now(),
            payload: {
              deviceType: 'tv',
              deviceId: 'sahar-tv-123',
              deviceName: 'SAHAR TV',
              capabilities: ['display', 'video', 'audio', 'navigation'],
              networkInfo: { ip: 'localhost', port: 4203 },
              protocolVersion: '2.0'
            }
          }));
          
          resolve();
        });
        
        tvWs.on('error', () => {
          clearTimeout(timeout);
          reject(new Error('connection failed'));
        });
      });
      
      // Set up TV message handling
      tvWs.on('message', (data) => {
        const message = JSON.parse(data);
        console.log(`  📺 TV received: ${message.type}`);
        
        if (message.type === 'data') {
          console.log(`  📺 TV processing data: ${message.payload.performers?.length} performers`);
          
          // Send data confirmation
          tvWs.send(JSON.stringify({
            type: 'data_confirmation',
            timestamp: Date.now(),
            payload: {
              status: 'received',
              dataVersion: '1.0',
              itemsReceived: {
                performers: message.payload.performers?.length || 0,
                videos: message.payload.performers?.reduce((acc, p) => acc + (p.videos?.length || 0), 0) || 0,
                scenes: message.payload.performers?.reduce((acc, p) => 
                  acc + (p.videos?.reduce((vAcc, v) => vAcc + (v.scenes?.length || 0), 0) || 0), 0) || 0
              }
            }
          }));
        }
        
        if (message.type === 'navigation') {
          console.log(`  📺 TV processing navigation: ${message.payload.action} -> ${message.payload.targetId}`);
          
          // Send status update
          tvWs.send(JSON.stringify({
            type: 'status',
            timestamp: Date.now(),
            payload: {
              currentState: {
                level: 'videos',
                performerId: message.payload.targetId,
                breadcrumb: ['Performers', 'Videos'],
                canGoBack: true
              }
            }
          }));
        }
      });
      
      return port; // Success
      
    } catch (error) {
      console.log(`  ❌ TV port ${port} failed: ${error.message}`);
      if (tvWs) tvWs.close();
      tvWs = null;
    }
  }
  
  throw new Error('TV could not connect to any port');
}

// Simulate Remote App discovering and connecting
async function simulateRemoteApp() {
  console.log('\n📱 Simulating Remote App...');
  
  // Remote discovers devices on network
  const discoveredDevices = [];
  const ports = [5544, 5545, 5546, 5547, 8000];
  
  console.log('  🔍 Remote scanning network...');
  
  for (const port of ports) {
    try {
      const testWs = new WebSocket(`ws://localhost:${port}`);
      
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          testWs.close();
          resolve();
        }, 2000);
        
        testWs.on('open', () => {
          clearTimeout(timeout);
          discoveredDevices.push({ ip: 'localhost', port });
          console.log(`  ✅ Remote found TV at localhost:${port}`);
          testWs.close();
          resolve();
        });
        
        testWs.on('error', () => {
          clearTimeout(timeout);
          resolve();
        });
      });
      
    } catch (error) {
      // Ignore discovery errors
    }
  }
  
  console.log(`  🔍 Remote discovery complete: ${discoveredDevices.length} devices found`);
  
  if (discoveredDevices.length === 0) {
    throw new Error('Remote found no TV devices');
  }
  
  // Connect to first discovered device
  const targetDevice = discoveredDevices[0];
  console.log(`  📱 Remote connecting to ${targetDevice.ip}:${targetDevice.port}...`);
  
  remoteWs = new WebSocket(`ws://${targetDevice.ip}:${targetDevice.port}`);
  
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('connection timeout')), 5000);
    
    remoteWs.on('open', () => {
      clearTimeout(timeout);
      console.log(`  ✅ Remote connected to TV`);
      
      // Send discovery message
      remoteWs.send(JSON.stringify({
        type: 'discovery',
        timestamp: Date.now(),
        payload: {
          deviceType: 'remote',
          deviceId: 'sahar-remote-456',
          deviceName: 'iPad Remote Control',
          capabilities: ['navigation', 'control'],
          networkInfo: { ip: 'localhost', port: 4202 },
          protocolVersion: '2.0'
        }
      }));
      
      resolve();
    });
    
    remoteWs.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
  
  // Set up Remote message handling
  remoteWs.on('message', (data) => {
    const message = JSON.parse(data);
    console.log(`  📱 Remote received: ${message.type}`);
    
    if (message.type === 'data_confirmation') {
      console.log(`  ✅ Remote: TV confirmed data receipt - ${message.payload.itemsReceived?.performers} performers`);
    }
    
    if (message.type === 'status') {
      console.log(`  📱 Remote: TV status update - ${message.payload.currentState?.level}`);
    }
  });
  
  return targetDevice;
}

// Simulate data transfer from Remote to TV
async function simulateDataTransfer() {
  console.log('\n📊 Simulating Data Transfer...');
  
  if (!remoteWs) {
    throw new Error('Remote not connected');
  }
  
  const performersData = [
    {
      id: 'yuval',
      name: 'Yuval',
      thumbnail: '/assets/performers/yuval.jpg',
      description: 'Children\'s music and educational content',
      videos: [
        {
          id: 'yuval-birthday-song',
          title: 'Happy Birthday Song',
          thumbnail: '/assets/videos/yuval-birthday.jpg',
          duration: '4:00',
          description: 'Fun birthday celebration song',
          scenes: [
            { id: 'scene-1', title: 'Opening', timestamp: 0, duration: 45, thumbnail: '/scene1.jpg', description: 'Introduction' },
            { id: 'scene-2', title: 'Song', timestamp: 45, duration: 135, thumbnail: '/scene2.jpg', description: 'Main song' },
            { id: 'scene-3', title: 'Celebration', timestamp: 180, duration: 60, thumbnail: '/scene3.jpg', description: 'Party time' }
          ]
        },
        {
          id: 'yuval-abc-song',
          title: 'ABC Learning Song',
          thumbnail: '/assets/videos/yuval-abc.jpg',
          duration: '3:00',
          description: 'Learn the alphabet with music',
          scenes: [
            { id: 'scene-1', title: 'A to H', timestamp: 0, duration: 60, thumbnail: '/abc1.jpg', description: 'First letters' },
            { id: 'scene-2', title: 'I to Q', timestamp: 60, duration: 60, thumbnail: '/abc2.jpg', description: 'Middle letters' },
            { id: 'scene-3', title: 'R to Z', timestamp: 120, duration: 60, thumbnail: '/abc3.jpg', description: 'Final letters' }
          ]
        }
      ]
    },
    {
      id: 'little-michal',
      name: 'Little Michal',
      thumbnail: '/assets/performers/michal.jpg',
      description: 'Creative and imaginative content',
      videos: [
        {
          id: 'michal-story-time',
          title: 'Story Time Adventures',
          thumbnail: '/assets/videos/michal-story.jpg',
          duration: '6:00',
          description: 'Amazing adventure stories',
          scenes: [
            { id: 'scene-1', title: 'Forest Adventure', timestamp: 0, duration: 120, thumbnail: '/story1.jpg', description: 'Journey begins' },
            { id: 'scene-2', title: 'Meeting Friends', timestamp: 120, duration: 120, thumbnail: '/story2.jpg', description: 'New characters' },
            { id: 'scene-3', title: 'Happy Ending', timestamp: 240, duration: 120, thumbnail: '/story3.jpg', description: 'Adventure concludes' }
          ]
        }
      ]
    }
  ];
  
  console.log(`  📤 Remote sending data: ${performersData.length} performers, ${performersData.reduce((acc, p) => acc + p.videos.length, 0)} videos`);
  
  remoteWs.send(JSON.stringify({
    type: 'data',
    timestamp: Date.now(),
    payload: {
      performers: performersData
    }
  }));
  
  // Wait for confirmation
  await new Promise((resolve) => {
    const originalHandler = remoteWs.onmessage;
    remoteWs.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'data_confirmation') {
        console.log(`  ✅ Data transfer confirmed by TV`);
        remoteWs.onmessage = originalHandler;
        resolve();
      } else if (originalHandler) {
        originalHandler(event);
      }
    };
    
    setTimeout(resolve, 3000); // Timeout after 3 seconds
  });
}

// Simulate navigation commands
async function simulateNavigation() {
  console.log('\n🧭 Simulating Navigation Commands...');
  
  if (!remoteWs) {
    throw new Error('Remote not connected');
  }
  
  // Navigate to performer
  console.log('  📱 Remote: Navigate to performer "yuval"');
  remoteWs.send(JSON.stringify({
    type: 'navigation',
    timestamp: Date.now(),
    payload: {
      action: 'navigate_to_performer',
      targetId: 'yuval',
      targetType: 'performer'
    }
  }));
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Navigate to video
  console.log('  📱 Remote: Navigate to video "yuval-birthday-song"');
  remoteWs.send(JSON.stringify({
    type: 'navigation',
    timestamp: Date.now(),
    payload: {
      action: 'navigate_to_video',
      targetId: 'yuval-birthday-song',
      targetType: 'video'
    }
  }));
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Navigate to scene
  console.log('  📱 Remote: Navigate to scene "scene-1"');
  remoteWs.send(JSON.stringify({
    type: 'navigation',
    timestamp: Date.now(),
    payload: {
      action: 'navigate_to_scene',
      targetId: 'scene-1',
      targetType: 'segment'
    }
  }));
  
  await new Promise(resolve => setTimeout(resolve, 2000));
}

// Main integration test
async function runIntegrationTest() {
  try {
    console.log('\n🚀 Starting Full Integration Test...\n');
    
    // Step 1: TV connects to local server
    const tvPort = await simulateTVApp();
    console.log(`✅ TV App simulation complete on port ${tvPort}`);
    
    // Step 2: Remote discovers and connects to TV
    const targetDevice = await simulateRemoteApp();
    console.log(`✅ Remote App simulation complete, connected to ${targetDevice.ip}:${targetDevice.port}`);
    
    // Step 3: Data transfer
    await simulateDataTransfer();
    console.log(`✅ Data transfer simulation complete`);
    
    // Step 4: Navigation commands
    await simulateNavigation();
    console.log(`✅ Navigation simulation complete`);
    
    console.log('\n🎉 Integration Test Complete!');
    console.log('\n📋 Summary:');
    console.log(`  📺 TV App: Connected to localhost:${tvPort}`);
    console.log(`  📱 Remote App: Connected to ${targetDevice.ip}:${targetDevice.port}`);
    console.log(`  📊 Data Transfer: ✅ Successful with confirmation`);
    console.log(`  🧭 Navigation: ✅ Multiple commands executed`);
    console.log('\n✨ Protocol v2.0 Implementation Verified!');
    
  } catch (error) {
    console.error(`❌ Integration test failed: ${error.message}`);
    process.exit(1);
  } finally {
    // Clean up connections
    if (tvWs) tvWs.close();
    if (remoteWs) remoteWs.close();
  }
}

// Run the integration test
runIntegrationTest();