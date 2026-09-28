// app/api/recommendations/route.ts
import type { NextRequest } from 'next/server';
import { generateSongRecommendations } from '@/lib/recommendations';
import type { Song } from '@/types/music';

export async function POST(request: NextRequest) {
  try {
    const seedSong = (await request.json()) as Song;

    if (!seedSong || !seedSong.title || !seedSong.artist) {
      return Response.json(
        { error: 'seedSong with title and artist is required' },
        { status: 400 }
      );
    }

    const recommendations = await generateSongRecommendations(seedSong, 30);

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
