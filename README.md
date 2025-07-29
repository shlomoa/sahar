# Sahar - TV Remote Control System

A complete dual-application system for synchronized TV and iPad remote control via WebSocket communication over LAN. Features YouTube-like performer content structure with enhanced video navigation controls.

## 🚀 System Overview

The system consists of two synchronized Angular applications that communicate in real-time:
- **TV Application**: Displays content and streams videos on the main screen
- **Remote Application**: iPad-optimized interface with enhanced video navigation controls
- **WebSocket Server**: Real-time communication hub for device discovery and control

## 📁 Project Structure

```
sahar/
├── apps/
│   ├── remote/                    # iPad Remote Application
│   │   ├── src/app/
│   │   │   ├── app.ts            # Main remote component
│   │   │   ├── app.html          # iPad-optimized UI
│   │   │   ├── app.scss          # Material Design styling
│   │   │   └── services/
│   │   │       └── websocket.service.ts
│   │   ├── package.json          # Angular 20.x + Material
│   │   └── angular.json          # Build configuration
│   └── tv/                       # TV Web Application
│       ├── src/app/
│       │   ├── app.ts            # Main TV component
│       │   ├── app.html          # TV-optimized layout
│       │   ├── app.scss          # Responsive TV styling
│       │   └── services/
│       │       ├── video-navigation.service.ts
│       │       └── websocket.service.ts
│       ├── package.json          # Angular 20.x + Material
│       └── angular.json          # Build configuration
├── shared/                       # Shared Models & Protocols
│   ├── models/
│   │   └── video-navigation.ts   # Data structure (4 performers, 11 videos, 44 scenes)
│   └── websocket/
│       └── websocket-protocol.ts # Communication protocol
├── websocket-test-server.js      # Node.js WebSocket test server
└── backup/                       # Original project backup
```

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
