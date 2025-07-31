const WebSocket = require('ws');

console.log('🧪 WEBSOCKET COMMUNICATION TEST');
console.log('================================');

// Test client to monitor all messages
const testClient = new WebSocket('ws://localhost:8000');

testClient.on('open', () => {
    console.log('✅ Connected to WebSocket server');
    
    // Send a discovery message to identify as a test client
    const discoveryMessage = {
        type: 'discovery',
        timestamp: Date.now(),
        payload: {
            deviceType: 'test',
            deviceId: 'test-monitor',
            deviceName: 'Test Monitor',
            capabilities: ['monitoring']
        }
    };
    
    testClient.send(JSON.stringify(discoveryMessage));
    console.log('📤 Sent discovery message');
});

testClient.on('message', (data) => {
    try {
        const message = JSON.parse(data.toString());
        console.log('📨 Received message:');
        console.log('  Type:', message.type);
        console.log('  Time:', new Date(message.timestamp).toISOString());
        
        if (message.type === 'broadcast') {
            console.log('  📢 BROADCAST - Original message:');
            console.log('    Type:', message.original.type);
            console.log('    Payload:', JSON.stringify(message.original.payload, null, 2));
        } else {
            console.log('  Payload:', JSON.stringify(message.payload, null, 2));
        }
        console.log('  ---');
    } catch (error) {
        console.error('❌ Error parsing message:', error);
        console.log('Raw data:', data.toString());
    }
});

testClient.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
});

testClient.on('close', () => {
    console.log('🔌 Disconnected from WebSocket server');
});

// Keep the script running
process.on('SIGINT', () => {
    console.log('\n👋 Shutting down test monitor...');
    testClient.close();
    process.exit(0);
});

console.log('🔍 Monitoring WebSocket messages... (Press Ctrl+C to stop)');
