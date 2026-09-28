// app/api/playlists/[id]/route.ts
import type { NextRequest } from 'next/server';
import pool from '@/lib/db';

const DEMO_USER = '00000000-0000-0000-0000-000000000001';

export async function DELETE(
  request: NextRequest,
  ctx: RouteContext<'/api/playlists/[id]'>
) {
  const { id } = await ctx.params;
  const userId =
    request.nextUrl.searchParams.get('userId') ??
    process.env.NEXT_PUBLIC_DEMO_USER_ID ??
    DEMO_USER;

  try {
    const result = await pool.query(
      `DELETE FROM playlists WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, userId]
    );

    if (result.rowCount === 0) {
      return Response.json(
        { error: 'Playlist not found or not owned by user' },
        { status: 404 }
      );
    }

    return Response.json({ success: true, id });
  } catch (err) {
    console.error('DELETE /api/playlists/[id]', err);
    return Response.json({ error: 'Failed to delete playlist' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<'/api/playlists/[id]'>
) {
  const { id } = await ctx.params;
  const userId =
    request.nextUrl.searchParams.get('userId') ??
    process.env.NEXT_PUBLIC_DEMO_USER_ID ??
    DEMO_USER;

  try {
    const { name, description } = await request.json();

    const result = await pool.query(
      `UPDATE playlists
       SET name = COALESCE($1, name),
           description = COALESCE($2, description)
       WHERE id = $3 AND user_id = $4
       RETURNING *`,
      [name, description, id, userId]
    );

    if (result.rowCount === 0) {
      return Response.json({ error: 'Playlist not found' }, { status: 404 });
    }

    return Response.json(result.rows[0]);
  } catch (err) {
    console.error('PATCH /api/playlists/[id]', err);
    return Response.json({ error: 'Failed to update playlist' }, { status: 500 });
  }
}
