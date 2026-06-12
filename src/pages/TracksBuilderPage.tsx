import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../layout/Layout';
import TracksCatalog from '../features/catalog/TracksCatalog';
import TrackEditor from '../features/trackEditor/TrackEditor';
import DebugTools from '../features/debugTools/DebugTools';
import { metadataStore } from '../store/metadata.store';

/**
 * Route orchestration: reads the track ID from `/#/tracks/{id}` (IDs may
 * contain slashes, hence the splat param) and triggers lazy loading. (ETC_010)
 */
export default function TracksBuilderPage() {
  const params = useParams();
  const trackId = params['*'] || undefined;

  useEffect(() => {
    if (!trackId) return;
    // Load errors are surfaced through the metadata store; swallow the
    // rejection here to avoid unhandled-promise noise.
    void metadataStore.getState().ensureTrackLoaded(trackId).catch(() => undefined);
  }, [trackId]);

  return (
    <Layout catalog={<TracksCatalog />} debug={<DebugTools trackId={trackId} />}>
      <TrackEditor trackId={trackId} />
    </Layout>
  );
}
