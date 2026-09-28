/**
 * Codec / audio format detection and display utilities.
 * All functions are pure and side-effect free (except canPlayFormat,
 * which touches the DOM and therefore guards against SSR).
 */

/**
 * Detect an audio format label from a file URL or filename extension.
 * Strips query strings before checking the extension.
 * Returns 'MP3' as the default fallback.
 */
export function detectFormat(url: string | null): string {
  if (!url) return 'MP3';

  // Strip query string / fragment before looking at extension.
  const pathname = url.split('?')[0].split('#')[0];
  const ext = pathname.split('.').pop()?.toLowerCase();

  const map: Record<string, string> = {
    flac: 'FLAC',
    mp3: 'MP3',
    m4a: 'AAC',
    aac: 'AAC',
    ogg: 'OGG',
    wav: 'WAV',
    opus: 'OPUS',
    wma: 'WMA',
  };

  return map[ext ?? ''] ?? 'MP3';
}

/**
 * Returns true if the given format label is lossless.
 * ALAC (.m4a container with Apple Lossless codec) is included even though
 * the extension maps to 'AAC' — callers that know the actual codec can
 * pass 'ALAC' directly.
 */
export function isLossless(format: string): boolean {
  return ['FLAC', 'WAV', 'ALAC'].includes(format.toUpperCase());
}

/**
 * Check whether the current browser can play a given format.
 * Always returns `true` on the server (SSR) so UI renders without
 * suppressing format badges during hydration.
 */
export function canPlayFormat(format: string): boolean {
  if (typeof document === 'undefined') return true; // SSR guard

  const audio = document.createElement('audio');

  const mimeMap: Record<string, string> = {
    FLAC: 'audio/flac',
    MP3: 'audio/mpeg',
    AAC: 'audio/mp4; codecs=mp4a.40.2',
    OGG: 'audio/ogg; codecs=vorbis',
    OPUS: 'audio/ogg; codecs=opus',
    WAV: 'audio/wav',
    WEBA: 'audio/webm; codecs=opus',
  };

  const mime = mimeMap[format.toUpperCase()];
  if (!mime) return false;

  // canPlayType returns '' (no), 'maybe', or 'probably'.
  return audio.canPlayType(mime) !== '';
}

/**
 * Format a raw byte count into a human-readable string (B / KB / MB).
 * Returns an empty string for null / zero values.
 */
export function formatFileSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Return a human-readable bitrate label.
 * Shows "Lossless" for lossless formats regardless of the kbps value
 * (which is often misleading for FLAC/WAV).
 */
export function formatBitrate(
  kbps: number | null,
  isLosslessFormat: boolean,
): string {
  if (isLosslessFormat) return 'Lossless';
  if (!kbps) return '';
  return `${kbps} kbps`;
}
