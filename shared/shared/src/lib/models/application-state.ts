export type FsmState = 'initializing' | 'ready' | 'playing' | 'paused' | 'error';

// Shared authoritative ApplicationState model (with versioning)
// Version increments on every committed mutation so clients can reconcile ordering.
export interface ApplicationState {
  version: number; // monotonically increasing
  fsmState: FsmState;
  connectedClients: {
    tv?: ClientInfo;
    remote?: ClientInfo;
  };
  // Domain data seeded by Remote (Task 1.17). Shape intentionally loose for Milestone 1.
  data?: {
    videos?: { id: string }[];
    // Add other seeded data properties as needed
  };
  navigation: {
    currentLevel: 'performers' | 'videos' | 'scenes';
    performerId?: string;
    videoId?: string;
    sceneId?: string;
    breadcrumb: string[];
  };
  player: {
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    volume: number;
    muted: boolean;
    youtubeId?: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface ClientInfo {
  deviceId: string;
  deviceName: string;
}
