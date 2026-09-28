'use client';

import dynamic from 'next/dynamic';
import StoreProvider from '../components/StoreProvider';

const MusicPlayer = dynamic(() => import('../components/MusicPlayer'), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-screen items-center justify-center bg-black text-white">
      <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
    </div>
  ),
});

export default function Home() {
  return (
    <StoreProvider>
      <MusicPlayer />
    </StoreProvider>
  );
}
