import { Injectable, inject, signal, computed } from '@angular/core';
import { ContentService } from './content.service';
import type { ApplicationState } from '../models';

/**
 * CatalogHelperService - Signal-Based State-Aware Catalog Facade
 * 
 * Bridges the gap between ApplicationState (navigation context) and ContentService (catalog data).
 * Uses Angular signals for reactive state management and automatic change detection.
 * 
 * **CONTRACT:**
 * - State must be initialized before accessing any computed signals or methods
 * - State is NEVER set to null after initialization (always valid ApplicationState)
 * - Apps MUST call setState() with non-null state before using helper methods
 * - Violation of this contract results in undefined behavior
 * 
 * **Responsibilities:**
 * 1. State Management - Holds current ApplicationState as signal (never null after init)
 * 2. Current Item Resolution - Computed signals for performer/video/scene
 * 3. Level-Based Data Filtering - Computed signals for collections
 * 4. Error Handling - Computed signals return null for missing items, never throw
 * 
 * **Access Patterns:**
 * - Computed Signals: Returns `T | null` or `T[]`, auto-updates, never throws
 * - setState() method: Called from app components when state changes (never with null)
 * 
 * **Benefits:**
 * - Automatic reactivity - templates update when state or catalog changes
 * - Zero boilerplate - no manual getters or try/catch needed in components
 * - Type safety - computed signals handle null checks consistently
 * - Performance - fine-grained updates, only affected views re-render
 * 
 * @example
 * ```typescript
 * // In component
 * private catalogHelper = inject(CatalogHelperService);
 * 
 * // REQUIRED: Initialize state before accessing signals
 * ngOnInit(): void {
 *   this.catalogHelper.setState(initialState);  // NEVER pass null
 * }
 * 
 * // Expose computed signals
 * readonly currentPerformer = this.catalogHelper.currentPerformer;
 * readonly currentVideos = this.catalogHelper.currentVideos;
 * 
 * // Update state when WebSocket sends new state
 * handleStateSync(state: ApplicationState): void {
 *   this.catalogHelper.setState(state);  // ALWAYS pass non-null state
 * }
 * 
 * // In template - simple signal syntax
 * @if (currentPerformer(); as performer) {
 *   <h2>{{ performer.name }}</h2>
 * }
 * 
 * @for (video of currentVideos(); track video.id) {
 *   <div>{{ video.title }}</div>
 * }
 * ```
 */
@Injectable({ providedIn: 'root' })
export class CatalogHelperService {
  private contentService = inject(ContentService);
  
  // Internal state signal - NEVER null after initialization (contract)
  // Apps MUST call setState() with non-null value before accessing computed signals
  private state = signal<ApplicationState>(null as unknown as ApplicationState);

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  /**
   * Updates the internal state signal.
   * Call this method from app components when WebSocket receives new state.
   * 
   * **CONTRACT: NEVER pass null - state must always be a valid ApplicationState**
   * 
   * @param state - New application state from server (NEVER null)
   * 
   * @example
   * ```typescript
   * handleStateSync(state: ApplicationState): void {
   *   this.catalogHelper.setState(state);  // ALWAYS non-null
   * }
   * ```
   */
  setState(state: ApplicationState): void {
    this.state.set(state);
  }

  // ============================================================================
  // COMPUTED SIGNALS - CURRENT ITEMS
  // ============================================================================

  /**
   * Computed signal returning current performer based on navigation state.
   * Automatically recomputes when state changes or catalog loads.
   * 
   * @returns Current Performer or null if performer not selected or not found
   */
  readonly currentPerformer = computed(() => {
    const state = this.state();
    const catalog = this.contentService.catalog();
    if (!catalog || !state?.navigation?.performerId) {
      return null;
    }
    try {
      return this.contentService.getPerformer(state.navigation.performerId);
    } catch {
      return null;  // Performer not found in catalog
    }
  });

  /**
   * Computed signal returning current video based on navigation state.
   * Automatically recomputes when state changes or catalog loads.
   * 
   * @returns Current Video or null if video not selected or not found
   */
  readonly currentVideo = computed(() => {
    const state = this.state();
    const catalog = this.contentService.catalog();
    if (!catalog || !state?.navigation?.videoId) {
      return null;
    }
    try {
      return this.contentService.getVideo(state.navigation.videoId);
    } catch {
      return null;  // Video not found in catalog
    }
  });

  /**
   * Computed signal returning current scene based on navigation state.
   * Automatically recomputes when state changes or catalog loads.
   * 
   * @returns Current Scene or null if scene not selected or not found
   */
  readonly currentScene = computed(() => {
    const state = this.state();
    const catalog = this.contentService.catalog();
    if (!catalog || !state?.navigation?.sceneId) {
      return null;
    }
    try {
      return this.contentService.getScene(state.navigation.sceneId);
    } catch {
      return null;  // Scene not found in catalog
    }
  });

  // ============================================================================
  // COMPUTED SIGNALS - LEVEL-BASED COLLECTIONS
  // ============================================================================

  /**
   * Computed signal returning all performers when current level is 'performers'.
   * Safe for template iteration - returns empty array when level doesn't match.
   * 
   * @returns Array of Performers or empty array
   */
  readonly currentPerformers = computed(() => {
    const state = this.state();
    const catalog = this.contentService.catalog();
    if (!catalog || state?.navigation?.currentLevel !== 'performers') {
      return [];
    }
    return catalog.performers;
  });

  /**
   * Computed signal returning videos for current performer when level is 'videos'.
   * Safe for template iteration - returns empty array when level doesn't match.
   * 
   * @returns Array of Videos or empty array
   */
  readonly currentVideos = computed(() => {
    const state = this.state();
    const catalog = this.contentService.catalog();
    if (!catalog || state?.navigation?.currentLevel !== 'videos') {
      return [];
    }
    if (!state?.navigation?.performerId) return [];
    return this.contentService.getVideosForPerformer(state.navigation.performerId);
  });

  /**
   * Computed signal returning scenes for current video when level is 'scenes'.
   * Safe for template iteration - returns empty array when level doesn't match.
   * 
   * @returns Array of Scenes or empty array
   */
  readonly currentScenes = computed(() => {
    const state = this.state();
    const catalog = this.contentService.catalog();
    if (!catalog || state?.navigation?.currentLevel !== 'scenes') {
      return [];
    }
    if (!state?.navigation?.videoId) return [];
    return this.contentService.getScenesForVideo(state.navigation.videoId);
  });

  /**
   * Computed signal checking if catalog is loaded and ready.
   * 
   * @returns true if catalog is loaded, false otherwise
   */
  readonly catalogReady = computed(() => 
    this.contentService.catalog() !== null
  );
}
