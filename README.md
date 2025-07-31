# SAHAR TV Remote Control System 📺

A sophisticated Angular-based remote control system for smart TVs, featuring real-time WebSocket communication, device discovery, and YouTube video integration.

## 🎯 Architecture Overview

```
Remote App (Tablet) ←→ WebSocket Server ←→ TV App (Display)
     (Data Owner)      (Multi-port Bridge)    (Video Player)
```

### Core Components
- **Remote App**: Touch-friendly tablet interface for navigation and control
- **TV App**: Large-screen display with YouTube video player integration  
- **WebSocket Server**: Multi-port communication bridge with device discovery
- **Shared Models**: Type-safe data structures and communication protocols

## ✨ Key Features

### Remote App (`apps/remote`)
- 🔍 **Auto Device Discovery**: Sophisticated RxJS-based scanning and connection
- 📱 **Touch Navigation**: Intuitive grid-based interface for performers, videos, and scenes
- 🎮 **Enhanced Controls**: Scene navigation, playback controls, and volume adjustment
- 🔗 **Auto-Connect**: Intelligent connection management with timeout handling
- 📊 **Real-time Sync**: Navigation state synchronized with TV display

### TV App (`apps/tv`)
- 🎬 **YouTube Integration**: Scene-based video playback with `@angular/youtube-player`
- 📡 **Data Reception**: Receives all content data from Remote via WebSocket
- 🖼️ **Responsive Grid**: Beautiful card-based layout for content browsing
- 🎯 **Scene Seeking**: Automatic seeking to specific timestamps in videos
- 📺 **TV-Optimized**: Large fonts, remote control navigation support

### WebSocket Communication
- 🌐 **Multi-Port Architecture**: Primary (8000) + Discovery (5544-5547)
- 🔄 **Protocol Support**: Navigation commands, data messages, control signals
- 🛡️ **Error Handling**: Robust reconnection and fallback mechanisms
- 📱 **Device Types**: Remote/TV identification and pairing

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Angular CLI 20+
- Modern browser with WebSocket support

### Installation & Setup

```bash
# Clone repository
git clone <repository-url>
cd sahar

# Install dependencies for both apps
cd apps/remote && npm install
cd ../tv && npm install
cd ../..
```

### Running the System

```bash
# Terminal 1: Start WebSocket Server
node websocket-test-server-multiport.js

# Terminal 2: Start TV Application
cd apps/tv && ng serve --port 4203

# Terminal 3: Start Remote Application  
cd apps/remote && ng serve --port 4202
```

### Access Points
- **TV Display**: http://localhost:4203
- **Remote Control**: http://localhost:4202
- **WebSocket Server**: ws://localhost:8000

## 📱 Usage Workflow

1. **Device Discovery**: Remote automatically scans for TV devices
2. **Auto-Connect**: Establishes WebSocket connection when TV found
3. **Data Transfer**: Remote sends performers/videos data to TV
4. **Navigation Sync**: Both apps show synchronized content navigation
5. **Video Playback**: Scene selection triggers YouTube player on TV
6. **Remote Control**: Use tablet for navigation and playback control

## 🏗️ Project Structure

```
sahar/
├── apps/
│   ├── remote/                 # Remote control tablet app
│   │   ├── src/app/
│   │   │   ├── components/     # UI components (grids, controls)
│   │   │   ├── services/       # WebSocket & auto-connect logic
│   │   │   └── models/         # Data models with sample content
│   │   └── package.json
│   └── tv/                     # TV display application  
│       ├── src/app/
│       │   ├── components/     # Video player component
│       │   ├── services/       # Data reception & navigation
│       │   └── models/         # TV-side data models
│       └── package.json
├── shared/                     # Shared protocols and models
│   ├── models/
│   └── websocket/
├── websocket-test-server-multiport.js  # WebSocket bridge server
└── docs/                      # Additional documentation
```

## 🎬 Video Integration

### YouTube Player Features
- **Scene-Based Playback**: Automatic seeking to scene timestamps
- **Responsive Design**: Adapts to different TV screen sizes
- **Control Integration**: Play/pause/seek via Remote app
- **Error Handling**: Graceful fallbacks for unavailable videos

