# SAHAR TV Remote - Deployment Guide

*This is the definitive source of truth for deployment and testing.*

## 🚀 Quick Start

### Prerequisites
- **Node.js**: 18+ required
- **Angular CLI**: 20+ required  
- **Modern Browser**: WebSocket support (Chrome 88+, Firefox 85+, Safari 14+)
- **Network**: Local WiFi (TV and Remote on same subnet)

### Verification
```bash
# Check prerequisites
node --version    # Should be 18+
ng version       # Should be Angular CLI 20+
```

## 📦 Installation

### 1. Clone and Setup
```bash
# Clone repository
git clone <repository-url>
cd sahar

# Install dependencies
cd apps/tv && npm install
cd ../remote && npm install
cd ../..
```

### 2. Development Environment
```bash
# Start TV Application (Terminal 1)
cd apps/tv
ng serve --port 4203

# Start Remote Application (Terminal 2)  
cd apps/remote
ng serve --port 4202
```

### 3. Access Applications
- **TV Display**: http://localhost:4203
- **Remote Control**: http://localhost:4202

## 🔧 Production Deployment

### Build Applications
```bash
# Build TV app for production
cd apps/tv
ng build --configuration production

# Build Remote app for production
cd apps/remote  
ng build --configuration production
```

### Build Output
- **TV App**: `apps/tv/dist/` (499.55 kB bundle, 122.30 kB compressed)
- **Remote App**: `apps/remote/dist/` (497.13 kB bundle, 118.93 kB compressed)

### Serve Production Builds
```bash
# Serve TV app (example with http-server)
cd apps/tv/dist
npx http-server -p 4203 -c-1

# Serve Remote app
cd apps/remote/dist  
npx http-server -p 4202 -c-1
```

## 🌐 Network Configuration

### Port Configuration
- **TV App**: Port 4203 (HTTP development server)
- **Remote App**: Port 4202 (HTTP development server)
- **TV WebSocket Server**: Ports 5544-5547 (automatic selection)

### Firewall Requirements
Ensure these ports are open on local network:
- **4202-4203**: HTTP access to applications
- **5544-5547**: WebSocket communication between TV and Remote

### Network Discovery
The Remote app automatically discovers TV devices by:
1. Scanning local network IP range
2. Testing WebSocket connections on ports 5544-5547
3. Establishing connection with first responsive TV

## 🧪 Testing Procedures

### 1. Basic Functionality Test
```bash
# Start applications
cd apps/tv && ng serve --port 4203      # Terminal 1
cd apps/remote && ng serve --port 4202  # Terminal 2

# Test steps:
# 1. Open http://localhost:4203 (TV)
# 2. Open http://localhost:4202 (Remote)  
# 3. Verify WebSocket connection established
# 4. Verify data synchronization
```

### 2. Connection Testing
- [ ] **TV WebSocket Server**: Check console for "TV WebSocket server listening on port XXXX"
- [ ] **Remote Discovery**: Verify Remote finds TV within 10 seconds
- [ ] **Connection Status**: Remote should show "TV Connected" status
- [ ] **Data Transfer**: Both apps should display synchronized performers grid

### 3. Navigation Testing
- [ ] **Performer Selection**: Click performer on Remote → TV navigates to videos
- [ ] **Video Selection**: Click video on Remote → Both apps show scenes
- [ ] **Scene Selection**: Click scene → TV plays YouTube video
- [ ] **Back Navigation**: Back button returns to previous level
- [ ] **Home Navigation**: Home button returns to performers view

### 4. Video Control Testing  
- [ ] **Video Playback**: Scene selection triggers YouTube player on TV
- [ ] **Enhanced Controls**: Remote shows additional control buttons during video
- [ ] **Play/Pause**: Controls work from Remote app
- [ ] **Scene Navigation**: Previous/next scene buttons functional
- [ ] **Volume Control**: Volume adjustment from Remote

### 5. Error Handling Testing
- [ ] **Network Disconnection**: Simulate network loss → verify reconnection
- [ ] **Invalid Commands**: Test malformed messages → verify graceful handling
- [ ] **YouTube Errors**: Test unavailable videos → verify fallback behavior
- [ ] **Connection Timeout**: Test discovery timeout → verify retry logic

## 🔍 Troubleshooting

### Common Issues

#### "TV not found" Error
**Symptoms**: Remote app cannot discover TV
**Solutions**:
1. Verify both devices on same WiFi network
2. Check firewall settings (ports 5544-5547)
3. Restart TV app to reinitialize WebSocket server
4. Check browser console for WebSocket errors

#### WebSocket Connection Failed
**Symptoms**: Connection established but immediately drops
**Solutions**:
1. Check network stability
2. Verify port availability (5544-5547)
3. Check browser WebSocket support
4. Review browser console for specific error messages

