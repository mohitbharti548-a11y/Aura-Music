/**
 * iTunes Search API client.
 * Free, no API key required.
 * Rate-limited to 300ms between calls to stay within Apple's limits.
 */

export interface ItunesTrack {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName: string; // album
  trackTimeMillis: number;
  previewUrl: string | null;
  artworkUrl100: string | null;
  primaryGenreName: string | null;
  releaseDate: string | null;
}

const ITUNES_BASE_URL = 'https://itunes.apple.com/search';

/** Pause execution for `ms` milliseconds. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Track the timestamp of the last iTunes call for rate limiting.
let lastCallAt = 0;
const RATE_LIMIT_MS = 300;

/**
 * Search the iTunes catalog for music tracks.
 * Automatically rate-limits to 300ms between successive calls.
 */
export async function searchItunes(
  query: string,
  limit = 10,
): Promise<ItunesTrack[]> {
  // Enforce rate limit
  const now = Date.now();
  const elapsed = now - lastCallAt;
  if (elapsed < RATE_LIMIT_MS) {
    await sleep(RATE_LIMIT_MS - elapsed);
  }
  lastCallAt = Date.now();

  const encoded = encodeURIComponent(query);
  const url = `${ITUNES_BASE_URL}?term=${encoded}&entity=musicTrack&media=music&limit=${limit}`;

  try {
    const res = await fetch(url, {
      headers: {
        // Identify ourselves; Apple may reject requests without a UA
        'User-Agent': 'my-music-app-crawler/1.0',
      },
    });

    if (!res.ok) {
      console.error(
        `[iTunes] HTTP ${res.status} for query "${query}": ${res.statusText}`,
      );
      return [];
    }

    const data = (await res.json()) as {
      resultCount: number;
      results: ItunesTrack[];
    };

    return data.results ?? [];
  } catch (err) {
    console.error(`[iTunes] Network error for query "${query}":`, err);
    return [];
  }
}

/**
 * Upgrade an iTunes 100×100 artwork URL to 600×600.
 * iTunes artwork URLs end in patterns like `100x100bb.jpg` or `100x100bb`.
 * Returns the original URL unchanged if no known pattern is found.
 */
export function getHiResArtwork(artworkUrl100: string | null): string | null {
  if (!artworkUrl100) return null;

  // Cover the variant with explicit .jpg extension first, then the bare form.
  if (artworkUrl100.includes('100x100bb.jpg')) {
    return artworkUrl100.replace('100x100bb.jpg', '600x600bb.jpg');
  }
  if (artworkUrl100.includes('100x100bb')) {
    return artworkUrl100.replace('100x100bb', '600x600bb');
  }

  // Pattern not found — return as-is rather than breaking the URL.
  return artworkUrl100;
}
