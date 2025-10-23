import { Injectable, signal } from '@angular/core';
import { Performer, Video, Scene, CatalogData } from '../models/video-navigation';

/**
 * ContentService - HTTP-based catalog delivery (Phase 2: Content Delivery Separation)
 * 
 * Fetches the flat normalized catalog structure (performers, videos, scenes) via HTTP
 * and provides convenient accessor methods. This replaces the catalog delivery via
 * WebSocket state_sync messages, reducing message size by ~95%.
 * 
 * Initialization:
 * - Catalog is loaded automatically via provideAppInitializer() before app bootstrap
 * - Modern functional provider pattern (APP_INITIALIZER deprecated in Angular 20+)
 * - This guarantees catalog is available when components initialize
 * - Both TV and Remote apps configure provideAppInitializer() in their app.config.ts
 * - No manual fetchCatalog() call needed in component code
 * 
 * Usage:
 * - Use synchronous getters to access catalog data (guaranteed available after bootstrap)
 * - Components query by ID using navigation state from WebSocketService
 * - Signal-based reactive state enables computed signals in downstream services
 * - FK helpers (getVideosForPerformer, getScenesForVideo) return [] if catalog null (defensive)
 * 
 * Signal Support (Step 2 - ContentService Refactoring):
 * - catalog signal holds the full CatalogData structure
 * - Enables CatalogHelperService to use computed signals for current items
 */
@Injectable({ providedIn: 'root' })
export class ContentService {
  // Signal-based reactive state
  readonly catalog = signal<CatalogData | null>(null);

  /**
   * Fetch catalog from HTTP endpoint with caching and duplicate request prevention
   * Uses closure to maintain fetchPromise across calls
   * @returns Promise that resolves to the catalog data
   */
  fetchCatalog = (() => {
    let fetchPromise: Promise<CatalogData> | null = null;
    
    return async (): Promise<CatalogData> => {
      // Return cached catalog if already fetched
      const cached = this.catalog();
      if (cached) {
        return cached;
      }

      // Prevent duplicate fetches - return existing promise if fetch in progress
      if (fetchPromise) {
        return fetchPromise;
      }

      // Fetch from HTTP endpoint
      fetchPromise = fetch('/api/content/catalog')
        .then(res => {
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
          }
          return res.json();
        })
        .then((data: CatalogData) => {
          // Update catalog signal with fetched data
          this.catalog.set(data);
          
          fetchPromise = null;
          console.log('✅ Catalog loaded via HTTP:', {
            performers: data.performers.length,
            videos: data.videos.length,
            scenes: data.scenes.length
          });
          return data;
        })
        .catch(err => {
          fetchPromise = null;
          console.error('❌ Failed to fetch catalog:', err);
          throw err;
        });

      return fetchPromise;
    };
  })();

  /**
   * Get performer by ID
   * Catalog guaranteed loaded via provideAppInitializer()
   * @param id Performer ID
   * @returns Performer
   * @throws Error if performer not found in catalog
   */
  getPerformer(id: string): Performer {
    const catalog = this.catalog()!;  // Non-null assertion - guaranteed by provideAppInitializer
    const performer = catalog.performers.find(p => p.id === id);
    if (!performer) {
      throw new Error(`Performer not found: ${id}`);
    }
    return performer;
  }

    /**
   * Get all videos for a performer (FK helper)
   * Catalog guaranteed loaded via provideAppInitializer()
   * @param performerId Performer ID
   * @returns Array of videos (may be empty if no videos found)
   */
  getVideosForPerformer(performerId: string): Video[] {
    const catalog = this.catalog()!;  // Non-null assertion - guaranteed by provideAppInitializer
    return catalog.videos.filter(v => v.performerId === performerId);
  }

  /**
   * Get video by ID
   * Catalog guaranteed loaded via provideAppInitializer()
   * @param id Video ID
   * @returns Video
   * @throws Error if video not found in catalog
   */
  getVideo(id: string): Video {
    const catalog = this.catalog()!;  // Non-null assertion - guaranteed by provideAppInitializer
    const video = catalog.videos.find(v => v.id === id);
    if (!video) {
      throw new Error(`Video not found: ${id}`);
    }
    return video;
  }

  /**
   * Get scenes for a specific video (FK query)
   * Catalog guaranteed loaded via provideAppInitializer()
   * @param videoId Video ID
   * @returns Array of scenes for this video (may be empty if no scenes found)
   */
  getScenesForVideo(videoId: string): Scene[] {
    const catalog = this.catalog()!;  // Non-null assertion - guaranteed by provideAppInitializer
    return catalog.scenes.filter(s => s.videoId === videoId);
  }

  /**
   * Get scene by ID
   * Catalog guaranteed loaded via provideAppInitializer()
   * @param id Scene ID
   * @returns Scene
   * @throws Error if scene not found in catalog
   */
  getScene(id: string): Scene {
    const catalog = this.catalog()!;  // Non-null assertion - guaranteed by provideAppInitializer
    const scene = catalog.scenes.find(s => s.id === id);
    if (!scene) {
      throw new Error(`Scene not found: ${id}`);
    }
    return scene;
  }
}
