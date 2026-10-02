'use client';
// components/MusicPlayer.tsx
// Root orchestrator with Android Hardware Back Navigation Stack & 120Hz Hardware-Accelerated Layout
import { useEffect, useState, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchSongs } from '../store/songsSlice';
import { fetchPlaylists, selectPlaylist } from '../store/playlistsSlice';
import {
  setExpandedOpen,
  setQueueOpen,
  setEqualizerOpen,
  setSleepTimerOpen,
} from '../features/player/playerSlice';
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

  // Player modals state
  const {
    isExpandedOpen,
    isQueueOpen,
    isEqualizerOpen,
    isSleepTimerOpen,
  } = useAppSelector((s) => s.player);

  const stateRef = useRef({
    isExpandedOpen,
    isQueueOpen,
    isEqualizerOpen,
    isSleepTimerOpen,
    selectedId,
  });

  useEffect(() => {
    stateRef.current = {
      isExpandedOpen,
      isQueueOpen,
      isEqualizerOpen,
      isSleepTimerOpen,
      selectedId,
    };
  }, [isExpandedOpen, isQueueOpen, isEqualizerOpen, isSleepTimerOpen, selectedId]);

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

  // Android Hardware Back Navigation History Stack
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Push initial baseline history state if not present
    if (!window.history.state || !window.history.state.auraBase) {
      window.history.replaceState({ auraBase: true, level: 0 }, '');
    }

    function handlePopState() {
      const {
        isQueueOpen: queueOpen,
        isEqualizerOpen: eqOpen,
        isSleepTimerOpen: timerOpen,
        isExpandedOpen: expandedOpen,
        selectedId: currentTab,
      } = stateRef.current;

      // 1. If Queue is open -> Close Queue
      if (queueOpen) {
        dispatch(setQueueOpen(false));
        window.history.pushState({ auraBase: true, level: 1 }, '');
        return;
      }

      // 2. If EQ or Sleep Timer open -> Close modal
      if (eqOpen) {
        dispatch(setEqualizerOpen(false));
        window.history.pushState({ auraBase: true, level: 1 }, '');
        return;
      }
      if (timerOpen) {
        dispatch(setSleepTimerOpen(false));
        window.history.pushState({ auraBase: true, level: 1 }, '');
        return;
      }

      // 3. If Expanded Playcard is open -> Minimize to Playcard
      if (expandedOpen) {
        dispatch(setExpandedOpen(false));
        window.history.pushState({ auraBase: true, level: 1 }, '');
        return;
      }

      // 4. If in Search/Discover/Library/Playlist -> Return to Home
      if (currentTab !== null && currentTab !== 'home') {
        dispatch(selectPlaylist(null));
        window.history.pushState({ auraBase: true, level: 0 }, '');
        return;
      }

      // Otherwise on Home with everything closed -> allow default exit
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [dispatch]);

  // Push history entry when opening card or changing views to capture back navigation
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (isQueueOpen || isExpandedOpen || isEqualizerOpen || isSleepTimerOpen || (selectedId !== null && selectedId !== 'home')) {
      window.history.pushState(
        {
          auraBase: true,
          isQueueOpen,
          isExpandedOpen,
          selectedId,
        },
        ''
      );
    }
  }, [isQueueOpen, isExpandedOpen, isEqualizerOpen, isSleepTimerOpen, selectedId]);

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
    <div className="flex flex-col h-screen bg-black text-white overflow-hidden select-none will-change-transform">
      {/* Main Area: Sidebar + Active View */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-hidden flex flex-col will-change-transform">
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
