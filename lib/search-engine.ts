// lib/search-engine.ts
// Sāṅgīt Neural & Phonetic Omni-Search Engine
// Upgraded Beyond Spotify: Phonetic Metaphone Transliteration, Intent Extraction & Taste-DNA Reranking
import type { Song } from '@/types/music';

export interface ParsedSearchIntent {
  cleanQuery: string;
  originalQuery: string;
  detectedMood: string | null;
  detectedEra: string | null;
  detectedGenre: string | null;
  prefersLossless: boolean;
}

const MOOD_KEYWORDS: Record<string, string[]> = {
  chill: ['chill', 'lofi', 'lo-fi', 'relax', 'calm', 'ambient', 'peaceful'],
  workout: ['workout', 'gym', 'energy', 'beast', 'training', 'power', 'motivation'],
  romantic: ['romantic', 'love', 'dil', 'ishq', 'pyar', 'romance', 'couple'],
  sad: ['sad', 'alone', 'broken', 'heartbreak', 'crying', 'depressed', 'dard'],
  party: ['party', 'club', 'dance', 'dj', 'bhangra', 'dhol', 'edm'],
  focus: ['focus', 'study', 'work', 'reading', 'coding', 'instrumental'],
  acoustic: ['acoustic', 'unplugged', 'guitar', 'piano', 'live'],
};

const ERA_KEYWORDS: Record<string, string[]> = {
  '90s': ['90s', 'nineties', '1990s', 'classic 90s'],
  '2000s': ['2000s', 'early 2000s', '2000'],
  '2010s': ['2010s', '2015', '2018'],
  retro: ['retro', 'vintage', 'old', 'golden era', '70s', '80s'],
  latest: ['latest', 'new', 'trending', '2025', '2026', 'fresh'],
};

const GENRE_KEYWORDS: Record<string, string[]> = {
  punjabi: ['punjabi', 'bhangra', 'pollywood'],
  bollywood: ['bollywood', 'hindi', 'filmi'],
  pop: ['pop', 'english pop', 'global pop'],
  hiphop: ['hiphop', 'hip hop', 'rap', 'trap', 'desi hip hop', 'dhh'],
  rnb: ['r&b', 'rnb', 'soul'],
  rock: ['rock', 'metal', 'alternative'],
};

/**
 * Phonetically simplifies text for typo and transliteration resilience
 * (e.g., "kesariya" -> "kesaria", "sidhu moosewala" -> "sidhu musewala", "arjit" -> "arijit")
 */
export function phoneticNormalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/ph/g, 'f')
    .replace(/ee/g, 'i')
    .replace(/oo/g, 'u')
    .replace(/aa/g, 'a')
    .replace(/sh/g, 's')
    .replace(/th/g, 't')
    .replace(/kh/g, 'k')
    .replace(/ch/g, 'c')
    .replace(/bh/g, 'b')
    .replace(/dh/g, 'd')
    .replace(/(.)\1+/g, '$1') // deduplicate double letters (e.g. tt -> t, ll -> l)
    .trim();
}

/**
 * Computes Damerau-Levenshtein edit distance for high-accuracy typo tolerance
 */
export function editDistance(a: string, b: string): number {
  const al = a.length;
  const bl = b.length;
  if (!al) return bl;
  if (!bl) return al;

  const matrix: number[][] = [];
  for (let i = 0; i <= al; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= bl; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= al; i++) {
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,       // deletion
        matrix[i][j - 1] + 1,       // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
      // Transposition
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        matrix[i][j] = Math.min(matrix[i][j], matrix[i - 2][j - 2] + 1);
      }
    }
  }

  return matrix[al][bl];
}

/**
 * Parses user input to extract semantic intents (mood, era, genre, quality preferences)
 */
