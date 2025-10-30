import { CatalogData, Performer, Scene, Video, createLogger } from 'shared';
import { catalogData as seedCatalog } from '../mock-data';

const logger = createLogger({ component: 'catalog-data-service' });
const logInfo = (event: string, meta?: any, msg?: string) => logger.info(event, meta, msg);

/**
 * CatalogDataService (S1/S4)
 * Seeded from mock-data; provides read-only getter and mutation APIs.
 * S4 adds deterministic mutations with FK validation and cascades.
 */
export class CatalogDataService {
  private catalog: CatalogData;

  constructor() {
    // Seed from static mock data
    this.catalog = seedCatalog;
    logInfo('catalog_seed_initialized', {
      performers: this.catalog.performers.length,
      videos: this.catalog.videos.length,
      scenes: this.catalog.scenes.length
    });
  }

  /** Return current catalog snapshot (immutable contract to callers) */
  getCatalog(): CatalogData {
    return this.catalog;
  }

  // --- S4: Mutation APIs ---

  /** Add a new performer with deterministic numeric id */
  addPerformer(input: Pick<Performer, 'name' | 'thumbnail'>): Performer {
    const nextId = this.nextId(this.catalog.performers, 1);
    const performer: Performer = { id: nextId, name: input.name, thumbnail: input.thumbnail };
    this.catalog.performers = [...this.catalog.performers, performer];
    logInfo('catalog_add_performer', { id: performer.id, name: performer.name });
    return performer;
  }

  /** Add a new video; validates performer FK */
  addVideo(input: Omit<Video, 'id'>): Video {
    const { performerId } = input;
    if (!this.catalog.performers.some(p => p.id === performerId)) {
      throw new Error(`Unknown performerId ${performerId}`);
    }
    const nextId = this.nextId(this.catalog.videos, 100);
    const video: Video = { id: nextId, ...input };
    this.catalog.videos = [...this.catalog.videos, video];
    logInfo('catalog_add_video', { id: video.id, name: video.name, performerId });
    return video;
  }

  /** Add a new scene; validates video FK and time bounds */
  addScene(input: Omit<Scene, 'id'>): Scene {
    const { videoId, startTime, endTime } = input;
    if (!this.catalog.videos.some(v => v.id === videoId)) {
      throw new Error(`Unknown videoId ${videoId}`);
    }
    if (typeof startTime !== 'number' || startTime < 0) {
      throw new Error('startTime must be a non-negative number');
    }
    if (endTime !== undefined && (typeof endTime !== 'number' || endTime <= startTime)) {
      throw new Error('endTime must be a number greater than startTime');
    }
    const nextId = this.nextId(this.catalog.scenes, 1000);
    const scene: Scene = { id: nextId, ...input };
    this.catalog.scenes = [...this.catalog.scenes, scene];
    logInfo('catalog_add_scene', { id: scene.id, name: scene.name, videoId });
    return scene;
  }

  /** Remove a performer and cascade delete their videos and scenes */
  removePerformer(performerId: number): void {
    const has = this.catalog.performers.some(p => p.id === performerId);
    if (!has) return;
    const videosToRemove = this.catalog.videos.filter(v => v.performerId === performerId).map(v => v.id);
    // Remove scenes of those videos
    if (videosToRemove.length) {
      this.catalog.scenes = this.catalog.scenes.filter(s => !videosToRemove.includes(s.videoId));
    }
    // Remove videos
    this.catalog.videos = this.catalog.videos.filter(v => v.performerId !== performerId);
    // Remove performer
    this.catalog.performers = this.catalog.performers.filter(p => p.id !== performerId);
    logInfo('catalog_remove_performer', { performerId, videosRemoved: videosToRemove.length });
  }

  /** Remove a video and cascade delete its scenes */
  removeVideo(videoId: number): void {
    const beforeVideos = this.catalog.videos.length;
    const beforeScenes = this.catalog.scenes.length;
    this.catalog.videos = this.catalog.videos.filter(v => v.id !== videoId);
    this.catalog.scenes = this.catalog.scenes.filter(s => s.videoId !== videoId);
    const dv = beforeVideos - this.catalog.videos.length;
    const ds = beforeScenes - this.catalog.scenes.length;
    if (dv || ds) logInfo('catalog_remove_video', { videoId, videosRemoved: dv, scenesRemoved: ds });
  }

  /** Remove a single scene */
  removeScene(sceneId: number): void {
    const before = this.catalog.scenes.length;
    this.catalog.scenes = this.catalog.scenes.filter(s => s.id !== sceneId);
    if (before !== this.catalog.scenes.length) logInfo('catalog_remove_scene', { sceneId });
  }

  // --- Helpers ---
  private nextId<T extends { id: number }>(items: T[], fallbackStart: number): number {
    if (!items.length) return fallbackStart;
    const maxId = items.reduce((m, i) => (i.id > m ? i.id : m), items[0].id);
    return maxId + 1;
  }
}
