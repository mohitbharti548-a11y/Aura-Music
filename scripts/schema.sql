-- ============================================================
-- Music App Database Schema
-- Run this against your PostgreSQL database to set up tables.
-- ============================================================

-- Enable UUID generation (built-in since PG 13)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------
-- USERS
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email        VARCHAR(255) UNIQUE NOT NULL,
  name         VARCHAR(255) NOT NULL,
  avatar_url   TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------
-- SONGS
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS songs (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  title            VARCHAR(255) NOT NULL,
  artist           VARCHAR(255) NOT NULL,
  album            VARCHAR(255),
  duration_seconds INTEGER,
  file_url         TEXT         NOT NULL,
  cover_url        TEXT,
  genre            VARCHAR(100),
  uploaded_by      UUID         REFERENCES users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ  DEFAULT NOW()
);

-- ----------------------------------------------------------
-- PLAYLISTS
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS playlists (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  cover_url   TEXT,
  user_id     UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_public   BOOLEAN      DEFAULT TRUE,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

-- ----------------------------------------------------------
-- PLAYLIST_SONGS  (junction table)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS playlist_songs (
  playlist_id UUID        NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  song_id     UUID        NOT NULL REFERENCES songs(id)     ON DELETE CASCADE,
  position    INTEGER     NOT NULL DEFAULT 0,
  added_at    TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (playlist_id, song_id)
);

-- ----------------------------------------------------------
-- LIKED_SONGS
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS liked_songs (
  user_id  UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  song_id  UUID        NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  liked_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, song_id)
);

-- ----------------------------------------------------------
-- INDEXES for common query patterns
-- ----------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_songs_created_at       ON songs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_playlists_user_id      ON playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_playlist_songs_order   ON playlist_songs(playlist_id, position);
CREATE INDEX IF NOT EXISTS idx_liked_songs_user       ON liked_songs(user_id);
