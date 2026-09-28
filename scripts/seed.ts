import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import pool from '../lib/db';

function loadEnvLocal() {
  if (process.env.DATABASE_URL) return;
  const envPath = join(process.cwd(), '.env.local');
  if (existsSync(envPath)) {
    const lines = readFileSync(envPath, 'utf-8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        const value = trimmed.slice(idx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = value.replace(/^["']|["']$/g, '');
        }
      }
    }
  }
}

const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001';

const SONGS = [
  {
    title: 'Dreamscape',
    artist: 'Aurora Beats',
    file_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    cover_url: '/covers/cover1.jpg',
    genre: 'Ambient',
  },
  {
    title: 'Midnight Groove',
    artist: 'Luna Vibes',
    file_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    cover_url: '/covers/cover2.jpg',
    genre: 'Electronic',
  },
  {
    title: 'Solar Flare',
    artist: 'Nova Pulse',
    file_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    cover_url: '/covers/cover3.jpg',
    genre: 'Electronic',
  },
  {
    title: 'Neon Rain',
    artist: 'Cipher Wave',
    file_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
    cover_url: '/covers/cover4.jpg',
    genre: 'Chillout',
  },
  {
    title: 'Crystal Echo',
    artist: 'Aurora Beats',
    file_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
    cover_url: '/covers/cover5.jpg',
    genre: 'Ambient',
  },
];

async function seed() {
  loadEnvLocal();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Demo user
    await client.query(
      `INSERT INTO users (id, email, name)
       VALUES ($1, 'demo@music.app', 'Demo User')
       ON CONFLICT (email) DO NOTHING`,
      [DEMO_USER_ID]
    );
    console.log('✔ Demo user ready');

    // Songs
    const songIds: string[] = [];
    for (const song of SONGS) {
      const r = await client.query(
        `INSERT INTO songs (title, artist, file_url, cover_url, genre, uploaded_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [song.title, song.artist, song.file_url, song.cover_url, song.genre, DEMO_USER_ID]
      );
      songIds.push(r.rows[0].id);
    }
    console.log(`✔ Inserted ${songIds.length} songs`);

    // Liked songs (first 2)
    for (const id of songIds.slice(0, 2)) {
      await client.query(
        `INSERT INTO liked_songs (user_id, song_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [DEMO_USER_ID, id]
      );
    }
    console.log('✔ Liked songs seeded');

    // Two playlists
    const pl1 = await client.query(
      `INSERT INTO playlists (name, description, user_id)
       VALUES ('My Favorites', 'A hand-picked selection of tracks', $1)
       RETURNING id`,
      [DEMO_USER_ID]
    );
    const pl2 = await client.query(
      `INSERT INTO playlists (name, description, user_id)
       VALUES ('Chill Vibes', 'Perfect for late-night sessions', $1)
       RETURNING id`,
      [DEMO_USER_ID]
    );

    // Playlist 1: all songs, Playlist 2: last 3
    for (let i = 0; i < songIds.length; i++) {
      await client.query(
        `INSERT INTO playlist_songs (playlist_id, song_id, position) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [pl1.rows[0].id, songIds[i], i]
      );
    }
    for (let i = 0; i < 3; i++) {
      await client.query(
        `INSERT INTO playlist_songs (playlist_id, song_id, position) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [pl2.rows[0].id, songIds[i + 2], i]
      );
    }
    console.log('✔ Playlists seeded');

    await client.query('COMMIT');
    console.log('\n✅ Seed complete! Demo user ID:', DEMO_USER_ID);
    console.log('   Copy this to your .env.local as NEXT_PUBLIC_DEMO_USER_ID');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
