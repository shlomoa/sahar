// Normalized content catalog structure for YouTube-like content
import { getYoutubeVideoId, getYoutubeThumbnailUrl } from '../utils/youtube-helpers';

export interface Performer {
  id: string;
  name: string;
  thumbnail: string;
  description?: string;
}

export interface Video {
  id: string;
  title: string;
  url: string; // YouTube video URL
  performerId: string; // Foreign key reference to Performer
  duration?: number; // Optional metadata hint (PlayerState.duration is authoritative at runtime)
  description?: string;
}

export interface Scene {
  id: string;
  title: string;
  videoId: string; // Foreign key reference to Video
  startTime: number; // Offset time from video start in seconds
  endTime?: number; // Optional end time for scene duration
  thumbnail?: string; // Optional custom thumbnail for the scene
  description?: string;
}

export interface CatalogData {
  performers: Performer[];
  videos: Video[];
  scenes: Scene[];
}
