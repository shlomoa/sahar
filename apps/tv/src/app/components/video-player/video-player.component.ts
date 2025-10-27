import { Component, Input, Output, EventEmitter, OnInit, ViewChild, OnChanges, SimpleChanges, SimpleChange } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { YouTubePlayerModule, YouTubePlayer } from '@angular/youtube-player';
import { Video, Scene, PlayerState, isEqualPlayerState } from 'shared';
import { getYoutubeVideoId, getYoutubeThumbnailUrl } from 'shared';
import { formatTime } from 'shared';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'video-player',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    YouTubePlayerModule
  ],
  templateUrl: './video-player.component.html',
  styleUrls: ['./video-player.component.scss']
})
export class VideoPlayerComponent implements OnInit, OnChanges {

  @ViewChild('youtubePlayer') youtubePlayer!: YouTubePlayer;
  
  // New protocol-oriented inputs (optional): prefer these when provided  
  @Input() playerState!: PlayerState;    // Complete player state  
  @Input() currentVideo?: Video | null;
  @Input() currentScene?: Scene | null;
  
  @Output() playerReady = new EventEmitter<YT.Player>();
  @Output() isPlaying = new EventEmitter<void>();
  @Output() videoPaused = new EventEmitter<void>();
  @Output() videoEnded = new EventEmitter<void>();
  @Output() timeUpdate = new EventEmitter<number>();

  playerWidth = 1280;
  playerHeight = 720;
  isPlayerReady = false;
  currentTime = 0;
  duration = 0;  

  formatTime = formatTime;
  // Inform YouTube IFrame API about our hosting origin to avoid postMessage targetOrigin warnings
  readonly origin = window.location.origin;

  ngOnInit(): void {
    // Angular YouTubePlayerModule handles API loading automatically
    console.log('📺 Video player component initialized');
    this.setupFullscreenListener();
  }

