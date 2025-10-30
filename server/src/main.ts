import express, { Request, Response, NextFunction } from 'express';
import { existsSync, readdirSync } from 'fs';
import httpProxy from 'http-proxy';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  createLogger,
  WEBSOCKET_CONFIG
} from 'shared';
import { Fsm } from './fsm';
import { getBestHostIP } from './utils/host-ip';
import { HttpService } from './services/http.service';
import { CatalogDataService } from './services/catalog-data.service';
import { ServerWebSocketService, ClientMetadata } from './services/server-websocket.service';

/**
 * SAHAR Unified Server - Bootstrap & Orchestration
 * 
 * Responsibilities:
 * - Initialize FSM with application state
 * - Configure Express application
 * - Start HTTP service (health, catalog endpoints)
 * - Start WebSocket service (client connections, message routing)
 * - Serve static files for TV and Remote apps
 * - Graceful shutdown handling
 * 
 * Business Logic:
 * - FSM: Application state management (server/src/fsm.ts)
 * - HttpService: HTTP endpoints (server/src/services/http.service.ts)
 * - ServerWebSocketService: WebSocket handling (server/src/services/server-websocket.service.ts)
 */

// --- Structured Logger (shared) ---
const logger = createLogger({ component: 'server' });
const logInfo = (event: string, meta?: any, msg?: string) => logger.info(event, meta, msg);
const logWarn = (event: string, meta?: any, msg?: string) => logger.warn(event, meta, msg);
const logError = (event: string, meta?: any, msg?: string) => logger.error(event, meta, msg);

// --- Bootstrap ---

// ESM-safe __dirname/__filename
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
logInfo('server_starting', { dir: __dirname }, 'Server starting up');

// --- Express Application Setup ---

// Create Express application
const app = express();

// Dev mode detection: DEV_SSR=1 enables proxy behavior to Angular dev servers
const DEV_SSR = process.env.DEV_SSR === '1' || process.env.DEV_SSR === 'true';

// Dev proxy for Angular SSR servers (Task 1.6/1.7)
const proxy = httpProxy.createProxyServer({ changeOrigin: true, ws: false });
proxy.on('error', (err: Error, _req: any, res: any) => {
  logError('proxy_error', { message: err.message });
  if (res && !res.headersSent) {
    res.statusCode = 502;
    res.end('Upstream dev server unavailable');
  }
});

function devProxy(target: string) {
  logInfo('devProxy created', { target });
  return (req: Request, res: Response, next: NextFunction) => {
    if (!DEV_SSR) return next();
    proxy.web(req, res, { target });
  };
}

// --- HTTP Server & WebSocket Setup ---

// Create HTTP server from the express app
const server = createServer(app);

// Create and attach WebSocket server on configured path
logInfo('websocket_config', { config: WEBSOCKET_CONFIG });
const wss = new WebSocketServer({ server, path: WEBSOCKET_CONFIG.WS_PATH });
logInfo('websocket_server', { server: server.address(), path: WEBSOCKET_CONFIG.WS_PATH });

// --- Application State & Services ---

// S2: Introduce CatalogDataService before FSM and inject into FSM
const catalogService = new CatalogDataService();
// FSM encapsulating authoritative application state (versioned)
const fsm = new Fsm(catalogService);

// Track client connections and their type (managed by ServerWebSocketService)
const clients = new Map<WebSocket, ClientMetadata>();

// Readiness flag (infrastructure readiness: HTTP + WS initialized)
let isReady = false;
const markReady = () => { isReady = true; };

// WebSocket Service handles all connection/message/broadcast logic
// Service instantiation has side effects (sets up connection handlers)
const wsService = new ServerWebSocketService(wss, fsm, catalogService, clients);
wsService.initialize();

// --- Express Middleware & Routes ---

// Middleware for parsing JSON
app.use(express.json());

