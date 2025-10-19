// System-level state for client connection and operational readiness

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
    muted: boolean;
    youtubeId?: string;
    // Optional explicit marker for which scene is currently playing )
    playingSceneId?: string;
}

export interface ClientsConnectionState {
    tv?: ConnectionState;
    remote?: ConnectionState;
}

// Shared authoritative ApplicationState model (with versioning)
// Version increments on every committed mutation so clients can reconcile ordering.
export interface ApplicationState {
  version: number; // monotonically increasing
  fsmState: FsmState;
  clientsConnectionState: ClientsConnectionState; // Synchronized connection status
  // Domain data seeded by Remote (Task 1.17). Shape intentionally loose for Milestone 1.
  data?: {
    videos?: { id: string }[];
    // Add other seeded data properties as needed
  };
  navigation: {
    currentLevel: NavigationLevel;
    performerId?: string;
    videoId?: string;
    sceneId?: string;
  };
  player: PlayerState;
  error?: {
    code: string;
    message: string;
  };
}

export interface ClientInfo {
  deviceId: string;
}
