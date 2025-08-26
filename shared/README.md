# Shared Components and Models

*Common models, services, and components used by both TV and Remote applications.*

## 🎯 Purpose

The shared folder contains all common code, models, and protocols used by both the TV and Remote applications. This ensures consistency and maintains the single source of truth principle across the SAHAR TV Remote Control System.

**Contents**: Common Models, Components, and Protocols
- **Models**: TypeScript interfaces and data structures
- **Components**: Reusable UI components (performers, videos, scenes grids)
- **Services**: Shared business logic and utilities
- **WebSocket Protocol**: Communication protocol definitions

## 📁 Structure

```
shared/
├── components/           # Reusable UI components
│   ├── index.ts         # Component exports
│   ├── performers-grid/ # Performers grid display
│   ├── scenes-grid/     # Scenes grid display
│   └── videos-grid/     # Videos grid display
├── models/              # TypeScript interfaces and data models
│   ├── video-navigation.ts        # Navigation state models
│   └── video-navigation.service.ts # Navigation service interface
├── services/            # Shared business logic (empty - app-specific)
└── websocket/           # WebSocket communication protocol
    └── websocket-protocol.ts      # Protocol v2.0 definitions
```

## 🔗 Usage in Applications

### Symlink Architecture
Both TV and Remote applications access shared code via symbolic links:

```bash
apps/tv/src/shared -> ../../../shared/      # TV app symlink
apps/remote/src/shared -> ../../../shared/  # Remote app symlink
```

```powershell
# Create symlinks (from repo root)
cd apps\tv\src\
New-Item -ItemType SymbolicLink -Path shared -Target ..\..\..\shared
cd ..\..\remote\src\
New-Item -ItemType SymbolicLink -Path shared -Target ..\..\..\shared
```

### Import Examples
```typescript
// In TV or Remote app (using symlinks)
import { PerformersGridComponent } from './shared/components';
import { VideoNavigation, Scene } from './shared/models/video-navigation';
import { WebSocketProtocol } from './shared/websocket/websocket-protocol';

// Alternative: Direct path (without symlinks)
import { PerformersGridComponent } from '../../shared/components';
import { VideoNavigation, Scene } from '../../shared/models/video-navigation';
import { WebSocketProtocol } from '../../shared/websocket/websocket-protocol';
```

---

*Part of the SAHAR TV Remote Control System*  
*For complete documentation, see [../README.md](../README.md)*
