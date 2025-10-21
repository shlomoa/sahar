// System-level state for client connection and operational readiness

import { CatalogData } from './video-navigation';

// @TODO: separate Player-specific state tracking (playing/paused) from 
// FsmState as it is already tracked in PlayerState.isPlaying

export type FsmState = 'initializing' | 'ready' | 'playing' | 'paused' | 'error';

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

export type NavigationLevel = 'performers' | 'videos' | 'scenes' | 'playing' | 'scene-selected';

export interface PlayerState {
    isPlaying: boolean;
    isFullscreen: boolean;
    currentTime: number;
    duration: number;
    volume: number;      // 0-100 range (matches YouTube API and UI)
    isMuted: boolean;
    youtubeId?: string;
    // Optional explicit marker for which scene is currently playing )
    playingSceneId?: string;
}

export interface ClientsConnectionState {
    tv?: ConnectionState;
    remote?: ConnectionState;
}

export interface NavigationState {
  currentLevel: NavigationLevel;
  performerId?: string;
  videoId?: string;
  sceneId?: string;
};

// Shared authoritative ApplicationState model (with versioning)
// Version increments on every committed mutation so clients can reconcile ordering.
// Phase 3: Catalog data removed - now delivered via HTTP GET /api/content/catalog
export interface ApplicationState {
  version: number; // monotonically increasing
  clientsConnectionState: ClientsConnectionState; // Synchronized connection status
  // Phase 3: data field removed - catalog delivered via HTTP, not WebSocket
  navigation: NavigationState;    
  player: PlayerState;
  error?: {
    code: string;
    message: string;
  };
}

export interface ClientInfo {
  deviceId: string;
}
