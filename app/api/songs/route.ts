// app/api/songs/route.ts
import type { NextRequest } from 'next/server';
import pool from '@/lib/db';
import { searchJioSaavn } from '@/lib/jiosaavn-client';

const DEMO_USER = '00000000-0000-0000-0000-000000000001';

// In-memory fallback cache for trending songs
let cachedTrending: any[] = [];
let lastCachedAt = 0;

export async function GET(request: NextRequest) {
  const userId =
    request.nextUrl.searchParams.get('userId') ??
    process.env.NEXT_PUBLIC_DEMO_USER_ID ??
    DEMO_USER;

  try {
    const result = await pool.query(
      `SELECT s.*,
              CASE WHEN ls.song_id IS NOT NULL THEN true ELSE false END AS is_liked
       FROM   songs s
       LEFT   JOIN liked_songs ls
              ON  ls.song_id = s.id
              AND ls.user_id = $1
       ORDER  BY s.created_at DESC`,
      [userId]
    );

    if (result.rows && result.rows.length > 0) {
      return Response.json(result.rows);
    }

    // Fallback to dynamic trending studio tracks if DB is empty or unconfigured
    const now = Date.now();
    if (cachedTrending.length > 0 && now - lastCachedAt < 1000 * 60 * 15) {
      return Response.json(cachedTrending);
    }

    const trendingKeywords = ['Trending Hits', 'Bollywood 2026', 'Arijit Singh', 'Punjabi Hits', 'Global Pop'];
    const randomKeyword = trendingKeywords[Math.floor(Math.random() * trendingKeywords.length)];
    const onlineHits = await searchJioSaavn(randomKeyword, 30).catch(() => []);

    if (onlineHits && onlineHits.length > 0) {
      cachedTrending = onlineHits;
      lastCachedAt = now;
      return Response.json(onlineHits);
    }

    return Response.json([]);
  } catch (err) {
    console.error('GET /api/songs', err);
    if (cachedTrending.length > 0) {
      return Response.json(cachedTrending);
    }
    return Response.json([]);
  }
}


export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      title, artist, album, duration_seconds,
      file_url, cover_url, genre,
      audio_format, file_size_bytes, bitrate_kbps, is_lossless, source,
    } = body;

    if (!title || !artist || !file_url) {
      return Response.json(
        { error: 'title, artist, and file_url are required' },
        { status: 400 }
      );
    }

    // Check if song already exists
    const existing = await pool.query(
      `SELECT * FROM songs WHERE LOWER(title) = LOWER($1) AND LOWER(artist) = LOWER($2) LIMIT 1`,
      [title, artist]
    );

    if (existing.rows.length > 0) {
      return Response.json(existing.rows[0], { status: 200 });
    }

    const result = await pool.query(
      `INSERT INTO songs
         (title, artist, album, duration_seconds, file_url, cover_url, genre,
          audio_format, file_size_bytes, bitrate_kbps, is_lossless, source, uploaded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [
        title, artist, album ?? null, duration_seconds ?? null,
        file_url, cover_url ?? null, genre ?? null,
        audio_format ?? null, file_size_bytes ?? null,
        bitrate_kbps ?? null, is_lossless ?? false,
        source ?? 'manual',
        process.env.NEXT_PUBLIC_DEMO_USER_ID ?? DEMO_USER,
      ]
    );

    return Response.json(result.rows[0], { status: 201 });
  } catch (err) {
    console.error('POST /api/songs', err);
    return Response.json({ error: 'Failed to add song' }, { status: 500 });
  }
}
