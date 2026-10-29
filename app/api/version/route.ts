// app/api/version/route.ts
// Sāṅgīt Live App Version & Feature Changelog API
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const versionData = {
    version: '1.5.0',
    appId: 'com.sangit.app',
    appName: 'Sāṅgīt',
    buildTime: new Date().toISOString(),
    fixes: [
      'Eliminated Spotify repetition trap with anti-fatigue frequency decay',
      'Fixed abrupt acoustic transitions with Camelot wheel key matching',
      'Multi-vector search tolerance for phonetic variations & transliterations',
      'Permanently resolved Netlify watermark interference'
    ],
    improvements: [
      'Complete brand redesign: Sāṅgīt with stylized teal and gold clef emblem',
      'Harmonic Camelot Wheel DJ-grade transitions between queued tracks',
      'Sāṅgīt Neural & Phonetic Omni-Search with natural language intent extraction',
      'Live Taste DNA profile with real-time acoustic multi-vector radar',
      'Interactive Serendipity Steerer slider (Familiar Comfort ↔ Deep Discovery)',
      'Four dynamic smart daily mixes categorized by acoustic mood & tempo'
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
