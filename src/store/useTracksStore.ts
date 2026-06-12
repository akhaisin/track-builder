import { useStore } from 'zustand';
import { tracksStore } from './tracks.store';
import type { TracksState } from './tracks.store';
import type { Track } from '../types/tracks';

export function useTracksStore<T>(selector: (state: TracksState) => T): T {
  return useStore(tracksStore, selector);
}

export function useTrack(id: string | undefined): Track | undefined {
  return useTracksStore((state) => (id ? state.tracks[id] : undefined));
}
