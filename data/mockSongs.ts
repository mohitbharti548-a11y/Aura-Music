// data/mockSongs.ts
export type Song = {
  id: string;
  title: string;
  artist: string;
  audioUrl: string;
  coverUrl: string;
};

export const mockSongs: Song[] = [
  {
    id: '1',
    title: 'Dreamscape',
    artist: 'Aurora Beats',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    coverUrl: '/covers/cover1.jpg',
  },
  {
    id: '2',
    title: 'Midnight Groove',
    artist: 'Luna Vibes',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    coverUrl: '/covers/cover2.jpg',
  },
  {
    id: '3',
    title: 'Solar Flare',
    artist: 'Nova Pulse',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    coverUrl: '/covers/cover3.jpg',
  },
];
