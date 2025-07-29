// Performer data structure for YouTube-like content
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
  type: 'video' | 'category' | 'segment' | 'performer';
  url?: string;
  children?: VideoItem[];
  startTime?: number; // For scenes with time offset
  endTime?: number;
}

export interface NavigationState {
  currentLevel: VideoItem[];
  breadcrumb: string[];
  canGoBack: boolean;
  currentPerformer?: Performer;
  currentVideo?: Video;
}

// Example performer data structure
export const performersData: Performer[] = [
  {
    id: 'yuval',
    name: 'Yuval',
    thumbnail: 'https://yt3.googleusercontent.com/ELvjLVIwbpAabtF2R3wgzS4fOVL1XU4ySxrm61gdhdlZCx3zYAR5HKmVlsuI_IkhzNpZEjAd=s160-c-k-c0x00ffffff-no-rj',
    description: 'Children\'s music and educational content',
    videos: [
      {
        id: 'yuval-birthday-song',
        title: 'Happy Birthday Song',
        thumbnail: 'https://images.pexels.com/photos/1729931/pexels-photo-1729931.jpeg?auto=compress&cs=tinysrgb&w=300',
        url: 'https://www.youtube.com/watch?v=example1',
        duration: 240, // 4 minutes
        description: 'A fun birthday celebration song',
        likedScenes: [
          {
            id: 'scene-1',
            title: 'Opening & Intro',
            startTime: 0,
            endTime: 45,
            description: 'Introduction and welcome'
          },
          {
            id: 'scene-2',
            title: 'Main Song Part',
            startTime: 45,
            endTime: 120,
            description: 'The main birthday song'
          },
          {
            id: 'scene-3',
            title: 'Dance Break',
            startTime: 120,
            endTime: 180,
            description: 'Interactive dance section'
          },
          {
            id: 'scene-4',
            title: 'Finale & Credits',
            startTime: 180,
            endTime: 240,
            description: 'Closing and credits'
          }
        ]
      },
      {
        id: 'yuval-animal-sounds',
        title: 'Animal Sounds',
        thumbnail: 'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg?auto=compress&cs=tinysrgb&w=300',
        url: 'https://www.youtube.com/watch?v=example2',
        duration: 300, // 5 minutes
        description: 'Learn different animal sounds',
        likedScenes: [
          {
            id: 'scene-5',
            title: 'Farm Animals',
            startTime: 0,
            endTime: 75,
            description: 'Cow, pig, chicken sounds'
          },
          {
            id: 'scene-6',
            title: 'Wild Animals',
            startTime: 75,
            endTime: 150,
            description: 'Lion, elephant, monkey sounds'
          },
          {
            id: 'scene-7',
            title: 'Ocean Animals',
            startTime: 150,
            endTime: 225,
            description: 'Dolphin, whale, seal sounds'
          },
          {
            id: 'scene-8',
            title: 'Animal Quiz',
            startTime: 225,
            endTime: 300,
            description: 'Interactive animal sound quiz'
          }
        ]
      }
    ]
  },
  {
    id: 'little-michal',
    name: 'Little Michal',
    thumbnail: 'https://yt3.googleusercontent.com/ytc/AIdro_nWusm1zzELGjN8vNamxNfqWvZ18QCb98giM0suD4jaOLQ=s160-c-k-c0x00ffffff-no-rj',
    description: 'Educational content for toddlers',
    videos: [
      {
        id: 'michal-abc-song',
        title: 'ABC Learning Song',
        thumbnail: 'https://images.pexels.com/photos/207691/pexels-photo-207691.jpeg?auto=compress&cs=tinysrgb&w=300',
        url: 'https://www.youtube.com/watch?v=example3',
        duration: 180, // 3 minutes
        description: 'Learn the alphabet with songs',
        likedScenes: [
          {
            id: 'scene-9',
            title: 'Letters A-F',
            startTime: 0,
            endTime: 45,
            description: 'First group of letters'
          },
          {
            id: 'scene-10',
            title: 'Letters G-M',
            startTime: 45,
            endTime: 90,
            description: 'Second group of letters'
          },
          {
            id: 'scene-11',
            title: 'Letters N-S',
            startTime: 90,
            endTime: 135,
            description: 'Third group of letters'
          },
          {
            id: 'scene-12',
            title: 'Letters T-Z',
            startTime: 135,
            endTime: 180,
            description: 'Final group of letters'
          }
        ]
      }
    ]
  },
  {
    id: 'roy-boy',
    name: 'Roy Boy',
    thumbnail: 'https://yt3.googleusercontent.com/pVKTM2PwD5QEYrvk2WvjIv_in_yCXnpH9HlgO8EQYXxys0wZRCoNfaCSWhPVHE-e4rorqWjmeA=s160-c-k-c0x00ffffff-no-rj',
    description: 'Adventure and superhero content for kids',
    videos: [
      {
        id: 'roy-superhero-training',
        title: 'Superhero Training',
        thumbnail: 'https://images.pexels.com/photos/163036/mario-luigi-yoschi-figures-163036.jpeg?auto=compress&cs=tinysrgb&w=300',
        url: 'https://www.youtube.com/watch?v=example4',
        duration: 320, // 5 minutes 20 seconds
        description: 'Join Roy Boy in superhero training adventures',
        likedScenes: [
          {
            id: 'scene-13',
            title: 'Super Strength',
            startTime: 0,
            endTime: 80,
            description: 'Training with super strength exercises'
          },
          {
            id: 'scene-14',
            title: 'Flying Practice',
            startTime: 80,
            endTime: 160,
            description: 'Learning to fly like a superhero'
          },
          {
            id: 'scene-15',
            title: 'Rescue Mission',
            startTime: 160,
            endTime: 240,
            description: 'First rescue mission adventure'
          },
          {
            id: 'scene-16',
            title: 'Hero Celebration',
            startTime: 240,
            endTime: 320,
            description: 'Celebrating becoming a hero'
          }
        ]
      },
      {
        id: 'roy-space-adventure',
        title: 'Space Adventure',
        thumbnail: 'https://images.pexels.com/photos/73873/star-clusters-rosette-nebula-star-galaxies-73873.jpeg?auto=compress&cs=tinysrgb&w=300',
        url: 'https://www.youtube.com/watch?v=example5',
        duration: 400, // 6 minutes 40 seconds
        description: 'Explore the galaxy with Roy Boy',
        likedScenes: [
          {
            id: 'scene-17',
            title: 'Rocket Launch',
            startTime: 0,
            endTime: 100,
            description: 'Preparing and launching the rocket ship'
          },
          {
            id: 'scene-18',
            title: 'Planet Exploration',
            startTime: 100,
            endTime: 200,
            description: 'Discovering new planets and environments'
          },
          {
            id: 'scene-19',
            title: 'Alien Friends',
            startTime: 200,
            endTime: 300,
            description: 'Meeting friendly alien creatures'
          },
          {
            id: 'scene-20',
            title: 'Return to Earth',
            startTime: 300,
            endTime: 400,
            description: 'Safe journey back home'
          }
        ]
      },
      {
        id: 'roy-dinosaur-discovery',
        title: 'Dinosaur Discovery',
        thumbnail: 'https://images.pexels.com/photos/3264723/pexels-photo-3264723.jpeg?auto=compress&cs=tinysrgb&w=300',
        url: 'https://www.youtube.com/watch?v=example6',
        duration: 340, // 5 minutes 40 seconds
        description: 'Travel back in time to meet dinosaurs',
        likedScenes: [
          {
            id: 'scene-21',
            title: 'T-Rex Encounter',
            startTime: 0,
            endTime: 85,
            description: 'Meeting the mighty Tyrannosaurus Rex'
          },
          {
            id: 'scene-22',
            title: 'Triceratops Family',
            startTime: 85,
            endTime: 170,
            description: 'Learning about herbivore dinosaurs'
          },
          {
            id: 'scene-23',
            title: 'Flying Pterodactyl',
            startTime: 170,
            endTime: 255,
            description: 'Soaring with prehistoric flying reptiles'
          },
          {
            id: 'scene-24',
            title: 'Fossil Hunt',
            startTime: 255,
            endTime: 340,
            description: 'Discovering ancient fossils and bones'
          }
        ]
      },
      {
        id: 'roy-ocean-exploration',
        title: 'Ocean Exploration',
        thumbnail: 'https://images.pexels.com/photos/1001682/pexels-photo-1001682.jpeg?auto=compress&cs=tinysrgb&w=300',
        url: 'https://www.youtube.com/watch?v=example7',
        duration: 380, // 6 minutes 20 seconds
        description: 'Dive deep into ocean adventures',
        likedScenes: [
          {
            id: 'scene-25',
            title: 'Submarine Dive',
            startTime: 0,
            endTime: 95,
            description: 'Descending into the deep ocean'
          },
          {
            id: 'scene-26',
            title: 'Coral Reef Tour',
            startTime: 95,
            endTime: 190,
            description: 'Exploring colorful coral reefs'
          },
          {
            id: 'scene-27',
            title: 'Whale Song',
            startTime: 190,
            endTime: 285,
            description: 'Listening to beautiful whale songs'
          },
          {
            id: 'scene-28',
            title: 'Treasure Discovery',
            startTime: 285,
            endTime: 380,
            description: 'Finding hidden underwater treasure'
          }
        ]
      }
    ]
  },
  {
    id: 'uncle-haim',
    name: 'Uncle Haim',
    thumbnail: 'https://yt3.googleusercontent.com/VH4WLb2QOqIsNue1J9MnsVJgraCN3lDc6tSkhTRqhtK6Ug-KLNh7htAXfNbZ-wX8-2hQsNoVFKY=s160-c-k-c0x00ffffff-no-rj',
    description: 'Comedy and entertainment content for children',
    videos: [
      {
        id: 'haim-comedy-sketches',
        title: 'Comedy Sketches',
        thumbnail: 'https://images.pexels.com/photos/1115804/pexels-photo-1115804.jpeg?auto=compress&cs=tinysrgb&w=300',
        url: 'https://www.youtube.com/watch?v=example8',
        duration: 360, // 6 minutes
        description: 'Funny comedy sketches and entertainment',
        likedScenes: [
          {
            id: 'scene-29',
            title: 'Funny Faces',
            startTime: 0,
            endTime: 90,
            description: 'Hilarious facial expressions and comedy'
          },
          {
            id: 'scene-30',
            title: 'Silly Voices',
            startTime: 90,
            endTime: 180,
            description: 'Funny character voices and impressions'
          },
          {
            id: 'scene-31',
            title: 'Magic Tricks',
            startTime: 180,
            endTime: 270,
            description: 'Simple magic tricks for kids'
          },
          {
            id: 'scene-32',
            title: 'Joke Time',
            startTime: 270,
            endTime: 360,
            description: 'Kid-friendly jokes and humor'
          }
        ]
      },
      {
        id: 'haim-musical-fun',
        title: 'Musical Fun',
        thumbnail: 'https://images.pexels.com/photos/164821/pexels-photo-164821.jpeg?auto=compress&cs=tinysrgb&w=300',
        url: 'https://www.youtube.com/watch?v=example9',
        duration: 480, // 8 minutes
        description: 'Musical entertainment and sing-alongs',
        likedScenes: [
          {
            id: 'scene-33',
            title: 'Guitar Songs',
            startTime: 0,
            endTime: 120,
            description: 'Acoustic guitar songs for children'
          },
          {
            id: 'scene-34',
            title: 'Sing Along',
            startTime: 120,
            endTime: 240,
            description: 'Interactive singing sessions'
          },
          {
            id: 'scene-35',
            title: 'Dance Party',
            startTime: 240,
            endTime: 360,
            description: 'Fun dance moves and party music'
          },
          {
            id: 'scene-36',
            title: 'Instrument Fun',
            startTime: 360,
            endTime: 480,
            description: 'Learning about different instruments'
          }
        ]
      },
      {
        id: 'haim-story-time',
        title: 'Story Time',
        thumbnail: 'https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg?auto=compress&cs=tinysrgb&w=300',
        url: 'https://www.youtube.com/watch?v=example10',
        duration: 600, // 10 minutes
        description: 'Engaging storytelling sessions',
        likedScenes: [
          {
            id: 'scene-37',
            title: 'Adventure Tales',
            startTime: 0,
            endTime: 150,
            description: 'Exciting adventure stories'
          },
          {
            id: 'scene-38',
            title: 'Funny Stories',
            startTime: 150,
            endTime: 300,
            description: 'Humorous and entertaining tales'
          },
          {
            id: 'scene-39',
            title: 'Fairy Tales',
            startTime: 300,
            endTime: 450,
            description: 'Classic fairy tales with a twist'
          },
          {
            id: 'scene-40',
            title: 'Interactive Stories',
            startTime: 450,
            endTime: 600,
            description: 'Stories where kids can participate'
          }
        ]
      },
      {
        id: 'haim-learning-games',
        title: 'Learning Games',
        thumbnail: 'https://images.pexels.com/photos/1148998/pexels-photo-1148998.jpeg?auto=compress&cs=tinysrgb&w=300',
        url: 'https://www.youtube.com/watch?v=example11',
        duration: 400, // 6 minutes 40 seconds
        description: 'Educational games and brain exercises',
        likedScenes: [
          {
            id: 'scene-41',
            title: 'Memory Games',
            startTime: 0,
            endTime: 100,
            description: 'Fun memory exercises and challenges'
          },
          {
            id: 'scene-42',
            title: 'Riddles & Puzzles',
            startTime: 100,
            endTime: 200,
            description: 'Brain teasers and puzzle solving'
          },
          {
            id: 'scene-43',
            title: 'Word Games',
            startTime: 200,
            endTime: 300,
            description: 'Vocabulary and language games'
          },
          {
            id: 'scene-44',
            title: 'Brain Teasers',
            startTime: 300,
            endTime: 400,
            description: 'Logic puzzles and thinking games'
          }
        ]
      }
    ]
  }
];

// Convert performers to legacy VideoItem format for backward compatibility
export const inputVideoData: VideoItem[] = performersData.map(performer => ({
  id: performer.id,
  title: performer.name,
  thumbnail: performer.thumbnail,
  type: 'performer' as const,
  children: performer.videos.map(video => ({
    id: video.id,
    title: video.title,
    thumbnail: video.thumbnail,
    type: 'video' as const,
    url: video.url,
    children: video.likedScenes.map(scene => ({
      id: scene.id,
      title: scene.title,
      thumbnail: video.thumbnail, // Use video thumbnail if scene doesn't have one
      type: 'segment' as const,
      url: `${video.url}&t=${scene.startTime}`, // YouTube URL with time parameter
      startTime: scene.startTime,
      endTime: scene.endTime
    }))
  }))
}));
