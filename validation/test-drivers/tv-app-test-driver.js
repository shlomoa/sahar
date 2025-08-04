// TV Application Test Driver
// Tests the actual TV Angular application by emulating Remote behavior
// CORRECT Architecture: TV app opens WebSocket port, Remote discovers and connects directly

const { spawn } = require('child_process');
const WebSocket = require('ws');
const path = require('path');

class TVAppTestDriver {
  constructor() {
    this.tvProcess = null;
    this.testResults = [];
    this.tvAppUrl = 'http://localhost:4203';
    this.mockRemoteWs = null; // We act as a Remote device connecting directly to TV's WebSocket port
    this.tvWebSocketPort = null; // Will be discovered from TV app
  }

  log(message) {
    console.log(`[TV Test Driver] ${message}`);
  }

  error(message) {
    console.error(`[TV Test Driver] ❌ ${message}`);
  }

  success(message) {
    console.log(`[TV Test Driver] ✅ ${message}`);
  }

  // Action 1.1: Start the TV Angular application (ng serve --port 4203)
  async startTVApp() {
    this.log('🚀 Action 1.1: Starting TV Angular application on port 4203...');
    
    return new Promise((resolve, reject) => {
      try {
        // Navigate to TV app directory and start ng serve
        const tvAppPath = path.resolve(__dirname, '../../apps/tv');
        
        this.log(`Starting ng serve in: ${tvAppPath}`);
        
        this.tvProcess = spawn('ng', ['serve', '--port', '4203'], {
          cwd: tvAppPath,
          stdio: 'pipe',
          shell: true
        });

        let startupOutput = '';
        
        this.tvProcess.stdout.on('data', (data) => {
          const output = data.toString();
          startupOutput += output;
          
          // Log important messages
          if (output.includes('Local:') || output.includes('webpack compiled')) {
            this.log(`TV App: ${output.trim()}`);
          }
          
          // Check if app is ready
          if (output.includes('webpack compiled successfully') || 
              output.includes('Local:') && output.includes('4203')) {
            this.success('TV Angular application started successfully on port 4203');
            resolve(true);
          }
        });

        this.tvProcess.stderr.on('data', (data) => {
          const error = data.toString();
          // Log non-critical warnings but don't fail
          if (!error.includes('Warning:')) {
            this.error(`TV App Error: ${error.trim()}`);
          }
        });

        this.tvProcess.on('error', (error) => {
          this.error(`Failed to start TV app: ${error.message}`);
          reject(error);
        });

        this.tvProcess.on('exit', (code) => {
          if (code !== 0 && code !== null) {
            this.error(`TV app process exited with code ${code}`);
            reject(new Error(`TV app process exited with code ${code}`));
          }
        });

        // Timeout after 60 seconds
        setTimeout(() => {
          if (this.tvProcess && !this.tvProcess.killed) {
            this.error('TV app startup timeout after 60 seconds');
            this.error('Startup output:', startupOutput);
            reject(new Error('TV app startup timeout'));
          }
        }, 60000);

      } catch (error) {
        this.error(`Exception starting TV app: ${error.message}`);
        reject(error);
      }
    });
  }

  // Action 1.2: Wait for successful startup and verify TV app is ready
  async waitForTVAppReady() {
    this.log('⏳ Action 1.2: Waiting for TV application to be fully ready...');
    
    const maxAttempts = 30;
    const attemptInterval = 2000; // 2 seconds
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // Check if the HTTP server is responding
        const response = await this.checkHTTPEndpoint();
        if (response) {
          this.success(`TV app HTTP server is responding (attempt ${attempt}/${maxAttempts})`);
          
          // Additional wait to ensure Angular app is fully loaded
          await this.sleep(3000);
          this.success('TV Angular application is fully ready for testing');
          return true;
        }
      } catch (error) {
        this.log(`Attempt ${attempt}/${maxAttempts}: TV app not ready yet - ${error.message}`);
      }
      
