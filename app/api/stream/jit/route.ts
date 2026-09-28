// app/api/stream/jit/route.ts
// Just-In-Time (JIT) Audio Ingestion & Optimization API
import type { NextRequest } from 'next/server';
import pool from '@/lib/db';
import { optimizeAndCacheAudio } from '@/lib/audio-transcoder';

const DEMO_USER = '00000000-0000-0000-0000-000000000001';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, artist, album, duration_seconds, source_url, cover_url, genre } = body;

    if (!title || !artist || !source_url) {
      return Response.json(
        { error: 'title, artist, and source_url are required' },
        { status: 400 }
      );
    }

    // Step 1: Check Database in Neon
    const existing = await pool.query(
      `SELECT * FROM songs WHERE LOWER(title) = LOWER($1) AND LOWER(artist) = LOWER($2) LIMIT 1`,
      [title, artist]
    );

    if (existing.rows.length > 0 && existing.rows[0].file_url?.startsWith('/audio/')) {
      return Response.json({ song: existing.rows[0], cached: true });
    }

    // Step 2 & 3: Optimize with FFmpeg & Cache on Server
    let optimizedUrl = source_url;
    let audioFormat = 'MP3';
    let bitRate = 192;
    let fileSizeBytes: number | null = null;

    try {
      const transcode = await optimizeAndCacheAudio(source_url, title, artist);
      optimizedUrl = transcode.fileUrl;
      audioFormat = transcode.audioFormat;
      bitRate = transcode.bitrateKbps;
      fileSizeBytes = transcode.fileSizeBytes;
    } catch (err) {
      console.warn('Transcode fallback to source URL:', err);
    }

    // Step 4: Upsert in PostgreSQL
    let savedSong;
    if (existing.rows.length > 0) {
      const updateRes = await pool.query(
        `UPDATE songs
         SET file_url = $1, audio_format = $2, bitrate_kbps = $3, file_size_bytes = $4
         WHERE id = $5
         RETURNING *`,
        [optimizedUrl, audioFormat, bitRate, fileSizeBytes, existing.rows[0].id]
      );
      savedSong = updateRes.rows[0];
    } else {
      const insertRes = await pool.query(
        `INSERT INTO songs
           (title, artist, album, duration_seconds, file_url, cover_url, genre,
            audio_format, bitrate_kbps, file_size_bytes, source, uploaded_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`,
        [
          title,
          artist,
          album ?? null,
          duration_seconds ?? null,
          optimizedUrl,
          cover_url ?? null,
          genre ?? null,
          audioFormat,
          bitRate,
          fileSizeBytes,
          'spotify-jit',
          process.env.NEXT_PUBLIC_DEMO_USER_ID ?? DEMO_USER,
        ]
      );
      savedSong = insertRes.rows[0];
    }

    return Response.json({ song: savedSong, cached: false });
  } catch (err) {
    console.error('JIT Stream error:', err);
    return Response.json({ error: 'JIT stream processing failed' }, { status: 500 });
  }
}
