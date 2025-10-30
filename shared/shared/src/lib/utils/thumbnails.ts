// Thumbnail utilities and defensive derivation helpers

import { getYoutubeVideoId, getYoutubeThumbnailUrl } from './youtube-helpers';

/**
 * Derive a thumbnail URL from a YouTube video URL.
 * Preference: sanitize upstream so regex match is guaranteed.
 * If derivation fails, fall back to a stable placeholder to preserve non-nullability.
 */
export function deriveThumbFromUrl(url: string): string {
  try {
    const id = getYoutubeVideoId(url);
    return getYoutubeThumbnailUrl(id, 'hqdefault');
  } catch {
    return '/assets/thumbnails/placeholder.webp';
  }
}
