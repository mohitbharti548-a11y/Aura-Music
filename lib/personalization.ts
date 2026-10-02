// lib/personalization.ts
// Autonomous User Taste Profiler, Device Fingerprinting & Adaptive Habit Recommendation Engine
import type { Song } from '@/types/music';

export interface DeviceProfile {
  deviceId: string;
  deviceName: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  platform: string;
  createdAt: number;
}

export interface TasteProfile {
  deviceId: string;
  totalListens: number;
  completedTracks: number;
  skippedTracks: number;
  genres: Record<string, number>;
  artists: Record<string, number>;
  timeOfDayHabits: {
    morning: number; // 05:00 - 11:59
    afternoon: number; // 12:00 - 16:59
    evening: number; // 17:00 - 21:59
    lateNight: number; // 22:00 - 04:59
  };
  lastActive: number;
}

const STORAGE_DEVICE_KEY = 'aura_device_profile';
const STORAGE_TASTE_KEY = 'aura_taste_profile';

export function getDeviceProfile(): DeviceProfile {
  if (typeof window === 'undefined') {
    return {
      deviceId: 'server_preview',
      deviceName: 'Web Device',
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
  const deviceId = `dev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

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
      genres: {},
      artists: {},
      timeOfDayHabits: { morning: 0, afternoon: 0, evening: 0, lateNight: 0 },
      lastActive: Date.now(),
    };
  }

  try {
    const raw = localStorage.getItem(STORAGE_TASTE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}

  const defaultProfile: TasteProfile = {
    deviceId: device.deviceId,
    totalListens: 0,
    completedTracks: 0,
    skippedTracks: 0,
    genres: {},
    artists: {},
    timeOfDayHabits: { morning: 0, afternoon: 0, evening: 0, lateNight: 0 },
    lastActive: Date.now(),
  };

  return defaultProfile;
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

    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) profile.timeOfDayHabits.morning++;
    else if (hour >= 12 && hour < 17) profile.timeOfDayHabits.afternoon++;
    else if (hour >= 17 && hour < 22) profile.timeOfDayHabits.evening++;
    else profile.timeOfDayHabits.lateNight++;

    const primaryArtist = song.artist.split(/,|&|feat\.|ft\./i)[0].trim();
    const genre = song.genre?.trim() || 'General';

    if (action === 'play') {
      profile.totalListens++;
      profile.artists[primaryArtist] = (profile.artists[primaryArtist] || 0) + 1;
      profile.genres[genre] = (profile.genres[genre] || 0) + 1;
    } else if (action === 'complete') {
      profile.completedTracks++;
      profile.artists[primaryArtist] = (profile.artists[primaryArtist] || 0) + 2;
      profile.genres[genre] = (profile.genres[genre] || 0) + 2;
    } else if (action === 'skip') {
      profile.skippedTracks++;
      if (listenedSeconds < 10) {
        // Minor penalty for rapid instant skip
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
  experienceLevel: string;
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
  let dominantPeriod = 'All-day listener';
  if (maxPeriod > 0) {
    if (maxPeriod === morning) dominantPeriod = 'Morning Flow';
    else if (maxPeriod === afternoon) dominantPeriod = 'Afternoon Groove';
    else if (maxPeriod === evening) dominantPeriod = 'Evening Chill';
    else dominantPeriod = 'Late Night Sessions';
  }

  const experienceLevel =
    profile.totalListens > 50
      ? 'Aura Audiophile'
      : profile.totalListens > 15
      ? 'Music Enthusiast'
      : 'New Explorer';

  return { topGenre, topArtist, dominantPeriod, experienceLevel };
}

export function getPersonalizedFeeds(allSongs: Song[]) {
  const profile = getTasteProfile();
  const { topGenre, topArtist } = getTopUserAttributes();

  // 1. Daily Mix: weighted by user's top artists & genres
  let dailyMix: Song[] = [];
  if (topArtist || topGenre) {
    dailyMix = allSongs.filter((s) => {
      const matchesArtist = topArtist && s.artist.toLowerCase().includes(topArtist.toLowerCase());
      const matchesGenre = topGenre && s.genre?.toLowerCase() === topGenre.toLowerCase();
      return matchesArtist || matchesGenre;
    });
  }
  if (dailyMix.length < 6) {
    const remain = allSongs.filter((s) => !dailyMix.some((m) => m.id === s.id));
    dailyMix = [...dailyMix, ...remain];
  }

  // 2. Current Time of Day Habit Recommendations
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
    dailyMix: dailyMix.slice(0, 12),
    habitMix: habitMix.slice(0, 12),
    habitTitle,
    habitSubtitle,
    topGenre,
    topArtist,
  };
}
