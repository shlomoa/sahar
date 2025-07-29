import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface VideoItem {
  id: string;
  title: string;
  thumbnail: string;
  type: 'video' | 'category' | 'segment';
  url?: string;
  children?: VideoItem[];
}

export interface NavigationState {
  currentLevel: VideoItem[];
  breadcrumb: string[];
  canGoBack: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class VideoNavigationService {
  private navigationState = new BehaviorSubject<NavigationState>({
    currentLevel: [],
    breadcrumb: ['Home'],
    canGoBack: false
  });

  private navigationStack: VideoItem[][] = [];

  // Detailed video data structure with specific videos and segments
  private videoData: VideoItem[] = [
    {
      id: 'yuval',
      title: 'Yuval',
      thumbnail: 'https://images.pexels.com/photos/8617834/pexels-photo-8617834.jpeg?auto=compress&cs=tinysrgb&w=300',
      type: 'category',
      children: [
        {
          id: 'yuval-video-1',
          title: 'Happy Birthday Song',
          thumbnail: 'https://images.pexels.com/photos/1729931/pexels-photo-1729931.jpeg?auto=compress&cs=tinysrgb&w=300',
          type: 'category',
          children: [
            {
              id: 'yuval-v1-s1',
              title: 'Opening & Intro',
              thumbnail: 'https://images.pexels.com/photos/1729931/pexels-photo-1729931.jpeg?auto=compress&cs=tinysrgb&w=300',
              type: 'segment',
              url: 'https://www.youtube.com/@7yuval?t=0'
            },
            {
              id: 'yuval-v1-s2',
              title: 'Main Song Part',
              thumbnail: 'https://images.pexels.com/photos/1729931/pexels-photo-1729931.jpeg?auto=compress&cs=tinysrgb&w=300',
              type: 'segment',
              url: 'https://www.youtube.com/@7yuval?t=45'
            },
            {
              id: 'yuval-v1-s3',
              title: 'Dance Break',
              thumbnail: 'https://images.pexels.com/photos/1729931/pexels-photo-1729931.jpeg?auto=compress&cs=tinysrgb&w=300',
              type: 'segment',
              url: 'https://www.youtube.com/@7yuval?t=120'
            },
            {
              id: 'yuval-v1-s4',
              title: 'Finale & Credits',
              thumbnail: 'https://images.pexels.com/photos/1729931/pexels-photo-1729931.jpeg?auto=compress&cs=tinysrgb&w=300',
              type: 'segment',
              url: 'https://www.youtube.com/@7yuval?t=180'
            }
          ]
        },
        {
          id: 'yuval-video-2',
          title: 'Animal Sounds',
          thumbnail: 'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg?auto=compress&cs=tinysrgb&w=300',
          type: 'category',
          children: [
            {
              id: 'yuval-v2-s1',
              title: 'Farm Animals',
              thumbnail: 'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg?auto=compress&cs=tinysrgb&w=300',
              type: 'segment',
              url: 'https://www.youtube.com/@7yuval?t=0'
            },
            {
              id: 'yuval-v2-s2',
              title: 'Wild Animals',
              thumbnail: 'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg?auto=compress&cs=tinysrgb&w=300',
              type: 'segment',
              url: 'https://www.youtube.com/@7yuval?t=60'
            },
            {
              id: 'yuval-v2-s3',
              title: 'Ocean Animals',
              thumbnail: 'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg?auto=compress&cs=tinysrgb&w=300',
              type: 'segment',
              url: 'https://www.youtube.com/@7yuval?t=120'
            },
            {
              id: 'yuval-v2-s4',
              title: 'Animal Quiz',
              thumbnail: 'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg?auto=compress&cs=tinysrgb&w=300',
              type: 'segment',
              url: 'https://www.youtube.com/@7yuval?t=180'
            }
          ]
        },
        {
          id: 'yuval-video-3',
          title: 'Colors & Shapes',
          thumbnail: 'https://images.pexels.com/photos/1148998/pexels-photo-1148998.jpeg?auto=compress&cs=tinysrgb&w=300',
          type: 'category',
          children: [
            {
              id: 'yuval-v3-s1',
              title: 'Primary Colors',
              thumbnail: 'https://images.pexels.com/photos/1148998/pexels-photo-1148998.jpeg?auto=compress&cs=tinysrgb&w=300',
              type: 'segment',
              url: 'https://www.youtube.com/@7yuval?t=0'
            },
            {
              id: 'yuval-v3-s2',
              title: 'Rainbow Song',
              thumbnail: 'https://images.pexels.com/photos/1148998/pexels-photo-1148998.jpeg?auto=compress&cs=tinysrgb&w=300',
              type: 'segment',
              url: 'https://www.youtube.com/@7yuval?t=90'
            },
            {
              id: 'yuval-v3-s3',
              title: 'Basic Shapes',
              thumbnail: 'https://images.pexels.com/photos/1148998/pexels-photo-1148998.jpeg?auto=compress&cs=tinysrgb&w=300',
              type: 'segment',
              url: 'https://www.youtube.com/@7yuval?t=150'
            },
            {
              id: 'yuval-v3-s4',
              title: 'Shape Matching Game',
              thumbnail: 'https://images.pexels.com/photos/1148998/pexels-photo-1148998.jpeg?auto=compress&cs=tinysrgb&w=300',
              type: 'segment',
              url: 'https://www.youtube.com/@7yuval?t=210'
            }
          ]
        },
        {
          id: 'yuval-video-4',
          title: 'Bedtime Stories',
          thumbnail: 'https://images.pexels.com/photos/1741230/pexels-photo-1741230.jpeg?auto=compress&cs=tinysrgb&w=300',
          type: 'category',
          children: [
            {
              id: 'yuval-v4-s1',
              title: 'The Sleepy Bear',
              thumbnail: 'https://images.pexels.com/photos/1741230/pexels-photo-1741230.jpeg?auto=compress&cs=tinysrgb&w=300',
              type: 'segment',
              url: 'https://www.youtube.com/@7yuval?t=0'
            },
            {
              id: 'yuval-v4-s2',
              title: 'Moon & Stars',
              thumbnail: 'https://images.pexels.com/photos/1741230/pexels-photo-1741230.jpeg?auto=compress&cs=tinysrgb&w=300',
              type: 'segment',
              url: 'https://www.youtube.com/@7yuval?t=120'
            },
            {
              id: 'yuval-v4-s3',
              title: 'Dream Adventure',
              thumbnail: 'https://images.pexels.com/photos/1741230/pexels-photo-1741230.jpeg?auto=compress&cs=tinysrgb&w=300',
              type: 'segment',
              url: 'https://www.youtube.com/@7yuval?t=240'
            },
            {
              id: 'yuval-v4-s4',
              title: 'Goodnight Song',
              thumbnail: 'https://images.pexels.com/photos/1741230/pexels-photo-1741230.jpeg?auto=compress&cs=tinysrgb&w=300',
              type: 'segment',
              url: 'https://www.youtube.com/@7yuval?t=360'
            }
          ]
        }
      ]
    },
    {
      id: 'little-michal',
      title: 'Little Michal',
      thumbnail: 'https://images.pexels.com/photos/301920/pexels-photo-301920.jpeg?auto=compress&cs=tinysrgb&w=300',
      type: 'category',
      children: [
        {
          id: 'michal-video-1',
          title: 'ABC Learning Song',
          thumbnail: 'https://images.pexels.com/photos/207691/pexels-photo-207691.jpeg?auto=compress&cs=tinysrgb&w=300',
          type: 'category',
          children: [
            {
              id: 'michal-v1-s1',
              title: 'Letters A-F',
              thumbnail: 'https://images.pexels.com/photos/207691/pexels-photo-207691.jpeg?auto=compress&cs=tinysrgb&w=300',
              type: 'segment',
              url: 'https://www.youtube.com/@LittleMichalOffical?t=0'
            },
            {
              id: 'michal-v1-s2',
              title: 'Letters G-M',
              thumbnail: 'https://images.pexels.com/photos/207691/pexels-photo-207691.jpeg?auto=compress&cs=tinysrgb&w=300',
              type: 'segment',
              url: 'https://www.youtube.com/@LittleMichalOffical?t=45'
            },
            {
              id: 'michal-v1-s3',
              title: 'Letters N-S',
              thumbnail: 'https://images.pexels.com/photos/207691/pexels-photo-207691.jpeg?auto=compress&cs=tinysrgb&w=300',
              type: 'segment',
              url: 'https://www.youtube.com/@LittleMichalOffical?t=90'
            },
            {
              id: 'michal-v1-s4',
              title: 'Letters T-Z',
              thumbnail: 'https://images.pexels.com/photos/207691/pexels-photo-207691.jpeg?auto=compress&cs=tinysrgb&w=300',
              type: 'segment',
              url: 'https://www.youtube.com/@LittleMichalOffical?t=135'
            }
          ]
        },
        {
          id: 'michal-video-2',
          title: 'Number Counting Fun',
          thumbnail: 'https://images.pexels.com/photos/1329296/pexels-photo-1329296.jpeg?auto=compress&cs=tinysrgb&w=300',
          type: 'category',
          children: [
            {
              id: 'michal-v2-s1',
              title: 'Numbers 1-5',
              thumbnail: 'https://images.pexels.com/photos/1329296/pexels-photo-1329296.jpeg?auto=compress&cs=tinysrgb&w=300',
              type: 'segment',
              url: 'https://www.youtube.com/@LittleMichalOffical?t=0'
            },
            {
              id: 'michal-v2-s2',
              title: 'Numbers 6-10',
              thumbnail: 'https://images.pexels.com/photos/1329296/pexels-photo-1329296.jpeg?auto=compress&cs=tinysrgb&w=300',
              type: 'segment',
              url: 'https://www.youtube.com/@LittleMichalOffical?t=60'
            },
            {
              id: 'michal-v2-s3',
              title: 'Counting Games',
              thumbnail: 'https://images.pexels.com/photos/1329296/pexels-photo-1329296.jpeg?auto=compress&cs=tinysrgb&w=300',
              type: 'segment',
              url: 'https://www.youtube.com/@LittleMichalOffical?t=120'
            },
            {
              id: 'michal-v2-s4',
              title: 'Number Dance',
              thumbnail: 'https://images.pexels.com/photos/1329296/pexels-photo-1329296.jpeg?auto=compress&cs=tinysrgb&w=300',
              type: 'segment',
              url: 'https://www.youtube.com/@LittleMichalOffical?t=180'
            }
          ]
        },
        {
          id: 'michal-video-3',
          title: 'Playground Adventures',
          thumbnail: 'https://images.pexels.com/photos/1148998/pexels-photo-1148998.jpeg?auto=compress&cs=tinysrgb&w=300',
          type: 'category',
          children: [
            {
              id: 'michal-v3-s1',
              title: 'Swing Time',
              thumbnail: 'https://images.pexels.com/photos/1148998/pexels-photo-1148998.jpeg?auto=compress&cs=tinysrgb&w=300',
              type: 'segment',
              url: 'https://www.youtube.com/@LittleMichalOffical?t=0'
            },
            {
              id: 'michal-v3-s2',
              title: 'Slide Fun',
              thumbnail: 'https://images.pexels.com/photos/1148998/pexels-photo-1148998.jpeg?auto=compress&cs=tinysrgb&w=300',
              type: 'segment',
              url: 'https://www.youtube.com/@LittleMichalOffical?t=75'
            },
            {
              id: 'michal-v3-s3',
              title: 'Sandbox Play',
              thumbnail: 'https://images.pexels.com/photos/1148998/pexels-photo-1148998.jpeg?auto=compress&cs=tinysrgb&w=300',
              type: 'segment',
              url: 'https://www.youtube.com/@LittleMichalOffical?t=150'
            },
            {
              id: 'michal-v3-s4',
              title: 'Friends Together',
              thumbnail: 'https://images.pexels.com/photos/1148998/pexels-photo-1148998.jpeg?auto=compress&cs=tinysrgb&w=300',
              type: 'segment',
              url: 'https://www.youtube.com/@LittleMichalOffical?t=225'
            }
          ]
        },
        {
          id: 'michal-video-4',
          title: 'Kitchen Helpers',
          thumbnail: 'https://images.pexels.com/photos/1092730/pexels-photo-1092730.jpeg?auto=compress&cs=tinysrgb&w=300',
          type: 'category',
          children: [
            {
              id: 'michal-v4-s1',
              title: 'Making Cookies',
              thumbnail: 'https://images.pexels.com/photos/1092730/pexels-photo-1092730.jpeg?auto=compress&cs=tinysrgb&w=300',
              type: 'segment',
              url: 'https://www.youtube.com/@LittleMichalOffical?t=0'
            },
            {
              id: 'michal-v4-s2',
              title: 'Fruit Salad',
              thumbnail: 'https://images.pexels.com/photos/1092730/pexels-photo-1092730.jpeg?auto=compress&cs=tinysrgb&w=300',
              type: 'segment',
              url: 'https://www.youtube.com/@LittleMichalOffical?t=90'
            },
            {
              id: 'michal-v4-s3',
              title: 'Setting the Table',
              thumbnail: 'https://images.pexels.com/photos/1092730/pexels-photo-1092730.jpeg?auto=compress&cs=tinysrgb&w=300',
              type: 'segment',
              url: 'https://www.youtube.com/@LittleMichalOffical?t=180'
            },
            {
              id: 'michal-v4-s4',
              title: 'Clean Up Song',
              thumbnail: 'https://images.pexels.com/photos/1092730/pexels-photo-1092730.jpeg?auto=compress&cs=tinysrgb&w=300',
              type: 'segment',
              url: 'https://www.youtube.com/@LittleMichalOffical?t=270'
            }
          ]
        }
      ]
    },
    {
      id: 'roy-boy',
      title: 'Roy Boy',
      thumbnail: 'https://images.pexels.com/photos/207691/pexels-photo-207691.jpeg?auto=compress&cs=tinysrgb&w=300',
      type: 'category',
      children: [
        {
          id: 'roy-video-1',
          title: 'Superhero Training',
          thumbnail: 'https://images.pexels.com/photos/163036/mario-luigi-yoschi-figures-163036.jpeg?auto=compress&cs=tinysrgb&w=300',
          type: 'category',
          children: [
            {
              id: 'roy-v1-s1',
              title: 'Super Strength',
              thumbnail: 'https://images.pexels.com/photos/163036/mario-luigi-yoschi-figures-163036.jpeg?auto=compress&cs=tinysrgb&w=300',
              type: 'segment',
              url: 'https://www.youtube.com/@royboychannel?t=0'
            },
            {
              id: 'roy-v1-s2',
              title: 'Flying Practice',
              thumbnail: 'https://images.pexels.com/photos/163036/mario-luigi-yoschi-figures-163036.jpeg?auto=compress&cs=tinysrgb&w=300',
              type: 'segment',
              url: 'https://www.youtube.com/@royboychannel?t=80'
            },
            {
              id: 'roy-v1-s3',
              title: 'Rescue Mission',
              thumbnail: 'https://images.pexels.com/photos/163036/mario-luigi-yoschi-figures-163036.jpeg?auto=compress&cs=tinysrgb&w=300',
              type: 'segment',
              url: 'https://www.youtube.com/@royboychannel?t=160'
            },
            {
              id: 'roy-v1-s4',
              title: 'Hero Celebration',
              thumbnail: 'https://images.pexels.com/photos/163036/mario-luigi-yoschi-figures-163036.jpeg?auto=compress&cs=tinysrgb&w=300',
              type: 'segment',
              url: 'https://www.youtube.com/@royboychannel?t=240'
            }
          ]
        },
        {
          id: 'roy-video-2',
          title: 'Space Adventure',
          thumbnail: 'https://images.pexels.com/photos/73873/star-clusters-rosette-nebula-star-galaxies-73873.jpeg?auto=compress&cs=tinysrgb&w=300',
          type: 'category',
          children: [
            {
              id: 'roy-v2-s1',
              title: 'Rocket Launch',
              thumbnail: 'https://images.pexels.com/photos/73873/star-clusters-rosette-nebula-star-galaxies-73873.jpeg?auto=compress&cs=tinysrgb&w=300',
              type: 'segment',
              url: 'https://www.youtube.com/@royboychannel?t=0'
            },
            {
              id: 'roy-v2-s2',
              title: 'Planet Exploration',
              thumbnail: 'https://images.pexels.com/photos/73873/star-clusters-rosette-nebula-star-galaxies-73873.jpeg?auto=compress&cs=tinysrgb&w=300',
              type: 'segment',
              url: 'https://www.youtube.com/@royboychannel?t=100'
            },
            {
              id: 'roy-v2-s3',
              title: 'Alien Friends',
              thumbnail: 'https://images.pexels.com/photos/73873/star-clusters-rosette-nebula-star-galaxies-73873.jpeg?auto=compress&cs=tinysrgb&w=300',
              type: 'segment',
              url: 'https://www.youtube.com/@royboychannel?t=200'
            },
            {
              id: 'roy-v2-s4',
              title: 'Return to Earth',
              thumbnail: 'https://images.pexels.com/photos/73873/star-clusters-rosette-nebula-star-galaxies-73873.jpeg?auto=compress&cs=tinysrgb&w=300',
              type: 'segment',
              url: 'https://www.youtube.com/@royboychannel?t=300'
            }
          ]
        },
        {
          id: 'roy-video-3',
          title: 'Dinosaur Discovery',
          thumbnail: 'https://images.pexels.com/photos/3264723/pexels-photo-3264723.jpeg?auto=compress&cs=tinysrgb&w=300',
          type: 'category',
          children: [
            {
              id: 'roy-v3-s1',
              title: 'T-Rex Encounter',
              thumbnail: 'https://images.pexels.com/photos/3264723/pexels-photo-3264723.jpeg?auto=compress&cs=tinysrgb&w=300',
              type: 'segment',
              url: 'https://www.youtube.com/@royboychannel?t=0'
            },
            {
              id: 'roy-v3-s2',
              title: 'Triceratops Family',
              thumbnail: 'https://images.pexels.com/photos/3264723/pexels-photo-3264723.jpeg?auto=compress&cs=tinysrgb&w=300',
              type: 'segment',
              url: 'https://www.youtube.com/@royboychannel?t=85'
            },
            {
              id: 'roy-v3-s3',
              title: 'Flying Pterodactyl',
              thumbnail: 'https://images.pexels.com/photos/3264723/pexels-photo-3264723.jpeg?auto=compress&cs=tinysrgb&w=300',
              type: 'segment',
              url: 'https://www.youtube.com/@royboychannel?t=170'
            },
            {
              id: 'roy-v3-s4',
              title: 'Fossil Hunt',
              thumbnail: 'https://images.pexels.com/photos/3264723/pexels-photo-3264723.jpeg?auto=compress&cs=tinysrgb&w=300',
              type: 'segment',
              url: 'https://www.youtube.com/@royboychannel?t=255'
            }
          ]
        },
        {
          id: 'roy-video-4',
          title: 'Ocean Exploration',
          thumbnail: 'https://images.pexels.com/photos/1001682/pexels-photo-1001682.jpeg?auto=compress&cs=tinysrgb&w=300',
          type: 'category',
          children: [
            {
              id: 'roy-v4-s1',
              title: 'Submarine Dive',
              thumbnail: 'https://images.pexels.com/photos/1001682/pexels-photo-1001682.jpeg?auto=compress&cs=tinysrgb&w=300',
              type: 'segment',
              url: 'https://www.youtube.com/@royboychannel?t=0'
            },
            {
              id: 'roy-v4-s2',
              title: 'Coral Reef Tour',
              thumbnail: 'https://images.pexels.com/photos/1001682/pexels-photo-1001682.jpeg?auto=compress&cs=tinysrgb&w=300',
              type: 'segment',
              url: 'https://www.youtube.com/@royboychannel?t=95'
            },
            {
              id: 'roy-v4-s3',
              title: 'Whale Song',
              thumbnail: 'https://images.pexels.com/photos/1001682/pexels-photo-1001682.jpeg?auto=compress&cs=tinysrgb&w=300',
              type: 'segment',
              url: 'https://www.youtube.com/@royboychannel?t=190'
            },
            {
              id: 'roy-v4-s4',
              title: 'Treasure Discovery',
              thumbnail: 'https://images.pexels.com/photos/1001682/pexels-photo-1001682.jpeg?auto=compress&cs=tinysrgb&w=300',
              type: 'segment',
              url: 'https://www.youtube.com/@royboychannel?t=285'
            }
          ]
        }
      ]
    }
  ];

  constructor() {
    // Initialize with root level
    this.updateNavigationState(this.videoData, ['Home'], false);
  }

  getNavigationState(): Observable<NavigationState> {
    return this.navigationState.asObservable();
  }

  navigateToItem(item: VideoItem): void {
    if (item.type === 'category' && item.children) {
      // Navigate to category or video with segments
      this.navigationStack.push(this.navigationState.value.currentLevel);
      const newBreadcrumb = [...this.navigationState.value.breadcrumb, item.title];
      this.updateNavigationState(item.children, newBreadcrumb, true);
    } else if (item.type === 'segment' && item.url) {
      // Play video segment - this will be handled by the WebSocket service
      console.log('Playing video segment:', item.url);
    }
  }

  goBack(): void {
    if (this.navigationStack.length > 0) {
      const previousLevel = this.navigationStack.pop()!;
      const newBreadcrumb = [...this.navigationState.value.breadcrumb];
      newBreadcrumb.pop();
      const canGoBack = this.navigationStack.length > 0;
      this.updateNavigationState(previousLevel, newBreadcrumb, canGoBack);
    }
  }

  goHome(): void {
    this.navigationStack = [];
    this.updateNavigationState(this.videoData, ['Home'], false);
  }

  private updateNavigationState(currentLevel: VideoItem[], breadcrumb: string[], canGoBack: boolean): void {
    this.navigationState.next({
      currentLevel,
      breadcrumb,
      canGoBack
    });
  }
}