      if (attempt < maxAttempts) {
        await this.sleep(attemptInterval);
      }
    }
    
    throw new Error('TV app failed to become ready within timeout period');
  }

  // Action 1.3: Run test scenarios - emulate Remote behavior
  async runTestScenarios() {
    this.log('🎭 Action 1.3: Running test scenarios - emulating Remote behavior...');
    
    try {
      // Scenario 1: Remote Discovery
      await this.testRemoteDiscovery();
      
      // Scenario 2: Remote sends navigation commands
      await this.testNavigationCommands();
      
      // Scenario 3: Remote sends control commands  
      await this.testControlCommands();
      
      // Scenario 4: State synchronization
      await this.testStateSynchronization();
      
      this.success('All test scenarios completed successfully');
      
    } catch (error) {
      this.error(`Test scenario failed: ${error.message}`);
      throw error;
    }
  }

  // Test Scenario 1: Emulate Remote discovering TV
  async testRemoteDiscovery() {
    this.log('📡 Testing Remote Discovery scenario...');
    
    try {
      // Discover TV's WebSocket port by checking available ports (5544-5547)
      const availablePorts = [5544, 5545, 5546, 5547];
      let discoveredPort = null;
      
      for (const port of availablePorts) {
        try {
          this.log(`Checking if TV is listening on port ${port}...`);
          await this.checkWebSocketPort('localhost', port);
          discoveredPort = port;
          this.success(`Discovered TV WebSocket server on port ${port}`);
          break;
        } catch (error) {
          this.log(`Port ${port} not available`);
        }
      }
      
      if (!discoveredPort) {
        throw new Error('Could not discover TV WebSocket port - TV app may not be running or not listening');
      }
      
      this.tvWebSocketPort = discoveredPort;
      
      // Connect directly to TV app's WebSocket port
      this.mockRemoteWs = new WebSocket(`ws://localhost:${discoveredPort}`);
      
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('WebSocket connection timeout'));
        }, 5000);
        
        this.mockRemoteWs.onopen = () => {
          clearTimeout(timeout);
          this.success(`Connected directly to TV app WebSocket on port ${discoveredPort}`);
          
          // Send discovery message as Remote device
          const discoveryMessage = {
            type: 'discovery',
            timestamp: Date.now(),
            payload: {
              deviceType: 'remote',
              deviceId: 'test-remote-001',
              deviceName: 'Test Remote Controller',
              capabilities: ['navigation', 'control', 'data'],
              networkInfo: {
                ip: '127.0.0.1',
                port: 4202
              }
            }
          };
          
          this.mockRemoteWs.send(JSON.stringify(discoveryMessage));
          this.success('Sent discovery message directly to TV app');
          resolve(true);
        };
        
        this.mockRemoteWs.onerror = (error) => {
          clearTimeout(timeout);
          reject(new Error(`WebSocket connection to TV app failed: ${error.message}`));
        };
      });
      
      this.success('Remote Discovery scenario completed successfully');
      
    } catch (error) {
      this.error(`Remote Discovery failed: ${error.message}`);
      throw error;
    }
  }

  // Helper method to check if TV app is listening on a WebSocket port
  async checkWebSocketPort(host, port) {
    return new Promise((resolve, reject) => {
      const testWs = new WebSocket(`ws://${host}:${port}`);
      
      const timeout = setTimeout(() => {
        testWs.close();
        reject(new Error(`Port ${port} not available`));
      }, 2000);
      
      testWs.onopen = () => {
        clearTimeout(timeout);
        testWs.close();
        resolve(true);
      };
      
      testWs.onerror = () => {
        clearTimeout(timeout);
        reject(new Error(`Port ${port} not available`));
      };
    });
  }

  // Test Scenario 2: Emulate Remote sending navigation commands
  async testNavigationCommands() {
    this.log('🧭 Testing Navigation Commands scenario...');
    
    if (!this.mockRemoteWs || this.mockRemoteWs.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected - run discovery test first');
    }
    
    try {
      // Test navigation to performer
      const navigateToPerformer = {
        type: 'navigation',
        timestamp: Date.now(),
        payload: {
          action: 'navigate_to_performer',
          targetId: 'performer_123',
          targetType: 'performer'
        }
      };
      
      this.mockRemoteWs.send(JSON.stringify(navigateToPerformer));
      this.log('Sent navigate_to_performer command');
      await this.sleep(1000);
      
      // Test navigation to video
      const navigateToVideo = {
        type: 'navigation',
        timestamp: Date.now(),
        payload: {
          action: 'navigate_to_video',
          targetId: 'video_456',
          targetType: 'video'
        }
      };
      
      this.mockRemoteWs.send(JSON.stringify(navigateToVideo));
      this.log('Sent navigate_to_video command');
      await this.sleep(1000);
      
      // Test navigation to scene
      const navigateToScene = {
        type: 'navigation',
        timestamp: Date.now(),
        payload: {
          action: 'navigate_to_scene',
          targetId: 'scene_789',
          targetType: 'segment'
        }
      };
      
      this.mockRemoteWs.send(JSON.stringify(navigateToScene));
      this.log('Sent navigate_to_scene command');
      await this.sleep(1000);
      
      this.success('Navigation Commands scenario completed successfully');
      
    } catch (error) {
      this.error(`Navigation Commands failed: ${error.message}`);
      throw error;
    }
  }

  // Test Scenario 3: Emulate Remote sending control commands
  async testControlCommands() {
    this.log('🎮 Testing Control Commands scenario...');
    
    if (!this.mockRemoteWs || this.mockRemoteWs.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected - run discovery test first');
    }
    
    try {
      // Test play command
      const playCommand = {
        type: 'control',
        timestamp: Date.now(),
        payload: {
          action: 'play',
          targetId: 'video_123'
        }
      };
      
      this.mockRemoteWs.send(JSON.stringify(playCommand));
      this.log('Sent play command');
      await this.sleep(1000);
      
      // Test pause command
      const pauseCommand = {
        type: 'control',
        timestamp: Date.now(),
        payload: {
          action: 'pause'
        }
      };
      
      this.mockRemoteWs.send(JSON.stringify(pauseCommand));
      this.log('Sent pause command');
      await this.sleep(1000);
      
      // Test resume command
      const resumeCommand = {
        type: 'control',
        timestamp: Date.now(),
        payload: {
          action: 'resume'
        }
      };
      
      this.mockRemoteWs.send(JSON.stringify(resumeCommand));
      this.log('Sent resume command');
      await this.sleep(1000);
      
      // Test back command
      const backCommand = {
        type: 'control',
        timestamp: Date.now(),
        payload: {
          action: 'back'
        }
      };
      
      this.mockRemoteWs.send(JSON.stringify(backCommand));
      this.log('Sent back command');
      await this.sleep(1000);
      
      // Test home command
      const homeCommand = {
        type: 'control',
        timestamp: Date.now(),
        payload: {
          action: 'home'
        }
      };
      
      this.mockRemoteWs.send(JSON.stringify(homeCommand));
      this.log('Sent home command');
      await this.sleep(1000);
      
      this.success('Control Commands scenario completed successfully');
      
    } catch (error) {
      this.error(`Control Commands failed: ${error.message}`);
      throw error;
    }
  }

  // Test Scenario 4: Emulate state synchronization
  async testStateSynchronization() {
    this.log('🔄 Testing State Synchronization scenario...');
    
    if (!this.mockRemoteWs || this.mockRemoteWs.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected - run discovery test first');
    }
    
    try {
      // Send data payload (performers data)
      const dataMessage = {
        type: 'data',
        timestamp: Date.now(),
        payload: {
          performers: [
            {
              id: 'performer_001',
              name: 'Test Performer',
              thumbnail: 'https://example.com/thumb1.jpg',
              description: 'Test performer for validation',
              videos: [
                {
                  id: 'video_001',
                  title: 'Test Video 1',
                  thumbnail: 'https://example.com/video1.jpg',
                  duration: '10:30',
                  url: 'https://youtube.com/watch?v=test1',
                  description: 'Test video for validation',
                  scenes: [
                    {
                      id: 'scene_001',
                      title: 'Test Scene 1',
                      timestamp: 0,
                      duration: 60,
                      thumbnail: 'https://example.com/scene1.jpg',
                      description: 'Test scene'
                    }
                  ]
                }
              ]
            }
          ]
        }
      };
      
      this.mockRemoteWs.send(JSON.stringify(dataMessage));
      this.log('Sent data payload to TV');
      await this.sleep(2000);
      
      // Send status update
      const statusMessage = {
        type: 'status',
        timestamp: Date.now(),
        payload: {
          currentState: {
            level: 'performers',
            breadcrumb: ['Home'],
            canGoBack: false
          },
          playerState: {
            isPlaying: false,
            currentTime: 0,
            duration: 0,
            volume: 100
          }
        }
      };
      
      this.mockRemoteWs.send(JSON.stringify(statusMessage));
      this.log('Sent status update to TV');
      await this.sleep(1000);
      
      this.success('State Synchronization scenario completed successfully');
      
    } catch (error) {
      this.error(`State Synchronization failed: ${error.message}`);
      throw error;
    }
  }

  // Helper method to check if HTTP endpoint is responding
  async checkHTTPEndpoint() {
    return new Promise((resolve, reject) => {
      const http = require('http');
      
      const req = http.get(this.tvAppUrl, (res) => {
        if (res.statusCode === 200) {
          resolve(true);
        } else {
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
      
      req.on('error', (error) => {
        reject(error);
      });
      
      req.setTimeout(5000, () => {
        req.destroy();
        reject(new Error('HTTP request timeout'));
      });
    });
  }

  // Helper method for sleep/delay
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Clean shutdown of TV app process
  async stopTVApp() {
    if (this.mockRemoteWs && this.mockRemoteWs.readyState === WebSocket.OPEN) {
      this.log('🔌 Closing WebSocket connection...');
      this.mockRemoteWs.close();
      this.mockRemoteWs = null;
    }
    
    if (this.tvProcess && !this.tvProcess.killed) {
      this.log('🛑 Stopping TV Angular application...');
      
      return new Promise((resolve) => {
        this.tvProcess.on('exit', () => {
          this.success('TV Angular application stopped');
          resolve();
        });
        
        // Try graceful shutdown first
        this.tvProcess.kill('SIGTERM');
        
        // Force kill after 5 seconds
        setTimeout(() => {
          if (!this.tvProcess.killed) {
            this.tvProcess.kill('SIGKILL');
          }
        }, 5000);
      });
    }
  }

  // Test runner - TV App testing workflow
  async runTests() {
    try {
      // Action 1.1: Start TV app
      await this.startTVApp();
      
      // Action 1.2: Wait for successful startup
      await this.waitForTVAppReady();
      
      // Action 1.3: Run test scenarios - emulate Remote behavior
      await this.runTestScenarios();
      
      // Action 1.4: Close the app (will be done by cleanup)
      
      this.log('📋 TV App Test Driver - All actions completed successfully');
      this.log('✅ TV Angular application tested with emulated Remote scenarios');
      this.log(`🌐 TV App URL: ${this.tvAppUrl}`);
      
      // Test complete - ready for cleanup
      this.log('🎯 Test complete. Press Ctrl+C to stop and close the TV application');
      
    } catch (error) {
      this.error(`TV app test failed: ${error.message}`);
      throw error;
    }
  }
}

// Handle graceful shutdown
let driver = null;

process.on('SIGINT', async () => {
  console.log('\n👋 Shutting down TV app test driver...');
  if (driver) {
    await driver.stopTVApp();
  }
  process.exit(0);
});

// Export for use as module or run directly
if (require.main === module) {
  driver = new TVAppTestDriver();
  driver.runTests().catch((error) => {
    console.error('TV app test driver failed:', error);
    process.exit(1);
  });
}

module.exports = TVAppTestDriver;
