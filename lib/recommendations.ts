// lib/recommendations.ts
// Sāṅgīt Autonomous Dynamic Radio & Algorithmic Music Recommendation Engine
// Upgraded Beyond Spotify: Zero-Payola, Harmonic Camelot Transitions, Anti-Fatigue Decay & Controllable Serendipity
import { searchJioSaavn } from './jiosaavn-client';
import pool from './db';
import {
  evaluateAcousticCompatibility,
  orderPlaylistHarmonically,
  estimateAcousticVector,
} from './harmonic-engine';
import type { Song } from '@/types/music';

// Curated Artist Affinity & Similarity Graph for high-fidelity radio transitions
export const ARTIST_AFFINITY_GRAPH: Record<string, string[]> = {
  // Punjabi & Northern Beats
  'yo yo honey singh': ['Badshah', 'Guru Randhawa', 'Raftaar', 'Diljit Dosanjh', 'Karan Aujla', 'Alfaaz', 'Bohemia'],
  'neha kakkar': ['Tony Kakkar', 'Dhvani Bhanushali', 'Asees Kaur', 'Jubin Nautiyal', 'Badshah', 'Tulsi Kumar'],
  'arijit singh': ['Atif Aslam', 'Jubin Nautiyal', 'Mohit Chauhan', 'Armaan Malik', 'Pritam', 'KK', 'Vishal Mishra'],
  'badshah': ['Yo Yo Honey Singh', 'Diljit Dosanjh', 'Karan Aujla', 'Divine', 'Ikka', 'Raftaar'],
  'diljit dosanjh': ['Karan Aujla', 'AP Dhillon', 'Sidhu Moose Wala', 'Ammy Virk', 'Guru Randhawa', 'Shubh'],
  'sidhu moose wala': ['Karan Aujla', 'AP Dhillon', 'Amrit Maan', 'Prem Dhillon', 'Diljit Dosanjh', 'Bohemia'],
  'ap dhillon': ['Gurinder Gill', 'Shubh', 'Karan Aujla', 'Diljit Dosanjh', 'Talwiinder', 'Intense'],
  'karan aujla': ['Diljit Dosanjh', 'Sidhu Moose Wala', 'AP Dhillon', 'Badshah', 'Shubh', 'Ikky'],
  'shubh': ['AP Dhillon', 'Karan Aujla', 'Diljit Dosanjh', 'Sidhu Moose Wala', 'Gurinder Gill'],
  'guru randhawa': ['Yo Yo Honey Singh', 'Arjun Kanungo', 'Armaan Malik', 'Badshah', 'Mika Singh'],
  'shreya ghoshal': ['Sunidhi Chauhan', 'Arijit Singh', 'Alka Yagnik', 'Monali Thakur', 'Palak Muchhal'],
  'atif aslam': ['Arijit Singh', 'Mustafa Zahid', 'KK', 'Jubin Nautiyal', 'Ali Zafar', 'Rahat Fateh Ali Khan'],
  'pritam': ['Arijit Singh', 'Vishal-Shekhar', 'Sachin-Jigar', 'Amit Trivedi', 'Shankar-Ehsaan-Loy'],
  'divine': ['Naezy', 'MC Stan', 'Raftaar', 'KR$NA', 'Badshah', 'Seedhe Maut'],
  'seedhe maut': ['KR$NA', 'Raftaar', 'Prabh Deep', 'Divine', 'Ahmer'],

  // Western / Global Pop, R&B & Hip-Hop
  'the weeknd': ['Daft Punk', 'Bruno Mars', 'Post Malone', 'Drake', 'Dua Lipa', 'Joji', 'Lana Del Rey'],
  'drake': ['Travis Scott', 'Future', '21 Savage', 'Kendrick Lamar', 'The Weeknd', 'PartyNextDoor'],
  'taylor swift': ['Olivia Rodrigo', 'Sabrina Carpenter', 'Billie Eilish', 'Katy Perry', 'Ariana Grande', 'Gracie Abrams'],
  'billie eilish': ['FINNEAS', 'Lorde', 'Olivia Rodrigo', 'Lana Del Rey', 'Melanie Martinez', 'Clairo'],
  'dua lipa': ['Calvin Harris', 'Ava Max', 'Bebe Rexha', 'Katy Perry', 'Charli XCX', 'Miley Cyrus'],
  'post malone': ['The Weeknd', 'Swae Lee', 'Khalid', '21 Savage', 'Juice WRLD', 'Morgan Wallen'],
  'bruno mars': ['Anderson .Paak', 'The Weeknd', 'Justin Timberlake', 'Silk Sonic', 'Mark Ronson'],
  'travis scott': ['Don Toliver', 'Drake', 'Playboi Carti', 'Metro Boomin', 'Future', 'Kid Cudi'],
  'ed sheeran': ['Shawn Mendes', 'Lewis Capaldi', 'James Arthur', 'Sam Smith', 'Charlie Puth'],
  'coldplay': ['Imagine Dragons', 'OneRepublic', 'The Chainsmokers', 'Maroon 5', 'U2', 'Keane'],
  'eminem': ['Dr. Dre', '50 Cent', 'Snoop Dogg', 'Tupac', 'Jay-Z', 'Royce da 5\'9'],
  'kendrick lamar': ['J. Cole', 'Baby Keem', 'ScHoolboy Q', 'Pusha T', 'Jay-Z', 'A$AP Rocky'],
  'ariana grande': ['Selena Gomez', 'Camila Cabello', 'Dua Lipa', 'Normani', 'Doja Cat'],
};

