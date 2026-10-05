// app/api/version/route.ts
// Live App Version API for In-App Live Update Synchronization
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const versionData = {
    version: '1.4.2',
    appId: 'com.auramusic.app',
    appName: 'Aura Music',
    buildTime: new Date().toISOString(),
    fixes: [
      'Permanently suppressed Netlify badge watermark across all views',
      'Fixed Android hardware back button to navigate hierarchically instead of closing app',
      'Fixed background playback controls on Android Notification Panel and Lock Screen',
      'Fixed continuous playlist queue replenishment without repeating 10-song loops',
      'Fixed lyrics auto-scroll jump when expanding player'
    ],
    improvements: [
      '120Hz ultra-fluid refresh rate motion and hardware-accelerated transitions',
      'Modern disconnected-bar Aura logo with radiant soundwave arcs',
      'Clean top header with mood & genre chips (Punjabi, Hindi, Romance, Workout)',
      'Speed Dial 3x3 grid with top Punjabi, Hindi, and Global charts',
      '1-Tap direct like/favorite and hide buttons on floating mini-playcard',
      'Comprehensive Settings panel with 1-tap instant in-app update'
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
