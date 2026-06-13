import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  addGateMesh,
  buildGrid,
  buildLabelSprite,
  buildPipeMesh,
  computeBounds,
  cssColor,
  disposeObject,
  pathLabelAnchors,
  PIPE_RADIUS,
} from './three/sceneBuilders';
import { createFlightAnimation } from './three/droneFlight';
import type { GateMarker } from './three/droneFlight';
import { gateCenter } from './flightPath';
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
  // Per-step gate groups (gates + label) toggled one-at-a-time along the
  // flight; populated by the static effect, consumed by the flight effect. (VIZ_024)
  const markersRef = useRef<GateMarker[]>([]);
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

    // Each non-aux step's gates + number become one group, revealed one at a
    // time along the flight (VIZ_024). Aux steps stay hidden entirely. (VIZ_022)
    const stepColor = cssColor('--tb-color-success', '#7ab87a');
    const anchors = pathLabelAnchors(track);
    const markers: GateMarker[] = [];
    track.path.forEach((step, index) => {
      const first = step.gates[0];
      if (step.aux || !first) return;
      const group = new THREE.Group();
      for (const gate of step.gates) {
        addGateMesh(group, gate, {
          fill: stepColor,
          fillOpacity: STEP_FILL_OPACITY,
          outline: stepColor,
        });
      }
      const sprite = buildLabelSprite(anchors[index]);
      if (sprite) group.add(sprite);
      trackGroup.add(group);
      markers.push({ object: group, position: gateCenter(first) });
    });
    markersRef.current = markers;
  }, [track, webglFailed]);

  // Flight animation lives in its own effect so the smoothing slider rebuilds
  // only the drone + trail, not the whole scene. (VIZ_019, VIZ_020, VIZ_023)
  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    // Without a flight the freshly-built step groups stay visible (default). (VIZ_024)
    const flight = createFlightAnimation(track, maxDeviation, markersRef.current);
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
