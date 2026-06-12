import { LOCAL_TRACKS_STORAGE_KEY } from '../types/tracks';
import type { Track } from '../types/tracks';

const minimalTrack: Track = { name: 'a', edges: [[[0, 0, 0], [0, 1, 0]]], path: [] };

async function freshStore() {
  vi.resetModules();
  return import('./tracks.store');
}

beforeEach(() => {
  localStorage.clear();
});

describe('tracks store initialization', () => {
  it('loads valid local tracks from localStorage', async () => {
    localStorage.setItem(
      LOCAL_TRACKS_STORAGE_KEY,
      JSON.stringify({ 'track-001': minimalTrack }),
    );
    const { tracksStore } = await freshStore();
    expect(tracksStore.getState().tracks['track-001']).toEqual(minimalTrack);
  });

  it('falls back to empty on corrupt JSON', async () => {
    localStorage.setItem(LOCAL_TRACKS_STORAGE_KEY, '{not json');
    const { tracksStore } = await freshStore();
    expect(tracksStore.getState().tracks).toEqual({});
  });

  it('falls back to empty on schema-invalid data', async () => {
    localStorage.setItem(
      LOCAL_TRACKS_STORAGE_KEY,
      JSON.stringify({ 'track-001': { edges: 'nope', path: [] } }),
    );
    const { tracksStore } = await freshStore();
    expect(tracksStore.getState().tracks).toEqual({});
  });
});

describe('tracks store CRUD', () => {
  it('sets and removes tracks', async () => {
    const { tracksStore } = await freshStore();
    tracksStore.getState().setTrack('t1', minimalTrack);
    expect(tracksStore.getState().tracks.t1).toEqual(minimalTrack);
    tracksStore.getState().removeTrack('t1');
    expect(tracksStore.getState().tracks.t1).toBeUndefined();
  });
});
