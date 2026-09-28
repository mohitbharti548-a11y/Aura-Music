// lib/offline-storage.ts
// Robust client-side IndexedDB storage for downloading and playing tracks offline.
import type { Song } from '@/types/music';

const DB_NAME = 'aura_music_db';
const DB_VERSION = 1;
const STORE_NAME = 'offline_tracks';

interface OfflineTrackRecord {
  id: string;
  song: Song;
  audioBlob: Blob;
  downloadedAt: number;
  sizeBytes: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      return reject(new Error('IndexedDB not available in SSR'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function isTrackDownloaded(songId: string): Promise<boolean> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(songId);
      req.onsuccess = () => resolve(!!req.result);
      req.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

export async function getDownloadedTrackUrl(songId: string): Promise<string | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(songId);
      req.onsuccess = () => {
        if (req.result && req.result.audioBlob) {
          const url = URL.createObjectURL(req.result.audioBlob);
          resolve(url);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function downloadTrack(
  song: Song,
  onProgress?: (percent: number) => void
): Promise<void> {
  const db = await openDB();

  // Normalize audio URL
  let fetchUrl = song.file_url;
  if (fetchUrl.startsWith('/audio/')) {
    fetchUrl = `/api${fetchUrl}`;
  }

  const response = await fetch(fetchUrl);
  if (!response.ok) {
    throw new Error(`Failed to download audio: ${response.statusText}`);
  }

  const contentLength = response.headers.get('content-length');
  const total = contentLength ? parseInt(contentLength, 10) : 0;

  let loaded = 0;
  let blob: Blob;

  if (response.body && total > 0 && onProgress) {
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        loaded += value.length;
        onProgress(Math.round((loaded / total) * 100));
      }
    }

    blob = new Blob(chunks as unknown as BlobPart[], { type: response.headers.get('content-type') || 'audio/mpeg' });
  } else {
    blob = await response.blob();
    onProgress?.(100);
  }

  const record: OfflineTrackRecord = {
    id: song.id,
    song: { ...song, is_lossless: true },
    audioBlob: blob,
    downloadedAt: Date.now(),
    sizeBytes: blob.size,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(record);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function removeDownloadedTrack(songId: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(songId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Failed to remove track from IndexedDB:', err);
  }
}

export async function getAllDownloadedTracks(): Promise<Song[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const records: OfflineTrackRecord[] = req.result || [];
        resolve(records.map((r) => r.song));
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function getAllDownloadedTrackIds(): Promise<string[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAllKeys();
      req.onsuccess = () => resolve((req.result as string[]) || []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}
