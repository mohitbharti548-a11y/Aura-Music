// app/api/version/route.ts
// Sāṅgīt Live App Version & Feature Changelog API
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const versionData = {
    version: '1.5.1',
    appId: 'com.sangit.app',
    appName: 'Sāṅgīt',
    buildTime: new Date().toISOString(),
    fixes: [
      'Outside app icon updated across Android mipmaps (square & round), PWA, and browser tabs',
      'Netlify drawer and feedback badge permanently blocked via DOM and CustomElement interception',
      'Bottom navigation and mini-player elevated higher to prevent phone gesture bar interference',
      'Mini-player hide button removed to eliminate accidental mis-taps while skipping'
    ],
    improvements: [
      'Reverse-engineered Spotify Premium layout: time-of-day greeting, 6-pack quick access grid, curated shelves',
      'BaRT dynamic recommendation engine balancing familiar favorites and serendipitous discovery',
      'Spotify-style micro-progress indicator on compact player',
      'Silky spring animations with cubic-bezier easing across all shelves and hover states'
    ]
  };

  return NextResponse.json(versionData, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
}
