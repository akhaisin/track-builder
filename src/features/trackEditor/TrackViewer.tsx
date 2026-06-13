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
  // Max distance (lattice units) the flight line may stray from each gate
  // center; raising it both deviates from centers and rounds turns (more
  // curvature). User-controlled in view mode. (VIZ_023)
  const [maxDeviation, setMaxDeviation] = useState(0.1);
  const [hasFlight, setHasFlight] = useState(false);
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
      // Aux steps are exit guides only — hidden in view mode. (VIZ_022)
      if (step.aux) continue;
      for (const gate of step.gates) {
        addGateMesh(trackGroup, gate, {
          fill: stepColor,
          fillOpacity: STEP_FILL_OPACITY,
          outline: stepColor,
        });
      }
    }

    // Step numbers always on, matching path mode; aux steps are skipped. (VIZ_022)
    for (const sprite of buildLabelSprites(track, { includeAux: false })) trackGroup.add(sprite);
  }, [track, webglFailed]);

  // Flight animation lives in its own effect so the smoothing slider rebuilds
  // only the drone + trail, not the whole scene. (VIZ_019, VIZ_020, VIZ_023)
  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const flight = createFlightAnimation(track, maxDeviation);
    setHasFlight(Boolean(flight));
    if (!flight) return;
    ctx.scene.add(flight.object);
    const unsubscribe = ctx.onFrame(flight.update);
    return () => {
      unsubscribe();
      ctx.scene.remove(flight.object);
      flight.dispose();
    };
  }, [track, maxDeviation, webglFailed]);

  if (webglFailed) {
    return (
      <div className={styles.viewerFallback}>
        3D view unavailable — WebGL is not supported in this environment.
      </div>
    );
  }

  return (
    <div className={styles.viewer} data-testid="track-viewer">
      <div ref={containerRef} className={styles.viewerCanvas} />
      {hasFlight && (
        <div className={styles.viewerOverlay}>
          <label className={styles.levelControl}>
            <span>Smoothing</span>
            <input
              type="range"
              min={0}
              max={0.25}
              step={0.025}
              value={maxDeviation}
              onChange={(event) => setMaxDeviation(Number(event.target.value))}
              aria-label="Flight path smoothing (max gate deviation)"
            />
            <span className={styles.levelValue}>{maxDeviation.toFixed(2)}</span>
          </label>
        </div>
      )}
    </div>
  );
}
