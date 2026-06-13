import TrackEditorToolbar from './TrackEditorToolbar';
import TrackEditorScene from './TrackEditorScene';
import styles from './TrackEditor.module.css';

export interface Props {
  trackId?: string;
}

/**
 * Center panel host: the mode toolbar above the mode-specific scene. All
 * editing interactions live inside the scene views. (WS_011–WS_014)
 */
export default function TrackEditor({ trackId }: Props) {
  return (
    <div className={styles.editor}>
      <TrackEditorToolbar trackId={trackId} />
      <TrackEditorScene trackId={trackId} />
    </div>
  );
}
