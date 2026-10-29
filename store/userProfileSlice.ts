// store/userProfileSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { Song } from '@/types/music';

export interface UserProfile {
  userId: string;
  likedGenres: string[];
  topArtists: string[];
  recentSongs: Song[];
}

export const fetchUserProfile = createAsyncThunk<UserProfile>(
  'userProfile/fetch',
  async (_, { rejectWithValue }) => {
    const userId = process.env.NEXT_PUBLIC_DEMO_USER_ID;
    if (!userId) return rejectWithValue('No user ID');
    const res = await fetch(`/api/userProfile?userId=${userId}`);
    if (!res.ok) return rejectWithValue('Failed to fetch profile');
    return (await res.json()) as UserProfile;
  },
);

interface UserProfileState {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
}

const initialState: UserProfileState = {
  profile: null,
  loading: false,
  error: null,
};

const userProfileSlice = createSlice({
  name: 'userProfile',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = action.payload;
      })
      .addCase(fetchUserProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export default userProfileSlice.reducer;
