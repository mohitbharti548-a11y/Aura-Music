/**
 * Streaming audio route with HTTP Range request support.
 * Serves files from public/audio/** and handles partial content (206)
 * for FLAC and other large audio formats.
 *
 * Security: path traversal prevention via startsWith(audioRoot) check.
 */

import { createReadStream, statSync } from 'node:fs';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import type { NextRequest } from 'next/server';

// Force Node.js runtime — Web Workers can't use node:fs / node:stream.
export const runtime = 'nodejs';

const CONTENT_TYPES: Record<string, string> = {
  flac: 'audio/flac',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  ogg: 'audio/ogg',
  wav: 'audio/wav',
  opus: 'audio/ogg; codecs=opus',
};

/** Default streaming chunk size: 2 MB. Large enough to reduce round-trips,
 *  small enough not to over-buffer on slow connections. */
const DEFAULT_CHUNK = 2 * 1024 * 1024;

export async function GET(
  request: NextRequest,
  ctx: RouteContext<'/api/audio/[...path]'>,
) {
  // params is a Promise in Next.js 16 — must await.
  const { path: rawParts } = await ctx.params;
  const parts = rawParts[0] === 'audio' ? rawParts.slice(1) : rawParts;

  const audioRoot = join(process.cwd(), 'public', 'audio');
  const filePath = join(audioRoot, ...parts);

  // Prevent path traversal: ensure resolved path stays under audioRoot.
  if (!filePath.startsWith(audioRoot)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  let stat: ReturnType<typeof statSync>;
  try {
    stat = statSync(filePath);
  } catch {
    return Response.json({ error: 'Audio file not found' }, { status: 404 });
  }

  const fileSize = stat.size;
  const ext = filePath.split('.').pop()?.toLowerCase() ?? 'mp3';
  const contentType = CONTENT_TYPES[ext] ?? 'audio/mpeg';

  const commonHeaders = {
    'Accept-Ranges': 'bytes',
    'Content-Type': contentType,
    // Immutable media caching — browser stores chunks in temporary media cache for instant replay
    'Cache-Control': 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
  };

  const rangeHeader = request.headers.get('range');

  if (rangeHeader) {
    // RFC 7233 §2.1 — only "bytes" range unit is supported.
    const match = rangeHeader.match(/bytes=(\d+)?-(\d+)?/);
    if (!match) {
      return new Response('Invalid Range', { status: 416 });
    }

    const start = match[1] ? parseInt(match[1], 10) : 0;
    const end = match[2]
      ? parseInt(match[2], 10)
      : Math.min(start + DEFAULT_CHUNK - 1, fileSize - 1);

    // Validate the range is within file bounds.
    if (start > fileSize - 1 || end > fileSize - 1 || start > end) {
      return new Response(null, {
        status: 416,
        headers: { 'Content-Range': `bytes */${fileSize}` },
      });
    }

    const chunkSize = end - start + 1;
    const nodeStream = createReadStream(filePath, { start, end });
    // Readable.toWeb() bridges Node.js streams to the Web Streams API
    // required by the Response constructor.
    const webStream = Readable.toWeb(nodeStream) as ReadableStream;

    return new Response(webStream, {
      status: 206,
      headers: {
        ...commonHeaders,
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Content-Length': String(chunkSize),
      },
    });
  }

  // No Range header — stream the entire file.
  const nodeStream = createReadStream(filePath);
  const webStream = Readable.toWeb(nodeStream) as ReadableStream;

  return new Response(webStream, {
    status: 200,
    headers: {
      ...commonHeaders,
      'Content-Length': String(fileSize),
    },
  });
}
