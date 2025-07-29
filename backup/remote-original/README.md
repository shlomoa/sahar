# Remote Application Folder

This folder will contain the iPad remote control application.

## Purpose
- Houses the iPad application code
- Remote control interface for TV
- WebSocket client implementation

## Structure (To be created)
```
remote/
├── src/           # Source code
├── assets/        # Images, icons, fonts
├── config/        # Application configuration
└── package.json   # Dependencies and scripts
```

## Requirements
- iPad-optimized user interface
- WebSocket client for TV communication
- Touch-friendly controls
- Real-time response handling
- Connection status indicators

## Technology Stack
- **Mobile Framework**: NativeScript Angular (latest version)
- **UI Library**: Angular Material (latest version) + NativeScript UI components
- **WebSocket**: Native WebSocket API
- **State Management**: Angular Services with RxJS
- **Styling**: Angular Material theming + custom iPad-optimized styles

## Communication
- Connect to TV app WebSocket server
- Send control commands
- Receive status updates
- Handle connection/disconnection events
