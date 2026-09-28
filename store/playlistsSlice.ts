// store/playlistsSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { Playlist, Song } from '@/types/music';

// ---------------------------------------------------------------------------
// Async thunks
// ---------------------------------------------------------------------------

export const fetchPlaylists = createAsyncThunk<Playlist[]>(
  'playlists/fetchAll',
  async (_, { rejectWithValue }) => {
    const userId = process.env.NEXT_PUBLIC_DEMO_USER_ID;
    const url = userId ? `/api/playlists?userId=${userId}` : '/api/playlists';
    const res = await fetch(url);
    if (!res.ok) return rejectWithValue('Failed to fetch playlists');
    return res.json() as Promise<Playlist[]>;
  }
);

export const fetchPlaylistSongs = createAsyncThunk<Song[], string>(
  'playlists/fetchSongs',
  async (playlistId, { rejectWithValue }) => {
    const userId = process.env.NEXT_PUBLIC_DEMO_USER_ID;
    const url = userId
      ? `/api/playlists/${playlistId}/songs?userId=${userId}`
      : `/api/playlists/${playlistId}/songs`;
    const res = await fetch(url);
    if (!res.ok) return rejectWithValue('Failed to fetch playlist songs');
    return res.json() as Promise<Song[]>;
  }
);

export const createPlaylist = createAsyncThunk<Playlist, { name: string; description?: string }>(
  'playlists/create',
  async (payload, { rejectWithValue }) => {
    const res = await fetch('/api/playlists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        userId: process.env.NEXT_PUBLIC_DEMO_USER_ID,
      }),
    });
    if (!res.ok) return rejectWithValue('Failed to create playlist');
    return res.json() as Promise<Playlist>;
  }
);

export const deletePlaylist = createAsyncThunk<string, string>(
  'playlists/delete',
  async (playlistId, { rejectWithValue }) => {
    const userId = process.env.NEXT_PUBLIC_DEMO_USER_ID;
    const url = userId ? `/api/playlists/${playlistId}?userId=${userId}` : `/api/playlists/${playlistId}`;
    const res = await fetch(url, { method: 'DELETE' });
    if (!res.ok) return rejectWithValue('Failed to delete playlist');
    return playlistId;
  }
);

export const addSongToPlaylist = createAsyncThunk<
  { playlistId: string; songId: string },
  { playlistId: string; songId: string }
>(
  'playlists/addSong',
  async ({ playlistId, songId }, { rejectWithValue }) => {
    const res = await fetch(`/api/playlists/${playlistId}/songs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ songId }),
    });
    if (!res.ok) return rejectWithValue('Failed to add song to playlist');
    return { playlistId, songId };
  }
);

export const removeSongFromPlaylist = createAsyncThunk<
  { playlistId: string; songId: string },
  { playlistId: string; songId: string }
>(
  'playlists/removeSong',
  async ({ playlistId, songId }, { rejectWithValue }) => {
    const res = await fetch(`/api/playlists/${playlistId}/songs?songId=${songId}`, {
      method: 'DELETE',
    });
    if (!res.ok) return rejectWithValue('Failed to remove song from playlist');
    return { playlistId, songId };
  }
);

export const fetchLikedSongs = createAsyncThunk<Song[]>(
  'playlists/fetchLiked',
  async (_, { rejectWithValue }) => {
    const userId = process.env.NEXT_PUBLIC_DEMO_USER_ID;
    const url = userId ? `/api/songs?userId=${userId}` : '/api/songs';
    const res = await fetch(url);
    if (!res.ok) return rejectWithValue('Failed to fetch songs');
    const songs: Song[] = await res.json();
    return songs.filter((s) => s.is_liked);
  }
);

// ---------------------------------------------------------------------------
// Slice
// ---------------------------------------------------------------------------

interface PlaylistsState {
  items: Playlist[];
  currentSongs: Song[];          // songs in the selected playlist / liked view
  selectedId: string | null;     // playlist id, or 'liked' for Liked Songs view
  loading: boolean;
  songsLoading: boolean;
  error: string | null;
}

const initialState: PlaylistsState = {
  items: [],
  currentSongs: [],
  selectedId: null,
  loading: false,
  songsLoading: false,
  error: null,
};

const playlistsSlice = createSlice({
  name: 'playlists',
  initialState,
  reducers: {
    selectPlaylist(state, action: { payload: string | null }) {
      state.selectedId = action.payload;
      state.currentSongs = [];
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchPlaylists
      .addCase(fetchPlaylists.pending, (state) => { state.loading = true; })
      .addCase(fetchPlaylists.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchPlaylists.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // fetchPlaylistSongs
      .addCase(fetchPlaylistSongs.pending, (state) => { state.songsLoading = true; })
      .addCase(fetchPlaylistSongs.fulfilled, (state, action) => {
        state.songsLoading = false;
        state.currentSongs = action.payload;
      })
      .addCase(fetchPlaylistSongs.rejected, (state) => { state.songsLoading = false; })
      // fetchLikedSongs
      .addCase(fetchLikedSongs.pending, (state) => { state.songsLoading = true; })
      .addCase(fetchLikedSongs.fulfilled, (state, action) => {
        state.songsLoading = false;
        state.currentSongs = action.payload;
      })
      .addCase(fetchLikedSongs.rejected, (state) => { state.songsLoading = false; })
      // createPlaylist
      .addCase(createPlaylist.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      })
      // deletePlaylist
      .addCase(deletePlaylist.fulfilled, (state, action) => {
        state.items = state.items.filter((p) => p.id !== action.payload);
        if (state.selectedId === action.payload) {
          state.selectedId = null;
          state.currentSongs = [];
        }
      })
      // addSongToPlaylist
      .addCase(addSongToPlaylist.fulfilled, (state, action) => {
        const pl = state.items.find((p) => p.id === action.payload.playlistId);
        if (pl) pl.song_count = (pl.song_count ?? 0) + 1;
      })
      // removeSongFromPlaylist
      .addCase(removeSongFromPlaylist.fulfilled, (state, action) => {
        state.currentSongs = state.currentSongs.filter((s) => s.id !== action.payload.songId);
        const pl = state.items.find((p) => p.id === action.payload.playlistId);
        if (pl && (pl.song_count ?? 0) > 0) {
          pl.song_count = (pl.song_count ?? 1) - 1;
        }
      });
  },
});

export const { selectPlaylist } = playlistsSlice.actions;
export default playlistsSlice.reducer;
