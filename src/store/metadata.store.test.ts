import { metadataStore } from './metadata.store';
import { tracksStore } from './tracks.store';
import type { Track } from '../types/tracks';

const remoteTrack: Track = { name: 'rg5-06', edges: [[[0, 0, 0], [1, 0, 0]]], path: [] };

function mockFetch(handler: (url: string) => Response | Promise<Response>) {
  vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => handler(String(input))));
}

beforeEach(() => {
  localStorage.clear();
  tracksStore.setState({ tracks: {} });
  metadataStore.setState({ byId: {}, indexStatus: 'idle', indexError: undefined, inflight: {} });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchCatalogIndex', () => {
  it('parses the index into readonly metadata entries', async () => {
    mockFetch(() => new Response('elements/ladder3.json\nRG5/rg5-06.json\n'));
    await metadataStore.getState().fetchCatalogIndex();
    const state = metadataStore.getState();
    expect(state.indexStatus).toBe('loaded');
    expect(state.byId['elements/ladder3']).toEqual({ readonly: true, loadStatus: 'idle' });
    expect(state.byId['RG5/rg5-06']).toEqual({ readonly: true, loadStatus: 'idle' });
  });

  it('records an error when the index fetch fails', async () => {
    mockFetch(() => new Response('nope', { status: 500 }));
    await metadataStore.getState().fetchCatalogIndex();
    const state = metadataStore.getState();
    expect(state.indexStatus).toBe('error');
    expect(state.indexError).toMatch(/500/);
  });

  it('does not refetch once loaded', async () => {
    mockFetch(() => new Response('RG5/rg5-06.json\n'));
    await metadataStore.getState().fetchCatalogIndex();
    await metadataStore.getState().fetchCatalogIndex();
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

describe('ensureTrackLoaded', () => {
  it('fetches, validates, and caches a remote track', async () => {
    mockFetch(() => new Response(JSON.stringify(remoteTrack)));
    const track = await metadataStore.getState().ensureTrackLoaded('RG5/rg5-06');
    expect(track).toEqual(remoteTrack);
    expect(tracksStore.getState().tracks['RG5/rg5-06']).toEqual(remoteTrack);
    expect(metadataStore.getState().byId['RG5/rg5-06']).toEqual({
      readonly: true,
      loadStatus: 'loaded',
    });

    await metadataStore.getState().ensureTrackLoaded('RG5/rg5-06');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('dedupes concurrent requests for the same track', async () => {
    mockFetch(() => new Response(JSON.stringify(remoteTrack)));
    const [a, b] = await Promise.all([
      metadataStore.getState().ensureTrackLoaded('RG5/rg5-06'),
      metadataStore.getState().ensureTrackLoaded('RG5/rg5-06'),
    ]);
    expect(a).toEqual(b);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(metadataStore.getState().inflight).toEqual({});
  });

  it('records load errors in metadata, not the tracks store', async () => {
    mockFetch(() => new Response('gone', { status: 404 }));
    await expect(
      metadataStore.getState().ensureTrackLoaded('RG5/missing'),
    ).rejects.toThrow(/404/);
    expect(metadataStore.getState().byId['RG5/missing']).toEqual({
      readonly: true,
      loadStatus: 'error',
      loadError: expect.stringMatching(/404/) as string,
    });
    expect(tracksStore.getState().tracks['RG5/missing']).toBeUndefined();
  });

  it('rejects schema-invalid track JSON', async () => {
    mockFetch(() => new Response(JSON.stringify({ edges: 'bad', path: [] })));
    await expect(
      metadataStore.getState().ensureTrackLoaded('RG5/bad'),
    ).rejects.toThrow(/Invalid track data/);
  });
});
