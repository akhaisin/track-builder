import { render, screen } from '@testing-library/react';
import DebugTools from './DebugTools';
import { serializeMetadataState } from './serializeMetadataState';
import { tracksStore } from '../../store/tracks.store';
import { metadataStore } from '../../store/metadata.store';
import { layoutStore } from '../../layout/layout.store';
import type { MetadataState } from '../../store/metadata.store';
import type { Track } from '../../types/tracks';

beforeEach(() => {
  localStorage.clear();
  tracksStore.setState({ tracks: {} });
  metadataStore.setState({ byId: {}, indexStatus: 'idle', indexError: undefined, inflight: {} });
  layoutStore.setState({ collapsed: {} });
});

describe('DebugTools', () => {
  it('renders the heading and "none" when no track is selected', () => {
    render(<DebugTools />);
    expect(screen.getByText('Debug Tools')).toBeInTheDocument();
    expect(screen.getByText('none')).toBeInTheDocument();
  });

  it('shows the selected track id', () => {
    render(<DebugTools trackId="RG5/rg5-06" />);
    expect(screen.getByText('RG5/rg5-06')).toBeInTheDocument();
  });

  it('renders the four store editors in order', () => {
    render(<DebugTools />);
    const roots = ['tracksStore', 'metadataStore', 'trackStore', 'layoutStore'];
    const positions = roots.map((name) => {
      const el = screen.getByText(name);
      expect(el).toBeInTheDocument();
      return el.compareDocumentPosition(document.body);
    });
    expect(positions).toHaveLength(4);
    // layoutStore is the last editor (ETC_009): it must appear after trackStore.
    const trackStoreEl = screen.getByText('trackStore');
    const layoutStoreEl = screen.getByText('layoutStore');
    expect(
      trackStoreEl.compareDocumentPosition(layoutStoreEl) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});

describe('serializeMetadataState', () => {
  it('replaces in-flight promises with a flag and id list', () => {
    const state = {
      byId: { 'RG5/rg5-06': { readonly: true, loadStatus: 'loading' } },
      indexStatus: 'loaded',
      indexError: undefined,
      inflight: { 'RG5/rg5-06': Promise.resolve({} as Track) },
    } as unknown as MetadataState;
    const serialized = serializeMetadataState(state);
    expect(serialized.hasInflight).toBe(true);
    expect(serialized.inflightIds).toEqual(['RG5/rg5-06']);
    expect(serialized.indexError).toBeNull();
    expect('inflight' in serialized).toBe(false);
  });

  it('reports no in-flight loads for an empty map', () => {
    const serialized = serializeMetadataState(metadataStore.getState());
    expect(serialized.hasInflight).toBe(false);
    expect(serialized.inflightIds).toEqual([]);
  });
});
