// Utility functions for YouTube video handling

export type YouTubeThumbnailImageQuality = 'default' | 'mqdefault' | 'hqdefault' | 'sddefault' | 'maxresdefault';

/**
 * Extracts the YouTube video ID from various YouTube URL formats.
 * @param url The YouTube URL.
 * @returns The video ID, or null if no valid ID is found.
 */
export function getYoutubeVideoId(url: string): string | null {
  if (!url) {
    return null;
  }

  // This regex is designed to handle various YouTube URL formats robustly.
  // It specifically looks for youtube.com or youtu.be domains.
  const regExp = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([\w-]{11})(?:\S+)?$/;
  const match = url.match(regExp);

  // The video ID is in the first capturing group.
  if (match && match[1]) {
    return match[1];
  } else {
    console.error('Could not extract YouTube video ID from URL:', url);
    return null;
  }
}

/**
 * Generates a YouTube thumbnail URL from a video ID.
 * @param videoId The YouTube video ID.
 * @param quality The desired thumbnail quality.
 * @returns The full URL for the thumbnail image.
 */
export function getYoutubeThumbnailUrl(videoId: string, quality: YouTubeThumbnailImageQuality = 'hqdefault'): string {
  return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
}
