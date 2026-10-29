// app/api/recommendations/route.ts
import type { NextRequest } from 'next/server';
import { generateSongRecommendations } from '@/lib/recommendations';
import type { Song } from '@/types/music';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const seedSong: Song = body.seedSong || body;
    const hiddenTrackIds: string[] = Array.isArray(body.hiddenTrackIds) ? body.hiddenTrackIds : [];
    const recentTrackIds: string[] = Array.isArray(body.recentTrackIds) ? body.recentTrackIds : [];
    const limit: number = typeof body.limit === 'number' ? body.limit : 10;
    const serendipity: number = typeof body.serendipity === 'number' ? body.serendipity : 0.35;

    if (!seedSong || !seedSong.title || !seedSong.artist) {
      return Response.json(
        { error: 'seedSong with title and artist is required' },
        { status: 400 }
      );
    }

    const recommendations = await generateSongRecommendations(seedSong, limit, hiddenTrackIds, {
      hiddenTrackIds,
      recentTrackIds,
      serendipity,
      limit,
    });

    return Response.json({
      seed: seedSong,
      count: recommendations.length,
      recommendations,
    });
  } catch (err) {
    console.error('POST /api/recommendations error:', err);
    return Response.json({ error: 'Failed to generate recommendations' }, { status: 500 });
  }
}
