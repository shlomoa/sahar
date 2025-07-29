# TV Application (Web)

The main display application for the Sahar TV Remote Control System. Optimized for TV screens with WebSocket communication for remote control.

## 🎯 Purpose
- **Content Display**: Shows performers, videos, and scenes in TV-optimized layout
- **Video Streaming**: Streams selected video content on the main screen
- **Remote Control**: Receives commands from iPad remote via WebSocket
- **Real-time Sync**: Maintains synchronized navigation state with remote device

## 🚀 Current Status: ✅ FULLY FUNCTIONAL

### ✅ Completed Features
- **Angular 20.x Setup**: Standalone components with Angular Material 20.1.3
- **TV-Optimized Layout**: 80% data view with responsive Material Design grid
- **WebSocket Integration**: Real-time communication with remote application
- **Video Navigation**: Complete navigation through 4 performers, 11 videos, 44 scenes
- **Material Design**: Comprehensive UI with theming and animations
- **Build System**: Production-ready with optimized bundles

### 🌐 Running Configuration
- **Development Server**: `http://localhost:4203`
- **Build Output**: `./dist/tv/`
- **WebSocket Client**: Connects to `ws://localhost:8000`

## 📊 Data Structure
```typescript
// 4 Performers with hierarchical content
performers: [
  {
    id: 'performer-1',
    name: 'Artist One',
    thumbnail: 'performer1.jpg',
    videos: [
      {
        id: 'video-1-1',
        title: 'Performance Collection 1',
        scenes: [
          { id: 'scene-1-1-1', title: 'Opening Act', duration: '5:30' },
          { id: 'scene-1-1-2', title: 'Main Performance', duration: '12:45' }
          // ... 11 total scenes per video
        ]
      }
      // ... 11 total videos per performer
    ]
  }
  // ... 4 total performers (44 total scenes)
]
```

## 🎨 Layout Design

```
┌─────────────────────────────────────────┐
│ Navigation Bar (10%)                    │
│ 🏠 [Sahar] > [Performer] > [Video]      │
├─────────────────────────────────────────┤
│                                         │
│ Material Design Grid (80%)              │
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐        │
│ │ IMG │ │ IMG │ │ IMG │ │ IMG │        │
│ │Title│ │Title│ │Title│ │Title│        │
│ └─────┘ └─────┘ └─────┘ └─────┘        │
│                                         │
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐        │
│ │ IMG │ │ IMG │ │ IMG │ │ IMG │        │
│ │Title│ │Title│ │Title│ │Title│        │
│ └─────┘ └─────┘ └─────┘ └─────┘        │
│                                         │
├─────────────────────────────────────────┤
│ Connection Status (10%)                 │
│ 🟢 Remote Connected | WebSocket Active  │
└─────────────────────────────────────────┘
```

## 🔧 Technology Stack
- **Framework**: Angular 20.0.5 (Standalone Components)
- **UI Library**: Angular Material 20.1.3
- **Styling**: SCSS with Material Design theming
- **Communication**: WebSocket client (native API)
- **Layout**: CSS Grid with Angular Flex Layout
- **Navigation**: Custom VideoNavigationService + Angular Router
- **Animations**: Angular Animations (required dependency)

## 🌐 WebSocket Integration

### Receives Commands
```typescript
// Navigation from remote
{ type: 'NAVIGATE_TO_PERFORMER', performerId: string }
{ type: 'NAVIGATE_TO_VIDEO', videoId: string }  
{ type: 'NAVIGATE_TO_SCENE', sceneId: string }

// Video control from remote
{ type: 'PLAY_VIDEO', sceneId: string }
{ type: 'PAUSE_VIDEO' }
{ type: 'VOLUME_CHANGE', level: number }
```

### Sends Status Updates
```typescript
// Current navigation state
{ type: 'NAVIGATION_UPDATE', currentView: string, selectedItem: object }

// Connection status
{ type: 'TV_STATUS', status: 'ready' | 'playing' | 'paused' }
```

## 🚀 Development Commands

### Start Development Server
```bash
ng serve --port 4203
# TV app available at http://localhost:4203
```

### Build for Production
```bash
ng build
# Output: ./dist/tv/
```

### Testing
```bash
ng test          # Unit tests
ng e2e           # End-to-end tests
```

### Code Generation
```bash
ng generate component component-name
ng generate service service-name
ng generate --help  # Available schematics
```

## 📁 Key Files

### Core Application
- **`src/app/app.ts`**: Main TV component with WebSocket integration
- **`src/app/app.html`**: TV-optimized Material Design layout
- **`src/app/app.scss`**: Responsive styling with Material theming

### Services
- **`src/app/services/video-navigation.service.ts`**: Navigation state management
- **`src/app/services/websocket.service.ts`**: WebSocket communication

### Configuration
- **`angular.json`**: Build configuration with bundle optimization
- **`package.json`**: Angular 20.x + Material dependencies
- **`tsconfig.json`**: TypeScript strict mode configuration

## 🔄 Communication Flow

1. **Startup**: TV app connects to WebSocket server on `ws://localhost:8000`
2. **Device Discovery**: Responds to remote device discovery requests
3. **Navigation Sync**: Receives navigation commands from remote
4. **Status Broadcasting**: Sends current state to remote application
5. **Video Control**: Processes play/pause/volume commands from remote

## 🎯 User Experience

### Navigation Levels
1. **Performers**: Grid of 4 performer thumbnails
2. **Videos**: Grid of 11 video collections for selected performer
3. **Scenes**: Grid of scene thumbnails for selected video
4. **Video Player**: Full-screen video streaming with remote control

### Material Design Features
- **Responsive Grid**: Adapts to different TV screen sizes
- **Smooth Animations**: Page transitions and hover effects
- **Consistent Theming**: Material Design color palette
- **Accessibility**: ARIA labels and keyboard navigation

## 🛠️ Performance Optimization

- **Lazy Loading**: Components loaded on demand
- **Bundle Splitting**: Optimized JavaScript chunks
- **Image Optimization**: Responsive thumbnails
- **WebSocket Management**: Efficient connection handling
- **Change Detection**: OnPush strategy for performance

## 📋 Build Configuration

### Bundle Budgets
- **Initial Bundle**: 1MB warning, 2MB error
- **Component Styles**: 12kB warning, 20kB error
- **Optimized Output**: Minified and compressed

### Development vs Production
- **Development**: Source maps, hot reload, debugging
- **Production**: Minification, tree shaking, optimization

---

*Part of the Sahar TV Remote Control System - Real-time synchronized TV and iPad remote control via WebSocket*
