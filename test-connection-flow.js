// WebSocket Connection Test Script
// Tests the full connection flow from Remote to TV

const WebSocket = require('ws');

console.log('🧪 SAHAR TV Remote - Connection Flow Test');
console.log('=========================================');

async function testConnectionFlow() {
    console.log('\n📋 Test Plan:');
    console.log('1. Verify WebSocket server is responding on port 8000');
    console.log('2. Test discovery message flow');
    console.log('3. Test connection establishment');
    console.log('4. Test navigation command');
    console.log('5. Verify status updates\n');

    // Test 1: Connect to WebSocket server
    console.log('🔌 Test 1: Connecting to WebSocket server...');
    
    try {
        const ws = new WebSocket('ws://localhost:8000');
        
        ws.on('open', () => {
            console.log('✅ WebSocket connection opened successfully');
            
            // Test 2: Send Remote discovery message (simulating Remote app)
            console.log('📤 Test 2: Sending Remote discovery message...');
            const discoveryMessage = {
                type: 'discovery',
                timestamp: Date.now(),
                payload: {
                    deviceType: 'remote',
                    deviceId: 'test-remote-12345',
                    deviceName: 'Test iPad Remote',
                    capabilities: ['navigation', 'control']
                }
            };
            
            ws.send(JSON.stringify(discoveryMessage));
            
            // Test 3: Send navigation command (simulating user interaction)
            setTimeout(() => {
                console.log('📤 Test 3: Sending navigation command...');
                const navigationCommand = {
                    type: 'navigation',
                    timestamp: Date.now(),
                    payload: {
                        action: 'go_to_performers'
                    }
                };
                
                ws.send(JSON.stringify(navigationCommand));
            }, 1000);
            
            // Test 4: Send heartbeat
            setTimeout(() => {
                console.log('📤 Test 4: Sending heartbeat...');
                const heartbeat = {
                    type: 'heartbeat',
                    timestamp: Date.now(),
                    payload: {
                        timestamp: Date.now(),
                        deviceId: 'test-remote-12345'
                    }
                };
                
                ws.send(JSON.stringify(heartbeat));
            }, 2000);
            
            // Close connection after tests
            setTimeout(() => {
                console.log('🔚 Closing test connection...');
                ws.close();
            }, 3000);
        });
        
        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());
                console.log('📨 Received message from server:', {
                    type: message.type,
                    payload: message.payload
                });
            } catch (e) {
                console.log('📨 Received raw message:', data.toString());
            }
        });
        
        ws.on('close', (code, reason) => {
            console.log(`🔌 Connection closed: ${code} - ${reason || 'No reason provided'}`);
            console.log('\n✅ Connection flow test completed');
        });
        
        ws.on('error', (error) => {
            console.error('❌ WebSocket error:', error.message);
        });
        
    } catch (error) {
        console.error('❌ Failed to create WebSocket connection:', error.message);
    }
}

// Run the test
testConnectionFlow();
