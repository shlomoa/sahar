// Performer data structure for YouTube-like content
import { getYoutubeVideoId, getYoutubeThumbnailUrl } from '../utils/youtube-helpers';
export type ItemType = 'video' | 'category' | 'segment' | 'performer';
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
  url: string; // YouTube video URL
  duration: number; // Video duration in seconds
  description?: string;
  likedScenes: LikedScene[];
}

export interface LikedScene {
  id: string;
  title: string;
  startTime: number; // Offset time from video start in seconds
  endTime?: number; // Optional end time for scene duration
  thumbnail?: string; // Optional custom thumbnail for the scene
  description?: string;
}

// Legacy interface for backward compatibility
export interface VideoItem {
  id: string;
  title: string;
  thumbnail: string;
  itemType: ItemType;
  url?: string;
  children?: VideoItem[];
  startTime?: number; // For scenes with time offset
  endTime?: number;
}

export interface NavigationState {
  currentLevel: VideoItem[];
  canGoBack: boolean;
  currentPerformer?: Performer;
  currentVideo?: Video;
}
