-- Migration v2: add audio format metadata columns to songs
-- Safe / idempotent: uses IF NOT EXISTS / IF EXISTS throughout.

ALTER TABLE songs
  ADD COLUMN IF NOT EXISTS audio_format    VARCHAR(10),
  ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT,
  ADD COLUMN IF NOT EXISTS bitrate_kbps    INTEGER,
  ADD COLUMN IF NOT EXISTS sample_rate_hz  INTEGER,
  ADD COLUMN IF NOT EXISTS is_lossless     BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS source          VARCHAR(50) DEFAULT 'manual';

-- Index for source filtering (e.g. WHERE source = 'itunes')
CREATE INDEX IF NOT EXISTS idx_songs_source ON songs(source);

-- Index for format filtering (e.g. WHERE audio_format = 'FLAC')
CREATE INDEX IF NOT EXISTS idx_songs_format ON songs(audio_format);
