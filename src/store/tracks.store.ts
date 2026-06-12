import { createStore } from 'zustand/vanilla';
import { isTrack, LOCAL_TRACKS_STORAGE_KEY } from '../types/tracks';
import type { Track } from '../types/tracks';

/**
 * Unified track store: holds all tracks with no distinction between local
 * and remote origin (CAT_031). Origin lives in the metadata store.
 */
export interface TracksState {
  tracks: Record<string, Track>;
  setTrack: (id: string, track: Track) => void;
  removeTrack: (id: string) => void;
}

/**
 * Read local tracks from localStorage; any parse or schema error falls back
 * to an empty list. (CAT_024, CAT_025)
 */
export function readLocalTracks(): Record<string, Track> {
  try {
    const raw = localStorage.getItem(LOCAL_TRACKS_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return {};
    }
    const entries = Object.entries(parsed);
    if (!entries.every(([, track]) => isTrack(track))) return {};
    return Object.fromEntries(entries) as Record<string, Track>;
  } catch {
    return {};
  }
}

export function writeLocalTracks(localTracks: Record<string, Track>): void {
  localStorage.setItem(LOCAL_TRACKS_STORAGE_KEY, JSON.stringify(localTracks));
}

export const tracksStore = createStore<TracksState>()((set) => ({
  tracks: readLocalTracks(),

  setTrack: (id, track) =>
    set((state) => ({ tracks: { ...state.tracks, [id]: track } })),

  removeTrack: (id) =>
    set((state) => {
      const tracks = { ...state.tracks };
      delete tracks[id];
      return { tracks };
    }),
}));
