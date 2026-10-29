// app/api/search/route.ts
// Sāṅgīt Neural & Phonetic Omni-Search API
// Multi-Tier Federated Search: Neon DB + JioSaavn 320kbps Master Engine + Apple iTunes Fallback
import type { NextRequest } from 'next/server';
import pool from '@/lib/db';
import { searchJioSaavn } from '@/lib/jiosaavn-client';
import { searchItunes, getHiResArtwork } from '@/lib/itunes-client';
import { parseSearchIntent, scoreSearchRelevance } from '@/lib/search-engine';
import type { Song } from '@/types/music';

const DEMO_USER = '00000000-0000-0000-0000-000000000001';

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')?.trim();
  const userId =
    request.nextUrl.searchParams.get('userId') ??
    process.env.NEXT_PUBLIC_DEMO_USER_ID ??
    DEMO_USER;
  const userGenre = request.nextUrl.searchParams.get('genre') || null;
  const userArtist = request.nextUrl.searchParams.get('artist') || null;

  if (!query) {
    return Response.json({ local: [], global: [], intent: null });
  }

  try {
    // 1. Parse Search Intent (Mood, Era, Genre, Quality)
    const intent = parseSearchIntent(query);
    const searchPattern = `%${intent.cleanQuery}%`;

    // 2. Query Channel 1: Local Neon Database (Instant match)
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
       LIMIT  12`,
      [searchPattern, userId]
    );

    // 3. Query Channel 2: JioSaavn 320kbps Master Stream Engine
    const saavnPrimaryPromise = searchJioSaavn(intent.cleanQuery, 14);

    // If a semantic intent was detected (e.g. "romantic", "90s", "chill"), perform a secondary targeted search
    const saavnIntentPromise =
      intent.detectedMood || intent.detectedEra || intent.detectedGenre
        ? searchJioSaavn(
            `${intent.cleanQuery} ${intent.detectedMood || ''} ${intent.detectedEra || ''} ${intent.detectedGenre || ''}`.trim(),
            8
          )
        : Promise.resolve([] as Song[]);

    // 4. Query Channel 3: Apple iTunes Global Catalog Fallback
    const itunesPromise = searchItunes(intent.cleanQuery, 6);

    const [dbResult, saavnPrimary, saavnIntent, itunesTracks] = await Promise.all([
      dbPromise.catch((err) => {
        console.error('Local DB search error:', err);
        return { rows: [] as Song[] };
      }),
      saavnPrimaryPromise.catch((err) => {
        console.error('JioSaavn primary search error:', err);
        return [] as Song[];
      }),
      saavnIntentPromise.catch((err) => {
        console.error('JioSaavn intent search error:', err);
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

    const globalCandidates: Song[] = [];

    // Combine JioSaavn results
    for (const song of [...saavnPrimary, ...saavnIntent]) {
      const key = `${song.title.toLowerCase()}||${song.artist.toLowerCase()}`;
      if (!existingKeys.has(key)) {
        existingKeys.add(key);
        globalCandidates.push(song);
      }
    }

    // Add unique iTunes tracks as fallback
    for (const t of itunesTracks) {
      const key = `${t.trackName.toLowerCase()}||${t.artistName.toLowerCase()}`;
      if (!existingKeys.has(key) && t.previewUrl) {
        existingKeys.add(key);
        globalCandidates.push({
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

    // 5. Intelligent Multi-Vector Relevance Reranking
    const rankedGlobal = globalCandidates
      .map((song) => ({
        song,
        score: scoreSearchRelevance(song, query, intent, userGenre, userArtist),
      }))
      .sort((a, b) => b.score - a.score)
      .map((item) => item.song);

    return Response.json({
      intent,
      local: localSongs,
      global: rankedGlobal,
    });
  } catch (err) {
    console.error('GET /api/search error:', err);
    return Response.json({ error: 'Search failed' }, { status: 500 });
  }
}
