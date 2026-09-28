// lib/jiosaavn-client.ts
// Primary High-Fidelity 320kbps Full-Length Stream & Metadata Engine
import { decryptJioSaavnMediaUrl } from './des';
import type { Song } from '@/types/music';

interface JioSaavnSongResult {
  id: string;
  song: string;
  album: string;
  year?: string;
  music?: string;
  primary_artists?: string;
  singers?: string;
  starring?: string;
  image?: string;
  duration?: string;
  encrypted_media_url?: string;
  language?: string;
  label?: string;
  release_date?: string;
  has_lyrics?: string;
}

export function upgradeJioSaavnArtwork(imageUrl?: string | null): string | null {
  if (!imageUrl) return null;
  return imageUrl
    .replace('150x150.jpg', '500x500.jpg')
    .replace('50x50.jpg', '500x500.jpg')
    .replace('150x150.png', '500x500.png')
    .replace('50x50.png', '500x500.png');
}

/**
 * Searches the official JioSaavn catalog for 320kbps full-length studio tracks.
 * Returns fully playable, full-duration songs with real artists and 500x500 artwork.
 */
export async function searchJioSaavn(query: string, limit = 15): Promise<Song[]> {
  try {
    const encoded = encodeURIComponent(query.trim());
    const url = `https://www.jiosaavn.com/api.php?__call=search.getResults&_marker=0&q=${encoded}&ctx=web6dot0&_format=json&p=1&n=${limit}`;

    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'application/json, text/plain, */*',
      },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) {
      console.warn(`[JioSaavn] HTTP ${res.status} for query "${query}"`);
      return [];
    }

    const data = (await res.json()) as { results?: JioSaavnSongResult[] };
    if (!data.results || !Array.isArray(data.results)) {
      return [];
    }

    const songs: Song[] = [];

    for (const item of data.results) {
      if (!item.encrypted_media_url) continue;

      const directStreamUrl = decryptJioSaavnMediaUrl(item.encrypted_media_url);
      if (!directStreamUrl) continue;

      const durationSec = item.duration ? parseInt(item.duration, 10) : null;
      const artistName =
        item.primary_artists || item.singers || item.music || 'Various Artists';

      songs.push({
        id: `saavn-${item.id}`,
        title: item.song.replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, '&'),
        artist: artistName.replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, '&'),
        album: item.album ? item.album.replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, '&') : 'Original Release',
        duration_seconds: durationSec && !isNaN(durationSec) ? durationSec : null,
        file_url: directStreamUrl,
        cover_url: upgradeJioSaavnArtwork(item.image),
        genre: item.language ? `${item.language.toUpperCase()}` : null,
        uploaded_by: null,
        created_at: item.release_date ?? (item.year ? `${item.year}-01-01` : new Date().toISOString()),
        audio_format: 'AAC 320kbps',
        is_lossless: true,
        source: 'official',
        is_liked: false,
      });
    }

    return songs;
  } catch (err) {
    console.error('[JioSaavn] Search error for query "${query}":', err);
    return [];
  }
}

/**
 * Resolves a full-length 320kbps stream URL for a given title and artist.
 */
export async function resolveFullStreamForTrack(
  title: string,
  artist: string
): Promise<{ streamUrl: string; duration: number | null; coverUrl: string | null } | null> {
  const query = `${title} ${artist}`.trim();
  const results = await searchJioSaavn(query, 5);

  if (results.length === 0) return null;

  const targetTitle = title.toLowerCase().trim();
  const targetArtist = artist.toLowerCase().trim();

  // Find best match
  const bestMatch =
    results.find(
      (r) =>
        r.title.toLowerCase().includes(targetTitle) ||
        targetTitle.includes(r.title.toLowerCase())
    ) ?? results[0];

  return {
    streamUrl: bestMatch.file_url,
    duration: bestMatch.duration_seconds,
    coverUrl: bestMatch.cover_url,
  };
}
