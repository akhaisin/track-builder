import { useStore } from 'zustand';
import { metadataStore } from './metadata.store';
import type { MetadataState } from './metadata.store';
import type { TrackMetadata } from '../types/metadata';

export function useMetadataStore<T>(selector: (state: MetadataState) => T): T {
  return useStore(metadataStore, selector);
}

export function useTrackMetadata(id: string | undefined): TrackMetadata | undefined {
  return useMetadataStore((state) => (id ? state.byId[id] : undefined));
}
