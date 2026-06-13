import { useEffect, useRef, useState } from 'react';
import {
  addGateMesh,
  buildGrid,
  buildLabelSprites,
  buildPipeMesh,
  computeBounds,
  cssColor,
  disposeObject,
  PIPE_RADIUS,
} from './three/sceneBuilders';
import { createFlightAnimation } from './three/droneFlight';
import { createSceneContext, isWebglAvailable } from './three/sceneSetup';
import type { SceneContext } from './three/sceneSetup';
import type { Track } from '../../types/tracks';
import styles from './TrackEditor.module.css';

export interface Props {
  track: Track;
  /** Camera-pose key: keeps orientation when switching workspace modes. */
  trackId?: string;
}

// Read-only twin of the path editor's styling.
const STEP_FILL_OPACITY = 0.3;

/**
 * Read-only 3D track view: lattice grid, structural edges as pipes, racing
 * path as translucent gate tiles, step number labels, orbit/zoom/pan camera.
 * Renders the track the same way as path mode, without editing.
 * (VIZ_001–VIZ_005)
 *
 * Remount per track (key on track id); in-place track edits only rebuild the
 * track group and keep the camera where the user put it.
 */
export default function TrackViewer({ track, trackId }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const ctxRef = useRef<SceneContext | null>(null);
  // jsdom and headless environments have no WebGL context.
  const [webglFailed] = useState(() => !isWebglAvailable());
  const initialTrackRef = useRef(track);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ctx = createSceneContext(container, initialTrackRef.current, trackId);
    ctxRef.current = ctx;
    return () => {
      ctx.dispose();
      ctxRef.current = null;
    };
  }, [trackId]);

  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const { trackGroup } = ctx;
    disposeObject(trackGroup);
    trackGroup.clear();

    trackGroup.add(buildGrid(computeBounds(track)));

    const edgeColor = cssColor('--tb-color-canvas-line', '#c9993a');
    for (const segment of track.edges) {
      trackGroup.add(buildPipeMesh(segment, PIPE_RADIUS, edgeColor));
    }

    const stepColor = cssColor('--tb-color-success', '#7ab87a');
    for (const step of track.path) {
      for (const gate of step) {
        addGateMesh(trackGroup, gate, {
          fill: stepColor,
          fillOpacity: STEP_FILL_OPACITY,
          outline: stepColor,
        });
      }
    }

    // Step numbers always on, matching path mode.
    for (const sprite of buildLabelSprites(track)) trackGroup.add(sprite);

    // Quadcopter flying the racing path, trailing a fading line. (VIZ_019, VIZ_020)
    const flight = createFlightAnimation(track);
    if (!flight) return;
    trackGroup.add(flight.object);
    const unsubscribe = ctx.onFrame(flight.update);
    return () => {
      unsubscribe();
      flight.dispose();
    };
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
