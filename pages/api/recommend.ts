// pages/api/recommend.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import pool from '../../lib/db';
import type { Song } from '@/types/music';

/**
 * Simple recommendation endpoint.
 * 1️⃣ Fetch recent listening history for the user.
 * 2️⃣ Determine top‑liked genres/artists from that history.
 * 3️⃣ Query songs that match those preferences and are not already listened to.
 * 4️⃣ Return up to 20 suggestions ordered by popularity.
 *
 * This is a lightweight, SQL‑only implementation that can be replaced with a
 * more sophisticated collaborative‑filtering model later.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse<Song[] | { error: string }>) {
  const { userId } = req.query;
  if (!userId || typeof userId !== 'string') {
    res.status(400).json({ error: 'Missing userId' });
    return;
  }

  try {
    // 1️⃣ Recent listening (last 30 days) – count plays per artist/genre
    const historyRes = await pool.query(
      `SELECT genre, artist, COUNT(*) AS plays
         FROM listening_history
        WHERE user_id = $1 AND listened_at > NOW() - INTERVAL '30 days'
        GROUP BY genre, artist
        ORDER BY plays DESC
        LIMIT 5`,
      [userId],
    );
    const prefs = historyRes.rows;
    if (prefs.length === 0) {
      // fallback: popular songs overall
      const popularRes = await pool.query(
        `SELECT * FROM songs ORDER BY play_count DESC LIMIT 20`,
      );
      res.status(200).json(popularRes.rows as Song[]);
      return;
    }

    // Build dynamic WHERE clauses for genre or artist matches
    const genreList = prefs.map((r) => r.genre).filter(Boolean);
    const artistList = prefs.map((r) => r.artist).filter(Boolean);
    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;
    if (genreList.length) {
      conditions.push(`genre = ANY($${idx}::text[])`);
      params.push(genreList);
      idx++;
    }
    if (artistList.length) {
      conditions.push(`artist = ANY($${idx}::text[])`);
      params.push(artistList);
      idx++;
    }
    // Exclude songs the user already heard
    const excludeRes = await pool.query(
      `SELECT song_id FROM listening_history WHERE user_id = $${idx}`,
      [userId],
    );
    const excludeIds = excludeRes.rows.map((r) => r.song_id);
    if (excludeIds.length) {
      conditions.push(`id NOT = ANY($${idx + 1}::int[])`);
      params.push(excludeIds);
    }

    const whereClause = conditions.length ? 'WHERE ' + conditions.join(' OR ') : '';
    const recRes = await pool.query(
      `SELECT * FROM songs ${whereClause} ORDER BY play_count DESC LIMIT 20`,
      params,
    );
    res.status(200).json(recRes.rows as Song[]);
  } catch (err) {
    console.error('[API] recommend error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
