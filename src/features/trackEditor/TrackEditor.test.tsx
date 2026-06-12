import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import TrackEditor from './TrackEditor';
import { tracksStore } from '../../store/tracks.store';
import { metadataStore } from '../../store/metadata.store';
import type { Track } from '../../types/tracks';

function SearchProbe() {
  const location = useLocation();
  return <div data-testid="search">{location.search}</div>;
}

function renderEditor(trackId?: string, initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <TrackEditor trackId={trackId} />
      <SearchProbe />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
  tracksStore.setState({ tracks: {} });
  metadataStore.setState({ byId: {}, indexStatus: 'idle', indexError: undefined, inflight: {} });
});

function seedLocalTrack(id = 'track-001') {
  tracksStore.getState().setTrack(id, {
    name: id,
    edges: [[[0, 0, 0], [0, 1, 0]]],
    path: [],
  });
  metadataStore.getState().registerLocal(id);
}

describe('TrackEditor states', () => {
  it('shows a placeholder when no track is selected', () => {
    renderEditor();
    expect(screen.getByText(/Select a track from the catalog/)).toBeInTheDocument();
    expect(screen.getByText('No track selected')).toBeInTheDocument();
  });

  it('shows a loading state while the track is not in the store yet', () => {
    metadataStore.setState({
      byId: { 'RG5/rg5-06': { readonly: true, loadStatus: 'loading' } },
    });
    renderEditor('RG5/rg5-06');
    expect(screen.getByText(/Loading track/)).toBeInTheDocument();
  });

  it('shows a load error from the metadata store', () => {
    metadataStore.setState({
      byId: {
        'RG5/missing': { readonly: true, loadStatus: 'error', loadError: 'HTTP 404' },
      },
    });
    renderEditor('RG5/missing');
    expect(screen.getByText(/Failed to load track/)).toBeInTheDocument();
    expect(screen.getByText(/HTTP 404/)).toBeInTheDocument();
  });
});

describe('export & sharing', () => {
  it('shows no export group without a selected track', () => {
    renderEditor();
    expect(
      screen.queryByRole('group', { name: 'Export and sharing' }),
    ).not.toBeInTheDocument();
  });

  it('copies the shareable URL and shows feedback', async () => {
    // userEvent.setup() installs a working clipboard stub.
    const user = userEvent.setup();
    seedLocalTrack();
    renderEditor('track-001', '/?mode=json');

    await user.click(screen.getByRole('button', { name: 'Copy link' }));
    expect(await window.navigator.clipboard.readText()).toBe(
      'http://localhost/#/tracks/track-001?mode=json',
    );
    expect(await screen.findByText('Copied ✓')).toBeInTheDocument();
  });

  it('copies an iframe embed snippet', async () => {
    const user = userEvent.setup();
    seedLocalTrack();
    renderEditor('track-001');

    await user.click(screen.getByRole('button', { name: 'Copy embed' }));
    const copiedText = await window.navigator.clipboard.readText();
    expect(copiedText).toContain('<iframe');
    expect(copiedText).toContain('#/tracks/track-001');
  });
});

