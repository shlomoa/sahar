// Remote-specific navigation state for TV synchronization
export interface RemoteNavigationState {
  level: 'performers' | 'videos' | 'scenes' | 'scene-selected';
  performerId?: string;
  videoId?: string;
  sceneId?: string;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';
