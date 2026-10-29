// lib/harmonic-engine.ts
// Sāṅgīt Harmonic Flow & Camelot Wheel DJ-Grade Transition Engine
// Provides musical key compatibility, BPM matching, and acoustic multi-vector profiling
import type { Song } from '@/types/music';

export interface AcousticVector {
  bpm: number;
  camelotKey: string;      // e.g. "8A" (A minor), "8B" (C major)
  energy: number;          // 0.0 - 1.0
  valence: number;         // 0.0 - 1.0 (mood: sad -> euphoric)
  acousticness: number;    // 0.0 - 1.0
  danceability: number;    // 0.0 - 1.0
  genreClass: string;
}

export interface HarmonicMatchResult {
  score: number;           // 0.0 - 1.0 total acoustic & harmonic synergy
  keyTransition: 'PERFECT' | 'RELATIVE' | 'ENERGY_BOOST' | 'ENERGY_DROP' | 'NEUTRAL';
  bpmMatchPct: number;
  matchReasons: string[];
}

// Camelot Wheel Key Lookup Table
const CAMELOT_KEYS: string[] = [
  '1A', '1B', '2A', '2B', '3A', '3B', '4A', '4B',
  '5A', '5B', '6A', '6B', '7A', '7B', '8A', '8B',
  '9A', '9B', '10A', '10B', '11A', '11B', '12A', '12B',
];

/**
 * Deterministically estimates acoustic vector features based on song metadata,
 * title, artist, genre, and duration when raw DSP waveform analysis is deferred.
 */
export function estimateAcousticVector(song: Song): AcousticVector {
  const text = `${song.title} ${song.artist} ${song.genre || ''} ${song.album || ''}`.toLowerCase();

  // 1. Estimate BPM & Mood
  let bpm = 118;
  let energy = 0.65;
  let valence = 0.60;
  let acousticness = 0.30;
  let danceability = 0.65;
  let genreClass = 'Pop / Contemporary';

  // Heuristic adjustments based on sonic descriptors
  if (/acoustic|unplugged|piano|strings|slow|serenade|lullaby|ballad/i.test(text)) {
    bpm = 78;
    energy = 0.35;
    valence = 0.45;
    acousticness = 0.88;
    danceability = 0.40;
    genreClass = 'Acoustic / Melodic';
  } else if (/lo-?fi|chill|ambient|relax|meditation|sleep|night/i.test(text)) {
    bpm = 84;
    energy = 0.38;
    valence = 0.50;
    acousticness = 0.70;
    danceability = 0.55;
    genreClass = 'Lo-Fi / Ambient';
  } else if (/gym|workout|energy|trap|drill|bass|drop|edm|dance|club|remix/i.test(text)) {
    bpm = 128;
    energy = 0.92;
    valence = 0.80;
    acousticness = 0.10;
    danceability = 0.90;
    genreClass = 'High-Energy Dance / EDM';
  } else if (/punjabi|bhangra|dhol|folk|tappe/i.test(text)) {
    bpm = 104;
    energy = 0.85;
    valence = 0.85;
    acousticness = 0.25;
    danceability = 0.88;
    genreClass = 'Punjabi / Rhythm';
  } else if (/sad|heartbreak|alone|crying|pain|tujhe kitna|rooth|judaai/i.test(text)) {
    bpm = 82;
    energy = 0.42;
    valence = 0.25;
    acousticness = 0.65;
    danceability = 0.35;
    genreClass = 'Melancholic / Soul';
  } else if (/romantic|love|dil|ishq|pyar|humsafar|tum hi ho/i.test(text)) {
    bpm = 92;
    energy = 0.58;
    valence = 0.70;
    acousticness = 0.52;
    danceability = 0.58;
    genreClass = 'Romantic / Melody';
  } else if (/rock|guitar|metal|punk/i.test(text)) {
    bpm = 136;
    energy = 0.88;
    valence = 0.60;
    acousticness = 0.20;
    danceability = 0.55;
    genreClass = 'Rock / Alternative';
  }

  // Consistent hash for repeatable key and micro-variations
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  const absHash = Math.abs(hash);
  const camelotKey = CAMELOT_KEYS[absHash % CAMELOT_KEYS.length];

  // Micro adjustments for realistic spread
  const bpmOffset = (absHash % 17) - 8;
  bpm = Math.max(60, Math.min(180, bpm + bpmOffset));

  return {
    bpm,
    camelotKey,
    energy: Math.min(1, Math.max(0, energy + ((absHash % 10) - 5) * 0.01)),
    valence: Math.min(1, Math.max(0, valence + (((absHash >> 3) % 10) - 5) * 0.01)),
    acousticness: Math.min(1, Math.max(0, acousticness + (((absHash >> 5) % 10) - 5) * 0.01)),
    danceability: Math.min(1, Math.max(0, danceability + (((absHash >> 7) % 10) - 5) * 0.01)),
    genreClass,
  };
}

