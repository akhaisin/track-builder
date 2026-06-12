import { JsonEditor } from 'json-edit-react';
import { useTracksStore, useTrack } from '../../store/useTracksStore';
import { useMetadataStore } from '../../store/useMetadataStore';
import { useLayoutStore } from '../../layout/layout.store';
import { updateTrack } from '../../store/trackActions';
import { serializeMetadataState } from './serializeMetadataState';
import type { Track } from '../../types/tracks';
import styles from './DebugTools.module.css';

export interface Props {
  trackId?: string;
}

/** Dev-only right panel with live JSON views of the stores. (ETC_001–ETC_009) */
export default function DebugTools({ trackId }: Props) {
  const tracks = useTracksStore((state) => state.tracks);
  const metadataState = useMetadataStore((state) => state);
  const collapsed = useLayoutStore((state) => state.collapsed);
  const track = useTrack(trackId);

  if (!import.meta.env.DEV) return null;

  return (
    <div className={styles.debugTools}>
      <h3 className={styles.heading}>Debug Tools</h3>
      <p className={styles.selected}>
        Selected track: <code>{trackId ?? 'none'}</code>
      </p>

      <div className={styles.section}>
        <JsonEditor data={{ tracks }} viewOnly rootName="tracksStore" collapse={0} />
      </div>

      <div className={styles.section}>
        <JsonEditor
          data={serializeMetadataState(metadataState)}
          viewOnly
          rootName="metadataStore"
          collapse={0}
        />
      </div>

      <div className={styles.section}>
        <JsonEditor
          data={track ?? null}
          rootName="trackStore"
          collapse={0}
          viewOnly={!trackId || !track}
          setData={(data) => {
            if (trackId && data) updateTrack(trackId, data as Track);
          }}
        />
      </div>

      <div className={styles.section}>
        <JsonEditor data={{ collapsed }} viewOnly rootName="layoutStore" collapse={0} />
      </div>
    </div>
  );
}
