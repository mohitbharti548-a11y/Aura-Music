// lib/personalization.ts
// Sāṅgīt Taste DNA, Acoustic Profiler & Adaptive User Habit Engine
// Upgraded Beyond Spotify: Real-Time Live Wrapped, Acoustic Radar, Diurnal Chronotypes & Steerable Serendipity
import type { Song } from '@/types/music';
import { estimateAcousticVector, type AcousticVector } from './harmonic-engine';

export interface DeviceProfile {
  deviceId: string;
  deviceName: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  platform: string;
  createdAt: number;
}

export interface AcousticRadar {
  energy: number;          // 0-100%
  valence: number;         // 0-100% (Mood / Joy)
  danceability: number;    // 0-100%
  acousticness: number;    // 0-100%
  averageBpm: number;
}

export interface TasteProfile {
  deviceId: string;
  totalListens: number;
  completedTracks: number;
  skippedTracks: number;
  totalListeningSeconds: number;
  serendipity: number;     // 0.0 (Familiar) to 1.0 (Adventurous Discovery)
  genres: Record<string, number>;
  artists: Record<string, number>;
  recentTrackIds: string[]; // For anti-fatigue decay
  acousticRadar: AcousticRadar;
  timeOfDayHabits: {
    morning: number;       // 05:00 - 11:59
    afternoon: number;     // 12:00 - 16:59
    evening: number;       // 17:00 - 21:59
    lateNight: number;     // 22:00 - 04:59
  };
  lastActive: number;
}

const STORAGE_DEVICE_KEY = 'sangit_device_profile';
const STORAGE_TASTE_KEY = 'sangit_taste_profile';
// Legacy migration key
const LEGACY_STORAGE_TASTE_KEY = 'aura_taste_profile';

