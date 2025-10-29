# SAHAR TV Remote — Deployment Guide

This guide is the single source of truth for deploying SAHAR system in its final  environment.


## 1) Requirements

### SW requirements
- Linux-based OS (Ubuntu 20.04+ recommended)
- Node.js 18+
- Angular CLI 20+
- Local network (same subnet) for devices

### HW requirements
- Raspberry Pi 4 or Orange Pi 3 LTS with 4GB+ RAM (for server and TV app)
- HDMI cable to connect to TV
- Power supply for the SBC
- Case/enclosure for the SBC

## 2) Production environment

- Unified Server:
  - Firewall: Allow inbound traffic on HTTP (80/8080) and WebSocket ports
- Remote client Device:
  - Smartphone or iPad - capable of running the Remote Angular app via browser
  - Browser: Modern browser (Chrome, Safari, Firefox)
  - Network: Both devices must be on the same local network as the server for WebSocket connectivity

## 3) Deployment Steps

### 3.1 Build All Components

**On Development Machine (Windows/Linux/macOS):**

```bash
# Build shared library
cd shared
npm run build

# Build server
cd ../server
npm run build

# Build TV app
cd ../apps/tv
ng build --configuration production

# Build Remote app
cd ../apps/remote
ng build --configuration production
```

### 3.2 Prepare Deployment Package

**Create deployment directory structure:**
```
sahar-deployment/
├── main.js              # Server executable (from server/dist/main.js)
├── tv/
│   └── browser/         # TV app build (from apps/tv/dist/tv/browser/)
│       ├── index.html
│       ├── main-[hash].js
│       └── assets/
└── remote/
    └── browser/         # Remote app build (from apps/remote/dist/remote/browser/)
        ├── index.html
        ├── main-[hash].js
        └── assets/
```

**Copy files:**
```bash
# Create deployment directory
mkdir sahar-deployment
cd sahar-deployment

# Copy server
cp ../server/dist/main.js ./

# Copy TV app
cp -r ../apps/tv/dist/tv/browser ./tv/

# Copy Remote app  
cp -r ../apps/remote/dist/remote/browser ./remote/
```

### 3.3 Deploy to Target Device

**Transfer to production server:**
```bash
# Using scp (replace with your server details)
scp -r sahar-deployment/ user@your-server:/path/to/deployment/

# Or using rsync
rsync -av sahar-deployment/ user@your-server:/path/to/deployment/
```

### 3.4 Install Node.js Dependencies

**On target server:**
```bash
cd /path/to/deployment/sahar-deployment

# Install Node.js (if not already installed)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should be 18+
```

### 3.5 Configure System Service (Optional)

**Create systemd service file:**
```bash
sudo nano /etc/systemd/system/sahar.service
```

**Service configuration:**
```ini
[Unit]
Description=SAHAR TV Remote Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/deployment/sahar-deployment
ExecStart=/usr/bin/node main.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

**Enable and start service:**
```bash
sudo systemctl daemon-reload
sudo systemctl enable sahar
sudo systemctl start sahar
sudo systemctl status sahar
```

### 3.6 Manual Start (Alternative)

**Run directly:**
```bash
cd /path/to/deployment/sahar-deployment
node main.js
```

**Expected output:**
```json
{"ts":"2025-10-29T17:45:11.591Z","level":"info","event":"server_starting","meta":{"component":"server","dir":"/path/to/deployment"},"msg":"Server starting up"}
{"ts":"2025-10-29T17:45:11.595Z","level":"info","event":"tv_index_found","meta":{"component":"server","path":"tv/browser/index.html"}}
{"ts":"2025-10-29T17:45:11.596Z","level":"info","event":"remote_index_found","meta":{"component":"server","path":"remote/browser/index.html"}}
{"ts":"2025-10-29T17:45:11.598Z","level":"info","event":"server_start","meta":{"component":"server","port":8080}}
{"ts":"2025-10-29T17:45:11.599Z","level":"info","event":"server_ready","meta":{"component":"server"}}
```

### 3.7 Network Configuration

**Firewall rules:**
```bash
# Allow HTTP traffic
sudo ufw allow 8080/tcp

# Optional: Allow only local network
sudo ufw allow from 192.168.1.0/24 to any port 8080
```

**Find server IP address:**
```bash
# Server will log the selected IP
# Or manually check:
ip addr show | grep "inet 192.168"
``` 

## 4) Post-deployment Validation
- After any deployment, validate with the flows in [VALIDATION.md](./VALIDATION.md) to ensure connectivity, state sync, and control paths are working.

## 5) Troubleshooting
- Protocol rules, message types, and the Stop-and-Wait model: see [ARCHITECTURE.md](./ARCHITECTURE.md) (Unified Communication Protocol)
- Canonical message and state types: [shared/websocket/websocket-protocol.ts](./shared/websocket/websocket-protocol.ts)
- Implementation tasks and current status: [IMPLEMENTATION.md](./IMPLEMENTATION.md)

## 6) Notes
- Ports and low-level network details are intentionally not duplicated here; see [ARCHITECTURE.md](./ARCHITECTURE.md) and [shared/websocket/websocket-protocol.ts](./shared/websocket/websocket-protocol.ts) when needed.
