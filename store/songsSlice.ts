// store/songsSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { Song } from '@/types/music';

// ---------------------------------------------------------------------------
// Async thunks
// ---------------------------------------------------------------------------

export const fetchSongs = createAsyncThunk<Song[]>(
  'songs/fetchAll',
  async (_, { rejectWithValue }) => {
    const userId = process.env.NEXT_PUBLIC_DEMO_USER_ID;
    const url = userId ? `/api/songs?userId=${userId}` : '/api/songs';
    const res = await fetch(url);
    if (!res.ok) return rejectWithValue('Failed to fetch songs');
    return res.json() as Promise<Song[]>;
  }
);

export const toggleLike = createAsyncThunk<
  { id: string; liked: boolean },
  { id: string; currentlyLiked: boolean }
>(
  'songs/toggleLike',
  async ({ id, currentlyLiked }, { rejectWithValue }) => {
    const userId =
      process.env.NEXT_PUBLIC_DEMO_USER_ID ?? '00000000-0000-0000-0000-000000000001';
    const method = currentlyLiked ? 'DELETE' : 'POST';
    const res = await fetch(`/api/songs/${id}/like?userId=${userId}`, { method });
    if (!res.ok) return rejectWithValue('Failed to toggle like');
    return { id, liked: !currentlyLiked };
  }
);

// ---------------------------------------------------------------------------
// Slice
// ---------------------------------------------------------------------------

interface SongsState {
  items: Song[];
  loading: boolean;
  error: string | null;
}

const initialState: SongsState = {
  items: [],
  loading: false,
  error: null,
};

const songsSlice = createSlice({
  name: 'songs',
  initialState,
  reducers: {
    // Optimistic update for like toggle
    setLiked(state, action: PayloadAction<{ id: string; liked: boolean }>) {
      const song = state.items.find((s) => s.id === action.payload.id);
      if (song) song.is_liked = action.payload.liked;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchSongs
      .addCase(fetchSongs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSongs.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchSongs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // toggleLike — reconcile server truth
      .addCase(toggleLike.fulfilled, (state, action) => {
        const song = state.items.find((s) => s.id === action.payload.id);
        if (song) song.is_liked = action.payload.liked;
      })
      .addCase(toggleLike.rejected, (state, action) => {
        // Rollback happens in the component via the rejected action
        console.error('Like toggle failed:', action.payload);
      });
  },
});

export const { setLiked } = songsSlice.actions;
export default songsSlice.reducer;
