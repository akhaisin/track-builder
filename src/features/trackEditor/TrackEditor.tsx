import { useState } from 'react';
import TrackEditorToolbar from './TrackEditorToolbar';
import TrackEditorScene from './TrackEditorScene';
import { createToolbarEventBus } from './toolbarEventBus';
import styles from './TrackEditor.module.css';

export interface Props {
  trackId?: string;
}

/**
 * Center panel host. Owns the toolbar→scene event flow: toolbar events are
 * forwarded down to the scene, which owns all mode-specific rendering. (WS_011–WS_013)
 */
export default function TrackEditor({ trackId }: Props) {
  const [events] = useState(createToolbarEventBus);

  return (
    <div className={styles.editor}>
      <TrackEditorToolbar trackId={trackId} onEvent={events.emit} />
      <TrackEditorScene trackId={trackId} events={events} />
    </div>
  );
}
