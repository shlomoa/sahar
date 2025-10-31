import { Express, Request, Response } from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { createLogger, ClientType } from 'shared';
import { Fsm } from '../fsm';
import { CatalogDataService } from './catalog-data.service';
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
    private catalogService: CatalogDataService,
    private wss: WebSocketServer,
    private clients: Map<WebSocket, { clientType: ClientType; deviceId: string; lastHeartbeat?: number }>,
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

    logInfo('http_routes_registered', { routes: ['/live', '/ready', '/health', '/host-ip', '/api/content/catalog', '/admin/catalog/*'] });

    // --- Admin endpoints (S5) - always enabled (auth gating removed) ---
    this.registerAdminRoutes(app);
    logInfo('admin_routes_enabled', { base: '/admin/catalog' });
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
    // S1: Serve catalog via CatalogDataService (read-only)
    const catalog = this.catalogService.getCatalog();
    logInfo('catalog_served', { 
      performers: catalog.performers.length, 
      videos: catalog.videos.length, 
      scenes: catalog.scenes.length 
    });
    res.json(catalog);
  }

  // --- Admin Routes (S5) ---
  private registerAdminRoutes(app: Express): void {
    // Create performer
    app.post('/admin/catalog/performers', (req: Request, res: Response) => {
      try {
        const { name, thumbnail, channelId } = req.body || {};
        if (typeof name !== 'string' || typeof thumbnail !== 'string' || typeof channelId !== 'string') {
          res.status(400).json({ ok: false, error: 'Invalid payload: { name: string, thumbnail: string, channelId: string } required' });
          return;
        }
        const created = this.catalogService.addPerformer({ name, thumbnail, channelId });
        res.status(201).json(created);
      } catch (e: any) {
        res.status(400).json({ ok: false, error: e?.message || 'Invalid performer payload' });
      }
    });

    // Delete performer (cascade videos/scenes)
    app.delete('/admin/catalog/performers/:id', (req: Request, res: Response) => {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) {
        res.status(400).json({ ok: false, error: 'Invalid performer id' });
        return;
      }
      this.catalogService.removePerformer(id);
      res.sendStatus(204);
    });

    // Create video
    app.post('/admin/catalog/videos', (req: Request, res: Response) => {
      try {
        const { name, url, performerId, thumbnail } = req.body || {};
        if (typeof name !== 'string' || typeof url !== 'string' || !Number.isFinite(performerId) || typeof thumbnail !== 'string') {
          res.status(400).json({ ok: false, error: 'Invalid payload: { name, url, performerId, thumbnail } required' });
          return;
        }
        const created = this.catalogService.addVideo({ name, url, performerId: Number(performerId), thumbnail });
        res.status(201).json(created);
      } catch (e: any) {
        res.status(400).json({ ok: false, error: e?.message || 'Invalid video payload' });
      }
    });

    // Delete video (cascade scenes)
    app.delete('/admin/catalog/videos/:id', (req: Request, res: Response) => {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) {
        res.status(400).json({ ok: false, error: 'Invalid video id' });
        return;
      }
      this.catalogService.removeVideo(id);
      res.sendStatus(204);
    });

    // Create scene
    app.post('/admin/catalog/scenes', (req: Request, res: Response) => {
      try {
        const { name, videoId, startTime, endTime, thumbnail } = req.body || {};
        if (typeof name !== 'string' || !Number.isFinite(videoId) || !Number.isFinite(startTime)) {
          res.status(400).json({ ok: false, error: 'Invalid payload: { name, videoId, startTime } required' });
          return;
        }
        const created = this.catalogService.addScene({ 
          name, 
          videoId: Number(videoId), 
          startTime: Number(startTime), 
          endTime: endTime !== undefined ? Number(endTime) : undefined,
          thumbnail: typeof thumbnail === 'string' ? thumbnail : undefined
        });
        res.status(201).json(created);
      } catch (e: any) {
        res.status(400).json({ ok: false, error: e?.message || 'Invalid scene payload' });
      }
    });

    // Delete scene
    app.delete('/admin/catalog/scenes/:id', (req: Request, res: Response) => {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) {
        res.status(400).json({ ok: false, error: 'Invalid scene id' });
        return;
      }
      this.catalogService.removeScene(id);
      res.sendStatus(204);
    });
  }
}
