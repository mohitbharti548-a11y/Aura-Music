'use client';
// components/AddToPlaylistModal.tsx
// Seamless modal to add a song to existing playlists or create a new playlist on the fly.
import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { createPlaylist, addSongToPlaylist } from '../store/playlistsSlice';
import type { Song } from '../types/music';

interface Props {
  song: Song | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function AddToPlaylistModal({ song, isOpen, onClose }: Props) {
  const dispatch = useAppDispatch();
  const { items: playlists } = useAppSelector((s) => s.playlists);

  const [isCreating, setIsCreating] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [addedPlaylists, setAddedPlaylists] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState<string | null>(null);

  if (!isOpen || !song) return null;

  async function handleAddToExisting(playlistId: string) {
    if (!song) return;
    setLoading(playlistId);
    try {
      await dispatch(addSongToPlaylist({ playlistId, songId: song.id })).unwrap();
      setAddedPlaylists((prev) => ({ ...prev, [playlistId]: true }));
      setTimeout(() => {
        onClose();
      }, 600);
    } catch (err) {
      console.error('Failed to add to playlist:', err);
    } finally {
      setLoading(null);
    }
  }

  async function handleCreateAndAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!song || !newPlaylistName.trim()) return;
    setLoading('create');
    try {
      const created = await dispatch(
        createPlaylist({ name: newPlaylistName.trim(), description: 'Created with Aura Sound' })
      ).unwrap();

      await dispatch(addSongToPlaylist({ playlistId: created.id, songId: song.id })).unwrap();
      setAddedPlaylists((prev) => ({ ...prev, [created.id]: true }));
      setNewPlaylistName('');
      setIsCreating(false);
      setTimeout(() => {
        onClose();
      }, 600);
    } catch (err) {
      console.error('Failed to create and add to playlist:', err);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200 select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#0f0f14]/95 border border-white/10 rounded-3xl p-6 shadow-2xl shadow-black/80 flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Add to Playlist</h3>
            <p className="text-xs text-zinc-400 truncate max-w-[260px] mt-0.5">
              {song.title} • {song.artist}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center text-xs transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Create New Playlist Action */}
        <div className="py-4">
          {!isCreating ? (
            <button
              onClick={() => setIsCreating(true)}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 hover:from-violet-600/30 hover:to-fuchsia-600/30 border border-violet-500/30 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all depth-button"
            >
              <span className="text-base font-bold text-violet-400">+</span>
              <span>New Playlist</span>
            </button>
          ) : (
            <form onSubmit={handleCreateAndAdd} className="p-3 rounded-2xl bg-black/40 border border-white/10 space-y-3">
              <input
                autoFocus
                type="text"
                placeholder="Playlist name..."
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                className="w-full bg-white/[0.06] text-white text-xs px-3 py-2.5 rounded-xl border border-white/10 focus:outline-none focus:border-violet-500"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={!newPlaylistName.trim() || loading === 'create'}
                  className="flex-1 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-xs font-medium transition-all"
                >
                  {loading === 'create' ? 'Creating...' : 'Create & Add'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 text-xs transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Existing Playlists List */}
        <div className="flex-1 overflow-y-auto space-y-1.5 max-h-60 pr-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 px-2 pb-1">
            Your Playlists
          </p>
          {playlists.length === 0 ? (
            <p className="text-xs text-zinc-500 py-6 text-center">No playlists created yet.</p>
          ) : (
            playlists.map((pl) => {
              const isAdded = addedPlaylists[pl.id];
              const isLoading = loading === pl.id;

              return (
                <div
                  key={pl.id}
                  onClick={() => !isAdded && !isLoading && handleAddToExisting(pl.id)}
                  className={`group flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all duration-150 depth-card ${
                    isAdded
                      ? 'bg-emerald-500/15 border border-emerald-500/30'
                      : 'bg-white/[0.03] hover:bg-white/[0.08] border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600/30 to-purple-800/30 border border-white/10 flex items-center justify-center shrink-0 text-xs">
                      ♫
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{pl.name}</p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        {pl.song_count ?? 0} {pl.song_count === 1 ? 'song' : 'songs'}
                      </p>
                    </div>
                  </div>

                  <div>
                    {isAdded ? (
                      <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                        ✓ Added
                      </span>
                    ) : isLoading ? (
                      <span className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin inline-block" />
                    ) : (
                      <span className="text-xs text-zinc-400 group-hover:text-white font-medium">
                        + Add
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
