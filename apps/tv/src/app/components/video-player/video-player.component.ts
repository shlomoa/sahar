import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ViewChild, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { YouTubePlayerModule, YouTubePlayer } from '@angular/youtube-player';
import { Video, LikedScene } from '../../models/video-navigation';

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
    // Load YouTube API if not already loaded
    if (!window.YT) {
      this.loadYouTubeAPI();
    }
  }

  ngOnDestroy() {
    // Cleanup if needed
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['currentVideo'] && this.currentVideo?.youtubeId) {
      this.loadVideo();
    }
    
    if (changes['currentScene'] && this.currentScene && this.isPlayerReady) {
      this.seekToScene();
    }
  }

  private loadYouTubeAPI() {
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    
    (window as any).onYouTubeIframeAPIReady = () => {
      console.log('📺 YouTube API loaded');
    };
  }

  onPlayerReady() {
    console.log('📺 YouTube player ready');
    this.isPlayerReady = true;
    this.playerReady.emit();
    
    if (this.currentVideo?.youtubeId) {
      this.loadVideo();
    }
  }

  onStateChange(event: any) {
    const playerState = event.data;
    
    switch (playerState) {
      case window.YT?.PlayerState.PLAYING:
        console.log('▶️ Video started playing');
        this.videoStarted.emit();
        this.startTimeTracking();
        break;
        
      case window.YT?.PlayerState.PAUSED:
        console.log('⏸️ Video paused');
        this.videoPaused.emit();
        this.stopTimeTracking();
        break;
        
      case window.YT?.PlayerState.ENDED:
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
    if (!this.isPlayerReady || !this.currentVideo?.youtubeId) {
      return;
    }

    console.log('📺 Loading YouTube video:', this.currentVideo.youtubeId);
    
    // The video will load automatically via the videoId binding
    // If we have a specific scene, seek to it after loading
    if (this.currentScene) {
      setTimeout(() => {
        this.seekToScene();
      }, 2000); // Wait for video to load
    }
  }

  private seekToScene() {
    if (!this.isPlayerReady || !this.currentScene) {
      return;
    }

    const startTime = this.currentScene.startTime;
    console.log('🎯 Seeking to scene timestamp:', startTime);
    
    try {
      this.youtubePlayer.seekTo(startTime, true);
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
    if (this.isPlayerReady) {
      this.youtubePlayer.playVideo();
    }
  }

  pause() {
    if (this.isPlayerReady) {
      this.youtubePlayer.pauseVideo();
    }
  }

  stop() {
    if (this.isPlayerReady) {
      this.youtubePlayer.stopVideo();
    }
  }

  seekTo(seconds: number) {
    if (this.isPlayerReady) {
      this.youtubePlayer.seekTo(seconds, true);
    }
  }

  setVolume(volume: number) {
    if (this.isPlayerReady) {
      this.youtubePlayer.setVolume(volume);
    }
  }

  getCurrentTime(): number {
    return this.isPlayerReady ? this.youtubePlayer.getCurrentTime() : 0;
  }

  getDuration(): number {
    return this.isPlayerReady ? this.youtubePlayer.getDuration() : 0;
  }
}
