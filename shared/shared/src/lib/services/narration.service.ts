import { Injectable, signal } from '@angular/core';

export interface SpeechOptions {
  rate?: number;           // 0.1 to 10 (default: 1)
  pitch?: number;          // 0 to 2 (default: 1)
  volume?: number;         // 0 to 1 (default: 1)
  lang?: string;           // Language code (default: he-IL)
  voiceName?: string;      // Specific voice name
  speakWithNiqqud?: boolean; // Keep niqqud marks (default: true)
}

// Unicode ranges
const RE_CANTILLATION = /[\u0591-\u05AF]/g; // טעמים
// Niqqud set: 05B0–05BD, 05BF, 05C1–05C2, 05C4–05C5, 05C7
const RE_NIQQUD = /[\u05B0-\u05BD\u05BF\u05C1-\u05C2\u05C4-\u05C5\u05C7]/g;

@Injectable({ providedIn: 'root' })
export class NarrationService {
  // Signals (reactive state - MODERNIZATION)
  readonly isSpeaking = signal(false);
  readonly isSupported = signal(false);
  readonly isEnabled = signal(false);

  private voices: SpeechSynthesisVoice[] = [];
  private preferredLang = 'he-IL';
  private chosenVoice: SpeechSynthesisVoice | null = null;
  private defaultSpeakWithNiqqud = true;

  constructor() {
    this.initVoices();
  }

  enable(): void {
    this.isEnabled.set(true);
  }

  disable(): void {
    this.isEnabled.set(false);
  }

  setLang(lang: string, opts?: { voiceName?: string }): void {
    this.preferredLang = lang;
    this.pickVoiceForLang(lang, opts?.voiceName);
  }

  setDefaultSpeakWithNiqqud(on: boolean): void {
    this.defaultSpeakWithNiqqud = on;
  }

  private initVoices(): void {
    const synth = globalThis.speechSynthesis;
    if (!synth) {
      this.isSupported.set(false);
      return;
    }

    this.isSupported.set(true);

    const load = () => {
      this.voices = synth.getVoices();
      this.pickVoiceForLang(this.preferredLang);
    };

    synth.onvoiceschanged = load;
    load();
  }

  private pickVoiceForLang(lang: string, explicitName?: string): void {
    this.chosenVoice = null;

    if (explicitName) {
      const byName = this.voices.find(v => v.name === explicitName);
      if (byName) {
        this.chosenVoice = byName;
        return;
      }
    }

    let candidates = this.voices.filter(v => v.lang?.toLowerCase() === lang.toLowerCase());
    if (!candidates.length) {
      candidates = this.voices.filter(v => v.lang?.toLowerCase().startsWith('he'));
    }
    if (!candidates.length) {
      candidates = this.voices.filter(v => /Hebrew|עברית|Ivrit/i.test(v.name));
    }

    this.chosenVoice = candidates.find(v => /google/i.test(v.name)) ?? candidates[0] ?? null;
  }

  private sanitize(text: string, speakWithNiqqud: boolean): string {
    // Remove cantillation; optionally remove niqqud
    let t = text.normalize('NFC').replace(RE_CANTILLATION, '');
    if (!speakWithNiqqud) {
      t = t.replace(RE_NIQQUD, '');
    }
    // Optional pacing hint: convert double spaces to " , "
    t = t.replace(/ {2,}/g, ' , ');
    return t;
  }

  speak(text: string, opts: SpeechOptions = {}): void {
    if (!this.isEnabled()) return;

    const synth = globalThis.speechSynthesis;
    if (!synth) return;

    const speakWithNiqqud = opts.speakWithNiqqud ?? this.defaultSpeakWithNiqqud;
    const clean = this.sanitize(text, speakWithNiqqud);

    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = opts.rate ?? 1;
    utterance.pitch = opts.pitch ?? 1;
    utterance.volume = opts.volume ?? 1;
    utterance.lang = opts.lang ?? this.preferredLang ?? 'he-IL';

    if (opts.voiceName) {
      const byName = this.voices.find(v => v.name === opts.voiceName);
      if (byName) {
        utterance.voice = byName;
      }
    } else if (this.chosenVoice) {
      utterance.voice = this.chosenVoice;
    }

    // Track speaking state
    utterance.onstart = () => this.isSpeaking.set(true);
    utterance.onend = () => this.isSpeaking.set(false);
    utterance.onerror = () => this.isSpeaking.set(false);

    synth.speak(utterance);
  }
}