/**
 * Calculates Camelot Wheel harmonic distance between two key codes.
 * Returns a score between 0.0 (distant) and 1.0 (exact harmonic match).
 */
export function calculateHarmonicScore(keyA: string, keyB: string): { score: number; transition: HarmonicMatchResult['keyTransition'] } {
  if (keyA === keyB) {
    return { score: 1.0, transition: 'PERFECT' };
  }

  const numA = parseInt(keyA.slice(0, -1), 10);
  const letterA = keyA.slice(-1);
  const numB = parseInt(keyB.slice(0, -1), 10);
  const letterB = keyB.slice(-1);

  // Relative Major/Minor (Same number, different letter, e.g. 8A <-> 8B)
  if (numA === numB && letterA !== letterB) {
    return { score: 0.95, transition: 'RELATIVE' };
  }

  // Adjacent hour around the Camelot 12-hour clock
  const hourDiff = Math.min(Math.abs(numA - numB), 12 - Math.abs(numA - numB));

  if (letterA === letterB) {
    if (hourDiff === 1) {
      const isUp = (numB - numA + 12) % 12 === 1;
      return {
        score: 0.90,
        transition: isUp ? 'ENERGY_BOOST' : 'ENERGY_DROP',
      };
    }
    if (hourDiff === 2) {
      return { score: 0.75, transition: 'ENERGY_BOOST' };
    }
  }

  // Two hours away or cross-letter adjacent
  if (hourDiff === 1 && letterA !== letterB) {
    return { score: 0.80, transition: 'NEUTRAL' };
  }

  return { score: Math.max(0.40, 1.0 - hourDiff * 0.12), transition: 'NEUTRAL' };
}

/**
 * Computes overall acoustic match synergy between two songs.
 */
export function evaluateAcousticCompatibility(songA: Song, songB: Song): HarmonicMatchResult {
  const vecA = estimateAcousticVector(songA);
  const vecB = estimateAcousticVector(songB);

  const { score: keyScore, transition } = calculateHarmonicScore(vecA.camelotKey, vecB.camelotKey);

  // BPM compatibility: check 1x, 0.5x (half-time), 2x (double-time)
  const bpmRatio = vecB.bpm / vecA.bpm;
  let bpmDelta = Math.abs(1 - bpmRatio);
  if (Math.abs(0.5 - bpmRatio) < bpmDelta) bpmDelta = Math.abs(0.5 - bpmRatio);
  if (Math.abs(2.0 - bpmRatio) < bpmDelta) bpmDelta = Math.abs(2.0 - bpmRatio);

  const bpmScore = Math.max(0, 1 - bpmDelta * 2.5);
  const bpmMatchPct = Math.round(bpmScore * 100);

  // Multi-vector Euclidean distance
  const energyDiff = Math.abs(vecA.energy - vecB.energy);
  const valenceDiff = Math.abs(vecA.valence - vecB.valence);
  const acousticDiff = Math.abs(vecA.acousticness - vecB.acousticness);
  const danceDiff = Math.abs(vecA.danceability - vecB.danceability);

  const vectorSimilarity =
    1 - (energyDiff * 0.35 + valenceDiff * 0.25 + acousticDiff * 0.20 + danceDiff * 0.20);

  // Total weighted harmonic flow score
  const totalScore = keyScore * 0.35 + bpmScore * 0.25 + vectorSimilarity * 0.40;

  const matchReasons: string[] = [];
  if (keyScore >= 0.90) {
    matchReasons.push(`Harmonic Key (${vecA.camelotKey} → ${vecB.camelotKey})`);
  }
  if (bpmMatchPct >= 85) {
    matchReasons.push(`${Math.round(vecB.bpm)} BPM Transition`);
  }
  if (energyDiff < 0.15) {
    matchReasons.push('Matching Energy Curve');
  }
  if (valenceDiff < 0.15) {
    matchReasons.push('Harmonic Mood Resonance');
  }

  return {
    score: Math.min(1, Math.max(0, totalScore)),
    keyTransition: transition,
    bpmMatchPct,
    matchReasons,
  };
}

/**
 * Re-orders a playlist into a smooth, seamless DJ progression using
 * Travelling Salesperson / Nearest Neighbor harmonic distance.
 */
export function orderPlaylistHarmonically(tracks: Song[]): Song[] {
  if (tracks.length <= 2) return tracks;

  const result: Song[] = [tracks[0]];
  const remaining = tracks.slice(1);

  while (remaining.length > 0) {
    const current = result[result.length - 1];
    let bestIdx = 0;
    let bestScore = -1;

    for (let i = 0; i < remaining.length; i++) {
      const compatibility = evaluateAcousticCompatibility(current, remaining[i]);
      if (compatibility.score > bestScore) {
        bestScore = compatibility.score;
        bestIdx = i;
      }
    }

    result.push(remaining.splice(bestIdx, 1)[0]);
  }

  return result;
}
