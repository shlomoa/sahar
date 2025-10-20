import { Injectable } from '@angular/core';
import { Performer, Video, Scene, CatalogData } from '../models/video-navigation';

/**
 * ContentService - HTTP-based catalog delivery (Phase 2: Content Delivery Separation)
 * 
 * Fetches the flat normalized catalog structure (performers, videos, scenes) via HTTP
 * and provides convenient accessor methods. This replaces the catalog delivery via
 * WebSocket state_sync messages, reducing message size by ~95%.
 * 
 * Usage:
 * 1. Call fetchCatalog() once on app startup (before connecting WebSocket)
 * 2. Use synchronous getters to access cached catalog data
 * 3. Components query by ID using navigation state from WebSocketService
 */
@Injectable({ providedIn: 'root' })
export class ContentService {
  private catalog: CatalogData | null = null;
  private fetchPromise: Promise<CatalogData> | null = null;

  /**
   * Fetch catalog from HTTP endpoint with caching and duplicate request prevention
   * @returns Promise that resolves to the catalog data
   */
  async fetchCatalog(): Promise<CatalogData> {
    // Return cached catalog if already fetched
    if (this.catalog) {
      return this.catalog;
    }

    // Prevent duplicate fetches - return existing promise if fetch in progress
    if (this.fetchPromise) {
      return this.fetchPromise;
    }

    // Fetch from HTTP endpoint
    this.fetchPromise = fetch('/api/content/catalog')
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        return res.json();
      })
      .then((data: CatalogData) => {
        this.catalog = data;
        this.fetchPromise = null;
        console.log('✅ Catalog loaded via HTTP:', {
          performers: data.performers.length,
          videos: data.videos.length,
          scenes: data.scenes.length
        });
        return data;
      })
      .catch(err => {
        this.fetchPromise = null;
        console.error('❌ Failed to fetch catalog:', err);
        throw err;
      });

    return this.fetchPromise;
  }

  /**
   * Get all performers
   * @returns Array of all performers (empty if catalog not yet fetched)
   */
  getPerformers(): Performer[] {
    return this.catalog?.performers || [];
  }

  /**
   * Get performer by ID
   * @param id Performer ID
   * @returns Performer or undefined if not found
   */
  getPerformer(id: string): Performer | undefined {
    return this.catalog?.performers.find(p => p.id === id);
  }

  /**
   * Get all videos
   * @returns Array of all videos (empty if catalog not yet fetched)
   */
  getVideos(): Video[] {
    return this.catalog?.videos || [];
  }

  /**
   * Get videos for a specific performer (FK query)
   * @param performerId Performer ID
   * @returns Array of videos for this performer
   */
  getVideosForPerformer(performerId: string): Video[] {
    return this.catalog?.videos.filter(v => v.performerId === performerId) || [];
  }

  /**
   * Get video by ID
   * @param id Video ID
   * @returns Video or undefined if not found
   */
  getVideo(id: string): Video | undefined {
    return this.catalog?.videos.find(v => v.id === id);
  }

  /**
   * Get all scenes
   * @returns Array of all scenes (empty if catalog not yet fetched)
   */
  getScenes(): Scene[] {
    return this.catalog?.scenes || [];
  }

  /**
   * Get scenes for a specific video (FK query)
   * @param videoId Video ID
   * @returns Array of scenes for this video
   */
  getScenesForVideo(videoId: string): Scene[] {
    return this.catalog?.scenes.filter(s => s.videoId === videoId) || [];
  }

  /**
   * Get scene by ID
   * @param id Scene ID
   * @returns Scene or undefined if not found
   */
  getScene(id: string): Scene | undefined {
    return this.catalog?.scenes.find(s => s.id === id);
  }

  /**
   * Clear cached catalog (for testing or forced refresh)
   */
  clearCache(): void {
    this.catalog = null;
    console.log('🔄 Catalog cache cleared');
  }

  /**
   * Check if catalog has been loaded
   * @returns true if catalog is cached, false otherwise
   */
  isLoaded(): boolean {
    return this.catalog !== null;
  }
}
