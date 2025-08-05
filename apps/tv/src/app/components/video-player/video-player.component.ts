import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ViewChild, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { YouTubePlayerModule, YouTubePlayer } from '@angular/youtube-player';
import { Video, LikedScene } from '@shared/models/video-navigation';
import { getYoutubeVideoId, getYoutubeThumbnailUrl } from '@shared/utils/youtube-helpers';

@Component({
  selector: 'app-video-player',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    YouTubePlayerModule
  ],
  templateUrl: './video-player.component.html',
  styleUrls: ['./video-player.component.scss']
})
export class VideoPlayerComponent implements OnInit, OnDestroy, OnChanges {
  @ViewChild('youtubePlayer') youtubePlayer!: YouTubePlayer;
  
  @Input() currentVideo?: Video;
  @Input() currentScene?: LikedScene;
  @Input() autoplay = true;
  @Input() showControls = true;
  
  @Output() playerReady = new EventEmitter<void>();
  @Output() videoStarted = new EventEmitter<void>();
  @Output() videoPaused = new EventEmitter<void>();
  @Output() videoEnded = new EventEmitter<void>();
  @Output() timeUpdate = new EventEmitter<number>();

  playerWidth = 1280;
  playerHeight = 720;
  isPlayerReady = false;
  currentTime = 0;
  duration = 0;

  ngOnInit() {
    // Angular YouTubePlayerModule handles API loading automatically
    console.log('📺 Video player component initialized');
  }

  ngOnDestroy() {
    // Cleanup if needed
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['currentVideo'] && this.currentVideo?.url) {
      this.loadVideo();
    }
    
    if (changes['currentScene'] && this.currentScene && this.isPlayerReady) {
      this.seekToScene();
    }
  }

  private extractYouTubeId(url: string): string | null {
    // Use shared utility function
    return getYoutubeVideoId(url);
  }

  getYouTubeId(): string | null {
    return this.currentVideo?.url ? this.extractYouTubeId(this.currentVideo.url) : null;
  }

  // Get YouTube thumbnail for current video
  getVideoThumbnail(quality: 'default' | 'mqdefault' | 'hqdefault' | 'sddefault' | 'maxresdefault' = 'hqdefault'): string | null {
    const videoId = this.getYouTubeId();
    return videoId ? getYoutubeThumbnailUrl(videoId, quality) : null;
  }

  onPlayerReady() {
    console.log('📺 YouTube player ready');
    this.isPlayerReady = true;
    this.playerReady.emit();
    
    // If we have a current scene, seek to it after the player is ready
    if (this.currentScene) {
      setTimeout(() => {
        this.seekToScene();
      }, 1000); // Wait for video to load
    }
  }

  onStateChange(event: any) {
    const playerState = event.data;
    
    // Use YouTube API constants for player states
    // YT.PlayerState.PLAYING = 1, PAUSED = 2, ENDED = 0
    switch (playerState) {
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
    if (!this.currentVideo?.url) {
      return;
    }

    const youtubeId = this.extractYouTubeId(this.currentVideo.url);
    if (!youtubeId) {
      console.error('❌ Invalid YouTube URL:', this.currentVideo.url);
      return;
    }

    console.log('📺 Loading YouTube video:', youtubeId);
    
    // Angular YouTube player handles video loading automatically via videoId binding
    // If we have a specific scene, seek to it after the video loads
    if (this.currentScene && this.isPlayerReady) {
      setTimeout(() => {
        this.seekToScene();
      }, 2000); // Wait for video to load
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
}