export function getDeviceProfile(): DeviceProfile {
  if (typeof window === 'undefined') {
    return {
      deviceId: 'server_preview',
      deviceName: 'Sāṅgīt Studio Web',
      deviceType: 'desktop',
      platform: 'Web',
      createdAt: Date.now(),
    };
  }

  try {
    const raw = localStorage.getItem(STORAGE_DEVICE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}

  const isMobile = /iPhone|Android.*Mobile/i.test(navigator.userAgent);
  const isTablet = /iPad|Android(?!.*Mobile)/i.test(navigator.userAgent);
  const deviceType = isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop';

  let platform = 'Web';
  if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) platform = 'iOS';
  else if (/Android/i.test(navigator.userAgent)) platform = 'Android';
  else if (/Mac/i.test(navigator.userAgent)) platform = 'macOS';
  else if (/Windows/i.test(navigator.userAgent)) platform = 'Windows';
  else if (/Linux/i.test(navigator.userAgent)) platform = 'Linux';

  const deviceName = `${platform} ${deviceType.charAt(0).toUpperCase() + deviceType.slice(1)}`;
  const deviceId = `sangit_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

  const profile: DeviceProfile = {
    deviceId,
    deviceName,
    deviceType,
    platform,
    createdAt: Date.now(),
  };

  try {
    localStorage.setItem(STORAGE_DEVICE_KEY, JSON.stringify(profile));
  } catch {}

  return profile;
}

export function getTasteProfile(): TasteProfile {
  const device = getDeviceProfile();

  if (typeof window === 'undefined') {
    return {
      deviceId: device.deviceId,
      totalListens: 0,
      completedTracks: 0,
      skippedTracks: 0,
      totalListeningSeconds: 0,
      serendipity: 0.35,
      genres: {},
      artists: {},
      recentTrackIds: [],
      acousticRadar: { energy: 72, valence: 68, danceability: 74, acousticness: 42, averageBpm: 118 },
      timeOfDayHabits: { morning: 0, afternoon: 0, evening: 0, lateNight: 0 },
      lastActive: Date.now(),
    };
  }

  try {
    let raw = localStorage.getItem(STORAGE_TASTE_KEY);
    if (!raw) {
      // Migrate legacy if exists
      raw = localStorage.getItem(LEGACY_STORAGE_TASTE_KEY);
    }
    if (raw) {
      const parsed = JSON.parse(raw);
      // Ensure defaults for all new fields
      parsed.serendipity = typeof parsed.serendipity === 'number' ? parsed.serendipity : 0.35;
      parsed.recentTrackIds = Array.isArray(parsed.recentTrackIds) ? parsed.recentTrackIds : [];
      parsed.totalListeningSeconds = parsed.totalListeningSeconds || 0;
      parsed.acousticRadar = parsed.acousticRadar || {
        energy: 72,
        valence: 68,
        danceability: 74,
        acousticness: 42,
        averageBpm: 118,
      };
      return parsed;
    }
  } catch {}

  const defaultProfile: TasteProfile = {
    deviceId: device.deviceId,
    totalListens: 0,
    completedTracks: 0,
    skippedTracks: 0,
    totalListeningSeconds: 0,
    serendipity: 0.35,
    genres: {},
    artists: {},
    recentTrackIds: [],
    acousticRadar: { energy: 72, valence: 68, danceability: 74, acousticness: 42, averageBpm: 118 },
    timeOfDayHabits: { morning: 0, afternoon: 0, evening: 0, lateNight: 0 },
    lastActive: Date.now(),
  };

  return defaultProfile;
}

export function setSerendipityLevel(level: number) {
  if (typeof window === 'undefined') return;
  try {
    const profile = getTasteProfile();
    profile.serendipity = Math.max(0, Math.min(1, level));
    localStorage.setItem(STORAGE_TASTE_KEY, JSON.stringify(profile));
  } catch {}
}

export function recordListeningEvent(
  song: Song,
  action: 'play' | 'complete' | 'skip',
  listenedSeconds = 0
) {
  if (typeof window === 'undefined' || !song) return;

  try {
    const profile = getTasteProfile();
    profile.lastActive = Date.now();
    profile.totalListeningSeconds += Math.round(listenedSeconds);

    // Diurnal circadian tracker
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) profile.timeOfDayHabits.morning++;
    else if (hour >= 12 && hour < 17) profile.timeOfDayHabits.afternoon++;
    else if (hour >= 17 && hour < 22) profile.timeOfDayHabits.evening++;
    else profile.timeOfDayHabits.lateNight++;

    // Track recently played for anti-fatigue
    if (!profile.recentTrackIds.includes(song.id)) {
      profile.recentTrackIds.unshift(song.id);
      if (profile.recentTrackIds.length > 50) {
        profile.recentTrackIds = profile.recentTrackIds.slice(0, 50);
      }
    }

    const primaryArtist = song.artist.split(/,|&|feat\.|ft\./i)[0].trim();
    const genre = song.genre?.trim() || 'General';

    // Acoustic vector extraction
    const vec = estimateAcousticVector(song);

    if (action === 'play') {
      profile.totalListens++;
      profile.artists[primaryArtist] = (profile.artists[primaryArtist] || 0) + 1;
      profile.genres[genre] = (profile.genres[genre] || 0) + 1;
    } else if (action === 'complete') {
      profile.completedTracks++;
      profile.artists[primaryArtist] = (profile.artists[primaryArtist] || 0) + 3;
      profile.genres[genre] = (profile.genres[genre] || 0) + 3;

      // Adapt acoustic radar towards completed tracks
      const weight = 0.15;
      profile.acousticRadar.energy = Math.round(profile.acousticRadar.energy * (1 - weight) + vec.energy * 100 * weight);
      profile.acousticRadar.valence = Math.round(profile.acousticRadar.valence * (1 - weight) + vec.valence * 100 * weight);
      profile.acousticRadar.danceability = Math.round(profile.acousticRadar.danceability * (1 - weight) + vec.danceability * 100 * weight);
      profile.acousticRadar.acousticness = Math.round(profile.acousticRadar.acousticness * (1 - weight) + vec.acousticness * 100 * weight);
      profile.acousticRadar.averageBpm = Math.round(profile.acousticRadar.averageBpm * (1 - weight) + vec.bpm * weight);
    } else if (action === 'skip') {
      profile.skippedTracks++;
      if (listenedSeconds < 12) {
        // Immediate skip penalty: slightly cool down artist
        profile.artists[primaryArtist] = Math.max(0, (profile.artists[primaryArtist] || 0) - 1);
      }
    }

    localStorage.setItem(STORAGE_TASTE_KEY, JSON.stringify(profile));
  } catch (err) {
    console.error('Failed to record taste event:', err);
  }
}

export function getTopUserAttributes(): {
  topGenre: string | null;
  topArtist: string | null;
  dominantPeriod: string;
  chronotype: string;
  experienceLevel: string;
  completionRatePct: number;
} {
  const profile = getTasteProfile();

  let topGenre: string | null = null;
  let maxGenreCount = 0;
  for (const [g, count] of Object.entries(profile.genres)) {
    if (count > maxGenreCount) {
      maxGenreCount = count;
      topGenre = g;
    }
  }

  let topArtist: string | null = null;
  let maxArtistCount = 0;
  for (const [a, count] of Object.entries(profile.artists)) {
    if (count > maxArtistCount) {
      maxArtistCount = count;
      topArtist = a;
    }
  }

  const { morning, afternoon, evening, lateNight } = profile.timeOfDayHabits;
  const maxPeriod = Math.max(morning, afternoon, evening, lateNight);
  let dominantPeriod = 'All-Day Explorer';
  let chronotype = 'Omni-Phase Audiophile';

  if (maxPeriod > 0) {
    if (maxPeriod === morning) {
      dominantPeriod = 'Morning Melodies';
      chronotype = 'Dawn Acoustic Seeker';
    } else if (maxPeriod === afternoon) {
      dominantPeriod = 'Afternoon Peak Energy';
      chronotype = 'Daytime Power Driver';
    } else if (maxPeriod === evening) {
      dominantPeriod = 'Evening Chill & Hits';
      chronotype = 'Sunset Harmonics Groover';
    } else {
      dominantPeriod = 'Midnight Lo-Fi & Soul';
      chronotype = 'Night Owl Audiophile';
    }
  }

  const experienceLevel =
    profile.totalListens > 60
      ? 'Sāṅgīt Master Audiophile'
      : profile.totalListens > 20
      ? 'Acoustic Connoisseur'
      : 'Harmonic Explorer';

  const totalActions = profile.completedTracks + profile.skippedTracks;
  const completionRatePct = totalActions > 0 ? Math.round((profile.completedTracks / totalActions) * 100) : 85;

  return {
    topGenre,
    topArtist,
    dominantPeriod,
    chronotype,
    experienceLevel,
    completionRatePct,
  };
}

export interface PersonalizedFeeds {
  dailyMixes: Array<{
    id: string;
    title: string;
    subtitle: string;
    color: string;
    tracks: Song[];
  }>;
  habitMix: Song[];
  habitTitle: string;
  habitSubtitle: string;
  topGenre: string | null;
  topArtist: string | null;
  dailyMix: Song[];
}

export function getPersonalizedFeeds(allSongs: Song[]): PersonalizedFeeds {
  const profile = getTasteProfile();
  const { topGenre, topArtist } = getTopUserAttributes();

  // 1. Daily Mix 1: High Energy & Uptempo Hits
  const mix1Tracks = allSongs.filter((s) => {
    const text = `${s.genre || ''} ${s.title} ${s.artist}`.toLowerCase();
    return /pop|dance|edm|party|energy|punjabi|drill|bhangra/i.test(text);
  });

  // 2. Daily Mix 2: Acoustic, Vocal & Melodic Flow
  const mix2Tracks = allSongs.filter((s) => {
    const text = `${s.genre || ''} ${s.title} ${s.artist}`.toLowerCase();
    return /acoustic|slow|romantic|love|unplugged|piano|r&b|soul|hindi/i.test(text);
  });

  // 3. Daily Mix 3: Artist Synergy & Personal Taste
  const mix3Tracks = allSongs.filter((s) => {
    const matchesArtist = topArtist && s.artist.toLowerCase().includes(topArtist.toLowerCase());
    const matchesGenre = topGenre && s.genre?.toLowerCase() === topGenre.toLowerCase();
    return matchesArtist || matchesGenre;
  });

  // 4. Daily Mix 4: Ambient, Lo-Fi & Late Night Echoes
  const mix4Tracks = allSongs.filter((s) => {
    const text = `${s.genre || ''} ${s.title} ${s.artist}`.toLowerCase();
    return /chill|lo-?fi|ambient|relax|sleep|indie|night|focus/i.test(text);
  });

  const fallback = allSongs.slice(0, 10);

  const dailyMixes = [
    {
      id: 'mix-1',
      title: 'Daily Mix 1 • Uptempo Energy',
      subtitle: 'High BPM, electronic master streams & rhythm',
      color: 'from-amber-500 to-rose-600',
      tracks: (mix1Tracks.length >= 4 ? mix1Tracks : fallback).slice(0, 12),
    },
    {
      id: 'mix-2',
      title: 'Daily Mix 2 • Acoustic & Soul',
      subtitle: 'Unplugged melodies, strings & romantic chords',
      color: 'from-emerald-500 to-teal-700',
      tracks: (mix2Tracks.length >= 4 ? mix2Tracks : fallback).slice(0, 12),
    },
    {
      id: 'mix-3',
      title: 'Daily Mix 3 • Taste DNA Favorites',
      subtitle: `Harmonic flow inspired by ${topArtist || 'your top spins'}`,
      color: 'from-sky-500 to-indigo-700',
      tracks: (mix3Tracks.length >= 4 ? mix3Tracks : fallback).slice(0, 12),
    },
    {
      id: 'mix-4',
      title: 'Daily Mix 4 • Deep Chill & Lo-Fi',
      subtitle: 'Atmospheric audio for meditation and midnight flow',
      color: 'from-purple-600 to-fuchsia-800',
      tracks: (mix4Tracks.length >= 4 ? mix4Tracks : fallback).slice(0, 12),
    },
  ];

  // 2. Circadian Diurnal Recommendation
  const currentHour = new Date().getHours();
  let habitTitle = 'Afternoon Peak Vibes';
  let habitSubtitle = 'High energy studio tracks for peak hours';
  let habitKeywords: string[] = ['pop', 'hip hop', 'dance', 'electronic'];

  if (currentHour >= 5 && currentHour < 12) {
    habitTitle = 'Morning Acoustic & Flow';
    habitSubtitle = 'Wake up to melodic studio acoustics & fresh vibes';
    habitKeywords = ['acoustic', 'pop', 'indie', 'chill'];
  } else if (currentHour >= 12 && currentHour < 17) {
    habitTitle = 'Afternoon Focus & Energy';
    habitSubtitle = 'Lossless rhythm to power through your day';
    habitKeywords = ['pop', 'hip hop', 'punjabi', 'bollywood'];
  } else if (currentHour >= 17 && currentHour < 22) {
    habitTitle = 'Evening Unwind & Hits';
    habitSubtitle = 'Trending chart-toppers & soothing melodies';
    habitKeywords = ['bollywood', 'r&b', 'pop', 'chill'];
  } else {
    habitTitle = 'Late Night Echoes & Lo-Fi';
    habitSubtitle = 'Ambient, midnight soul, and soothing deep audio';
    habitKeywords = ['chill', 'acoustic', 'sad', 'focus', 'rnb'];
  }

  let habitMix = allSongs.filter((s) =>
    habitKeywords.some(
      (k) =>
        s.genre?.toLowerCase().includes(k) ||
        s.title.toLowerCase().includes(k) ||
        s.artist.toLowerCase().includes(k)
    )
  );
  if (habitMix.length < 6) {
    habitMix = allSongs.slice(0, 10);
  }

  return {
    dailyMixes,
    dailyMix: dailyMixes[2].tracks,
    habitMix: habitMix.slice(0, 12),
    habitTitle,
    habitSubtitle,
    topGenre,
    topArtist,
  };
}
