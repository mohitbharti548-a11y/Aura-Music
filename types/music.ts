// types/music.ts
// Shared types that match the PostgreSQL schema exactly.
// Used by API routes, Redux slices, and UI components.

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  created_at: string;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string | null;
  duration_seconds: number | null;
  file_url: string;
  cover_url: string | null;
  genre: string | null;
  uploaded_by: string | null;
  created_at: string;
  // Joined field from liked_songs — present on API responses
  is_liked?: boolean;
  // Phase 3 additions — may be null for records that predate the migration
  audio_format?: string | null;    // e.g. 'mp3', 'flac', 'm4a'
  file_size_bytes?: number | null;
  bitrate_kbps?: number | null;
  is_lossless?: boolean | null;
  source?: string | null;          // e.g. 'upload', 'deezer', 'soundhelix'
}

export interface Playlist {
  id: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  user_id: string;
  is_public: boolean;
  created_at: string;
  // Aggregated field
  song_count?: number;
}
