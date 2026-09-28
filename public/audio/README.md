# /public/audio/

Drop your local audio files here. They will be served through the streaming API at:

```
/api/audio/filename.flac   →  streams public/audio/filename.flac
/api/audio/subdir/song.mp3 →  streams public/audio/subdir/song.mp3
```

The streaming route (`app/api/audio/[...path]/route.ts`) handles:
- **HTTP Range requests** (byte-range seeking, required for FLAC files)
- **Chunked delivery** — 2 MB chunks by default
- **Correct MIME types** per extension (audio/flac, audio/mpeg, audio/mp4, etc.)
- **Path traversal protection** — only serves files inside this folder

## Supported formats
| Extension | MIME type             | Lossless? |
|-----------|----------------------|-----------|
| .flac     | audio/flac           | ✅ Yes    |
| .wav      | audio/wav            | ✅ Yes    |
| .mp3      | audio/mpeg           | ❌ No     |
| .m4a      | audio/mp4            | ❌ No     |
| .aac      | audio/aac            | ❌ No     |
| .ogg      | audio/ogg            | ❌ No     |
| .opus     | audio/ogg; codecs=opus | ❌ No   |

## Usage
After placing a file here, set its `file_url` in the database to:

```
/audio/your-song.flac
```

The PlayerBar will automatically route it through `/api/audio/your-song.flac`.
External URLs (Deezer previews, SoundHelix, etc.) are used directly without routing.
