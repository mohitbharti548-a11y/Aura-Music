// app/api/stream/resolve/route.ts
// Resolves any song to its full-length 320kbps studio audio stream
import type { NextRequest } from 'next/server';
import { resolveFullStreamForTrack } from '@/lib/jiosaavn-client';
import pool from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { title, artist, songId } = await request.json();

    if (!title || !artist) {
      return Response.json(
        { error: 'title and artist are required' },
        { status: 400 }
      );
    }

    // Resolve full 320kbps stream
    const resolved = await resolveFullStreamForTrack(title, artist);

    if (!resolved) {
      return Response.json({ resolved: false, streamUrl: null });
    }

    // Optionally update Neon DB if songId exists and has preview url
    if (songId && !songId.startsWith('official-') && !songId.startsWith('saavn-')) {
      await pool
        .query(
          `UPDATE songs 
           SET file_url = $1, duration_seconds = COALESCE($2, duration_seconds), audio_format = 'AAC 320kbps', is_lossless = true
           WHERE id = $3`,
          [resolved.streamUrl, resolved.duration, songId]
        )
        .catch(() => {});
    }

    return Response.json({
      resolved: true,
      streamUrl: resolved.streamUrl,
      duration: resolved.duration,
      coverUrl: resolved.coverUrl,
    });
  } catch (err) {
    console.error('Resolve stream error:', err);
    return Response.json({ error: 'Failed to resolve full stream' }, { status: 500 });
  }
}
