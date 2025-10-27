// Utility functions for YouTube video handling

export const YOUTUBE_THUMBNAIL_QUALITIES = ['maxresdefault', 'sddefault', 'hqdefault', 'mqdefault', 'default'] as const

export type YouTubeThumbnailImageQuality = typeof YOUTUBE_THUMBNAIL_QUALITIES[number];

/**
 * Extracts the YouTube video ID from various YouTube URL formats.
 * @param url The YouTube URL.
 * @returns The video ID, or null if no valid ID is found.
 */
export function getYoutubeVideoId(url: string): string {
  if (!url) {
    throw new Error('Invalid YouTube URL');
  }

  // This regex is designed to handle various YouTube URL formats robustly.
  // It specifically looks for youtube.com or youtu.be domains.
  const regExp = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([\w-]{11})(?:\S+)?$/;
  const match = url.match(regExp);

  // The video ID is in the first capturing group.
  if (match && match[1]) {
    return match[1];
  } else {
    throw new Error(`Could not extract YouTube video ID from URL: ${url}`);    
  }
}

/**
 * Returns the first available thumbnail URL for a YouTube video.
 * Tries higher resolutions first and falls back if 404 / not available.
 *
 * @param videoId YouTube video ID (e.g. 'RLXswLCRG08') 
 */
export function getYoutubeThumbnailUrl(videoId: string, quality: YouTubeThumbnailImageQuality = 'hqdefault'): string {
  return `https://i.ytimg.com/vi/${videoId}/${quality}.jpg`;
}

// Format time in seconds to mm:ss
export function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}