// HTTP Service handles: /live, /ready, /health, /host-ip, /api/content/catalog
const httpService = new HttpService(fsm, catalogService, wss, clients, () => isReady);
httpService.setupRoutes(app);

// Static file serving
app.use('/.well-known', express.static('public/.well-known', { dotfiles: 'allow' }));
app.use(express.static('public'));

// --- Angular App Static File Configuration ---

// Define paths to TV and Remote app builds - simple relative paths
const tvAppPath = './tv';
const remoteAppPath = './remote';
const tvIndexPath = path.resolve(tvAppPath, 'browser/index.html');
const remoteIndexPath = path.resolve(remoteAppPath, 'browser/index.html');

// Pre-flight existence checks (helpful diagnostics when static serving fails)
if (!existsSync(tvIndexPath)) {
  logWarn('tv_index_missing', { expected: path.relative(__dirname, tvIndexPath) });
} else {
  logInfo('tv_index_found', { path: path.relative(__dirname, tvIndexPath) });
}

if (!existsSync(remoteIndexPath)) {
  logWarn('remote_index_missing', { expected: path.relative(__dirname, remoteIndexPath) });
} else {
  logInfo('remote_index_found', { path: path.relative(__dirname, remoteIndexPath) });
}

// Inline SSR status object (Milestone 1 minimal gating – log only, no fail-fast)
export let SSR_STATUS: { tv: boolean; remote: boolean; tvPath: string; remotePath: string } = {
  tv: false,
  remote: false,
  tvPath: '',
  remotePath: ''
};

// Static file serving for Angular apps - simple relative paths
// Serve TV and Remote browser builds with fallthrough for Angular routing
app.use('/tv', express.static('./tv/browser', { fallthrough: true }));
app.use('/remote', express.static('./remote/browser', { fallthrough: true }));

// Asset passthrough for Angular builds
app.use('/remote/assets', express.static('./remote/browser/assets', { fallthrough: true }));
app.use('/tv/assets', express.static('./tv/browser/assets', { fallthrough: true }));

// Root serves TV app (base href '/')
app.use('/', express.static('./tv/browser', { fallthrough: true }));

// --- Angular Routing Support ---

// Dev SSR proxy (DEV_SSR=1) or fallback to built index.html

// TV routes: '/' and '/tv'
app.get(['/','/tv'], (req: Request, res: Response, next: NextFunction) => {
  logInfo('http_request', { path: req.path, method: req.method, route: 'root_or_tv' });
  if (DEV_SSR) return devProxy(`http://${getBestHostIP()}:${WEBSOCKET_CONFIG.SERVER_DEFAULT_PORT}`)(req, res, next);
  res.sendFile(tvIndexPath);
});

// Remote route: '/remote'
app.get('/remote', (req: Request, res: Response, next: NextFunction) => {
  logInfo('http_request', { path: req.path, method: req.method });
  if (DEV_SSR) return devProxy(`http://${getBestHostIP()}:${WEBSOCKET_CONFIG.SERVER_DEFAULT_PORT}`)(req, res, next);
  res.sendFile(remoteIndexPath);
});

// Catch-all for Angular routing (deep links)
app.get(['/tv/*splat','/*splat'], (req: Request, res: Response, next: NextFunction) => {
  logInfo('http_request', { path: req.path, method: req.method, route: 'tv_or_root_catchall' });
  if (/\.[a-zA-Z0-9]+$/.test(req.path)) return next(); // Skip file requests
  if (DEV_SSR) return devProxy(`http://${getBestHostIP()}:${WEBSOCKET_CONFIG.SERVER_DEFAULT_PORT}`)(req, res, next);
  res.sendFile(tvIndexPath);
});

app.get('/remote/*splat', (req: Request, res: Response, next: NextFunction) => {
  logInfo('http_request', { path: req.path, method: req.method, route: 'remote_catchall' });
  if (/\.[a-zA-Z0-9]+$/.test(req.path)) return next(); // Skip file requests
  if (DEV_SSR) return devProxy(`http://${getBestHostIP()}:${WEBSOCKET_CONFIG.SERVER_DEFAULT_PORT}`)(req, res, next);
  res.sendFile(remoteIndexPath);
});

