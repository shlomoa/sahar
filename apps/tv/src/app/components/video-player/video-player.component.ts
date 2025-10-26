import { Component, Input, Output, EventEmitter, OnInit, ViewChild, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { YouTubePlayerModule, YouTubePlayer } from '@angular/youtube-player';
import { Video, Scene, YouTubeThumbnailImageQuality, PlayerState } from 'shared';
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
  @Input() playerState!: PlayerState;    // Complete player state
  @Input() positionSec?: number | null;  // desired seek position (seconds)
  @Input() currentVideo?: Video;
  @Input() currentScene?: Scene;
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
  currentTime = 0;
  duration = 0;  

  // Inform YouTube IFrame API about our hosting origin to avoid postMessage targetOrigin warnings
  origin = typeof window !== 'undefined' ? window.location.origin : '';

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
    console.log('📺 Video player component on change callback', changes);
    // Handle video source change via either explicit videoId or currentVideo.url
    if ((changes['videoId'] || changes['currentVideo']) && (this.videoId || this.currentVideo?.url)) {
      this.loadVideo();
    }
    
    if (changes['currentScene'] && this.currentScene && this.isPlayerReady) {
      this.seekToScene();
    }

    // Handle fullscreen changes (independent of player readiness)
    if ('isFullscreen' in changes && typeof this.playerState === 'boolean') {
      this.toggleFullscreen();
    }

    // Map protocol-oriented playback inputs into player API when ready
    if (this.isPlayerReady) {
      if ('isPlaying' in changes && this.playerState.isPlaying !== undefined && this.playerState.isPlaying !== null) {
        if (this.playerState.isPlaying) 
          this.play();
        else
          this.pause();
      }

      if ('positionSec' in changes && typeof this.positionSec === 'number' && !Number.isNaN(this.positionSec)) {
        this.seekTo(this.positionSec);
      }

      if ('volume' in changes && typeof this.playerState.volume === 'number' && !Number.isNaN(this.playerState.volume)) {
        // Server now sends 0-100 range directly, which matches YouTube API expectations
        this.setVolume(this.playerState.volume);
      }
      if ('isMuted' in changes && typeof this.playerState.isMuted === 'boolean') {
        this.playerState.isMuted ? this.mute() : this.unmute();
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
    console.log('📺 YouTube player ready received event', event);
    this.isPlayerReady = true;
    this.playerReady.emit(event.target);
    
    // If we have a position or scene, seek to it after the player is ready
    if (this.positionSec !== null && this.positionSec !== undefined || this.currentScene) {
      setTimeout(() => {
        this.seekToPosition();
      }, 1000); // Wait for video to load
    }

    // If autoplay or isPlaying is desired, attempt to start playback once ready
    if (this.autoplay || this.playerState.isPlaying) {
      setTimeout(() => this.tryAutoplay(), 0);
    }
  }

  onStateChange(event: YT.OnStateChangeEvent) {
    console.log('📺 YouTube player state changed:', event);
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
        if (this.autoplay || this.playerState.isPlaying) {
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
        if (this.autoplay || this.playerState.isPlaying) {
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
    console.log('⏱️ Starting time tracking');
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
    console.log('⏱️ Stopping time tracking');
    if (this.timeTrackingInterval) {
      clearInterval(this.timeTrackingInterval);
      this.timeTrackingInterval = undefined;
    }
  }

  private loadVideo() {
    console.log('📺 Loading video in player');
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
    console.log('🎯 Seeking to scene:', this.currentScene);
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
    console.log('▶️ Playing video');
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

  unmute() {
    console.log('🔊 Unmuting video');
    if (this.isPlayerReady && this.youtubePlayer) {
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
    if (this.isPlayerReady && this.youtubePlayer) {
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
    if (this.isPlayerReady && this.youtubePlayer) {
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
    if (this.isPlayerReady && this.youtubePlayer) {
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
    if (this.isPlayerReady && this.youtubePlayer) {
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
    if (this.isPlayerReady && this.youtubePlayer) {
      try {
        console.log('🔊 Setting volume to (user-initiated):', volume);
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
