// app/api/playlists/[id]/songs/route.ts
import type { NextRequest } from 'next/server';
import pool from '@/lib/db';

const DEMO_USER = '00000000-0000-0000-0000-000000000001';

/** GET /api/playlists/:id/songs — ordered track list with liked flags */
export async function GET(
  request: NextRequest,
  ctx: RouteContext<'/api/playlists/[id]/songs'>
) {
  const { id } = await ctx.params;
  const userId =
    request.nextUrl.searchParams.get('userId') ??
    process.env.NEXT_PUBLIC_DEMO_USER_ID ??
    DEMO_USER;

  try {
    const result = await pool.query(
      `SELECT s.*,
              ps.position,
              ps.added_at,
              CASE WHEN ls.song_id IS NOT NULL THEN true ELSE false END AS is_liked
       FROM   playlist_songs ps
       JOIN   songs s ON s.id = ps.song_id
       LEFT   JOIN liked_songs ls
              ON  ls.song_id = s.id
              AND ls.user_id = $2
       WHERE  ps.playlist_id = $1
       ORDER  BY ps.position ASC`,
      [id, userId]
    );
    return Response.json(result.rows);
  } catch (err) {
    console.error('GET /api/playlists/[id]/songs', err);
    return Response.json({ error: 'Failed to fetch playlist songs' }, { status: 500 });
  }
}

/** POST /api/playlists/:id/songs — add a song to the playlist */
export async function POST(
  request: Request,
  ctx: RouteContext<'/api/playlists/[id]/songs'>
) {
  const { id } = await ctx.params;

  try {
    const { songId, position = 0 } = await request.json();

    if (!songId) {
      return Response.json({ error: 'songId is required' }, { status: 400 });
    }

    await pool.query(
      `INSERT INTO playlist_songs (playlist_id, song_id, position)
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING`,
      [id, songId, position]
    );

    return Response.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error('POST /api/playlists/[id]/songs', err);
    return Response.json({ error: 'Failed to add song to playlist' }, { status: 500 });
  }
}

/** DELETE /api/playlists/:id/songs?songId=... — remove a song from the playlist */
export async function DELETE(
  request: NextRequest,
  ctx: RouteContext<'/api/playlists/[id]/songs'>
) {
  const { id } = await ctx.params;
  const songId = request.nextUrl.searchParams.get('songId');

  if (!songId) {
    return Response.json({ error: 'songId query parameter is required' }, { status: 400 });
  }

  try {
    await pool.query(
      `DELETE FROM playlist_songs WHERE playlist_id = $1 AND song_id = $2`,
      [id, songId]
    );

    return Response.json({ success: true, removedSongId: songId });
  } catch (err) {
    console.error('DELETE /api/playlists/[id]/songs', err);
    return Response.json({ error: 'Failed to remove song from playlist' }, { status: 500 });
  }
}