#### Video Not Playing
**Symptoms**: Scene selected but YouTube video doesn't load
**Solutions**:
1. Verify YouTube video ID exists and is accessible
2. Check network connection for video streaming
3. Verify @angular/youtube-player component loaded
4. Check browser console for YouTube API errors

#### Data Not Syncing
**Symptoms**: Remote and TV show different content
**Solutions**:
1. Refresh both applications
2. Check WebSocket connection status
3. Verify data transfer completion in network tab
4. Check browser console for JSON parsing errors

### Debug Information

#### WebSocket Status Check
```javascript
// In browser console (TV app)
console.log('WebSocket Server Status:', window.webSocketServerStatus);

// In browser console (Remote app)  
console.log('WebSocket Connection:', window.webSocketConnection);
```

#### Network Discovery Debug
```javascript
// In browser console (Remote app)
console.log('Discovery Results:', window.discoveryResults);
console.log('Connection Attempts:', window.connectionAttempts);
```

### Performance Monitoring

#### Bundle Size Analysis
```bash
# Analyze TV app bundle
cd apps/tv
ng build --stats-json
npx webpack-bundle-analyzer dist/stats.json

# Analyze Remote app bundle
cd apps/remote
ng build --stats-json  
npx webpack-bundle-analyzer dist/stats.json
```

#### Network Performance
- **Latency Target**: <50ms for WebSocket commands
- **Discovery Time**: <10 seconds for TV detection
- **Connection Establishment**: <3 seconds
- **Data Transfer**: <5 seconds for complete data set

## 🔧 Development Workflow

### Local Development Setup
```bash
# Development with live reload
cd apps/tv && ng serve --port 4203 --host 0.0.0.0    # Allow network access
cd apps/remote && ng serve --port 4202 --host 0.0.0.0

# Access from other devices on network
# TV: http://<local-ip>:4203
# Remote: http://<local-ip>:4202
```

### Code Changes Testing
1. **TV App Changes**: 
   - Automatic reload on http://localhost:4203
   - WebSocket server restarts automatically
   - Test connection re-establishment

2. **Remote App Changes**:
   - Automatic reload on http://localhost:4202
   - Test discovery and connection logic
   - Verify data transfer and navigation

### Production Testing
```bash
# Build and test production versions
ng build --configuration production  # Both apps
# Deploy to local HTTP server
# Test with actual network discovery
# Verify performance characteristics
```

## 📱 Device-Specific Deployment

### TV Application Deployment
**Target**: Large screen displays (Smart TVs, computers connected to TVs)
- **Screen Size**: 32"+ recommended
- **Resolution**: 1920x1080 minimum
- **Browser**: Kiosk mode recommended
- **Network**: Stable WiFi connection required

### Remote Application Deployment  
**Target**: Tablets and smartphones
- **Screen Size**: 7"+ recommended for optimal experience
- **Touch**: Multi-touch support required
- **Browser**: Mobile-optimized (Safari on iOS, Chrome on Android)
- **Network**: Same WiFi network as TV

### Smart TV Integration
For deployment on actual Smart TV platforms:
1. **Tizen (Samsung)**: Package as Tizen web app
2. **webOS (LG)**: Package as webOS app
3. **Android TV**: Deploy as Progressive Web App (PWA)
4. **Apple TV**: Use AirPlay for web content

## 🔐 Security Considerations

### Network Security
- **Local Network Only**: Applications designed for trusted local networks
- **No External Dependencies**: No cloud services or external APIs required
- **Data Privacy**: All data remains on local devices
- **WebSocket Security**: Uses standard WebSocket protocol over local network

### Production Hardening
- **HTTPS**: Use HTTPS in production for secure WebSocket connections (WSS)
- **Content Security Policy**: Implement CSP headers for web application security
- **Input Validation**: All WebSocket messages validated before processing
- **Rate Limiting**: Prevent message flooding between devices

## 📊 Monitoring and Analytics

### Application Monitoring
```javascript
// Performance monitoring
window.performance.mark('app-start');
window.performance.mark('connection-established');
window.performance.measure('connection-time', 'app-start', 'connection-established');
```

### Error Tracking
```javascript
// WebSocket error tracking
window.addEventListener('error', (event) => {
  console.error('Application Error:', event);
});

// WebSocket connection monitoring
webSocket.addEventListener('error', (event) => {
  console.error('WebSocket Error:', event);
});
```

### Usage Analytics
- **Connection Success Rate**: Track discovery and connection success
- **Command Response Time**: Monitor WebSocket message latency
- **Video Playback**: Track successful YouTube video loads
- **User Interactions**: Monitor navigation patterns

---

*For architecture details, see [ARCHITECTURE.md](./ARCHITECTURE.md)*  
*For protocol specification, see [PROTOCOL.md](./PROTOCOL.md)*  
*For project overview, see [README.md](./README.md)*