### Sample Content Structure
```typescript
interface Video {
  id: string;
  title: string;
  youtubeId: string;        // YouTube video ID for playback
  likedScenes: LikedScene[];
}

interface LikedScene {
  id: string;
  title: string;
  startTime: number;        // Seconds for seeking
  endTime?: number;
}
```

## 🔧 Configuration

### WebSocket Ports
- **Primary**: 8000 (main communication)
- **Discovery**: 5544-5547 (device scanning)
- **TV App**: 4203 (Angular dev server)
- **Remote App**: 4202 (Angular dev server)

### Auto-Connect Settings
```typescript
// In Remote app WebSocket service
autoConnectDelay: 1000,      // Wait time after scan completion
scanTimeout: 10000,          // Device discovery timeout
retryAttempts: 3             // Connection retry limit
```

## 🧪 Testing & Verification

### Build Verification
```bash
# Test Remote app build
cd apps/remote && ng build

# Test TV app build  
cd apps/tv && ng build
```

### Manual Testing Checklist
- [ ] WebSocket server starts without errors
- [ ] Remote app discovers TV device
- [ ] Auto-connect establishes connection
- [ ] Data synchronization (performers → TV)
- [ ] Navigation sync (Remote ↔ TV)
- [ ] YouTube video playback
- [ ] Scene seeking functionality
- [ ] Control commands (play/pause/volume)

## 📊 System Status

### Build Status
- ✅ **Remote App**: 492.37 kB (builds successfully)
- ✅ **TV App**: 487.48 kB (builds successfully) 
- ✅ **WebSocket Server**: Multi-port architecture operational
- ✅ **YouTube Integration**: @angular/youtube-player package integrated

### Recent Updates
- **Video Player**: Complete YouTube integration with scene seeking
- **Auto-Connect**: Sophisticated RxJS-based device connection
- **Data Architecture**: Remote owns data, TV receives via WebSocket
- **Error Handling**: Robust connection management and fallbacks

## 🛠️ Development

### Key Technologies
- **Frontend**: Angular 20+ with Material Design
- **Communication**: WebSocket with custom protocol
- **Video**: YouTube Player API integration
- **Reactive**: RxJS for async operations and state management
- **Styling**: SCSS with responsive design

### Architecture Principles
- **Single Source of Truth**: Remote app owns all data
- **Reactive Design**: Observable-based state management  
- **Separation of Concerns**: Clear Remote vs TV responsibilities
- **Error Resilience**: Graceful degradation and recovery

## 📖 Additional Documentation

- [Architecture Details](./ARCHITECTURE-CORRECTED.md)
- [Integration Status](./INTEGRATION-STATUS.md)
- [Port Configuration](./PORT-CONFIGURATION.md)
- [Build Status](./BUILD-STATUS.md)
- [Verification Results](./VERIFICATION-RESULTS.md)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**SAHAR TV Remote** - Transforming the smart TV experience with intelligent remote control 🚀

## 🎯 Applications

### 1. TV Application
- **Location**: `./apps/tv/`
- **URL**: `http://localhost:4203`
- **Purpose**: Main display for content and video streaming
- **Technology**: Angular 20.x + Angular Material 20.1.3 (Standalone API)
- **Features**:
  - 80% data view layout with performer thumbnails
  - WebSocket communication for remote control
  - Video streaming capability
  - Material Design responsive grid layout

### 2. Remote Application (iPad)
- **Location**: `./apps/remote/`
- **URL**: `http://localhost:4202`
- **Purpose**: iPad remote control with synchronized content display
- **Technology**: Angular 20.x + Angular Material 20.1.3 (Standalone API)
- **Features**:
  - Synchronized content navigation (performers → videos → scenes)
  - Enhanced video navigation buttons when scenes are selected
  - Device discovery via UDP broadcast
  - iPad-optimized Material Design interface
  - Real-time WebSocket communication

## 🔧 Technology Stack

- **Frontend**: Angular 20.0.5 with Standalone Components
- **UI Framework**: Angular Material 20.1.3
- **Communication**: WebSocket protocol over LAN
- **Styling**: SCSS with Material Design theming
- **Animation**: Angular Animations (required dependency)
- **Build System**: Angular CLI with optimized bundles

