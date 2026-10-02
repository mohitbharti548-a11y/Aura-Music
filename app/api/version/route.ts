// app/api/version/route.ts
// Live App Version API for In-App Live Update Synchronization
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const versionData = {
    version: '1.3.0',
    appId: 'com.auramusic.app',
    appName: 'Aura Music',
    buildTime: new Date().toISOString(),
    fixes: [
      'Removed Netlify logo watermark completely across all views',
      'Fixed infinite 10-song playlist loop with continuous queue generation',
      'Direct like/favorite & hide buttons on minimized playcard',
      'Fixed lyrics auto-scroll jump when expanding player'
    ],
    improvements: [
      'Clean top header with mood & genre filter chips (Punjabi, Hindi, Romance, Workout)',
      'Full Android Lock Screen & Notification Panel media controls',
      'Speed Dial 3x3 grid with top Punjabi, Hindi, and Global charts',
      'Dedicated Settings panel with 1-tap direct app updates'
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
