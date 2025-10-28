import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ButtonDescriptionService {
  // Signal (replaces POC's BehaviorSubject)
  readonly description = signal<string | null>(null);

  setDescription(text: string | null): void {
    this.description.set(text);
  }
}
