// lib/audius-client.ts
// Client for Audius open decentralized music catalog (full-length 320kbps audio streams)

export interface AudiusTrack {
  id: string;
  title: string;
  user: {
    name: string;
  };
  duration: number;
  artwork: {
    '480x480'?: string;
    '1000x1000'?: string;
  } | null;
  genre: string | null;
}

const AUDIUS_HOST = 'https://discoveryprovider.audius.co';
const APP_NAME = 'AudiophileApp';

export async function searchAudius(query: string, limit = 10): Promise<AudiusTrack[]> {
  try {
    const encoded = encodeURIComponent(query);
    const res = await fetch(
      `${AUDIUS_HOST}/v1/tracks/search?query=${encoded}&limit=${limit}&app_name=${APP_NAME}`,
      {
        headers: {
          'User-Agent': 'AudiophileMusicApp/1.0',
        },
      }
    );

    if (!res.ok) return [];

    const json = (await res.json()) as { data: AudiusTrack[] };
    return json.data ?? [];
  } catch (err) {
    console.error('Audius search error:', err);
    return [];
  }
}

export function getAudiusStreamUrl(trackId: string): string {
  return `${AUDIUS_HOST}/v1/tracks/${trackId}/stream?app_name=${APP_NAME}`;
}
