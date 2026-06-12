import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import TracksCatalog from './TracksCatalog';
import { metadataStore } from '../../store/metadata.store';
import { tracksStore } from '../../store/tracks.store';
import ladder3 from '../../../public/tracks/elements/ladder3.json';

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

function renderCatalog(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <TracksCatalog />
      <Routes>
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

function mockFetchOk() {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('tracks.txt')) {
        return Promise.resolve(
          new Response('elements/ladder3.json\nRG5/rg5-06.json\nRG5/rg5-07.json\n'),
        );
      }
      if (url.endsWith('ladder3.json')) {
        return Promise.resolve(new Response(JSON.stringify(ladder3)));
      }
      return Promise.resolve(new Response('not found', { status: 404 }));
    }),
  );
}

beforeEach(() => {
  localStorage.clear();
  tracksStore.setState({ tracks: {} });
  metadataStore.setState({ byId: {}, indexStatus: 'idle', indexError: undefined, inflight: {} });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('TracksCatalog', () => {
  it('renders both sections and the remote tree grouped by directory', async () => {
    mockFetchOk();
    renderCatalog();
    expect(screen.getByText('My Tracks')).toBeInTheDocument();
    expect(screen.getByText('Catalog Tracks')).toBeInTheDocument();

    expect(await screen.findByText('RG5')).toBeInTheDocument();
    expect(screen.getByText('elements')).toBeInTheDocument();
    expect(screen.getByText('rg5-06')).toBeInTheDocument();
    expect(screen.getByText('RG5/rg5-07')).toBeInTheDocument();
  });

  it('shows an error message when the catalog index fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('network down'))));
    renderCatalog();
    expect(await screen.findByText(/Failed to load catalog/)).toBeInTheDocument();
    expect(screen.getByText(/network down/)).toBeInTheDocument();
  });

  it('creates a new local track and navigates to it', async () => {
    mockFetchOk();
    const user = userEvent.setup();
    renderCatalog();
    await user.click(screen.getByRole('button', { name: 'New track' }));
    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/tracks/track-001'),
    );
    expect(tracksStore.getState().tracks['track-001'].name).toBe('track-001');
  });

  it('clones a remote track into a new local track', async () => {
    mockFetchOk();
    const user = userEvent.setup();
    renderCatalog();
    await screen.findByText('rg5-06');
    await user.click(screen.getByRole('button', { name: 'Clone elements/ladder3' }));
    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/tracks/track-001'),
    );
    expect(tracksStore.getState().tracks['track-001'].edges).toEqual(ladder3.edges);
  });

  it('selects a track on click', async () => {
    mockFetchOk();
    const user = userEvent.setup();
    renderCatalog();
    await user.click(await screen.findByText('rg5-06'));
    expect(screen.getByTestId('location')).toHaveTextContent('/tracks/RG5/rg5-06');
  });

  it('deletes a local track after confirmation and navigates home if open', async () => {
    mockFetchOk();
    tracksStore.getState().setTrack('track-001', { name: 'track-001', edges: [], path: [] });
    metadataStore.getState().registerLocal('track-001');
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();
    renderCatalog('/tracks/track-001');

    await user.click(screen.getByRole('button', { name: 'Delete track-001' }));
    expect(confirmSpy).toHaveBeenCalled();
    expect(tracksStore.getState().tracks['track-001']).toBeUndefined();
    expect(screen.getByTestId('location')).toHaveTextContent('/');
    confirmSpy.mockRestore();
  });

  it('keeps the track when deletion is not confirmed', async () => {
    mockFetchOk();
    tracksStore.getState().setTrack('track-001', { name: 'track-001', edges: [], path: [] });
    metadataStore.getState().registerLocal('track-001');
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const user = userEvent.setup();
    renderCatalog();

    await user.click(screen.getByRole('button', { name: 'Delete track-001' }));
    expect(tracksStore.getState().tracks['track-001']).toBeDefined();
    confirmSpy.mockRestore();
  });

  it('shows no delete button on remote tracks', async () => {
    mockFetchOk();
    renderCatalog();
    await screen.findByText('rg5-06');
    expect(
      screen.queryByRole('button', { name: 'Delete RG5/rg5-06' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Clone RG5/rg5-06' }),
    ).toBeInTheDocument();
  });
});