## 📊 Data Structure

The system uses a YouTube-like hierarchical content structure:
- **4 Performers**: Top-level content creators
- **11 Videos**: Video collections per performer
- **44 Scenes**: Individual scenes within videos
- **Enhanced Controls**: Additional navigation buttons for scene playback

## 🌐 Communication Protocol

### WebSocket Messages
```typescript
// Navigation Commands
{ type: 'NAVIGATE_TO_PERFORMER', performerId: string }
{ type: 'NAVIGATE_TO_VIDEO', videoId: string }
{ type: 'NAVIGATE_TO_SCENE', sceneId: string }

// Control Commands
{ type: 'PLAY_VIDEO', sceneId: string }
{ type: 'PAUSE_VIDEO' }
{ type: 'VOLUME_CHANGE', level: number }

// Device Discovery
{ type: 'DEVICE_DISCOVERY', deviceInfo: object }
{ type: 'CONNECTION_STATUS', status: 'connected' | 'disconnected' }
```

### Connection Details
- **WebSocket Server**: `ws://localhost:8000`
- **Device Discovery**: UDP broadcast on LAN
- **Real-time Sync**: Bidirectional communication
- **Auto-reconnection**: Error handling and retry logic

## 🚀 Quick Start

### Prerequisites
```bash
# Ensure Node.js and Angular CLI are installed
node --version  # v20+
ng version      # Angular CLI 20+
```

### 1. Start WebSocket Server
```bash
node websocket-test-server.js
# Server starts on ws://localhost:8000
```

### 2. Start TV Application
```bash
cd apps/tv
ng serve --port 4203
# TV app available at http://localhost:4203
```

### 3. Start Remote Application
```bash
cd apps/remote
ng serve --port 4202
# Remote app available at http://localhost:4202
```

### 4. Build for Production
```bash
# Build TV app
cd apps/tv && ng build

# Build Remote app
cd apps/remote && ng build
```

## ✅ Development Status

### Completed Features
- ✅ **Project Architecture**: Complete Angular CLI workspace setup
- ✅ **TV Application**: Fully functional with WebSocket integration
- ✅ **Remote Application**: iPad-optimized interface with Material Design
- ✅ **WebSocket Communication**: Real-time protocol tested and validated
- ✅ **Data Models**: Hierarchical content structure (performers/videos/scenes)
- ✅ **Build System**: Both applications compile successfully
- ✅ **Test Server**: Node.js WebSocket server for development testing
- ✅ **Enhanced Video Controls**: Additional navigation buttons for scene playback
- ✅ **Device Discovery**: UDP broadcast protocol for LAN device detection

### System Validation
- **TV-Remote Communication**: ✅ Tested and functional
- **Build Process**: ✅ Both apps compile without errors
- **Development Servers**: ✅ Running on ports 4203 (TV) and 4202 (Remote)
- **WebSocket Server**: ✅ Active on localhost:8000
- **Material Design**: ✅ Fully integrated with animations support

## 🔄 Usage Workflow

1. **Device Discovery**: Remote app broadcasts to find TV on LAN
2. **Connection**: WebSocket connection established between devices
3. **Content Sync**: Both devices show synchronized performer/video/scene navigation
4. **Enhanced Controls**: When scene selected, remote shows additional video navigation buttons
5. **Video Streaming**: TV streams selected scene while remote provides enhanced controls

## 🛠️ Development Guidelines

### Code Standards
- TypeScript strict mode enabled
- Angular Standalone Components architecture
- Material Design principles
- Responsive design for multiple screen sizes
- WebSocket error handling and reconnection

### Testing Strategy
- Unit tests for services and components
- Integration tests for WebSocket communication
- End-to-end testing for TV-Remote synchronization
- Performance testing for real-time communication

## 📋 Build Configuration

Both applications use optimized Angular build settings:
- **Bundle Budgets**: Increased for Material Design components
- **Code Splitting**: Lazy loading for optimal performance
- **SCSS Processing**: Material theming and responsive styles
- **TypeScript**: Strict compilation with type safety
