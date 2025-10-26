import { Express, Request, Response } from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { createLogger, ClientType } from 'shared';
import { Fsm } from '../fsm';
import { getBestHostIP } from '../utils/host-ip';

const logger = createLogger({ component: 'http-service' });
const logInfo = (event: string, meta?: any, msg?: string) => logger.info(event, meta, msg);

/**
 * HttpService
 * 
 * Encapsulates all HTTP endpoint handlers for the SAHAR server:
 * - Health/readiness probes: /live, /ready, /health
 * - Utility endpoints: /host-ip
 * - API endpoints: /api/content/catalog
 * 
 * This is a plain TypeScript class (not an Angular service).
 */
export class HttpService {
  constructor(
    private fsm: Fsm,
    private wss: WebSocketServer,
    private clients: Map<WebSocket, { clientType: ClientType; deviceId: string; lastStateAckVersion?: number; lastHeartbeat?: number; missedAckVersions?: Set<number>; ackRetryCount?: number }>,
    private isReadyGetter: () => boolean
  ) {}

  /**
   * Register all HTTP routes with the Express application
   */
  setupRoutes(app: Express): void {
    // Liveness probe - process is up
    app.get('/live', this.handleLive.bind(this));

    // Readiness probe - infrastructure ready
    app.get('/ready', this.handleReady.bind(this));

    // Health snapshot - enriched debug/monitoring
    app.get('/health', this.handleHealth.bind(this));

    // Host IP for QR generation
    app.get('/host-ip', this.handleHostIp.bind(this));

    // Content catalog API
    app.get('/api/content/catalog', this.handleCatalog.bind(this));

    logInfo('http_routes_registered', { routes: ['/live', '/ready', '/health', '/host-ip', '/api/content/catalog'] });
  }

  // --- Route Handlers ---

  private handleLive(_req: Request, res: Response): void {
    res.json({ status: 'live' });
  }

  private handleReady(_req: Request, res: Response): void {
    const ready = this.isReadyGetter();
    if (ready) {
      res.json({ status: 'ready' });
    } else {
      res.status(503).json({ status: 'not_ready', error: 'Infrastructure not ready' });
    }
  }

  private handleHealth(_req: Request, res: Response): void {
    logInfo('http_request', { path: '/health', method: 'GET' });
    const wsConnections = [...this.wss.clients].length;
    const registered = [...this.clients.values()].map(c => ({ 
      clientType: c.clientType, 
      deviceId: c.deviceId, 
      lastHeartbeat: c.lastHeartbeat ?? null 
    }));
    const fsmSnap = this.fsm.getSnapshot();
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptimeSeconds: process.uptime(),    
      wsConnections,
      registeredClients: registered,
      navigationLevel: fsmSnap.navigation.currentLevel,
      playerState: {
        isPlaying: fsmSnap.player.isPlaying,
        isFullscreen: fsmSnap.player.isFullscreen,
        currentTime: fsmSnap.player.currentTime,
        version: fsmSnap.version
      }
    });
  }

  private handleHostIp(_req: Request, res: Response): void {
    logInfo('http_request', { path: '/host-ip', method: 'GET' });
    const ip = getBestHostIP();
    res.json({ ip, port: 8080 }); // WEBSOCKET_CONFIG.SERVER_DEFAULT_PORT
  }

  private handleCatalog(_req: Request, res: Response): void {
    logInfo('http_request', { path: '/api/content/catalog', method: 'GET' });
    const catalog = this.fsm.getCatalogData();
    logInfo('catalog_served', { 
      performers: catalog.performers.length, 
      videos: catalog.videos.length, 
      scenes: catalog.scenes.length 
    });
    res.json(catalog);
  }
}
