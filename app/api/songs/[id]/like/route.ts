// app/api/songs/[id]/like/route.ts
import type { NextRequest } from 'next/server';
import pool from '@/lib/db';

const DEMO_USER = '00000000-0000-0000-0000-000000000001';

export async function POST(
  request: NextRequest,
  ctx: RouteContext<'/api/songs/[id]/like'>
) {
  const { id } = await ctx.params;
  const userId =
    request.nextUrl.searchParams.get('userId') ??
    process.env.NEXT_PUBLIC_DEMO_USER_ID ??
    DEMO_USER;

  try {
    await pool.query(
      `INSERT INTO liked_songs (user_id, song_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [userId, id]
    );
    return Response.json({ liked: true });
  } catch (err) {
    console.error('POST /api/songs/[id]/like', err);
    return Response.json({ error: 'Failed to like song' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  ctx: RouteContext<'/api/songs/[id]/like'>
) {
  const { id } = await ctx.params;
  const userId =
    request.nextUrl.searchParams.get('userId') ??
    process.env.NEXT_PUBLIC_DEMO_USER_ID ??
    DEMO_USER;

  try {
    await pool.query(
      `DELETE FROM liked_songs WHERE user_id = $1 AND song_id = $2`,
      [userId, id]
    );
    return Response.json({ liked: false });
  } catch (err) {
    console.error('DELETE /api/songs/[id]/like', err);
    return Response.json({ error: 'Failed to unlike song' }, { status: 500 });
  }
}
