'use client';
// components/Sidebar.tsx
// Desktop Sidebar + Mobile/Compact Floating Bottom Navigation.
import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  selectPlaylist,
  fetchPlaylistSongs,
  fetchLikedSongs,
  createPlaylist,
  deletePlaylist,
} from '../store/playlistsSlice';

export default function Sidebar() {
  const dispatch = useAppDispatch();
  const { items: playlists, selectedId } = useAppSelector((s) => s.playlists);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function handleSelectHome() {
    dispatch(selectPlaylist(null));
  }

  function handleSelectSearch() {
    dispatch(selectPlaylist('search'));
  }

  function handleSelectDiscover() {
    dispatch(selectPlaylist('discover'));
  }

  function handleSelectFavorites() {
    dispatch(selectPlaylist('liked'));
    dispatch(fetchLikedSongs());
  }

  function handleSelectDownloaded() {
    dispatch(selectPlaylist('downloaded'));
  }

  function handleSelectPlaylist(id: string) {
    dispatch(selectPlaylist(id));
    dispatch(fetchPlaylistSongs(id));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    await dispatch(createPlaylist({ name: newName.trim() }));
    setNewName('');
    setCreating(false);
  }

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (deletingId === id) {
      await dispatch(deletePlaylist(id));
      setDeletingId(null);
    } else {
      setDeletingId(id);
      setTimeout(() => setDeletingId((curr) => (curr === id ? null : curr)), 3000);
    }
  }

  const isHome = selectedId === null || selectedId === 'home';
  const isSearch = selectedId === 'search';
  const isDiscover = selectedId === 'discover';
  const isFavorites = selectedId === 'liked';
  const isDownloaded = selectedId === 'downloaded';

  return (
    <>
      {/* SVG Gradient Definitions for Aesthetic Outlines */}
      <svg width="0" height="0" className="hidden" aria-hidden="true">
        <defs>
          <linearGradient id="sidebar-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="50%" stopColor="#e879f9" />
            <stop offset="100%" stopColor="#818cf8" />
          </linearGradient>
          <linearGradient id="sidebar-heart-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f43f5e" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
        </defs>
      </svg>

      {/* 1. DESKTOP & TABLET SIDEBAR (>=768px) */}
      <aside className="hidden md:flex flex-col justify-between w-56 lg:w-60 bg-[#09090c]/90 border-r border-white/[0.06] shrink-0 select-none z-20">
        <div className="flex flex-col">
          {/* Brand Header */}
          <div className="px-6 py-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-400 via-violet-500 to-fuchsia-500 p-[1.5px] shadow-lg shadow-violet-500/20 flex items-center justify-center">
                <div className="w-full h-full bg-[#0c0a1a] rounded-[10px] flex items-center justify-center">
                  <img src={`/logo.svg?v=${Date.now()}`} alt="Aura Logo" className="w-5 h-5 object-contain" />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold tracking-tight bg-gradient-to-r from-sky-200 via-violet-200 to-pink-200 bg-clip-text text-transparent">Aura</span>
                <span className="text-[9px] tracking-wider uppercase text-zinc-500 font-semibold">Studio Sound</span>
              </div>
            </div>
          </div>

          {/* Primary Navigation */}
          <div className="px-3 space-y-1">
            {/* 1. HOME */}
            <button
              onClick={handleSelectHome}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 depth-button group ${
                isHome
                  ? 'bg-white/10 text-white shadow-inner font-semibold'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <svg
                className="w-4.5 h-4.5 shrink-0 transition-transform duration-200 group-hover:scale-110"
                viewBox="0 0 24 24"
                fill="none"
                stroke={isHome ? 'url(#sidebar-gradient)' : 'currentColor'}
                strokeWidth={isHome ? '2.2' : '1.8'}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className={isHome ? 'bg-gradient-to-r from-violet-300 via-fuchsia-300 to-indigo-300 bg-clip-text text-transparent font-bold' : ''}>
                Home
              </span>
            </button>

            {/* 2. SEARCH */}
            <button
              onClick={handleSelectSearch}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 depth-button group ${
                isSearch
                  ? 'bg-white/10 text-white shadow-inner font-semibold'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <svg
                className="w-4.5 h-4.5 shrink-0 transition-transform duration-200 group-hover:scale-110"
                viewBox="0 0 24 24"
                fill="none"
                stroke={isSearch ? 'url(#sidebar-gradient)' : 'currentColor'}
                strokeWidth={isSearch ? '2.2' : '1.8'}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <span className={isSearch ? 'bg-gradient-to-r from-violet-300 via-fuchsia-300 to-indigo-300 bg-clip-text text-transparent font-bold' : ''}>
                Search
              </span>
            </button>

            {/* 3. DISCOVER */}
            <button
              onClick={handleSelectDiscover}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 depth-button group ${
                isDiscover
                  ? 'bg-white/10 text-white shadow-inner font-semibold'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <svg
                className="w-4.5 h-4.5 shrink-0 transition-transform duration-200 group-hover:scale-110"
                viewBox="0 0 24 24"
                fill="none"
                stroke={isDiscover ? 'url(#sidebar-gradient)' : 'currentColor'}
                strokeWidth={isDiscover ? '2.2' : '1.8'}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              <span className={isDiscover ? 'bg-gradient-to-r from-violet-300 via-fuchsia-300 to-indigo-300 bg-clip-text text-transparent font-bold' : ''}>
                Discover
              </span>
            </button>

            {/* 4. FAVORITES */}
            <button
              onClick={handleSelectFavorites}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 depth-button group ${
                isFavorites
                  ? 'bg-white/10 text-white shadow-inner font-semibold'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <svg
                className="w-4.5 h-4.5 shrink-0 transition-transform duration-200 group-hover:scale-110"
                viewBox="0 0 24 24"
                fill={isFavorites ? 'url(#sidebar-heart-gradient)' : 'none'}
                stroke={isFavorites ? 'url(#sidebar-heart-gradient)' : 'currentColor'}
                strokeWidth={isFavorites ? '2.2' : '1.8'}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span className={isFavorites ? 'bg-gradient-to-r from-rose-400 to-pink-400 bg-clip-text text-transparent font-bold' : ''}>
                Favorites
              </span>
            </button>

            {/* 5. DOWNLOADED / OFFLINE */}
            <button
              onClick={handleSelectDownloaded}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 depth-button group ${
                isDownloaded
                  ? 'bg-white/10 text-white shadow-inner font-semibold'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <svg
                className="w-4.5 h-4.5 shrink-0 transition-transform duration-200 group-hover:scale-110"
                viewBox="0 0 24 24"
                fill="none"
                stroke={isDownloaded ? 'url(#sidebar-gradient)' : 'currentColor'}
                strokeWidth={isDownloaded ? '2.2' : '1.8'}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span className={isDownloaded ? 'bg-gradient-to-r from-violet-300 via-fuchsia-300 to-indigo-300 bg-clip-text text-transparent font-bold' : ''}>
                Downloaded
              </span>
            </button>
          </div>

          {/* Playlists Section */}
          <div className="px-5 pt-8 pb-2 flex items-center justify-between">
            <span className="text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">
              Playlists
            </span>
            <button
              onClick={() => setCreating(!creating)}
              className="w-5 h-5 rounded-md text-zinc-400 hover:text-white hover:bg-white/10 flex items-center justify-center text-xs transition-colors"
              title="Create Playlist"
              aria-label="Create Playlist"
            >
              +
            </button>
          </div>

          {/* Inline Create Input */}
          {creating && (
            <div className="px-3 pb-2">
              <form onSubmit={handleCreate} className="p-2 rounded-xl bg-zinc-900 border border-white/10 shadow-lg">
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Playlist name..."
                  className="w-full bg-black/50 text-white text-xs px-2.5 py-1.5 rounded-lg border border-white/10 focus:outline-none focus:border-violet-500"
                />
                <div className="flex gap-1.5 mt-2">
                  <button
                    type="submit"
                    disabled={!newName.trim()}
                    className="flex-1 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-[11px] font-medium rounded-md py-1 transition-all"
                  >
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreating(false)}
                    className="flex-1 bg-white/5 hover:bg-white/10 text-zinc-400 text-[11px] rounded-md py-1"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Self-Created Playlists List */}
          <div className="px-3 space-y-0.5 max-h-[40vh] overflow-y-auto">
            {playlists.length === 0 ? (
              <p className="text-[11px] text-zinc-600 px-3.5 py-2">No playlists yet</p>
            ) : (
              playlists.map((pl) => {
                const isSelected = selectedId === pl.id;
                const isDeleting = deletingId === pl.id;

                return (
                  <div
                    key={pl.id}
                    onClick={() => handleSelectPlaylist(pl.id)}
                    className={`group w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs cursor-pointer transition-all duration-200 depth-button ${
                      isSelected
                        ? 'bg-white/10 text-white font-medium shadow-inner'
                        : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    <span className="truncate pr-2">{pl.name}</span>

                    <button
                      onClick={(e) => handleDelete(e, pl.id)}
                      title={isDeleting ? 'Click to delete' : 'Delete'}
                      className={`opacity-0 group-hover:opacity-100 px-1 py-0.5 rounded text-[10px] transition-all shrink-0 ${
                        isDeleting
                          ? 'opacity-100 bg-rose-500/20 text-rose-300'
                          : 'text-zinc-500 hover:text-rose-400'
                      }`}
                      aria-label="Delete playlist"
                    >
                      {isDeleting ? 'Delete?' : '×'}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Subtle Footer with Lossless Badge & In-App Update Trigger */}
        <div className="p-4 border-t border-white/[0.04] space-y-2">
          <div className="flex items-center justify-between px-1 text-zinc-500 text-[11px]">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
              <span className="font-normal text-zinc-400">Lossless Studio</span>
            </div>
            <span className="text-[10px] text-zinc-600 font-mono">v1.2.0</span>
          </div>

          <button
            onClick={() => window.dispatchEvent(new CustomEvent('aura-check-update'))}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] text-zinc-400 hover:text-white text-[10px] font-medium transition-all active:scale-95 border border-white/[0.05]"
            title="Check for newest features and live patches"
          >
            <span className="text-violet-400">✦</span>
            <span>Check for Updates</span>
          </button>
        </div>
      </aside>
    </>
  );
}
