import { Injectable, Signal, computed, effect, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AdminQrOverlayService {
  // Visibility and URL state
  private readonly _visible = signal(false);
  private readonly _adminUrl = signal<string>('');
  private readonly _expiresAt = signal<number>(0);

  // Public signals
  readonly visible: Signal<boolean> = this._visible.asReadonly();
  readonly adminUrl: Signal<string> = this._adminUrl.asReadonly();
  readonly secondsLeft = computed(() => {
    if (!this._visible()) return 0;
    const ms = this._expiresAt() - Date.now();
    return Math.max(0, Math.ceil(ms / 1000));
  });

  private timerId: number | null = null;
  private readonly defaultVisibleMs = 5000; // 5s

  constructor() {
    // Keep a light effect to clear timer when hidden
    effect(() => {
      if (!this._visible() && this.timerId) {
        window.clearTimeout(this.timerId);
        this.timerId = null;
      }
    });
  }

  async show(visibleMs: number = this.defaultVisibleMs, adminUrl: string): Promise<void> {
    // Build/refresh URL on each show
    this._adminUrl.set(adminUrl);

    const now = Date.now();
    const newExpiry = now + visibleMs;

    if (this._visible()) {
      // Already visible → extend
      this._expiresAt.set(newExpiry);
      this.scheduleHide();
    } else {
      // First show
      this._expiresAt.set(newExpiry);
      this._visible.set(true);
      this.scheduleHide();
    }
  }

  hide(): void {
    this._visible.set(false);
    this._expiresAt.set(0);
  }

  private scheduleHide(): void {
    if (this.timerId) {
      window.clearTimeout(this.timerId);
    }
    const delay = Math.max(0, this._expiresAt() - Date.now());
    this.timerId = window.setTimeout(() => {
      this.hide();
    }, delay);
  }
}
