// app/api/version/route.ts
// Live App Version API for In-App Live Update Synchronization
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const versionData = {
    version: '1.2.0',
    appId: 'com.auramusic.app',
    appName: 'Aura Music',
    buildTime: new Date().toISOString(),
    features: [
      'Last played song & position resume on launch',
      'Autonomous device & habit-based taste profiling',
      'Disconnected-bar floating "A" logo & harmonic song themes',
      'Sliding recommendations & instant in-app update sync'
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
