import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

/**
 * SecretTapService
 * Detects a hidden gesture: 3 taps, small pause, 3 taps ("3–pause–3").
 * Timing defaults:
 *  - intraTapMaxMs: 400ms between taps in a burst
 *  - interBurstMinMs: 300ms minimal gap between bursts
 *  - interBurstMaxMs: 1200ms maximal gap between bursts
 *  - cooldownMs: 5000ms after a successful trigger
 */
@Injectable({ providedIn: 'root' })
export class SecretTapService {
  // Configuration
  private pattern: [number, number] = [3, 3];
  private intraTapMaxMs = 400;
  private interBurstMinMs = 300;
  private interBurstMaxMs = 1200;
  private cooldownMs = 5000;

  private triggerSubject = new Subject<void>();
  /** Emits when the gesture is detected. */
  readonly triggered$ = this.triggerSubject.asObservable();

  // FSM state
  private burstIndex = 0; // 0 -> first burst, 1 -> second burst
  private tapCountInBurst = 0;
  private lastTapTime = 0;
  private waitingGap = false;
  private cooldownUntil = 0;
  private attached = false;

  attach(el: Document | HTMLElement = document): void {
    if (this.attached) return;
    this.attached = true;
    // Prefer pointer events to unify mouse/touch/pen
    el.addEventListener('pointerdown', this.onPointerDown, { passive: true, capture: true });
  }

  detach(el: Document | HTMLElement = document): void {
    if (!this.attached) return;
    this.attached = false;
    el.removeEventListener('pointerdown', this.onPointerDown, true);
  }

  private onPointerDown = (_ev: Event) => {
    const now = performance.now();
    if (now < this.cooldownUntil) {
      // In cooldown, ignore all taps
      return;
    }

    if (this.waitingGap) {
      // We are between bursts; measure the gap from last tap of previous burst
      const gap = now - this.lastTapTime;
      if (gap >= this.interBurstMinMs && gap <= this.interBurstMaxMs) {
        // Valid inter-burst gap → start next burst
        this.waitingGap = false;
        this.burstIndex = 1; // second burst
        this.tapCountInBurst = 0;
        this.lastTapTime = now;
        this.incrementBurst(now);
      } else {
        // Gap invalid → reset to first burst and treat this as first tap
        this.resetToStart(now);
        this.incrementBurst(now);
      }
      return;
    }

    // Not waiting for gap → we are in a burst (or at start)
    if (this.tapCountInBurst === 0) {
      // Start of a burst
      this.lastTapTime = now;
      this.incrementBurst(now);
      return;
    }

    const delta = now - this.lastTapTime;
    if (delta <= this.intraTapMaxMs) {
      // Within allowed tap spacing
      this.incrementBurst(now);
    } else {
      // Too slow → reset and treat as the first tap of new first burst
      this.resetToStart(now);
      this.incrementBurst(now);
    }
  };

  private incrementBurst(now: number): void {
    this.tapCountInBurst++;
    this.lastTapTime = now;

    const requiredTaps = this.burstIndex === 0 ? this.pattern[0] : this.pattern[1];
    if (this.tapCountInBurst >= requiredTaps) {
      if (this.burstIndex === 0) {
        // Finished first burst → wait for inter-burst gap
        this.waitingGap = true;
        // Keep lastTapTime as timestamp for measuring the gap
      } else {
        // Finished second burst → success
        this.onSuccess(now);
      }
    }
  }

  private onSuccess(now: number): void {
    this.triggerSubject.next();
    this.cooldownUntil = now + this.cooldownMs;
    this.resetAll();
  }

  private resetAll(): void {
    this.burstIndex = 0;
    this.tapCountInBurst = 0;
    this.lastTapTime = 0;
    this.waitingGap = false;
  }

  private resetToStart(now: number): void {
    this.burstIndex = 0;
    this.tapCountInBurst = 0;
    this.lastTapTime = now;
    this.waitingGap = false;
  }
}
