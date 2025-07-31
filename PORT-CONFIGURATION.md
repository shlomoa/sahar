# 🌐 SAHAR TV Remote - Port Configuration Guide

## 📊 **Port Usage Overview**

### **Development Server Ports (HTTP)**

#### **Port 4202 - Remote Application**
- **Service:** Angular Development Server  
- **Application:** `apps/remote/` (Tablet/Mobile Interface)
- **Access:** `http://localhost:4202`
- **Purpose:** 
  - Touch-friendly remote control interface
  - Device discovery and connection management
  - Navigation command input (performers → videos → scenes)
  - Video playback controls (play/pause/volume/seek)
- **User Role:** Primary interaction device (tablet/phone)
- **Build Size:** ~124 kB (includes WebSocket service)

#### **Port 4203 - TV Application**  
- **Service:** Angular Development Server
- **Application:** `apps/tv/` (Television Display Interface)
- **Access:** `http://localhost:4203`
- **Purpose:**
  - Large-screen content display
  - Receives navigation commands from Remote
  - Shows performers grid, videos list, scenes timeline
  - Video playback display and status updates
- **User Role:** Display device (TV/monitor)
- **Build Size:** ~67 kB (focused on display logic)

### **WebSocket Communication Ports**

#### **Ports 5544-5547 - Primary Discovery Range**
- **Protocol:** WebSocket (ws://)
- **Purpose:** Device discovery and communication per user story requirements
- **Specification:** "use a jump list with 4 ports between 5544 and 5547"
- **Services:**
  - **Port 5544:** WebSocket server instance #1
  - **Port 5545:** WebSocket server instance #2  
  - **Port 5546:** WebSocket server instance #3
  - **Port 5547:** WebSocket server instance #4
- **Discovery Process:** Remote app scans all 4 ports across gateway IP range
- **Status:** ✅ **REQUIRED** (per user story)

#### **Port 8000 - Development Fallback**
- **Protocol:** WebSocket (ws://)
- **Purpose:** Development testing and compatibility fallback
- **Rationale:** 
  - Common development server port
  - Existing TV app compatibility
  - Immediate testing without network scanning
  - Backward compatibility during development
- **Status:** 🔧 **OPTIONAL** (development convenience)

## 🎯 **Port Selection Rationale**

### **Why 4202/4203 for Angular Apps?**
1. **Angular CLI Convention:** `ng serve` defaults to 4200, increments for conflicts
2. **Multi-App Workspace:** Sequential ports for related applications  
3. **Development Standard:** Common practice for Angular development
4. **Port Availability:** Higher likelihood of being available on developer machines
5. **User Story Compliance:** Application server ports not specified in requirements

### **Why 5544-5547 for WebSocket?**
1. **User Story Requirement:** Explicitly specified port range
2. **Network Discovery:** Supports IP scanning across gateway range
3. **Load Distribution:** Multiple ports for redundancy/load balancing
4. **Protocol Separation:** Dedicated ports for WebSocket communication

### **Why Include 8000?**
1. **Development Convenience:** Immediate testing without full discovery
2. **Compatibility:** Existing Angular/TV app configurations
3. **Fallback Strategy:** Ensures connectivity during development
4. **Testing Isolation:** Single port for focused debugging

## 🔧 **Development Workflow**

### **Full System Testing**
```bash
# 1. Start WebSocket servers (all 5 ports)
node websocket-test-server-multiport.js

# 2. Start TV application  
cd apps/tv && ng serve --port 4203

# 3. Start Remote application
cd apps/remote && ng serve --port 4202

# 4. Test discovery
# Remote (4202) → Scan ports 5544-5547 → Find TV devices
# Remote (4202) → Connect to TV via WebSocket (5544-5547)
# TV (4203) → Receive commands and update display
```

### **Quick Development Testing**
```bash
# Use port 8000 fallback for rapid testing
# Remote app will find "Local TV (Test)" on localhost:8000
# Skip network discovery for immediate connectivity testing
```

## 📋 **Port Summary Table**

| Port | Service | Protocol | Purpose | Status |
|------|---------|----------|---------|--------|
| 4202 | Remote App | HTTP | Tablet interface | ✅ Active |
| 4203 | TV App | HTTP | Display interface | ✅ Active |
| 5544 | WebSocket #1 | WS | Discovery/Comm | ✅ Required |
| 5545 | WebSocket #2 | WS | Discovery/Comm | ✅ Required |
| 5546 | WebSocket #3 | WS | Discovery/Comm | ✅ Required |
| 5547 | WebSocket #4 | WS | Discovery/Comm | ✅ Required |
| 8000 | WebSocket Test | WS | Dev fallback | 🔧 Optional |

## 🎉 **Integration Flow**

1. **User opens Remote app** → `http://localhost:4202`
2. **Device discovery initiates** → Scans `192.168.1.x:5544-5547`
3. **TV devices found** → Lists available WebSocket servers
4. **Connection established** → Remote ↔ TV via WebSocket
5. **Navigation synchronizes** → Commands flow Remote → TV
6. **TV displays content** → `http://localhost:4203` shows result

This configuration provides **robust discovery** (5544-5547) with **development convenience** (8000) while using **standard Angular ports** (4202/4203) for the user interface applications.
