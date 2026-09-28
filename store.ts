// store.ts
import { configureStore } from '@reduxjs/toolkit';
import playerReducer from './features/player/playerSlice';
import songsReducer from './store/songsSlice';
import playlistsReducer from './store/playlistsSlice';

export const store = configureStore({
  reducer: {
    player: playerReducer,
    songs: songsReducer,
    playlists: playlistsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
