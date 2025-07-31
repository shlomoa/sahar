// TV App Models - Data received from Remote via WebSocket
// TV app has no local data, everything comes from Remote

export interface Performer {
  id: string;
  name: string;
  thumbnail: string;
  description?: string;
  videos: Video[];
}

export interface Video {
  id: string;
  title: string;
  thumbnail: string;
  url: string;
  duration: number;
  youtubeId?: string; // YouTube video ID for playback
  description?: string;
  likedScenes: LikedScene[];
}

export interface LikedScene {
  id: string;
  title: string;
  startTime: number;
  endTime?: number;
  thumbnail?: string;
  description?: string;
}

export interface VideoItem {
  id: string;
  title: string;
  thumbnail: string;
  type: 'video' | 'category' | 'segment' | 'performer';
  url?: string;
  children?: VideoItem[];
  startTime?: number;
  endTime?: number;
}

export interface NavigationState {
  currentLevel: VideoItem[];
  breadcrumb: string[];
  canGoBack: boolean;
  currentPerformer?: Performer;
  currentVideo?: Video;
}

// TV app starts with empty state - no local data
export const emptyNavigationState: NavigationState = {
  currentLevel: [],
  breadcrumb: ['Waiting for Remote...'],
  canGoBack: false,
  currentPerformer: undefined,
  currentVideo: undefined
};
