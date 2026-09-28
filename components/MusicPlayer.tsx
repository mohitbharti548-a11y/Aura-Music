'use client';
// components/MusicPlayer.tsx
// Root orchestrator — wires Sidebar, HomeView, SearchView, DiscoverBrowse, SongList, and PlayerBar.
import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchSongs } from '../store/songsSlice';
import { fetchPlaylists, selectPlaylist } from '../store/playlistsSlice';
import { getAllDownloadedTracks } from '../lib/offline-storage';
import Sidebar from './Sidebar';
import HomeView from './HomeView';
import SearchView from './SearchView';
import DiscoverBrowse from './DiscoverBrowse';
import SongList from './SongList';
import PlayerBar from './PlayerBar';
import type { Song } from '../types/music';

export default function MusicPlayer() {
  const dispatch = useAppDispatch();
  const [downloadedSongs, setDownloadedSongs] = useState<Song[]>([]);

  // Songs state
  const { items: allSongs, loading: songsLoading } = useAppSelector((s) => s.songs);

  // Playlists state
  const {
    selectedId,
    currentSongs,
    songsLoading: playlistSongsLoading,
    items: playlists,
  } = useAppSelector((s) => s.playlists);

  // Bootstrap: load songs + playlists on mount
  useEffect(() => {
    dispatch(fetchSongs());
    dispatch(fetchPlaylists());
  }, [dispatch]);

  // If viewing downloaded tab, refresh offline songs
  useEffect(() => {
    if (selectedId === 'downloaded') {
      getAllDownloadedTracks().then((tracks) => {
        setDownloadedSongs(tracks);
      });
    }
  }, [selectedId]);

  // Global Ctrl+K / Cmd+K listener to switch to Search tab
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        dispatch(selectPlaylist('search'));
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatch]);

  // View Routing
  const isHome = selectedId === null || selectedId === 'home';
  const isSearch = selectedId === 'search';
  const isDiscover = selectedId === 'discover';
  const isFavorites = selectedId === 'liked';
  const isDownloaded = selectedId === 'downloaded';

  const displaySongs = isHome
    ? allSongs
    : isDownloaded
    ? downloadedSongs
    : currentSongs;

  const displayLoading = isHome ? songsLoading : isDownloaded ? false : playlistSongsLoading;

  const displayTitle = isFavorites
    ? 'Favorites'
    : isDownloaded
    ? 'Downloaded Songs'
    : (playlists.find((p) => p.id === selectedId)?.name ?? 'Playlist');

  const queue = displaySongs.length > 0 ? displaySongs : allSongs;

  return (
    <div className="flex flex-col h-screen bg-black text-white overflow-hidden select-none">
      {/* Main Area: Sidebar + Active View */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-hidden flex flex-col">
          {isHome ? (
            <HomeView allSongs={allSongs} />
          ) : isSearch ? (
            <SearchView />
          ) : isDiscover ? (
            <DiscoverBrowse />
          ) : (
            <SongList
              songs={displaySongs}
              loading={displayLoading}
              title={displayTitle}
              queue={queue}
            />
          )}
        </main>
      </div>

      {/* Sticky Bottom Player Bar */}
      <PlayerBar queue={queue} />
    </div>
  );
}
