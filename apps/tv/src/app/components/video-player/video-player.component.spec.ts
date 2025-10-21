import { Component, EventEmitter, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SimpleChange } from '@angular/core';
import { By } from '@angular/platform-browser';
import { VideoPlayerComponent } from './video-player.component';
import { YouTubePlayer } from '@angular/youtube-player';


// Stub for @angular/youtube-player component with compatible API
@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'youtube-player',
  standalone: true,
  template: ''
})
class YoutubePlayerStub {
  @Input() videoId = '';
  @Input() width?: number;
  @Input() height?: number;
  @Input() playerVars?: undefined;

  // Outputs used by VideoPlayerComponent
  // Note: not triggered in these tests; provided for completeness
  ready = new EventEmitter<void>();
  stateChange = new EventEmitter<undefined>();

  // Methods the component invokes via @ViewChild reference
  playVideo = jasmine.createSpy('playVideo');
  pauseVideo = jasmine.createSpy('pauseVideo');
  stopVideo = jasmine.createSpy('stopVideo');
  seekTo = jasmine.createSpy('seekTo');
  setVolume = jasmine.createSpy('setVolume');
  getCurrentTime = jasmine.createSpy('getCurrentTime').and.returnValue(0);
  getDuration = jasmine.createSpy('getDuration').and.returnValue(0);
}

function sc(change: undefined | SimpleChange): SimpleChange {
  // Helper to mark SimpleChange
  return change as SimpleChange;
}

describe('VideoPlayerComponent (POC)', () => {
  let fixture: ComponentFixture<VideoPlayerComponent>;
  let component: VideoPlayerComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VideoPlayerComponent, YoutubePlayerStub]
    })
      // Override template to ensure our stub is used and exposed via #youtubePlayer
      .overrideComponent(VideoPlayerComponent, {
        set: {
          template: `
            <youtube-player
              #youtubePlayer
              [videoId]="getYouTubeId() || ''"
              [width]="playerWidth"
              [height]="playerHeight"
              [playerVars]="{ autoplay: autoplay ? 1 : 0, controls: showControls ? 1 : 0 }"
              (ready)="onPlayerReady()"
              (stateChange)="onStateChange($event)">
            </youtube-player>
          `
        }
      })
      .compileComponents();

    fixture = TestBed.createComponent(VideoPlayerComponent);
    component = fixture.componentInstance;
  });

  function getStub(): YoutubePlayerStub {
    const de = fixture.debugElement.query(By.directive(YoutubePlayerStub));
    return de.componentInstance as YoutubePlayerStub;
  }

  it('renders youtube-player when videoId is provided', () => {
    component.videoId = 'dQw4w9WgXcQ';
    fixture.detectChanges();

    const stub = getStub();
    expect(stub).toBeTruthy();
    expect(stub.videoId).toBe('dQw4w9WgXcQ');
  });

  it('initializes without errors', () => {
    expect(component).toBeTruthy();
    fixture.detectChanges();
  });

  it('calls playVideo when isPlaying toggles to true', () => {
    fixture.detectChanges();
    const stub = getStub();

    component['youtubePlayer'] = stub as unknown as YouTubePlayer; // satisfy @ViewChild usage
    component.isPlayerReady = true;

    component.isPlaying = true;
    component.ngOnChanges({ isPlaying: sc(new SimpleChange(null, true, false)) });

    expect(stub.playVideo).toHaveBeenCalled();
  });

  it('calls pauseVideo when isPlaying toggles to false', () => {
    fixture.detectChanges();
    const stub = getStub();

    component['youtubePlayer'] = stub as unknown as YouTubePlayer; // satisfy @ViewChild usage
    component.isPlayerReady = true;

    component.isPlaying = false;
    component.ngOnChanges({ isPlaying: sc(new SimpleChange(true, false, false)) });

    expect(stub.pauseVideo).toHaveBeenCalled();
  });

  it('seeks when positionSec changes', () => {
    fixture.detectChanges();
    const stub = getStub();

    component['youtubePlayer'] = stub as unknown as YouTubePlayer; // satisfy @ViewChild usage
    component.isPlayerReady = true;

    component.positionSec = 42;
    component.ngOnChanges({ positionSec: sc(new SimpleChange(10, 42, false)) });

    expect(stub.seekTo).toHaveBeenCalledWith(42);
  });

  it('normalizes volume 0..1 to 0..100 when volume changes', () => {
    fixture.detectChanges();
    const stub = getStub();

    component['youtubePlayer'] = stub as unknown as YouTubePlayer; // satisfy @ViewChild usage
    component.isPlayerReady = true;

    component.volume = 0.5; // 50%
    component.ngOnChanges({ volume: sc(new SimpleChange(null, 0.5, false)) });
    expect(stub.setVolume).toHaveBeenCalledWith(50);
  });

  it('passes volume unchanged when already 0..100', () => {
    fixture.detectChanges();
    const stub = getStub();

    component['youtubePlayer'] = stub as unknown as YouTubePlayer; // satisfy @ViewChild usage
    component.isPlayerReady = true;

    component.volume = 80;
    component.ngOnChanges({ volume: sc(new SimpleChange(60, 80, false)) });
    expect(stub.setVolume).toHaveBeenCalledWith(80);
  });
});
