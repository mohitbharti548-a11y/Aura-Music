/**
 * Deezer API client — used as a fallback source.
 * Free public API, no authentication required for search.
 * https://developers.deezer.com/api/search
 */

export interface DeezerTrack {
  id: number;
  title: string;
  artist: {
    name: string;
  };
  album: {
    title: string;
    cover_xl: string | null;
  };
  /** Track duration in seconds */
  duration: number;
  /** 30-second MP3 preview URL */
  preview: string | null;
}

/** Shape of the raw Deezer search response envelope. */
interface DeezerSearchResponse {
  data: DeezerTrack[];
  total: number;
  next?: string;
}

const DEEZER_BASE_URL = 'https://api.deezer.com/search';

/**
 * Search Deezer for music tracks.
 * Returns up to `limit` results; returns an empty array on failure.
 */
export async function searchDeezer(
  query: string,
  limit = 10,
): Promise<DeezerTrack[]> {
  const encoded = encodeURIComponent(query);
  const url = `${DEEZER_BASE_URL}?q=${encoded}&limit=${limit}`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'my-music-app-crawler/1.0',
      },
    });

    if (!res.ok) {
      console.error(
        `[Deezer] HTTP ${res.status} for query "${query}": ${res.statusText}`,
      );
      return [];
    }

    const data = (await res.json()) as DeezerSearchResponse;

    // `data.data` may be undefined if Deezer returns an error object instead
    if (!Array.isArray(data.data)) {
      console.error(`[Deezer] Unexpected response shape for query "${query}":`, data);
      return [];
    }

    // Slice here in case Deezer returns more than requested
    return data.data.slice(0, limit);
  } catch (err) {
    console.error(`[Deezer] Network error for query "${query}":`, err);
    return [];
  }
}
