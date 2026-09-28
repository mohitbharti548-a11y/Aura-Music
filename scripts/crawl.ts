/**
 * Music Crawler CLI — Phase 3
 *
 * Usage:
 *   npx tsx scripts/crawl.ts "Adele"                          positional query
 *   npx tsx scripts/crawl.ts --artist "Billie Eilish"         artist search
 *   npx tsx scripts/crawl.ts --query "lo-fi beats" --limit 20 custom query + limit
 *   npx tsx scripts/crawl.ts --watchlist                      process watchlist.json
 *   npx tsx scripts/crawl.ts --source deezer "Portishead"     use Deezer
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import pool from '../lib/db';
import { searchItunes, getHiResArtwork } from './lib/itunes-client';
import { searchDeezer } from './lib/deezer-client';
import type { SongCandidate } from './lib/db-ingester';

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

// ── ANSI colour helpers ───────────────────────────────────────────────────────
const green  = (s: string) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
const red    = (s: string) => `\x1b[31m${s}\x1b[0m`;
const bold   = (s: string) => `\x1b[1m${s}\x1b[0m`;

// ── Watchlist type ────────────────────────────────────────────────────────────
interface Watchlist {
  artists: string[];
  queries:  string[];
  limit:    number;
}

// ── Arg parsing ───────────────────────────────────────────────────────────────
function parseArgs(argv: string[]): {
  watchlist: boolean;
  artist:    string | null;
  query:     string | null;
  limit:     number;
  source:    'itunes' | 'deezer';
} {
  const args = argv.slice(2); // drop 'node' and script path

  let watchlist = false;
  let artist: string | null = null;
  let query: string | null = null;
  let limit = 10;
  let source: 'itunes' | 'deezer' = 'itunes';
  let positional: string | null = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--watchlist':
        watchlist = true;
        break;
      case '--artist':
        artist = args[++i] ?? null;
        break;
      case '--query':
        query = args[++i] ?? null;
        break;
      case '--limit':
        limit = parseInt(args[++i] ?? '10', 10);
        break;
      case '--source': {
        const s = args[++i];
        if (s === 'deezer') source = 'deezer';
        break;
      }
      default:
        // First unrecognised token is the positional query
        if (!arg.startsWith('--') && positional === null) {
          positional = arg;
        }
    }
  }

  // Positional wins over --artist/--query when all three are provided
  if (positional !== null && artist === null && query === null) {
    query = positional;
  }

  return { watchlist, artist, query, limit, source };
}

// ── Source adapters ───────────────────────────────────────────────────────────
async function fetchFromItunes(
  term: string,
  limit: number,
): Promise<SongCandidate[]> {
  const tracks = await searchItunes(term, limit);
  return tracks.map((t) => ({
    title:            t.trackName,
    artist:           t.artistName,
    album:            t.collectionName ?? null,
    duration_seconds: t.trackTimeMillis ? Math.round(t.trackTimeMillis / 1000) : null,
    file_url:         t.previewUrl ?? null,
    cover_url:        getHiResArtwork(t.artworkUrl100 ?? null),
    genre:            t.primaryGenreName ?? null,
    audio_format:     'MP3', // iTunes previews are always 128 kbps MP3
    source:           'itunes',
  }));
}

async function fetchFromDeezer(
  term: string,
  limit: number,
): Promise<SongCandidate[]> {
  const tracks = await searchDeezer(term, limit);
  return tracks.map((t) => ({
    title:            t.title,
    artist:           t.artist.name,
    album:            t.album.title ?? null,
    duration_seconds: t.duration ?? null,
    file_url:         t.preview ?? null,
    cover_url:        t.album.cover_xl ?? null,
    genre:            null,
    audio_format:     'MP3', // Deezer previews are always MP3
    source:           'deezer',
  }));
}

/**
 * Crawl a single search term and print per-song status lines.
 * This is the primary entry point used by main().
 */