  private setupFullscreenListener() {
    document.addEventListener('fullscreenchange', () => {
      this.playerState.isFullscreen = !!document.fullscreenElement;
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    console.log('📺 Video player component ngOnChanges called', changes);    
    // Handle video source change via either explicit videoId or currentVideo.url
    if (!this.isPlayerReady) {
      console.log('📺 Player not ready yet, skipping ngOnChanges handling');
      return;
    }
    if ('playerState' in changes) {
      if (isEqualPlayerState(changes['playerState'].previousValue, changes['playerState'].currentValue)) {
        console.log('📺 PlayerState change detected but no effective difference');
        // could have changed but is effectively the same
      } else {
        const prev: PlayerState = changes['playerState'].previousValue;
        const curr: PlayerState = changes['playerState'].currentValue;

        // Do not handle currentTime change at this point
        //if (typeof curr.currentTime === 'number' && curr.currentTime !== prev.currentTime) {
        //  this.seekTo(curr.currentTime);
        //}

        // Handle volume change
        if (typeof curr.volume === 'number' && curr.volume !== prev.volume) {
          this.setVolume(curr.volume);
        }
        if (typeof curr.isMuted === 'boolean' && curr.isMuted !== prev.isMuted) {
          curr.isMuted ? this.mute() : this.unmute();
        }
        if (typeof curr.isFullscreen === 'boolean' && curr.isFullscreen !== prev.isFullscreen) {
          this.toggleFullscreen();
        }
        if (typeof curr.isPlaying === 'boolean' && curr.isPlaying !== prev.isPlaying) {
          curr.isPlaying ? this.play() : this.pause();
        }
      }
    }
    if (changes['currentVideo'] && this.currentVideo) {
      this.loadVideo();
    }
    
    if (changes['currentScene'] && this.currentScene) {
      this.seekToScene();
    }
 
  }

  // Extract YouTube ID from current video URL
  get youtubeId(): string {
    if (!this.currentVideo) {
      throw new Error('No current video for youtubeId');
    }
    return getYoutubeVideoId(this.currentVideo.url); 
  }
  
  // Get YouTube thumbnail for current video
  get getVideoThumbnail(): string {
    const videoId = this.youtubeId;
    return getYoutubeThumbnailUrl(videoId);
  }

  onYTError($event: YT.OnErrorEvent) {
    console.error('📺 YouTube player error:', $event);
  }

  onTBReady(event: YT.PlayerEvent): void {
    console.log('📺 YouTube onPlayerReady event received', event);

    this.isPlayerReady = true;
    this.playerReady.emit(event.target);
    
    // If we have a position or scene, seek to it after the player is ready
    if (this.playerState.currentTime !== null && this.playerState.currentTime !== undefined || this.currentScene) {
      setTimeout(() => {
        this.seekToPosition();
      }, 1000); // Wait for video to load
    }

    // If autoplay or isPlaying is desired, attempt to start playback once ready
    if (this.playerState.isPlaying) {
      setTimeout(() => this.tryAutoplay(), 0);
    }
  }

  onYTStateChange(event: YT.OnStateChangeEvent) {
    console.log('📺 YouTube player state changed:', event);
    const ytPlayerState = event.data;
    
    // Use YouTube API constants for player states
    // YT.PlayerState: UNSTARTED = -1, ENDED = 0, PLAYING = 1, PAUSED = 2, BUFFERING = 3, CUED = 5
    switch (ytPlayerState) {
      case -1: // YT.PlayerState.UNSTARTED
        console.log('⏳ Video unstarted');
        break;

      case 1: // YT.PlayerState.PLAYING
        console.log('▶️ Video started playing');
        this.isPlaying.emit();
        this.startTimeTracking();
        break;
        
      case 2: // YT.PlayerState.PAUSED
        console.log('⏸️ Video paused');
        this.videoPaused.emit();
        this.stopTimeTracking();
        break;
        
      case 0: // YT.PlayerState.ENDED
        console.log('⏹️ Video ended');
        this.videoEnded.emit();
        this.stopTimeTracking();
        break;

      case 3: // YT.PlayerState.BUFFERING
        console.log('🔄 Video buffering');
        // If buffering persists while we intend to play, retry a nudge after a short delay
        if (this.playerState.isPlaying) {
          setTimeout(() => {
            try {
              if (this.youtubePlayer.getPlayerState && this.youtubePlayer.getPlayerState() === 3) {
                this.tryAutoplay();
              }
            } catch (e) {
              console.error('❌ Error during buffering retry:', e);
            }
          }, 1500);
        }
        break;

      case 5: // YT.PlayerState.CUED
        console.log('🎬 Video cued and ready');
        // If we intend to play, attempt to start playback
        if (this.playerState.isPlaying) {
          this.tryAutoplay();
        }
        break;
    }
  }

  /**
   * Attempt to start playback in a way that works with browser autoplay policies.
   * For autoplay (no user interaction), start muted to comply with browser policies.
   * For user-initiated play commands, attempt unmuted playback.
   */
  private tryAutoplay() {
    console.log('🔇 Attempting autoplay');
    if (!this.isPlayerReady) return;
    try {
      // Always start muted for autoplay to comply with browser policies
      console.log('🔇 Starting muted autoplay to comply with browser policies'); 
      this.youtubePlayer.playVideo();
    } catch (error) {
      console.error('❌ Error attempting autoplay:', error);
    }
  }

  private timeTrackingInterval?: number;

  private startTimeTracking() {
    console.log('⏱️ Starting time tracking');
    this.stopTimeTracking(); // Clear any existing interval
    
    this.timeTrackingInterval = window.setInterval(() => {
      if (this.isPlayerReady) {
        this.currentTime = this.youtubePlayer.getCurrentTime();
        this.duration = this.youtubePlayer.getDuration();
        this.timeUpdate.emit(this.currentTime);
      }
    }, 1000);
  }

  private stopTimeTracking() {
    console.log('⏱️ Stopping time tracking');
    if (this.timeTrackingInterval) {
      clearInterval(this.timeTrackingInterval);
      this.timeTrackingInterval = undefined;
    }
  }

  private loadVideo() {
    console.log('📺 Loading YouTube video:', this.youtubeId);
    // Angular YouTube player handles video loading automatically via videoId binding
    // If we have a specific position (positionSec) or scene, seek to it after the video loads   
    if (this.isPlayerReady) {
      setTimeout(() => {
        this.seekToPosition();
      }, 2000); // Wait for video to load
    }
  }

  private seekToScene() {
    console.log('🎯 Seeking to scene:', this.currentScene);
    if (!this.isPlayerReady || !this.currentScene) {
      console.warn('⚠️ Cannot seek to scene: player not ready or scene/player missing');
      return;
    }

    const startTime = this.currentScene.startTime;
    console.log('🎯 Seeking to scene timestamp:', startTime);
    
    try {
      this.youtubePlayer.seekTo(startTime, true);
      console.log('✅ Successfully seeked to scene:', this.currentScene.title);
    } catch (error) {
      console.error('❌ Error seeking to scene:', error);
    }
  }

  private seekToPosition() {
    if (!this.isPlayerReady) {
      console.warn('⚠️ Cannot seek to position: player not ready');
      return;
    }
    console.log('🎯 Seeking to position (input/currentScene):', this.playerState.currentTime, this.currentScene);
    // Prefer explicit positionSec input, fallback to currentScene.startTime
    const position = this.playerState.currentTime ?? this.currentScene?.startTime;
    
    if (position === null || position === undefined) {
      console.warn('⚠️ No position to seek to');
      return;
    }

    console.log('🎯 Seeking to position:', position);
    
    try {
      this.youtubePlayer.seekTo(position, true);
      console.log('✅ Successfully seeked to position:', position);
    } catch (error) {
      console.error('❌ Error seeking to position:', error);
    }
  }

  // Public control methods
  play() {
    console.log('▶️ Playing video');
    if (this.isPlayerReady) {
      try {
        // For user-initiated play commands, don't force mute
        // Let the Remote control volume separately
        console.log('▶️ Playing video (user-initiated)');
        this.youtubePlayer.playVideo();
      } catch (error) {
        console.error('❌ Error playing video:', error);
      }
    }
  }

  unmute() {
    console.log('🔊 Unmuting video');
    if (this.isPlayerReady) {
      try {
        console.log('🔊 Unmuting video (user-initiated)');
        this.youtubePlayer.unMute();
      } catch (error) {
        console.error('❌ Error pausing video:', error);
      }
    }
  }

  mute() {
    console.log('🔇 Muting video');
    if (this.isPlayerReady) {
      try {
        console.log('🔇 Muting video (user-initiated)');
        this.youtubePlayer.mute();
      } catch (error) {
        console.error('❌ Error pausing video:', error);
      }
    }
  }

  pause() {
    console.log('⏸️ Pausing video');
    if (this.isPlayerReady) {
      try {
        console.log('⏸️ Pausing video (user-initiated)');
        this.youtubePlayer.pauseVideo();
      } catch (error) {
        console.error('❌ Error pausing video:', error);
      }
    }
  }

  stop() {
    console.log('⏹️ Stopping video');
    if (this.isPlayerReady) {
      try {
        console.log('⏹️ Stopping video (user-initiated)');
        this.youtubePlayer.stopVideo();
      } catch (error) {
        console.error('❌ Error stopping video:', error);
      }
    }
  }

  seekTo(seconds: number) {
    console.log('🎯 Seeking to seconds:', seconds);
    if (this.isPlayerReady) {
      try {
        console.log('🎯 Seeking to seconds (user-initiated):', seconds);
        this.youtubePlayer.seekTo(seconds, true);
      } catch (error) {
        console.error('❌ Error seeking video:', error);
      }
    }
  }

  setVolume(volume: number) {
    console.log('🔊 Setting volume to:', volume);
    if (this.isPlayerReady) {
      try {
        console.log('🔊 Setting volume to (user-initiated):', volume);
        this.youtubePlayer.setVolume(volume);
      } catch (error) {
        console.error('❌ Error setting volume:', error);
      }
    }
  }

  getCurrentTime(): number {
    if (this.isPlayerReady) {
      try {
        return this.youtubePlayer.getCurrentTime();
      } catch (error) {
        console.error('❌ Error getting current time:', error);
        return 0;
      }
    }
    return 0;
  }

  getDuration(): number {
    if (this.isPlayerReady) {
      try {
        return this.youtubePlayer.getDuration();
      } catch (error) {
        console.error('❌ Error getting duration:', error);
        return 0;
      }
    }
    return 0;
  }

  toggleFullscreen() {
    console.log('🔲 Toggling fullscreen');
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        this.playerState.isFullscreen = true;
      }).catch(err => {
        console.error('Error attempting to enable fullscreen:', err);
      });
    } else {
      document.exitFullscreen().then(() => {
        this.playerState.isFullscreen = false;
      });
    }
  }

}
