#!/usr/bin/env node

// Protocol v2.0 Test Client
// Tests TV and Remote WebSocket connectivity

const WebSocket = require('ws');

console.log('🧪 Protocol v2.0 Test Client');
console.log('============================');

// Test TV Connection (should connect to localhost)
async function testTVConnection() {
  console.log('\n📺 Testing TV Connection...');
  
  const ports = [5544, 5545, 5546, 5547, 8000];
  
  for (const port of ports) {
    try {
      console.log(`  Trying port ${port}...`);
      await testConnection(`ws://localhost:${port}`, 'tv', port);
      return port; // Return first successful port
    } catch (error) {
      console.log(`  ❌ Port ${port} failed: ${error.message}`);
    }
  }
  
  throw new Error('No TV server found on any port');
}

// Test Remote Discovery (simulates network scanning)
async function testRemoteDiscovery() {
  console.log('\n📱 Testing Remote Discovery...');
  
  const ports = [5544, 5545, 5546, 5547, 8000];
  const discovered = [];
  
  for (const port of ports) {
    try {
      console.log(`  Scanning port ${port}...`);
      await testConnection(`ws://localhost:${port}`, 'remote', port);
      discovered.push(port);
      console.log(`  ✅ Discovered TV on port ${port}`);
    } catch (error) {
      console.log(`  ❌ Port ${port}: ${error.message}`);
    }
  }
  
  console.log(`\n🔍 Discovery complete: found ${discovered.length} TV devices on ports: ${discovered.join(', ')}`);
  return discovered;
}

function testConnection(url, deviceType, port) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('Connection timeout'));
    }, 2000); // Protocol v2.0: 2-second timeout
    
    ws.on('open', () => {
      clearTimeout(timeout);
      console.log(`    ✅ Connected to ${url}`);
      
      // Send Protocol v2.0 discovery message
      const discoveryMessage = {
        type: 'discovery',
        timestamp: Date.now(),
        payload: {
          deviceType: deviceType,
          deviceId: `test-${deviceType}-${Date.now()}`,
          deviceName: `Test ${deviceType.toUpperCase()}`,
          capabilities: deviceType === 'tv' ? ['display', 'video', 'audio'] : ['navigation', 'control'],
          networkInfo: {
            ip: 'localhost',
            port: deviceType === 'tv' ? 4203 : 4202
          },
          protocolVersion: '2.0'
        }
      };
      
      ws.send(JSON.stringify(discoveryMessage));
      console.log(`    📤 Sent discovery message as ${deviceType}`);
      
      // Wait for response
      const responseTimeout = setTimeout(() => {
        ws.close();
        resolve({ port, connected: true, response: 'timeout' });
      }, 1000);
      
      ws.on('message', (data) => {
        clearTimeout(responseTimeout);
        try {
          const message = JSON.parse(data);
          console.log(`    📨 Received: ${message.type}`);
          ws.close();
          resolve({ port, connected: true, response: message.type });
        } catch (error) {
          ws.close();
          resolve({ port, connected: true, response: 'invalid_json' });
        }
      });
    });
    
    ws.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    
    ws.on('close', (code, reason) => {
      clearTimeout(timeout);
    });
  });
}

// Test Data Transfer (Remote → TV)
async function testDataTransfer(port) {
  console.log(`\n📊 Testing Data Transfer to port ${port}...`);
  
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:${port}`);
    
    ws.on('open', () => {
      console.log(`  📤 Sending test data...`);
      
      // Send Protocol v2.0 data message
      const dataMessage = {
        type: 'data',
        timestamp: Date.now(),
        payload: {
          performers: [
            {
              id: 'test-performer',
              name: 'Test Performer',
              thumbnail: '/test.jpg',
              description: 'Test performer for Protocol v2.0',
              videos: [
                {
                  id: 'test-video',
                  title: 'Test Video',
                  thumbnail: '/test-video.jpg',
                  duration: '3:00',
                  description: 'Test video for Protocol v2.0',
                  scenes: [
                    {
                      id: 'test-scene',
                      title: 'Test Scene',
                      timestamp: 0,
                      duration: 30,
                      thumbnail: '/test-scene.jpg',
                      description: 'Test scene for Protocol v2.0'
                    }
                  ]
                }
              ]
            }
          ]
        }
      };
      
      ws.send(JSON.stringify(dataMessage));
      
      // Wait for confirmation
      const timeout = setTimeout(() => {
        ws.close();
        resolve({ success: false, reason: 'timeout' });
      }, 3000);
      
      ws.on('message', (data) => {
        clearTimeout(timeout);
        try {
          const message = JSON.parse(data);
          console.log(`  📨 Received: ${message.type}`);
          
          if (message.type === 'data_confirmation') {
            console.log(`  ✅ Data confirmed: ${message.payload.status}`);
            ws.close();
            resolve({ success: true, confirmation: message });
          } else {
            ws.close();
            resolve({ success: false, reason: 'unexpected_response', message });
          }
        } catch (error) {
          ws.close();
          resolve({ success: false, reason: 'invalid_json', error });
        }
      });
    });
    
    ws.on('error', (error) => {
      reject(error);
    });
  });
}

// Main test execution
async function runTests() {
  try {
    console.log('\n🚀 Starting Protocol v2.0 Tests...\n');
    
    // Test 1: TV Connection
    const tvPort = await testTVConnection();
    console.log(`✅ TV connection test passed on port ${tvPort}`);
    
    // Test 2: Remote Discovery
    const discoveredPorts = await testRemoteDiscovery();
    console.log(`✅ Remote discovery test passed, found ${discoveredPorts.length} devices`);
    
    // Test 3: Data Transfer
    if (discoveredPorts.length > 0) {
      const dataResult = await testDataTransfer(discoveredPorts[0]);
      if (dataResult.success) {
        console.log(`✅ Data transfer test passed`);
      } else {
        console.log(`⚠️ Data transfer test failed: ${dataResult.reason}`);
      }
    }
    
    console.log('\n🎉 Protocol v2.0 Tests Complete!');
    console.log('\n📋 Summary:');
    console.log(`  📺 TV Connection: Port ${tvPort}`);
    console.log(`  🔍 Discovery: ${discoveredPorts.length} devices found`);
    console.log(`  📊 Data Transfer: ${discoveredPorts.length > 0 ? 'Tested' : 'Skipped'}`);
    
  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the tests
runTests();