export function parseSearchIntent(rawQuery: string): ParsedSearchIntent {
  let q = rawQuery.toLowerCase();
  let detectedMood: string | null = null;
  let detectedEra: string | null = null;
  let detectedGenre: string | null = null;
  let prefersLossless = false;

  if (/\b(lossless|flac|320kbps|master|hifi)\b/i.test(q)) {
    prefersLossless = true;
    q = q.replace(/\b(lossless|flac|320kbps|master|hifi)\b/gi, '').trim();
  }

  for (const [mood, words] of Object.entries(MOOD_KEYWORDS)) {
    for (const w of words) {
      const regex = new RegExp(`\\b${w}\\b`, 'i');
      if (regex.test(q)) {
        detectedMood = mood;
        q = q.replace(regex, '').trim();
        break;
      }
    }
    if (detectedMood) break;
  }

  for (const [era, words] of Object.entries(ERA_KEYWORDS)) {
    for (const w of words) {
      const regex = new RegExp(`\\b${w}\\b`, 'i');
      if (regex.test(q)) {
        detectedEra = era;
        q = q.replace(regex, '').trim();
        break;
      }
    }
    if (detectedEra) break;
  }

  for (const [genre, words] of Object.entries(GENRE_KEYWORDS)) {
    for (const w of words) {
      const regex = new RegExp(`\\b${w}\\b`, 'i');
      if (regex.test(q)) {
        detectedGenre = genre;
        q = q.replace(regex, '').trim();
        break;
      }
    }
    if (detectedGenre) break;
  }

  const cleanQuery = q.replace(/\s+/g, ' ').trim() || rawQuery.trim();

  return {
    cleanQuery,
    originalQuery: rawQuery.trim(),
    detectedMood,
    detectedEra,
    detectedGenre,
    prefersLossless,
  };
}

/**
 * Calculates a multi-factor search relevance score for a song against a query,
 * including exact matching, prefix matching, phonetic similarity, and Taste DNA alignment.
 */
export function scoreSearchRelevance(
  song: Song,
  query: string,
  parsed: ParsedSearchIntent,
  userTopGenre: string | null = null,
  userTopArtist: string | null = null
): number {
  const normQuery = query.toLowerCase().trim();
  const phoneQuery = phoneticNormalize(normQuery);

  const title = (song.title || '').toLowerCase();
  const artist = (song.artist || '').toLowerCase();
  const album = (song.album || '').toLowerCase();
  const genre = (song.genre || '').toLowerCase();

  const phoneTitle = phoneticNormalize(title);
  const phoneArtist = phoneticNormalize(artist);

  let score = 0;

  // 1. Exact & Substring Match
  if (title === normQuery) score += 100;
  else if (title.startsWith(normQuery)) score += 60;
  else if (title.includes(normQuery)) score += 40;

  if (artist === normQuery) score += 80;
  else if (artist.startsWith(normQuery)) score += 50;
  else if (artist.includes(normQuery)) score += 35;

  if (album.includes(normQuery)) score += 20;

  // 2. Phonetic & Fuzzy Match (Tolerant to typo & transliteration)
  if (phoneTitle.includes(phoneQuery) || phoneQuery.includes(phoneTitle)) score += 35;
  if (phoneArtist.includes(phoneQuery) || phoneQuery.includes(phoneArtist)) score += 30;

  // Fuzzy Levenshtein on title words
  const queryTokens = normQuery.split(/\s+/);
  const titleTokens = title.split(/\s+/);
  for (const qt of queryTokens) {
    if (qt.length < 3) continue;
    for (const tt of titleTokens) {
      const dist = editDistance(qt, tt);
      if (dist <= 1) score += 25;
      else if (dist === 2 && qt.length > 5) score += 15;
    }
  }

  // 3. Intent Alignments (Mood / Era / Genre)
  if (parsed.detectedGenre && genre.includes(parsed.detectedGenre)) {
    score += 30;
  }
  if (parsed.detectedMood && (title.includes(parsed.detectedMood) || genre.includes(parsed.detectedMood))) {
    score += 25;
  }
  if (parsed.prefersLossless && (song.is_lossless || song.bitrate_kbps === 320)) {
    score += 20;
  }

  // 4. Taste-DNA Personalized Reranking Boost
  if (userTopGenre && genre.includes(userTopGenre.toLowerCase())) {
    score += 15;
  }
  if (userTopArtist && artist.includes(userTopArtist.toLowerCase())) {
    score += 20;
  }

  return score;
}
