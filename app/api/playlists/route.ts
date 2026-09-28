// app/api/playlists/route.ts
import type { NextRequest } from 'next/server';
import pool from '@/lib/db';

const DEMO_USER = '00000000-0000-0000-0000-000000000001';

export async function GET(request: NextRequest) {
  const userId =
    request.nextUrl.searchParams.get('userId') ??
    process.env.NEXT_PUBLIC_DEMO_USER_ID ??
    DEMO_USER;

  try {
    const result = await pool.query(
      `SELECT p.*, COUNT(ps.song_id)::int AS song_count
       FROM   playlists p
       LEFT   JOIN playlist_songs ps ON ps.playlist_id = p.id
       WHERE  p.user_id = $1 OR p.is_public = true
       GROUP  BY p.id
       ORDER  BY p.created_at DESC`,
      [userId]
    );
    return Response.json(result.rows);
  } catch (err) {
    console.error('GET /api/playlists', err);
    return Response.json({ error: 'Failed to fetch playlists' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, cover_url, is_public = true, userId } = body;

    if (!name) {
      return Response.json({ error: 'name is required' }, { status: 400 });
    }

    const result = await pool.query(
      `INSERT INTO playlists (name, description, cover_url, user_id, is_public)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        name,
        description ?? null,
        cover_url ?? null,
        userId ?? process.env.NEXT_PUBLIC_DEMO_USER_ID ?? DEMO_USER,
        is_public,
      ]
    );

    return Response.json(result.rows[0], { status: 201 });
  } catch (err) {
    console.error('POST /api/playlists', err);
    return Response.json({ error: 'Failed to create playlist' }, { status: 500 });
  }
}
