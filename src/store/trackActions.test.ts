import { cloneTrack, createLocalTrack, deleteLocalTrack, nextTrackName, updateTrack } from './trackActions';
import { metadataStore } from './metadata.store';
import { tracksStore } from './tracks.store';
import { LOCAL_TRACKS_STORAGE_KEY } from '../types/tracks';
import type { Track } from '../types/tracks';
import ladder3 from '../../public/tracks/elements/ladder3.json';

function storedTracks(): Record<string, Track> {
  return JSON.parse(localStorage.getItem(LOCAL_TRACKS_STORAGE_KEY) ?? '{}') as Record<string, Track>;
}

beforeEach(() => {
  localStorage.clear();
  tracksStore.setState({ tracks: {} });
  metadataStore.setState({ byId: {}, indexStatus: 'idle', indexError: undefined, inflight: {} });
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(new Response(JSON.stringify(ladder3)))),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createLocalTrack', () => {
  it('clones the seed track with an auto-generated name and persists it', async () => {
    const id = await createLocalTrack();
    expect(id).toBe('track-001');
    const track = tracksStore.getState().tracks[id];
    expect(track.name).toBe('track-001');
    expect(track.edges).toEqual(ladder3.edges);
    expect(metadataStore.getState().byId[id]).toEqual({
      readonly: false,
      loadStatus: 'loaded',
    });
    expect(storedTracks()[id].name).toBe('track-001');
  });

  it('increments the name suffix across creations', async () => {
    await createLocalTrack();
    const second = await createLocalTrack();
    expect(second).toBe('track-002');
  });
});

describe('cloneTrack', () => {
  it('clones a local track without refetching', async () => {
    const id = await createLocalTrack();
    vi.mocked(fetch).mockClear();
    const cloneId = await cloneTrack(id);
    expect(cloneId).toBe('track-002');
    expect(fetch).not.toHaveBeenCalled();
    expect(tracksStore.getState().tracks[cloneId].edges).toEqual(ladder3.edges);
  });
});

describe('deleteLocalTrack', () => {
  it('removes the track from both stores and localStorage', async () => {
    const id = await createLocalTrack();
    deleteLocalTrack(id);
    expect(tracksStore.getState().tracks[id]).toBeUndefined();
    expect(metadataStore.getState().byId[id]).toBeUndefined();
    expect(storedTracks()).toEqual({});
  });
});

describe('updateTrack', () => {
  it('persists edits to local tracks', async () => {
    const id = await createLocalTrack();
    const edited: Track = { ...tracksStore.getState().tracks[id], description: 'edited' };
    updateTrack(id, edited);
    expect(storedTracks()[id].description).toBe('edited');
  });

  it('does not persist remote tracks to localStorage', async () => {
    await metadataStore.getState().ensureTrackLoaded('elements/ladder3');
    const remote = tracksStore.getState().tracks['elements/ladder3'];
    updateTrack('elements/ladder3', { ...remote, description: 'tweaked' });
    expect(storedTracks()).toEqual({});
  });
});

describe('nextTrackName', () => {
  it('continues from the highest existing suffix', async () => {
    tracksStore.getState().setTrack('track-007', { edges: [], path: [] });
    metadataStore.getState().registerLocal('track-007');
    expect(nextTrackName()).toBe('track-008');
  });
});
