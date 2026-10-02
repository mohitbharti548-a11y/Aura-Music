// lib/recommendations.ts
// Spotify-Grade Autonomous Dynamic Radio & Music Recommendation Engine
import { searchJioSaavn } from './jiosaavn-client';
import pool from './db';
import type { Song } from '@/types/music';

// Artist Similarity & Affinity Graph for high-fidelity radio transitions
const ARTIST_AFFINITY_GRAPH: Record<string, string[]> = {
  // Bollywood & Pop
  'yo yo honey singh': ['Badshah', 'Guru Randhawa', 'Neha Kakkar', 'Diljit Dosanjh', 'Raftaar'],
  'neha kakkar': ['Tony Kakkar', 'Dhvani Bhanushali', 'Asees Kaur', 'Jubin Nautiyal', 'Badshah'],
  'arijit singh': ['Atif Aslam', 'Jubin Nautiyal', 'Mohit Chauhan', 'Armaan Malik', 'Pritam'],
  'badshah': ['Yo Yo Honey Singh', 'Diljit Dosanjh', 'Karan Aujla', 'Divine', 'Ikka'],
  'diljit dosanjh': ['Karan Aujla', 'AP Dhillon', 'Sidhu Moose Wala', 'Ammy Virk', 'Guru Randhawa'],
  'sidhu moose wala': ['Karan Aujla', 'AP Dhillon', 'Amrit Maan', 'Prem Dhillon', 'Diljit Dosanjh'],
  'ap dhillon': ['Gurinder Gill', 'Shubh', 'Karan Aujla', 'Diljit Dosanjh', 'Talwiinder'],
  'shreya ghoshal': ['Sunidhi Chauhan', 'Arijit Singh', 'Alka Yagnik', 'Monali Thakur'],
  'atif aslam': ['Arijit Singh', 'Mustafa Zahid', 'KK', 'Jubin Nautiyal', 'Ali Zafar'],
  'pritam': ['Arijit Singh', 'Vishal-Shekhar', 'Sachin-Jigar', 'Amit Trivedi', 'Shankar-Ehsaan-Loy'],
  
  // Western / Global Pop & Hip-Hop
  'the weeknd': ['Daft Punk', 'Bruno Mars', 'Post Malone', 'Drake', 'Dua Lipa'],
  'drake': ['Travis Scott', 'Future', '21 Savage', 'Kendrick Lamar', 'The Weeknd'],
  'taylor swift': ['Olivia Rodrigo', 'Sabrina Carpenter', 'Billie Eilish', 'Katy Perry', 'Ariana Grande'],
  'billie eilish': ['FINNEAS', 'Lorde', 'Olivia Rodrigo', 'Lana Del Rey', 'Melanie Martinez'],
  'dua lipa': ['Calvin Harris', 'Ava Max', 'Bebe Rexha', 'Katy Perry', 'Charli XCX'],
  'post malone': ['The Weeknd', 'Swae Lee', 'Khalid', '21 Savage', 'Juice WRLD'],
  'bruno mars': ['Anderson .Paak', 'The Weeknd', 'Justin Timberlake', 'Silk Sonic', 'Mark Ronson'],
  'travis scott': ['Don Toliver', 'Drake', 'Playboi Carti', 'Metro Boomin', 'Future'],
  'ed sheeran': ['Shawn Mendes', 'Lewis Capaldi', 'James Arthur', 'Sam Smith', 'Charlie Puth'],
  'coldplay': ['Imagine Dragons', 'OneRepublic', 'The Chainsmokers', 'Maroon 5', 'U2'],
  'eminem': ['Dr. Dre', '50 Cent', 'Snoop Dogg', 'Tupac', 'Jay-Z'],
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

/**
 * Interleaves multiple track arrays so the same artist isn't played repeatedly.
 * Mimics Spotify's weighted fair shuffle algorithm.
 */
function interleaveRecommendations(
  arrays: Song[][],
  maxLimit = 10,
  hiddenTrackIds: string[] = []
): Song[] {
  const result: Song[] = [];
  const seenIds = new Set<string>(hiddenTrackIds);
  const seenTitles = new Set<string>();

  const maxLen = Math.max(...arrays.map((a) => a.length), 0);

  for (let i = 0; i < maxLen; i++) {
    for (const arr of arrays) {
      if (i < arr.length) {
        const track = arr[i];
        const titleKey = track.title.toLowerCase().trim();

        if (!seenIds.has(track.id) && !seenTitles.has(titleKey)) {
          seenIds.add(track.id);
          seenTitles.add(titleKey);
          result.push(track);
          if (result.length >= maxLimit) return result;
        }
      }
    }
  }

  return result;
}

/**
 * Generates an up-to-10 track intelligent dynamic radio station based on a seed song.
 */
export async function generateSongRecommendations(
  seedSong: Song,
  limit = 10,
  hiddenTrackIds: string[] = []
): Promise<Song[]> {
  try {
    const seedArtists = extractArtistList(seedSong.artist);
    const primaryArtist = seedArtists[0] || seedSong.artist;
    const normPrimary = normalizeArtist(primaryArtist);

    // 1. Determine related artists from graph or query
    const relatedArtists: string[] = [];
    for (const [key, related] of Object.entries(ARTIST_AFFINITY_GRAPH)) {
      if (normPrimary.includes(key) || key.includes(normPrimary)) {
        relatedArtists.push(...related);
      }
    }

    const secondaryArtist = seedArtists[1] || relatedArtists[0];
    const relatedArtistQuery = relatedArtists[1] || relatedArtists[0] || null;

    // 2. Fetch candidates across 4 parallel intelligent query channels
    const query1 = searchJioSaavn(primaryArtist, 8);
    const query2 = secondaryArtist
      ? searchJioSaavn(secondaryArtist, 6)
      : Promise.resolve([] as Song[]);
    const query3 = searchJioSaavn(
      seedSong.genre ? `${seedSong.genre} top hits` : `${primaryArtist} hits`,
      6
    );
    const query4 = relatedArtistQuery
      ? searchJioSaavn(relatedArtistQuery, 6)
      : Promise.resolve([] as Song[]);

    // 5. Query local Neon DB for matching genre/artist tracks (if DB connected)
    const localDbPromise = (async () => {
      try {
        if (!process.env.DATABASE_URL) return [] as Song[];
        const res = await pool.query(
          `SELECT * FROM songs 
           WHERE (artist ILIKE $1 OR genre ILIKE $2 OR album ILIKE $3)
             AND id != $4
           ORDER BY created_at DESC 
           LIMIT 6`,
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

    // Remove seed song itself and hidden track IDs
    const hiddenSet = new Set(hiddenTrackIds);
    const filterSeed = (list: Song[]) =>
      list.filter(
        (s) =>
          s.id !== seedSong.id &&
          !hiddenSet.has(s.id) &&
          s.title.toLowerCase().trim() !== seedSong.title.toLowerCase().trim()
      );

    // 3. Interleave streams for high musical coherence & artist variety
    const combined = interleaveRecommendations(
      [
        filterSeed(q1Res),
        filterSeed(localRes),
        filterSeed(q2Res),
        filterSeed(q3Res),
        filterSeed(q4Res),
      ],
      limit,
      hiddenTrackIds
    );

    return combined.slice(0, limit);
  } catch (err) {
    console.error('Error generating song recommendations:', err);
    return [];
  }
}
