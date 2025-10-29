# Shared

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.1.0.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the library, run:

```bash
ng build shared
```

This command will compile your project, and the build artifacts will be placed in the `dist/` directory.

### Publishing the Library

Once the project is built, you can publish your library by following these steps:

1. Navigate to the `dist` directory:
   ```bash
   cd dist/shared
   ```

2. Run the `npm publish` command to publish your library to the npm registry:
   ```bash
   npm publish
   ```

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.



# Shared Library

Angular library package containing common models, services, components, and protocol definitions used by both TV and Remote applications.

## 🎯 Purpose

The shared library is an Angular library that provides all common code, models, and protocols for the SAHAR TV Remote Control System. It ensures consistency and maintains the single source of truth principle.

**Contents**: Common Models, Services, Components, and Protocol v3.0
- **Models**: TypeScript interfaces and data structures
- **Components**: Reusable UI components (performers, videos, scenes grids)
- **Services**: Shared business logic (WebSocket base, ContentService, navigation)
- **Protocol**: WebSocket Protocol v3.0 definitions and utilities

## 📁 Structure

```
shared/shared/src/lib/
├── components/           # Reusable UI components
│   ├── index.ts         # Component exports
│   ├── app-toolbar/         # Shared navigation toolbar (TV + Remote)
│   ├── back-card/           # Back navigation card
│   ├── button-description-panel/  # Accessibility: Description panel
│   ├── device-connection/   # Connection status display
│   ├── navigation/          # Navigation root component
│   ├── performers-grid/     # Performers grid component
│   ├── scenes-grid/         # Scenes grid component
│   └── videos-grid/         # Videos grid component
├── directives/          # Shared directives
│   ├── index.ts         # Directive exports
│   └── focus-desc.directive.ts  # Accessibility: Focus + description
├── models/              # TypeScript interfaces and data models
│   ├── application-state.ts    # Core state interface
│   ├── messages.ts             # Protocol message types and unions
│   ├── video-navigation.ts     # Navigation data models
│   └── websocket-protocol.ts   # Protocol v3.0 definitions
├── services/            # Shared services
│   ├── button-description.service.ts  # Accessibility: Description state
│   ├── catalog-helper.service.ts      # Catalog computed signals
│   ├── content.service.ts             # HTTP catalog fetching + caching
│   ├── narration.service.ts           # Accessibility: Text-to-speech
│   ├── video-navigation.service.ts    # Navigation state queries
│   └── websocket-base.service.ts      # Base WebSocket client
└── utils/               # Utility functions
    ├── logging.ts       # Structured logging helpers
    ├── websocket-utils.ts   # Protocol utilities
    └── youtube-helpers.ts   # YouTube URL/thumbnail helpers
```

## 🔗 Usage in Applications

The shared library is built as an npm package and installed as a dependency in TV, Remote, and Server applications.

### Building the Library

```bash
# From repo root or shared directory
npm run build -w shared

# Or from shared/shared directory
ng build shared
```

Build artifacts are placed in `dist/shared/`.

### Installing in Applications

After building, install the package in consuming applications:

```bash
# From TV app directory
npm install ../../shared/dist/shared --save

# From Remote app directory  
npm install ../../shared/dist/shared --save

# From Server directory
npm install ../shared/dist/shared --save
```

### Import Examples

```typescript
// Import models
import { ApplicationState, CatalogData, Performer, Video, Scene } from 'shared';
import { WebSocketMessage, NavigationCommand, ControlCommand } from 'shared';
import { WEBSOCKET_CONFIG, ERROR_CODES } from 'shared';

// Import services
import { ContentService } from 'shared';
import { WebSocketBaseService } from 'shared';
import { VideoNavigationService } from 'shared';

// Import components
import { PerformersGridComponent, VideosGridComponent, ScenesGridComponent } from 'shared';
import { DeviceConnectionComponent } from 'shared';
import { AppToolbarComponent } from 'shared';
import { ButtonDescriptionPanelComponent } from 'shared';
import { SharedNavigationRootComponent } from 'shared';

// Import directives
import { FocusDescDirective } from 'shared';

// Import accessibility services
import { NarrationService, ButtonDescriptionService } from 'shared';

// Import utilities
import { createLogger } from 'shared';
import { validateMessage, createErrorMessage } from 'shared';
import { extractYouTubeId, getYouTubeThumbnail } from 'shared';
```

## 📡 Protocol v3.0

The shared library defines Protocol v3.0 (Stop-and-Wait) used for WebSocket communication:

- **Message Types**: `register`, `navigation_command`, `control_command`, `state_sync`, `ack`, `error`, `heartbeat`
- **ACK Protocol**: Clients must ACK each `state_sync` with the received version
- **Validation**: Message structure validation and error codes
- **Configuration**: `WEBSOCKET_CONFIG` (port, timeouts, paths)

See `models/websocket-protocol.ts` for complete protocol definitions.

## 🧩 Key Services

### ContentService
HTTP-based catalog fetching with caching:
```typescript
const catalog = await contentService.getCatalog();
// Returns: { performers, videos, scenes }
```

### WebSocketBaseService
Abstract base class for WebSocket clients with:
- Connection management and reconnection logic
- Message sending with type-safe generators
- Handler registration for incoming messages
- Heartbeat and connection state tracking

### VideoNavigationService
Stateless catalog query service:
- `getPerformers()`, `getVideos(performerId)`, `getScenes(videoId)`
- `getPerformer(id)`, `getVideo(id)`, `getScene(id)`
- Validates IDs and returns typed results

## 🎨 Components

All components are Angular 20 standalone components with Material Design:

- **AppToolbarComponent**: Shared navigation toolbar for TV and Remote apps
  - Signal-based inputs: `title`, `connectionStatus`
  - Output: `homeClick` event
  - Automatically styled with Material theming
  - App-specific height overrides via host styles
- **PerformersGridComponent**: Grid display of performers with thumbnails
- **VideosGridComponent**: Grid display of videos for a performer
- **ScenesGridComponent**: Grid display of scenes for a video
- **DeviceConnectionComponent**: Real-time connection status indicator
- **ButtonDescriptionPanelComponent**: Accessibility - Fixed bottom banner for button descriptions
- **SharedNavigationRootComponent**: Unified navigation component for performers → videos → scenes

## 🎯 Directives

- **FocusDescDirective**: Accessibility - Handles focus/blur, mouse hover, and touch long-press for button descriptions and narration

## ♿ Accessibility Services

- **NarrationService**: Hebrew text-to-speech with Web Speech API
  - Language support: `he-IL`
  - Smart voice selection (Google Hebrew preferred)
  - Niqqud/cantillation handling
  - Signal-based state: `isSpeaking`, `isSupported`, `isEnabled`
- **ButtonDescriptionService**: Signal-based state management for button descriptions
  - Simple API: `description` signal, `setDescription()` method

## 🔍 Utilities

- **Logging**: `createLogger(component)` - Structured JSON logging
- **WebSocket**: `validateMessage()`, `createErrorMessage()` - Protocol helpers
- **YouTube**: `extractYouTubeId()`, `getYouTubeThumbnail()` - YouTube URL parsing

## 🧪 Testing

```bash
# Run unit tests
ng test shared
```

---

*Part of the SAHAR TV Remote Control System*  
*For complete documentation, see [../../README.md](../../README.md)*
