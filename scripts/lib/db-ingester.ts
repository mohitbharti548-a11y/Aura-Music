/**
 * Deduplication and DB insertion logic for crawler-sourced songs.
 * Deduplication key: (LOWER(title), LOWER(artist)) — case-insensitive.
 */

import pool from '../../lib/db';

export interface SongCandidate {
  title: string;
  artist: string;
  album?: string | null;
  /** Track duration in seconds */
  duration_seconds?: number | null;
  /** Preview/stream URL */
  file_url: string | null;
  cover_url?: string | null;
  genre?: string | null;
  audio_format?: string | null;
  /** Where this record came from, e.g. 'itunes' or 'deezer' */
  source?: string | null;
}

export interface IngestResult {
  added: number;
  skipped: number;
  errors: number;
}

/**
 * Check whether a song already exists in the DB (case-insensitive on both
 * title and artist).
 */
export async function songExists(
  title: string,
  artist: string,
): Promise<boolean> {
  const res = await pool.query(
    `SELECT 1 FROM songs
     WHERE LOWER(title) = LOWER($1)
       AND LOWER(artist) = LOWER($2)
     LIMIT 1`,
    [title, artist],
  );
  return (res.rowCount ?? 0) > 0;
}

/**
 * Ingest an array of song candidates into the database.
 * Skips duplicates (same title+artist, case-insensitive).
 * Returns counts of added / skipped / errored records.
 */
export async function ingestSongs(
  songs: SongCandidate[],
  source: string,
): Promise<IngestResult> {
  let added = 0;
  let skipped = 0;
  let errors = 0;

  for (const song of songs) {
    try {
      const exists = await songExists(song.title, song.artist);

      if (exists) {
        skipped++;
        continue;
      }

      await pool.query(
        `INSERT INTO songs
           (title, artist, album, duration_seconds, file_url, cover_url,
            genre, audio_format, source)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          song.title,
          song.artist,
          song.album ?? null,
          song.duration_seconds ?? null,
          song.file_url ?? null,
          song.cover_url ?? null,
          song.genre ?? null,
          song.audio_format ?? null,
          song.source ?? source,
        ],
      );

      added++;
    } catch (err) {
      console.error(
        `[DB] Failed to ingest "${song.title}" by "${song.artist}":`,
        err,
      );
      errors++;
    }
  }

  return { added, skipped, errors };
}