describe('workspace modes', () => {
  it('renders four mode buttons with view active by default', () => {
    seedLocalTrack();
    renderEditor('track-001');
    const view = screen.getByRole('button', { name: 'View' });
    expect(view).toHaveAttribute('aria-pressed', 'true');
    for (const label of ['Gates', 'Path', 'JSON']) {
      expect(screen.getByRole('button', { name: label })).toHaveAttribute(
        'aria-pressed',
        'false',
      );
    }
  });

  it('updates ?mode= in the URL when a mode button is clicked', async () => {
    seedLocalTrack();
    const user = userEvent.setup();
    renderEditor('track-001');
    await user.click(screen.getByRole('button', { name: 'JSON' }));
    expect(screen.getByTestId('search')).toHaveTextContent('mode=json');
    await user.click(screen.getByRole('button', { name: 'Gates' }));
    expect(screen.getByTestId('search')).toHaveTextContent('mode=gates');
  });

  it('respects the mode from the URL and falls back to view for unknown values', () => {
    seedLocalTrack();
    renderEditor('track-001', '/?mode=bogus');
    expect(screen.getByRole('button', { name: 'View' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('mounts the 3D viewer in view mode (WebGL fallback under jsdom)', async () => {
    seedLocalTrack();
    renderEditor('track-001');
    expect(await screen.findByText(/3D view unavailable/)).toBeInTheDocument();
  });

  it('mounts the gates editor with its toolbar tools in gates mode', async () => {
    seedLocalTrack();
    renderEditor('track-001', '/?mode=gates');
    // Gates tool buttons appear in the main toolbar (WS_013).
    expect(screen.getByRole('group', { name: 'Gates tools' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add edge' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    // jsdom has no WebGL, so the editor surface falls back.
    expect(await screen.findByText(/3D view unavailable/)).toBeInTheDocument();
  });

  it('shows a read-only notice in gates mode for catalog tracks', async () => {
    tracksStore.getState().setTrack('RG5/rg5-06', { name: 'rg5', edges: [], path: [] });
    metadataStore.setState({
      byId: { 'RG5/rg5-06': { readonly: true, loadStatus: 'loaded' } },
    });
    renderEditor('RG5/rg5-06', '/?mode=gates');
    expect(await screen.findByText(/Read-only catalog track/)).toBeInTheDocument();
  });

  it('mounts the path editor with its steps panel in path mode', async () => {
    seedLocalTrack();
    tracksStore.getState().setTrack('track-001', {
      name: 'track-001',
      edges: [[[0, 0, 0], [0, 1, 0]]],
      path: [
        [[[0, 0, 0], [1, 1, 0]]],
        [[[1, 0, 0], [0, 1, 0]]],
      ],
    });
    renderEditor('track-001', '/?mode=path');
    expect(await screen.findByText('Path steps')).toBeInTheDocument();
    expect(screen.getByText('Step 1')).toBeInTheDocument();
    expect(screen.getByText('Step 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New step' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete step' })).toBeInTheDocument();
  });

  it('reorders and removes path steps from the steps panel, persisting to the store', async () => {
    const user = userEvent.setup();
    seedLocalTrack();
    const stepA = [[[0, 0, 0], [1, 1, 0]]];
    const stepB = [[[1, 0, 0], [0, 1, 0]]];
    tracksStore.getState().setTrack('track-001', {
      name: 'track-001',
      edges: [],
      path: [stepA, stepB] as Track['path'],
    });
    renderEditor('track-001', '/?mode=path');

    await user.click(await screen.findByRole('button', { name: 'Move step 1 down' }));
    expect(tracksStore.getState().tracks['track-001'].path).toEqual([stepB, stepA]);

    await user.click(screen.getByRole('button', { name: 'Remove step 1' }));
    expect(tracksStore.getState().tracks['track-001'].path).toEqual([stepA]);
    // Persisted immediately (VIZ_017).
    const stored = JSON.parse(
      localStorage.getItem('fpv-track-builder.local-tracks.v1') ?? '{}',
    ) as Record<string, Track>;
    expect(stored['track-001'].path).toEqual([stepA]);
  });

  it('shows a read-only notice in path mode for catalog tracks', async () => {
    tracksStore.getState().setTrack('RG5/rg5-06', { name: 'rg5', edges: [], path: [] });
    metadataStore.setState({
      byId: { 'RG5/rg5-06': { readonly: true, loadStatus: 'loaded' } },
    });
    renderEditor('RG5/rg5-06', '/?mode=path');
    expect(await screen.findByText(/Read-only catalog track/)).toBeInTheDocument();
  });

  it('renders a read-only JSON tree of the track in json mode', () => {
    seedLocalTrack();
    renderEditor('track-001', '/?mode=json');
    // json-edit-react renders the root name and top-level keys; the toolbar
    // title also shows the id, hence getAllByText.
    expect(screen.getAllByText(/track-001/).length).toBeGreaterThan(1);
    expect(screen.getByText(/edges/)).toBeInTheDocument();
    expect(screen.getByText(/path/)).toBeInTheDocument();
  });
});
