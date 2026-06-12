import { useEffect, useRef, useState } from 'react';
import {
  buildEdgesObject,
  buildGrid,
  buildLabelSprites,
  buildPathObject,
  computeBounds,
  disposeObject,
} from './three/sceneBuilders';
import { createSceneContext, isWebglAvailable } from './three/sceneSetup';
import type { SceneContext } from './three/sceneSetup';
import type { Track } from '../../types/tracks';
import styles from './TrackEditor.module.css';

export interface Props {
  track: Track;
}

/**
 * 3D track view: lattice grid, structural edges, highlighted racing path,
 * optional path labels, orbit/zoom/pan camera. (VIZ_001–VIZ_005)
 *
 * Remount per track (key on track id) so the camera reframes; in-place track
 * edits only rebuild the track group and keep the camera where the user put it.
 */
export default function TrackViewer({ track }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const ctxRef = useRef<SceneContext | null>(null);
  // jsdom and headless environments have no WebGL context.
  const [webglFailed] = useState(() => !isWebglAvailable());
  const initialTrackRef = useRef(track);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ctx = createSceneContext(container, initialTrackRef.current);
    ctxRef.current = ctx;
    return () => {
      ctx.dispose();
      ctxRef.current = null;
    };
  }, []);

  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const { trackGroup } = ctx;
    disposeObject(trackGroup);
    trackGroup.clear();

    trackGroup.add(buildGrid(computeBounds(track)));
    trackGroup.add(buildEdgesObject(track));
    trackGroup.add(buildPathObject(track));
    if (track.show_path_labels) {
      for (const sprite of buildLabelSprites(track)) trackGroup.add(sprite);
    }
  }, [track, webglFailed]);

  if (webglFailed) {
    return (
      <div className={styles.viewerFallback}>
        3D view unavailable — WebGL is not supported in this environment.
      </div>
    );
  }

  return <div ref={containerRef} className={styles.viewer} data-testid="track-viewer" />;
}
