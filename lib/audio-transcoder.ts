// lib/audio-transcoder.ts
// Server-side audio transcoder & cache optimizer using FFmpeg.
// Converts incoming streams into high-efficiency 192kbps MP3/Opus files for progressive streaming.

import { spawn } from 'node:child_process';
import { createWriteStream, existsSync, mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import crypto from 'node:crypto';
import pool from './db';

const CACHE_DIR = join(process.cwd(), 'public', 'audio', 'cache');

// Ensure cache directory exists
if (!existsSync(CACHE_DIR)) {
  mkdirSync(CACHE_DIR, { recursive: true });
}

export interface TranscodeResult {
  fileUrl: string;       // e.g. '/audio/cache/a1b2c3.mp3'
  audioFormat: string;   // 'MP3'
  bitrateKbps: number;   // 192
  fileSizeBytes: number;
}

/**
 * Generate a deterministic hash for a track based on artist and title
 */
export function getTrackHash(title: string, artist: string): string {
  return crypto
    .createHash('md5')
    .update(`${artist.toLowerCase().trim()}::${title.toLowerCase().trim()}`)
    .digest('hex');
}

/**
 * Download and optimize raw audio stream into a 192kbps web-friendly streamable MP3.
 */
export async function optimizeAndCacheAudio(
  sourceUrl: string,
  title: string,
  artist: string
): Promise<TranscodeResult> {
  const hash = getTrackHash(title, artist);
  const outputFileName = `${hash}.mp3`;
  const outputPath = join(CACHE_DIR, outputFileName);
  const relativeFileUrl = `/audio/cache/${outputFileName}`;

  // 1. If already transcoded and cached on disk, return immediately
  if (existsSync(outputPath)) {
    const stats = statSync(outputPath);
    if (stats.size > 10240) {
      return {
        fileUrl: relativeFileUrl,
        audioFormat: 'MP3',
        bitrateKbps: 192,
        fileSizeBytes: stats.size,
      };
    }
  }

  // 2. Transcode on-the-fly using FFmpeg
  return new Promise((resolve, reject) => {
    // FFmpeg args: convert input URL -> 192kbps CBR MP3, 44.1kHz stereo with ID3 tags
    const ffmpeg = spawn('ffmpeg', [
      '-y',
      '-i', sourceUrl,
      '-vn',                      // Disable video
      '-codec:a', 'libmp3lame',    // MP3 LAME encoder
      '-b:a', '192k',             // 192 kbps bitrate
      '-ar', '44100',             // 44.1 kHz sample rate
      '-ac', '2',                 // Stereo
      '-metadata', `title=${title}`,
      '-metadata', `artist=${artist}`,
      outputPath,
    ]);

    ffmpeg.stderr.on('data', () => {
      // ffmpeg writes progress to stderr
    });

    ffmpeg.on('close', (code) => {
      if (code === 0 && existsSync(outputPath)) {
        const stats = statSync(outputPath);
        resolve({
          fileUrl: relativeFileUrl,
          audioFormat: 'MP3',
          bitrateKbps: 192,
          fileSizeBytes: stats.size,
        });
      } else {
        reject(new Error(`FFmpeg exited with error code ${code}`));
      }
    });

    ffmpeg.on('error', (err) => {
      reject(err);
    });
  });
}
