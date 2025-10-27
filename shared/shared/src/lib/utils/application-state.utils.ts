import { PlayerState } from "../models";

export function isEqualPlayerState(a: PlayerState, b: PlayerState): boolean {
  return a.isPlaying === b.isPlaying &&
         a.isMuted === b.isMuted &&
         a.volume === b.volume &&
         a.currentTime === b.currentTime &&
         a.isFullscreen === b.isFullscreen;
}
