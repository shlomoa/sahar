import { Component, Input, Output, EventEmitter, OnInit, ViewChild, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { YouTubePlayerModule, YouTubePlayer } from '@angular/youtube-player';
import { Video, LikedScene, YouTubeThumbnailImageQuality } from 'shared';
import { getYoutubeVideoId, getYoutubeThumbnailUrl } from 'shared';

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
  @Input() videoId?: string;             // YouTube video id (11 chars)
  @Input() isPlaying?: boolean | null;   // desired play/pause state
  @Input() positionSec?: number | null;  // desired seek position (seconds)
  @Input() volume?: number | null;       // 0..1 (preferred) or 0..100

  @Input() currentVideo?: Video;
  @Input() currentScene?: LikedScene;
  @Input() autoplay = true;
  @Input() showControls = true;
  
  @Output() playerReady = new EventEmitter<YT.Player>();
  @Output() videoStarted = new EventEmitter<void>();
  @Output() videoPaused = new EventEmitter<void>();
  @Output() videoEnded = new EventEmitter<void>();
  @Output() timeUpdate = new EventEmitter<number>();

  playerWidth = 1280;
  playerHeight = 720;
  isPlayerReady = false;
  isFullscreen = false;
  currentTime = 0;
  duration = 0;

  // Inform YouTube IFrame API about our hosting origin to avoid postMessage targetOrigin warnings
  origin = typeof window !== 'undefined' ? window.location.origin : '';

  ngOnInit(): void {
    // Angular YouTubePlayerModule handles API loading automatically
    console.log('📺 Video player component initialized');
  }

  ngOnChanges(changes: SimpleChanges) {
    console.log('📺 Video player component on change callback', changes);
    // Handle video source change via either explicit videoId or currentVideo.url
    if ((changes['videoId'] || changes['currentVideo']) && (this.videoId || this.currentVideo?.url)) {
      this.loadVideo();
    }
    
    if (changes['currentScene'] && this.currentScene && this.isPlayerReady) {
      this.seekToScene();
    }

    // Map protocol-oriented playback inputs into player API when ready
    if (this.isPlayerReady) {
      if ('isPlaying' in changes && this.isPlaying !== undefined && this.isPlaying !== null) {
        if (this.isPlaying) 
           this.play();
        else
          this.pause();
      }

      if ('positionSec' in changes && typeof this.positionSec === 'number' && !Number.isNaN(this.positionSec)) {
        this.seekTo(this.positionSec);
      }

      if ('volume' in changes && typeof this.volume === 'number' && !Number.isNaN(this.volume)) {
        // Server now sends 0-100 range directly, which matches YouTube API expectations
        this.setVolume(this.volume);
      }
    }
  }

  private extractYouTubeId(url: string): string | null {
    // Use shared utility function
    return getYoutubeVideoId(url);
  }


  getYouTubeId(): string | null {
    // Prefer explicit input when provided, otherwise derive from currentVideo.url
    if (this.videoId) {
      return this.videoId;
    }
    return this.currentVideo?.url ? this.extractYouTubeId(this.currentVideo.url) : null;
  }
  
  // Get YouTube thumbnail for current video
  getVideoThumbnail(quality: YouTubeThumbnailImageQuality = 'hqdefault'): string | null {
    const videoId = this.getYouTubeId();
    return videoId ? getYoutubeThumbnailUrl(videoId, quality) : null;
  }

  onPlayerReady(event: YT.PlayerEvent): void {
    console.log('📺 YouTube player ready recieved event', event);
    this.isPlayerReady = true;
    this.playerReady.emit(event.target);
    
    // If we have a position or scene, seek to it after the player is ready
    if (this.positionSec !== null && this.positionSec !== undefined || this.currentScene) {
      setTimeout(() => {
        this.seekToPosition();
      }, 1000); // Wait for video to load
    }

    // If autoplay or isPlaying is desired, attempt to start playback once ready
    if (this.autoplay || this.isPlaying) {
      setTimeout(() => this.tryAutoplay(), 0);
    }
  }

  onStateChange(event: YT.OnStateChangeEvent) {
    const playerState = event.data;
    
    // Use YouTube API constants for player states
    // YT.PlayerState: UNSTARTED = -1, ENDED = 0, PLAYING = 1, PAUSED = 2, BUFFERING = 3, CUED = 5
    switch (playerState) {
      case -1: // YT.PlayerState.UNSTARTED
        console.log('⏳ Video unstarted');
        break;

      case 1: // YT.PlayerState.PLAYING
        console.log('▶️ Video started playing');
        this.videoStarted.emit();
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
        if (this.autoplay || this.isPlaying) {
          setTimeout(() => {
            try {
              if (this.youtubePlayer && this.youtubePlayer.getPlayerState && this.youtubePlayer.getPlayerState() === 3) {
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
        if (this.autoplay || this.isPlaying) {
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
    if (!this.isPlayerReady || !this.youtubePlayer) return;
    try {
      // Always start muted for autoplay to comply with browser policies
      console.log('🔇 Starting muted autoplay to comply with browser policies');
      this.setVolume(0);
      this.youtubePlayer.playVideo();
    } catch (error) {
      console.error('❌ Error attempting autoplay:', error);
    }
  }

  private timeTrackingInterval?: number;

  private startTimeTracking() {
    this.stopTimeTracking(); // Clear any existing interval
    
    this.timeTrackingInterval = window.setInterval(() => {
      if (this.youtubePlayer && this.isPlayerReady) {
        this.currentTime = this.youtubePlayer.getCurrentTime();
        this.duration = this.youtubePlayer.getDuration();
        this.timeUpdate.emit(this.currentTime);
      }
    }, 1000);
  }

  private stopTimeTracking() {
    if (this.timeTrackingInterval) {
      clearInterval(this.timeTrackingInterval);
      this.timeTrackingInterval = undefined;
    }
  }

  private loadVideo() {
    const providedId = this.getYouTubeId();
    if (!providedId) {
      // Fall back to currentVideo.url if present, otherwise bail
      if (!this.currentVideo?.url) return;
    }

    const youtubeId = providedId ?? this.extractYouTubeId(this.currentVideo!.url);
    if (!youtubeId) {
      console.error('❌ Invalid YouTube ID/URL:', this.currentVideo?.url ?? '(none)');
      return;
    }

    console.log('📺 Loading YouTube video:', youtubeId);
    
    // Angular YouTube player handles video loading automatically via videoId binding
    // If we have a specific position (positionSec) or scene, seek to it after the video loads
    if ((this.positionSec !== null && this.positionSec !== undefined) || this.currentScene) {
      if (this.isPlayerReady) {
        setTimeout(() => {
          this.seekToPosition();
        }, 2000); // Wait for video to load
      }
    }
  }

  private seekToScene() {
    if (!this.isPlayerReady || !this.currentScene || !this.youtubePlayer) {
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
    if (!this.isPlayerReady || !this.youtubePlayer) {
      console.warn('⚠️ Cannot seek to position: player not ready');
      return;
    }

    // Prefer explicit positionSec input, fallback to currentScene.startTime
    const position = this.positionSec ?? this.currentScene?.startTime;
    
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

  // Utility method for formatting time
  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // Public control methods
  play() {
    if (this.isPlayerReady && this.youtubePlayer) {
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

  pause() {
    if (this.isPlayerReady && this.youtubePlayer) {
      try {
        this.youtubePlayer.pauseVideo();
      } catch (error) {
        console.error('❌ Error pausing video:', error);
      }
    }
  }

  stop() {
    if (this.isPlayerReady && this.youtubePlayer) {
      try {
        this.youtubePlayer.stopVideo();
      } catch (error) {
        console.error('❌ Error stopping video:', error);
      }
    }
  }

  seekTo(seconds: number) {
    if (this.isPlayerReady && this.youtubePlayer) {
      try {
        this.youtubePlayer.seekTo(seconds, true);
      } catch (error) {
        console.error('❌ Error seeking video:', error);
      }
    }
  }

  setVolume(volume: number) {
    if (this.isPlayerReady && this.youtubePlayer) {
      try {
        this.youtubePlayer.setVolume(volume);
      } catch (error) {
        console.error('❌ Error setting volume:', error);
      }
    }
  }

  getCurrentTime(): number {
    if (this.isPlayerReady && this.youtubePlayer) {
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
    if (this.isPlayerReady && this.youtubePlayer) {
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
    console.log('📺 Toggling fullscreen mode');
    if (!this.isFullscreen) {
      this.openFullscreen();
    } else {
      this.closeFullscreen();
    }
    this.youtubePlayer?.requestFullscreen();
  }   

  closeFullscreen() {
    const doc = document as Document & {
      webkitExitFullscreen?: () => Promise<void>;
      msExitFullscreen?: () => Promise<void>;
    };

    if (doc.exitFullscreen) {
      doc.exitFullscreen();
    } else if (doc.webkitExitFullscreen) { // Safari
      doc.webkitExitFullscreen();
    } else if (doc.msExitFullscreen) { // IE11
      doc.msExitFullscreen();
    }

    this.isFullscreen = false;
  }

  openFullscreen() {
    const elem = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void>;
      msRequestFullscreen?: () => Promise<void>;
    };
    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    } else if (elem.webkitRequestFullscreen) { /* Safari */
      elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) { /* IE11 */
      elem.msRequestFullscreen();
    }
    this.isFullscreen = true;
  }

}
