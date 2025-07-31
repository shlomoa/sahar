// Shared data models for video navigation
// This file contains the data structure used by both TV and Remote applications

export interface Performer {
  id: number;
  name: string;
  thumbnail: string;
  videos: Video[];
}

export interface Video {
  id: number;
  title: string;
  thumbnail: string;
  duration: number;
  youtubeId?: string; // YouTube video ID for playback
  scenes: LikedScene[];
}

export interface LikedScene {
  id: number;
  title: string;
  thumbnail: string;
  timestamp: number;
  duration: number;
  videoId: number;
}

// Navigation levels
export type NavigationLevel = 'performers' | 'videos' | 'scenes';

// Navigation state
export interface NavigationState {
  level: NavigationLevel;
  selectedPerformerId?: number;
  selectedVideoId?: number;
  selectedSceneId?: number;
  breadcrumb: string[];
  canGoBack: boolean;
}

// Video player state
export interface VideoPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  selectedVideoId?: number;
  selectedSceneId?: number;
}

// Complete data set with 4 performers, 11 videos, and 44 scenes
export const performersData: Performer[] = [
  {
    id: 1,
    name: 'Emma Stone',
    thumbnail: 'https://picsum.photos/400/600?random=1',
    videos: [
      {
        id: 1,
        title: 'Morning Routine',
        thumbnail: 'https://picsum.photos/400/300?random=101',
        duration: 1800, // 30 minutes
        youtubeId: 'dQw4w9WgXcQ', // Sample YouTube video ID
        scenes: [
          { id: 1, title: 'Wake Up', thumbnail: 'https://picsum.photos/200/150?random=1001', timestamp: 0, duration: 300, videoId: 1 },
          { id: 2, title: 'Coffee Time', thumbnail: 'https://picsum.photos/200/150?random=1002', timestamp: 300, duration: 420, videoId: 1 },
          { id: 3, title: 'Getting Ready', thumbnail: 'https://picsum.photos/200/150?random=1003', timestamp: 720, duration: 360, videoId: 1 },
          { id: 4, title: 'Breakfast', thumbnail: 'https://picsum.photos/200/150?random=1004', timestamp: 1080, duration: 480, videoId: 1 },
          { id: 5, title: 'Final Touches', thumbnail: 'https://picsum.photos/200/150?random=1005', timestamp: 1560, duration: 240, videoId: 1 }
        ]
      },
      {
        id: 2,
        title: 'Evening Relaxation',
        thumbnail: 'https://picsum.photos/400/300?random=102',
        duration: 2100, // 35 minutes
        youtubeId: 'M7lc1UVf-VE', // Sample YouTube video ID
        scenes: [
          { id: 6, title: 'Coming Home', thumbnail: 'https://picsum.photos/200/150?random=1006', timestamp: 0, duration: 360, videoId: 2 },
          { id: 7, title: 'Dinner Prep', thumbnail: 'https://picsum.photos/200/150?random=1007', timestamp: 360, duration: 540, videoId: 2 },
          { id: 8, title: 'Wine & Music', thumbnail: 'https://picsum.photos/200/150?random=1008', timestamp: 900, duration: 600, videoId: 2 },
          { id: 9, title: 'Reading Time', thumbnail: 'https://picsum.photos/200/150?random=1009', timestamp: 1500, duration: 420, videoId: 2 },
          { id: 10, title: 'Bedtime Routine', thumbnail: 'https://picsum.photos/200/150?random=1010', timestamp: 1920, duration: 180, videoId: 2 }
        ]
      },
      {
        id: 3,
        title: 'Weekend Adventure',
        thumbnail: 'https://picsum.photos/400/300?random=103',
        duration: 2700, // 45 minutes
        youtubeId: 'jNQXAC9IVRw', // Sample YouTube video ID
        scenes: [
          { id: 11, title: 'Early Start', thumbnail: 'https://picsum.photos/200/150?random=1011', timestamp: 0, duration: 300, videoId: 3 },
          { id: 12, title: 'Road Trip', thumbnail: 'https://picsum.photos/200/150?random=1012', timestamp: 300, duration: 900, videoId: 3 },
          { id: 13, title: 'Hiking Trail', thumbnail: 'https://picsum.photos/200/150?random=1013', timestamp: 1200, duration: 720, videoId: 3 },
          { id: 14, title: 'Scenic Views', thumbnail: 'https://picsum.photos/200/150?random=1014', timestamp: 1920, duration: 480, videoId: 3 },
          { id: 15, title: 'Return Journey', thumbnail: 'https://picsum.photos/200/150?random=1015', timestamp: 2400, duration: 300, videoId: 3 }
        ]
      }
    ]
  },
  {
    id: 2,
    name: 'Ryan Gosling',
    thumbnail: 'https://picsum.photos/400/600?random=2',
    videos: [
      {
        id: 4,
        title: 'Jazz Night',
        thumbnail: 'https://picsum.photos/400/300?random=104',
        duration: 1980, // 33 minutes
        youtubeId: 'VMmp3wfCWKQ', // Sample YouTube video ID
        scenes: [
          { id: 16, title: 'Sound Check', thumbnail: 'https://picsum.photos/200/150?random=1016', timestamp: 0, duration: 360, videoId: 4 },
          { id: 17, title: 'First Set', thumbnail: 'https://picsum.photos/200/150?random=1017', timestamp: 360, duration: 600, videoId: 4 },
          { id: 18, title: 'Intermission', thumbnail: 'https://picsum.photos/200/150?random=1018', timestamp: 960, duration: 300, videoId: 4 },
          { id: 19, title: 'Second Set', thumbnail: 'https://picsum.photos/200/150?random=1019', timestamp: 1260, duration: 540, videoId: 4 },
          { id: 20, title: 'Encore', thumbnail: 'https://picsum.photos/200/150?random=1020', timestamp: 1800, duration: 180, videoId: 4 }
        ]
      },
      {
        id: 5,
        title: 'City Drive',
        thumbnail: 'https://picsum.photos/400/300?random=105',
        duration: 1620, // 27 minutes
        youtubeId: 'ZbZSe6N_BXs', // Sample YouTube video ID
        scenes: [
          { id: 21, title: 'Downtown', thumbnail: 'https://picsum.photos/200/150?random=1021', timestamp: 0, duration: 420, videoId: 5 },
          { id: 22, title: 'Traffic Lights', thumbnail: 'https://picsum.photos/200/150?random=1022', timestamp: 420, duration: 360, videoId: 5 },
          { id: 23, title: 'Highway', thumbnail: 'https://picsum.photos/200/150?random=1023', timestamp: 780, duration: 480, videoId: 5 },
          { id: 24, title: 'Sunset Strip', thumbnail: 'https://picsum.photos/200/150?random=1024', timestamp: 1260, duration: 360, videoId: 5 }
        ]
      }
    ]
  },
  {
    id: 3,
    name: 'Margot Robbie',
    thumbnail: 'https://picsum.photos/400/600?random=3',
    videos: [
      {
        id: 6,
        title: 'Beach Day',
        thumbnail: 'https://picsum.photos/400/300?random=106',
        duration: 2220, // 37 minutes
        scenes: [
          { id: 25, title: 'Beach Arrival', thumbnail: 'https://picsum.photos/200/150?random=1025', timestamp: 0, duration: 300, videoId: 6 },
          { id: 26, title: 'Swimming', thumbnail: 'https://picsum.photos/200/150?random=1026', timestamp: 300, duration: 600, videoId: 6 },
          { id: 27, title: 'Volleyball', thumbnail: 'https://picsum.photos/200/150?random=1027', timestamp: 900, duration: 480, videoId: 6 },
          { id: 28, title: 'Lunch Break', thumbnail: 'https://picsum.photos/200/150?random=1028', timestamp: 1380, duration: 420, videoId: 6 },
          { id: 29, title: 'Sunset', thumbnail: 'https://picsum.photos/200/150?random=1029', timestamp: 1800, duration: 420, videoId: 6 }
        ]
      },
      {
        id: 7,
        title: 'Shopping Spree',
        thumbnail: 'https://picsum.photos/400/300?random=107',
        duration: 1440, // 24 minutes
        scenes: [
          { id: 30, title: 'Mall Entrance', thumbnail: 'https://picsum.photos/200/150?random=1030', timestamp: 0, duration: 240, videoId: 7 },
          { id: 31, title: 'Fashion Store', thumbnail: 'https://picsum.photos/200/150?random=1031', timestamp: 240, duration: 480, videoId: 7 },
          { id: 32, title: 'Accessories', thumbnail: 'https://picsum.photos/200/150?random=1032', timestamp: 720, duration: 360, videoId: 7 },
          { id: 33, title: 'Checkout', thumbnail: 'https://picsum.photos/200/150?random=1033', timestamp: 1080, duration: 360, videoId: 7 }
        ]
      },
      {
        id: 8,
        title: 'Red Carpet',
        thumbnail: 'https://picsum.photos/400/300?random=108',
        duration: 900, // 15 minutes
        scenes: [
          { id: 34, title: 'Arrival', thumbnail: 'https://picsum.photos/200/150?random=1034', timestamp: 0, duration: 180, videoId: 8 },
          { id: 35, title: 'Photo Session', thumbnail: 'https://picsum.photos/200/150?random=1035', timestamp: 180, duration: 360, videoId: 8 },
          { id: 36, title: 'Interviews', thumbnail: 'https://picsum.photos/200/150?random=1036', timestamp: 540, duration: 240, videoId: 8 },
          { id: 37, title: 'Inside Event', thumbnail: 'https://picsum.photos/200/150?random=1037', timestamp: 780, duration: 120, videoId: 8 }
        ]
      }
    ]
  },
  {
    id: 4,
    name: 'Leonardo DiCaprio',
    thumbnail: 'https://picsum.photos/400/600?random=4',
    videos: [
      {
        id: 9,
        title: 'Environmental Documentary',
        thumbnail: 'https://picsum.photos/400/300?random=109',
        duration: 3600, // 60 minutes
        scenes: [
          { id: 38, title: 'Climate Change', thumbnail: 'https://picsum.photos/200/150?random=1038', timestamp: 0, duration: 900, videoId: 9 },
          { id: 39, title: 'Wildlife Conservation', thumbnail: 'https://picsum.photos/200/150?random=1039', timestamp: 900, duration: 1080, videoId: 9 },
          { id: 40, title: 'Ocean Pollution', thumbnail: 'https://picsum.photos/200/150?random=1040', timestamp: 1980, duration: 720, videoId: 9 },
          { id: 41, title: 'Renewable Energy', thumbnail: 'https://picsum.photos/200/150?random=1041', timestamp: 2700, duration: 900, videoId: 9 }
        ]
      },
      {
        id: 10,
        title: 'Art Gallery Visit',
        thumbnail: 'https://picsum.photos/400/300?random=110',
        duration: 1800, // 30 minutes
        scenes: [
          { id: 42, title: 'Modern Art', thumbnail: 'https://picsum.photos/200/150?random=1042', timestamp: 0, duration: 600, videoId: 10 },
          { id: 43, title: 'Classical Paintings', thumbnail: 'https://picsum.photos/200/150?random=1043', timestamp: 600, duration: 720, videoId: 10 },
          { id: 44, title: 'Sculpture Garden', thumbnail: 'https://picsum.photos/200/150?random=1044', timestamp: 1320, duration: 480, videoId: 10 }
        ]
      },
      {
        id: 11,
        title: 'Yacht Party',
        thumbnail: 'https://picsum.photos/400/300?random=111',
        duration: 2400, // 40 minutes
        scenes: [
          { id: 45, title: 'Boarding', thumbnail: 'https://picsum.photos/200/150?random=1045', timestamp: 0, duration: 300, videoId: 11 },
          { id: 46, title: 'Deck Party', thumbnail: 'https://picsum.photos/200/150?random=1046', timestamp: 300, duration: 900, videoId: 11 },
          { id: 47, title: 'Dinner Service', thumbnail: 'https://picsum.photos/200/150?random=1047', timestamp: 1200, duration: 600, videoId: 11 },
          { id: 48, title: 'Night Dancing', thumbnail: 'https://picsum.photos/200/150?random=1048', timestamp: 1800, duration: 600, videoId: 11 }
        ]
      }
    ]
  }
];