// --- Server Startup ---
server.listen(WEBSOCKET_CONFIG.SERVER_DEFAULT_PORT, () => {
  logInfo('server_start', { port: WEBSOCKET_CONFIG.SERVER_DEFAULT_PORT });
  logInfo('host_ip_selected', { hostIp: getBestHostIP() });
  logInfo('server_status', { express: true, httpListening: true, tvRoute: '/tv', remoteRoute: '/remote', websocket: true, devSsr: DEV_SSR, tvDevPort: WEBSOCKET_CONFIG.SERVER_DEFAULT_PORT, remoteDevPort: WEBSOCKET_CONFIG.SERVER_DEFAULT_PORT });
  markReady();
  logInfo('server_ready');
  
  // Catalog served via HTTP GET /api/content/catalog
  logInfo('catalog_initialization', { 
    mode: 'http_only',
    message: 'Catalog served via HTTP /api/content/catalog'
  });
  
  logInfo('mode_banner', {
    mode: DEV_SSR ? 'dev_proxy' : 'prod_static',
    wsPath: WEBSOCKET_CONFIG.WS_PATH,
    serverPort: WEBSOCKET_CONFIG.SERVER_DEFAULT_PORT,
    tvDevPort: WEBSOCKET_CONFIG.SERVER_DEFAULT_PORT,
    remoteDevPort: WEBSOCKET_CONFIG.SERVER_DEFAULT_PORT
  });
  
  // SSR detection (non-dev mode only)
  if (!DEV_SSR) {
    const tvServerDir = path.join(tvAppPath, 'server');
    const remoteServerDir = path.join(remoteAppPath, 'server');
    const tvDirExists = existsSync(tvServerDir);
    const remoteDirExists = existsSync(remoteServerDir);
    
    // Pick representative SSR entry file
    const pickEntry = (dir: string) => {
      try {
        const files = readdirSync(dir);
        const cand = files.find(f => /^(main|index).*.\.(mjs|js)$/i.test(f)) || files.find(f => /\.(mjs|js)$/i.test(f));
        return cand ? path.join(dir, cand) : '';
      } catch {        
        logError('ssr_dir_read_error', { dir: path.relative(__dirname, dir) });
        return '';
      }
    };
    const tvEntry = tvDirExists ? pickEntry(tvServerDir) : '';
    const remoteEntry = remoteDirExists ? pickEntry(remoteServerDir) : '';
    SSR_STATUS = { tv: tvDirExists, remote: remoteDirExists, tvPath: tvEntry, remotePath: remoteEntry };

    // Deprecated /seed endpoint (catalog now read-only via HTTP)
    app.post('/seed', (req: Request, res: Response) => {
      logInfo('http_request', { path: req.path, method: req.method });
      logWarn('seed_endpoint_deprecated', { message: 'POST /seed is deprecated - catalog served via HTTP GET /api/content/catalog' });
      res.status(410).json({ 
        ok: false, 
        error: 'POST /seed endpoint is deprecated. Catalog is now read-only via HTTP GET /api/content/catalog' 
      });
    });

    logInfo('ssr_dir_status', { app: 'tv', dir: path.relative(__dirname, tvServerDir), exists: tvDirExists, pickedEntry: tvEntry ? path.relative(__dirname, tvEntry) : null });
    logInfo('ssr_dir_status', { app: 'remote', dir: path.relative(__dirname, remoteServerDir), exists: remoteDirExists, pickedEntry: remoteEntry ? path.relative(__dirname, remoteEntry) : null });
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  logWarn('shutdown_signal', { signal: 'SIGINT' });
  server.close(() => {
    logWarn('server_shutdown');
    process.exit(0);
  });
});

export { app, server };