async function crawlTermVerbose(
  term: string,
  limit: number,
  source: 'itunes' | 'deezer',
): Promise<{ added: number; skipped: number; errors: number }> {
  console.log(bold(`\n🔍 Searching [${source}]: "${term}" (limit ${limit})`));

  const candidates =
    source === 'deezer'
      ? await fetchFromDeezer(term, limit)
      : await fetchFromItunes(term, limit);

  if (candidates.length === 0) {
    console.log(yellow(`  No results for "${term}".`));
    return { added: 0, skipped: 0, errors: 0 };
  }

  // Use the db-ingester for each song individually so we can print status
  const { songExists } = await import('./lib/db-ingester');

  let added = 0;
  let skipped = 0;
  let errors = 0;

  for (const c of candidates) {
    const label = `${c.title} — ${c.artist}`;
    try {
      const exists = await songExists(c.title, c.artist);
      if (exists) {
        console.log(yellow(`  ⏭  Skip: ${label}`));
        skipped++;
        continue;
      }

      // Insert directly via pool for single-row insert
      await pool.query(
        `INSERT INTO songs
           (title, artist, album, duration_seconds, file_url, cover_url,
            genre, audio_format, source)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          c.title,
          c.artist,
          c.album ?? null,
          c.duration_seconds ?? null,
          c.file_url ?? null,
          c.cover_url ?? null,
          c.genre ?? null,
          c.audio_format ?? null,
          c.source ?? source,
        ],
      );

      console.log(green(`  ✅ New:  ${label}`));
      added++;
    } catch (err) {
      console.log(red(`  ❌ Error: ${label} — ${String(err)}`));
      errors++;
    }
  }

  return { added, skipped, errors };
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  loadEnvLocal();

  // Guard: require DATABASE_URL before touching anything DB-related
  if (!process.env.DATABASE_URL) {
    console.error(
      red(
        '\n❌ DATABASE_URL environment variable is not set.\n' +
        '   Set it in .env.local or export it before running the crawler.\n' +
        '   Example: DATABASE_URL=postgres://user:pass@localhost:5432/mydb\n',
      ),
    );
    process.exit(1);
  }

  const opts = parseArgs(process.argv);
  let totalAdded = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  function accumulate(r: { added: number; skipped: number; errors: number }) {
    totalAdded   += r.added;
    totalSkipped += r.skipped;
    totalErrors  += r.errors;
  }

  try {
    if (opts.watchlist) {
      // ── Watchlist mode ───────────────────────────────────────────────────
      const watchlistPath = join(process.cwd(), 'scripts', 'watchlist.json');
      let wl: Watchlist;
      try {
        wl = JSON.parse(readFileSync(watchlistPath, 'utf-8')) as Watchlist;
      } catch {
        console.error(red(`\n❌ Could not read watchlist at ${watchlistPath}`));
        process.exit(1);
      }

      const limit = wl.limit ?? 10;

      for (const artist of wl.artists ?? []) {
        accumulate(await crawlTermVerbose(artist, limit, opts.source));
      }
      for (const q of wl.queries ?? []) {
        accumulate(await crawlTermVerbose(q, limit, opts.source));
      }
    } else {
      // ── Single-term mode ─────────────────────────────────────────────────
      const term = opts.artist ?? opts.query;
      if (!term) {
        console.error(
          red(
            '\n❌ No search term provided.\n' +
            '   Usage: npx tsx scripts/crawl.ts "Adele"\n' +
            '          npx tsx scripts/crawl.ts --artist "Billie Eilish"\n' +
            '          npx tsx scripts/crawl.ts --watchlist\n',
          ),
        );
        process.exit(1);
      }

      accumulate(await crawlTermVerbose(term, opts.limit, opts.source));
    }
  } finally {
    // Always close the pool so the process exits cleanly.
    await pool.end();
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log(
    bold(
      `\nCrawl complete: ${green(String(totalAdded))} added, ` +
      `${yellow(String(totalSkipped))} skipped, ` +
      `${totalErrors > 0 ? red(String(totalErrors)) : String(totalErrors)} errors`,
    ),
  );
}

main().catch((err) => {
  console.error(red('\n💥 Unexpected error:'), err);
  pool.end().finally(() => process.exit(1));
});
