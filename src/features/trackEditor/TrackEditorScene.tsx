import { lazy, Suspense } from 'react';
import { JsonEditor } from 'json-edit-react';
import { useTrack } from '../../store/useTracksStore';
import { useTrackMetadata } from '../../store/useMetadataStore';
import { useWorkspaceMode } from './workspaceMode';
import type { Track } from '../../types/tracks';
import type { WorkspaceMode } from './workspaceMode';
import styles from './TrackEditor.module.css';

export interface Props {
  trackId?: string;
}

interface ModeViewProps {
  trackId: string;
  track: Track;
}

/** Read-only JSON object tree of the selected track. (VIZ_009) */
function JsonModeView({ trackId, track }: ModeViewProps) {
  return (
    <div className={styles.jsonView}>
      <JsonEditor data={track} viewOnly rootName={trackId} />
    </div>
  );
}

// Three.js dominates the bundle; load the 3D chunks on demand.
const TrackViewer = lazy(() => import('./TrackViewer'));
const GatesEditor = lazy(() => import('./GatesEditor'));
const PathEditor = lazy(() => import('./PathEditor'));

const loading3d = <div className={styles.scenePlaceholder}>Loading 3D view…</div>;

const MODE_VIEWS: Record<WorkspaceMode, (props: ModeViewProps) => React.ReactNode> = {
  view: ({ track, trackId }) => (
    <Suspense fallback={loading3d}>
      <TrackViewer key={trackId} track={track} trackId={trackId} />
    </Suspense>
  ),
  gates: ({ track, trackId }) => (
    <Suspense fallback={loading3d}>
      <GatesEditor key={trackId} trackId={trackId} track={track} />
    </Suspense>
  ),
  path: ({ track, trackId }) => (
    <Suspense fallback={loading3d}>
      <PathEditor key={trackId} trackId={trackId} track={track} />
    </Suspense>
  ),
  json: (props) => <JsonModeView {...props} />,
};

/**
 * Renders the active workspace mode. Holds a live reference to the current
 * track entry in the tracks store and re-renders when it changes. (WS_014)
 */
export default function TrackEditorScene({ trackId }: Props) {
  const [mode] = useWorkspaceMode();
  const track = useTrack(trackId);
  const metadata = useTrackMetadata(trackId);

  if (!trackId) {
    return (
      <div className={styles.scenePlaceholder}>
        Select a track from the catalog to get started.
      </div>
    );
  }

  if (metadata?.loadStatus === 'error') {
    return (
      <div className={styles.sceneError}>
        Failed to load track “{trackId}”: {metadata.loadError}
      </div>
    );
  }

  if (!track) {
    return <div className={styles.scenePlaceholder}>Loading track…</div>;
  }

  return <div className={styles.scene}>{MODE_VIEWS[mode]({ trackId, track })}</div>;
}
