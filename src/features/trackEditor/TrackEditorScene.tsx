import { lazy, Suspense } from 'react';
import { JsonEditor } from 'json-edit-react';
import { useTrack } from '../../store/useTracksStore';
import { useTrackMetadata } from '../../store/useMetadataStore';
import { useWorkspaceMode } from './workspaceMode';
import type { Track } from '../../types/tracks';
import type { WorkspaceMode } from './workspaceMode';
import type { ToolbarEventBus } from './toolbarEventBus';
import styles from './TrackEditor.module.css';

export interface Props {
  trackId?: string;
  /** Toolbar event channel; mode views subscribe to it. (WS_013) */
  events: ToolbarEventBus;
}

interface ModeViewProps {
  trackId: string;
  track: Track;
  events: ToolbarEventBus;
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
      <TrackViewer key={trackId} track={track} />
    </Suspense>
  ),
  gates: ({ track, trackId, events }) => (
    <Suspense fallback={loading3d}>
      <GatesEditor key={trackId} trackId={trackId} track={track} events={events} />
    </Suspense>
  ),
  path: ({ track, trackId, events }) => (
    <Suspense fallback={loading3d}>
      <PathEditor key={trackId} trackId={trackId} track={track} events={events} />
    </Suspense>
  ),
  json: (props) => <JsonModeView {...props} />,
};

/**
 * Renders the active workspace mode. Holds a live reference to the current
 * track entry in the tracks store and re-renders when it changes. (WS_014)
 */
export default function TrackEditorScene({ trackId, events }: Props) {
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

  return <div className={styles.scene}>{MODE_VIEWS[mode]({ trackId, track, events })}</div>;
}
