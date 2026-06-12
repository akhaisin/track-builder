import { createStore } from 'zustand/vanilla';
import type { TrackLoadStatus, TrackMetadata } from '../types/metadata';
import { isTrack, TRACKS_INDEX_URL, trackJsonUrl } from '../types/tracks';
import type { Track } from '../types/tracks';
import { tracksStore } from './tracks.store';

/**
 * Per-track metadata: readonly flag and remote load status. This store is the
 * sole source of truth for whether a track is remote (CAT_032–CAT_034). It
 * also owns the catalog index fetch and lazy remote track loading.
 */
export interface MetadataState {
  byId: Record<string, TrackMetadata>;
  indexStatus: TrackLoadStatus;
  indexError?: string;
  /** In-flight remote loads, keyed by track ID — dedupes concurrent requests. (CAT_027) */
  inflight: Record<string, Promise<Track>>;
  registerLocal: (id: string) => void;
  unregister: (id: string) => void;
  fetchCatalogIndex: () => Promise<void>;
  ensureTrackLoaded: (id: string) => Promise<Track>;
}

/** Tracks present at startup came from localStorage, i.e. they are local. (CAT_033) */
function initialById(): Record<string, TrackMetadata> {
  const byId: Record<string, TrackMetadata> = {};
  for (const id of Object.keys(tracksStore.getState().tracks)) {
    byId[id] = { readonly: false, loadStatus: 'loaded' };
  }
  return byId;
}

export const metadataStore = createStore<MetadataState>()((set, get) => ({
  byId: initialById(),
  indexStatus: 'idle',
  indexError: undefined,
  inflight: {},

  registerLocal: (id) =>
    set((state) => ({
      byId: { ...state.byId, [id]: { readonly: false, loadStatus: 'loaded' } },
    })),

  unregister: (id) =>
    set((state) => {
      const byId = { ...state.byId };
      delete byId[id];
      return { byId };
    }),

  fetchCatalogIndex: async () => {
    const { indexStatus } = get();
    if (indexStatus === 'loading' || indexStatus === 'loaded') return;
    set({ indexStatus: 'loading', indexError: undefined });
    try {
      const response = await fetch(TRACKS_INDEX_URL);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();
      const ids = text
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => line.replace(/\.json$/, ''));
      set((state) => {
        const byId = { ...state.byId };
        for (const id of ids) {
          byId[id] ??= { readonly: true, loadStatus: 'idle' };
        }
        return { byId, indexStatus: 'loaded' };
      });
    } catch (err) {
      set({
        indexStatus: 'error',
        indexError: err instanceof Error ? err.message : String(err),
      });
    }
  },

  ensureTrackLoaded: (id) => {
    const { byId, inflight } = get();
    const cached = tracksStore.getState().tracks[id];
    if (cached && byId[id]?.loadStatus === 'loaded') {
      return Promise.resolve(cached);
    }
    const pending = inflight[id];
    if (pending) return pending;

    const promise = (async () => {
      try {
        const response = await fetch(trackJsonUrl(id));
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data: unknown = await response.json();
        if (!isTrack(data)) throw new Error(`Invalid track data for "${id}"`);
        tracksStore.getState().setTrack(id, data);
        set((state) => {
          const next = { ...state.inflight };
          delete next[id];
          return {
            inflight: next,
            byId: { ...state.byId, [id]: { readonly: true, loadStatus: 'loaded' } },
          };
        });
        return data;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        set((state) => {
          const next = { ...state.inflight };
          delete next[id];
          return {
            inflight: next,
            byId: {
              ...state.byId,
              [id]: { readonly: true, loadStatus: 'error', loadError: message },
            },
          };
        });
        throw err;
      }
    })();

    set((state) => ({
      inflight: { ...state.inflight, [id]: promise },
      byId: { ...state.byId, [id]: { readonly: true, loadStatus: 'loading' } },
    }));
    return promise;
  },
}));
