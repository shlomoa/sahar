import { Directive, HostListener, Input, inject } from '@angular/core';
import { ButtonDescriptionService } from '../services/button-description.service';
import { NarrationService } from '../services/narration.service';

@Directive({
  selector: '[libFocusDesc]',
  standalone: true
})
export class FocusDescDirective {
  @Input('libFocusDesc') desc = '';
  @Input() speakOnFocus = true;

  private descriptionService = inject(ButtonDescriptionService);
  private narrationService = inject(NarrationService);

  private longPressTimer: number | null = null;
  private readonly longPressMs = 700;

  @HostListener('focus') onFocus(): void {
    this.descriptionService.setDescription(this.desc);
    if (this.speakOnFocus) {
      this.narrationService.speak(this.desc);  // Service checks isEnabled internally
    }
  }

  @HostListener('blur') onBlur(): void {
    this.descriptionService.setDescription(null);
  }

  @HostListener('mouseenter') onEnter(): void {
    this.descriptionService.setDescription(this.desc);
  }

  @HostListener('mouseleave') onLeave(): void {
    this.descriptionService.setDescription(null);
  }

  @HostListener('touchstart') onTouchStart(): void {
    if (this.longPressTimer) window.clearTimeout(this.longPressTimer);
    this.longPressTimer = window.setTimeout(() => {
      this.descriptionService.setDescription(this.desc);
      if (this.speakOnFocus) {
        this.narrationService.speak(this.desc);
      }
    }, this.longPressMs);
  }

  @HostListener('touchend')
  @HostListener('touchcancel')
  onTouchEnd(): void {
    if (this.longPressTimer) {
      window.clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }
}