/**
 * Normalizes artist names for comparison and dictionary lookup.
 */
function normalizeArtist(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
}

/**
 * Splits combined artist strings like "Yo Yo Honey Singh, Neha Kakkar" or "The Weeknd feat. Daft Punk"
 */
function extractArtistList(artistString: string): string[] {
  return artistString
    .split(/,|&|feat\.|ft\.|vs\./i)
    .map((s) => s.trim())
    .filter((s) => s.length > 1);
}

export interface RecommendationOptions {
  limit?: number;
  hiddenTrackIds?: string[];
  recentTrackIds?: string[];
  serendipity?: number;        // 0.0 (Pure familiar) to 1.0 (Deep adventurous discovery)
}

/**
 * Generates an up-to-N track intelligent dynamic radio station based on a seed song,
 * enriched with Camelot wheel transitions, acoustic energy matching, anti-fatigue decay,
 * and transparent recommendation badges.
 */
export async function generateSongRecommendations(
  seedSong: Song,
  limit = 10,
  hiddenTrackIds: string[] = [],
  options: RecommendationOptions = {}
): Promise<Song[]> {
  try {
    const serendipity = typeof options.serendipity === 'number' ? options.serendipity : 0.35;
    const recentTrackIds = options.recentTrackIds || [];
    const hiddenSet = new Set([...hiddenTrackIds, ...(options.hiddenTrackIds || [])]);
    const recentSet = new Set(recentTrackIds);

    const seedArtists = extractArtistList(seedSong.artist);
    const primaryArtist = seedArtists[0] || seedSong.artist;
    const normPrimary = normalizeArtist(primaryArtist);

    // 1. Determine related artists from the affinity graph
    const relatedArtists: string[] = [];
    for (const [key, related] of Object.entries(ARTIST_AFFINITY_GRAPH)) {
      if (normPrimary.includes(key) || key.includes(normPrimary)) {
        relatedArtists.push(...related);
      }
    }

    const secondaryArtist = seedArtists[1] || relatedArtists[0];
    const varietyArtist =
      relatedArtists[Math.floor(Math.random() * Math.max(1, relatedArtists.length))] ||
      primaryArtist;

    // 2. Fetch candidates across multi-channel streams
    const queryLimit = Math.max(16, Math.round(limit * 1.8));
    const langBoost = seedSong.genre ? `${seedSong.genre} ` : '';

    // Channel A: Core artist catalog
    const query1 = searchJioSaavn(`${langBoost}${primaryArtist}`, queryLimit);

    // Channel B: Acoustic genre / mood matching
    const genreQuery = seedSong.genre
      ? `${seedSong.genre} hits`
      : `${primaryArtist} top hits`;
    const query2 = searchJioSaavn(genreQuery, queryLimit);

    // Channel C: Related artist discovery pool (Serendipity channel)
    const discoveryQuery = varietyArtist !== primaryArtist
      ? `${langBoost}${varietyArtist}`
      : `${seedSong.title.split('(')[0].trim()} radio`;
    const query3 = searchJioSaavn(discoveryQuery, queryLimit);

    // Channel D: Similar vibe / album / mood channel
    const typeQuery = seedSong.album
      ? `${seedSong.album} songs`
      : `${primaryArtist} essentials`;
    const query4 = searchJioSaavn(typeQuery, queryLimit);

    // Channel E: Local Database matches (if PostgreSQL configured)
    const localDbPromise = (async () => {
      try {
        if (!process.env.DATABASE_URL) return [] as Song[];
        const res = await pool.query(
          `SELECT * FROM songs 
           WHERE (artist ILIKE $1 OR genre ILIKE $2 OR album ILIKE $3)
             AND id != $4
           ORDER BY created_at DESC 
           LIMIT 8`,
          [
            `%${primaryArtist}%`,
            seedSong.genre ? `%${seedSong.genre}%` : '%',
            seedSong.album ? `%${seedSong.album}%` : '%',
            seedSong.id,
          ]
        );
        return res.rows as Song[];
      } catch {
        return [] as Song[];
      }
    })();

    const [q1Res, q2Res, q3Res, q4Res, localRes] = await Promise.all([
      query1.catch(() => [] as Song[]),
      query2.catch(() => [] as Song[]),
      query3.catch(() => [] as Song[]),
      query4.catch(() => [] as Song[]),
      localDbPromise,
    ]);

    // Consolidate raw candidate pool with deduplication
    const rawCandidates: Song[] = [];
    const seenIds = new Set<string>();
    const seenTitles = new Set<string>();

    // Add seed song to seen sets so it's never recommended to itself
    seenIds.add(seedSong.id);
    seenTitles.add(seedSong.title.toLowerCase().trim());

    for (const poolArr of [q1Res, localRes, q2Res, q3Res, q4Res]) {
      for (const track of poolArr) {
        const titleKey = track.title.toLowerCase().trim();
        if (
          !seenIds.has(track.id) &&
          !seenTitles.has(titleKey) &&
          !hiddenSet.has(track.id)
        ) {
          seenIds.add(track.id);
          seenTitles.add(titleKey);
          rawCandidates.push(track);
        }
      }
    }

    // 3. Multi-Vector Scoring & Algorithmic Reranking
    const scoredCandidates = rawCandidates.map((candidate) => {
      const acousticResult = evaluateAcousticCompatibility(seedSong, candidate);
      const candVec = estimateAcousticVector(candidate);

      let finalScore = acousticResult.score;

      // Anti-Fatigue Frequency Decay: If track was played recently, penalize score
      if (recentSet.has(candidate.id)) {
        finalScore *= 0.40; // 60% penalty for recent tracks
      }

      // Check artist affinity bonus
      const candArtists = extractArtistList(candidate.artist).map(normalizeArtist);
      const isSameArtist = candArtists.some((a) => a === normPrimary);
      const isRelatedArtist = candArtists.some((a) =>
        relatedArtists.map(normalizeArtist).includes(a)
      );

      if (isSameArtist) {
        // Familiarity bias inversely scaled by serendipity
        finalScore += (1 - serendipity) * 0.25;
      } else if (isRelatedArtist) {
        finalScore += 0.20;
        acousticResult.matchReasons.push(`Artist Affinity with ${primaryArtist}`);
      } else {
        // Unconnected discovery track boosted when serendipity is high
        finalScore += serendipity * 0.30;
        if (acousticResult.score >= 0.75) {
          acousticResult.matchReasons.push('Serendipitous Discovery');
        }
      }

      // Populate enhanced acoustic metadata on candidate
      candidate.match_reasons = acousticResult.matchReasons.slice(0, 3);
      candidate.harmonic_key = candVec.camelotKey;
      candidate.bpm = Math.round(candVec.bpm);
      candidate.acoustic_energy = Math.round(candVec.energy * 100);

      return {
        track: candidate,
        score: finalScore,
      };
    });

    // Sort by algorithmic score descending
    scoredCandidates.sort((a, b) => b.score - a.score);

    // Pick top candidates up to limit
    const topTracks = scoredCandidates.slice(0, limit).map((s) => s.track);

    // 4. Sequence with Harmonic DJ Flow (Camelot Wheel Ordering)
    const harmonicallyOrdered = orderPlaylistHarmonically(topTracks);

    return harmonicallyOrdered;
  } catch (err) {
    console.error('Error generating upgraded song recommendations:', err);
    return [];
  }
}
