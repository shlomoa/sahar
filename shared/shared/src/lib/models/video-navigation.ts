// Normalized content catalog structure for YouTube-like content

export interface Performer {
  id: number;
  name: string;
  thumbnail: string;
}

export interface Video {
  id: number;
  name: string;
  url: string; // YouTube video URL
  performerId: number; // Foreign key reference to Performer
  thumbnail: string; // M1: non-nullable on public surfaces; normalized client-side if missing in legacy payloads
  duration?: number; // Optional metadata hint (PlayerState.duration is authoritative at runtime)
}

export interface Scene {
  id: number;
  name: string;
  videoId: number; // Foreign key reference to Video
  startTime: number; // Offset time from video start in seconds
  endTime?: number; // Optional end time for scene duration
  thumbnail?: string; // Optional custom thumbnail for the scene
}

export interface CatalogData {
  performers: Performer[];
  videos: Video[];
  scenes: Scene[];
}
