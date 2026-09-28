// app/api/search/route.ts
import type { NextRequest } from 'next/server';
import pool from '@/lib/db';
import { searchJioSaavn } from '@/lib/jiosaavn-client';
import { searchItunes, getHiResArtwork } from '@/lib/itunes-client';
import type { Song } from '@/types/music';

const DEMO_USER = '00000000-0000-0000-0000-000000000001';

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')?.trim();
  const userId =
    request.nextUrl.searchParams.get('userId') ??
    process.env.NEXT_PUBLIC_DEMO_USER_ID ??
    DEMO_USER;

  if (!query) {
    return Response.json({ local: [], global: [] });
  }

  try {
    const searchPattern = `%${query}%`;

    // 1. Search Local Database in Neon PostgreSQL
    const dbPromise = pool.query(
      `SELECT s.*,
              CASE WHEN ls.song_id IS NOT NULL THEN true ELSE false END AS is_liked
       FROM   songs s
       LEFT   JOIN liked_songs ls
              ON  ls.song_id = s.id
              AND ls.user_id = $2
       WHERE  s.title ILIKE $1
          OR  s.artist ILIKE $1
          OR  s.album ILIKE $1
          OR  s.genre ILIKE $1
       ORDER  BY s.created_at DESC
       LIMIT  10`,
      [searchPattern, userId]
    );

    // 2. Engine 1: JioSaavn High-Fidelity 320kbps Full-Length Stream Engine
    const saavnPromise = searchJioSaavn(query, 12);

    // 3. Engine 2: Apple iTunes Catalog (Secondary Fallback & Enrichment)
    const itunesPromise = searchItunes(query, 8);

    const [dbResult, saavnSongs, itunesTracks] = await Promise.all([
      dbPromise.catch((err) => {
        console.error('Local DB search error:', err);
        return { rows: [] as Song[] };
      }),
      saavnPromise.catch((err) => {
        console.error('JioSaavn search error:', err);
        return [] as Song[];
      }),
      itunesPromise.catch((err) => {
        console.error('iTunes search error:', err);
        return [];
      }),
    ]);

    const localSongs: Song[] = dbResult.rows;

    const existingKeys = new Set(
      localSongs.map((s) => `${s.title.toLowerCase()}||${s.artist.toLowerCase()}`)
    );

    const globalSongs: Song[] = [];

    // Add JioSaavn Full 320kbps Studio Releases first
    for (const song of saavnSongs) {
      const key = `${song.title.toLowerCase()}||${song.artist.toLowerCase()}`;
      if (!existingKeys.has(key)) {
        existingKeys.add(key);
        globalSongs.push(song);
      }
    }

    // Add unique iTunes tracks as fallback
    for (const t of itunesTracks) {
      const key = `${t.trackName.toLowerCase()}||${t.artistName.toLowerCase()}`;
      if (!existingKeys.has(key) && t.previewUrl) {
        existingKeys.add(key);
        globalSongs.push({
          id: `official-${t.trackId}`,
          title: t.trackName,
          artist: t.artistName,
          album: t.collectionName ?? 'Original Release',
          duration_seconds: t.trackTimeMillis ? Math.round(t.trackTimeMillis / 1000) : null,
          file_url: t.previewUrl,
          cover_url: getHiResArtwork(t.artworkUrl100),
          genre: t.primaryGenreName ?? null,
          uploaded_by: null,
          created_at: t.releaseDate ?? new Date().toISOString(),
          audio_format: 'AAC',
          is_lossless: false,
          source: 'official',
          is_liked: false,
        });
      }
    }

    return Response.json({
      local: localSongs,
      global: globalSongs,
    });
  } catch (err) {
    console.error('GET /api/search error:', err);
    return Response.json({ error: 'Search failed' }, { status: 500 });
  }
}
