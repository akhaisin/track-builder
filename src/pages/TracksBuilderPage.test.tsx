import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import TracksBuilderPage from './TracksBuilderPage';
import { tracksStore } from '../store/tracks.store';
import { metadataStore } from '../store/metadata.store';
import ladder3 from '../../public/tracks/elements/ladder3.json';

// Layout pulls in react-resizable-panels; page tests only care about slot
// composition, so mock it per test conventions.
vi.mock('../layout/Layout', () => ({
  default: ({ catalog, debug, children }: Record<string, React.ReactNode>) => (
    <div>
      <div data-testid="catalog-slot">{catalog}</div>
      <div data-testid="center-slot">{children}</div>
      <div data-testid="debug-slot">{debug}</div>
    </div>
  ),
}));

function renderPage(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<TracksBuilderPage />} />
        <Route path="/tracks/*" element={<TracksBuilderPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
  tracksStore.setState({ tracks: {} });
  metadataStore.setState({ byId: {}, indexStatus: 'idle', indexError: undefined, inflight: {} });
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('tracks.txt')) {
        return Promise.resolve(new Response('elements/ladder3.json\n'));
      }
      if (url.endsWith('ladder3.json')) {
        return Promise.resolve(new Response(JSON.stringify(ladder3)));
      }
      return Promise.resolve(new Response('not found', { status: 404 }));
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('TracksBuilderPage', () => {
  it('renders catalog and editor placeholder on the home route', () => {
    renderPage('/');
    expect(screen.getByText('My Tracks')).toBeInTheDocument();
    expect(screen.getByText(/Select a track from the catalog/)).toBeInTheDocument();
  });

  it('lazily loads the track from the URL, including IDs with slashes', async () => {
    renderPage('/tracks/elements/ladder3');
    // Match the seed track's own name so this survives edits to the demo seed.
    expect((await screen.findAllByText(new RegExp(ladder3.name ?? 'ladder3'))).length).toBeGreaterThan(0);
    expect(metadataStore.getState().byId['elements/ladder3']?.loadStatus).toBe('loaded');
    expect(tracksStore.getState().tracks['elements/ladder3']).toBeDefined();
  });

  it('shows the load error for an unknown track', async () => {
    renderPage('/tracks/RG5/missing');
    expect(await screen.findByText(/Failed to load track/)).toBeInTheDocument();
  });
});
