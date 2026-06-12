import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  buildEdgesObject,
  buildGrid,
  buildLabelSprites,
  computeBounds,
  cssColor,
  disposeObject,
  flattenSegments,
} from './three/sceneBuilders';
import { createSceneContext, isWebglAvailable } from './three/sceneSetup';
import { snapToLattice } from './gatesLogic';
import { addSegmentToStep, appendStep, moveStep, removeStep } from './pathLogic';
import { updateTrack } from '../../store/trackActions';
import { useTrackMetadata } from '../../store/useMetadataStore';
import type { SceneContext } from './three/sceneSetup';
import type { Point3, Track, TrackSegment } from '../../types/tracks';
import type { ToolbarEventBus } from './toolbarEventBus';
import styles from './TrackEditor.module.css';

export interface Props {
  trackId: string;
  track: Track;
  events: ToolbarEventBus;
}

const CLICK_TOLERANCE_PX = 5;

function ndcFromPointer(event: PointerEvent, element: HTMLElement): THREE.Vector2 {
  const rect = element.getBoundingClientRect();
  return new THREE.Vector2(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1,
  );
}

/**
 * Path editor: define the gate sequence by adding segments (two lattice
 * clicks) to numbered steps, reorder or remove steps via the steps panel,
 * persist every edit immediately. (VIZ_014–VIZ_017)
 */
export default function PathEditor({ trackId, track, events }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const ctxRef = useRef<SceneContext | null>(null);
  const stepLinesRef = useRef<THREE.LineSegments[]>([]);
  const [webglFailed] = useState(() => !isWebglAvailable());
  const [selectedStep, setSelectedStep] = useState<number | null>(null);
  const [pendingPoint, setPendingPoint] = useState<Point3 | null>(null);
  const [level, setLevel] = useState(0);
  const metadata = useTrackMetadata(trackId);
  const readonly = metadata?.readonly ?? false;
  const initialTrackRef = useRef(track);

  const commit = useCallback(
    (next: Track | null) => {
      if (next) updateTrack(trackId, next);
    },
    [trackId],
  );

  // Latest interaction state for native event handlers and bus callbacks.
  const stateRef = useRef({ selectedStep, pendingPoint, level, track });
  useEffect(() => {
    stateRef.current = { selectedStep, pendingPoint, level, track };
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container || readonly) return;
    const ctx = createSceneContext(container, initialTrackRef.current);
    ctxRef.current = ctx;

    const raycaster = new THREE.Raycaster();
    raycaster.params.Line.threshold = 0.15;
    const downPosition = { x: 0, y: 0 };

    function latticePointAt(ndc: THREE.Vector2): Point3 | null {
      raycaster.setFromCamera(ndc, ctx.camera);
      const currentLevel = stateRef.current.level;
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -currentLevel);
      const hit = new THREE.Vector3();
      if (!raycaster.ray.intersectPlane(plane, hit)) return null;
      return snapToLattice(hit.x, currentLevel, hit.z);
    }

    function handleClick(pointerEvent: PointerEvent) {
      const ndc = ndcFromPointer(pointerEvent, ctx.renderer.domElement);
      const state = stateRef.current;

      if (!state.pendingPoint) {
        raycaster.setFromCamera(ndc, ctx.camera);
        const hit = raycaster.intersectObjects(stepLinesRef.current, false)[0];
        if (hit) {
          setSelectedStep(hit.object.userData.stepIndex as number);
          return;
        }
      }

      const point = latticePointAt(ndc);
      if (!point) return;
      if (!state.pendingPoint) {
        setPendingPoint(point);
        return;
      }

      const segment: TrackSegment = [state.pendingPoint, point];
      if (state.selectedStep !== null) {
        commit(addSegmentToStep(state.track, state.selectedStep, segment));
      } else {
        const next = appendStep(state.track, segment);
        if (next) {
          commit(next);
          setSelectedStep(next.path.length - 1);
        }
      }
      setPendingPoint(null);
    }

    function onPointerDown(pointerEvent: PointerEvent) {
      downPosition.x = pointerEvent.clientX;
      downPosition.y = pointerEvent.clientY;
    }

    function onPointerUp(pointerEvent: PointerEvent) {
      const moved = Math.hypot(
        pointerEvent.clientX - downPosition.x,
        pointerEvent.clientY - downPosition.y,
      );
      if (moved <= CLICK_TOLERANCE_PX && pointerEvent.button === 0) {
        handleClick(pointerEvent);
      }
    }

    const element = ctx.renderer.domElement;
    element.addEventListener('pointerdown', onPointerDown);
    element.addEventListener('pointerup', onPointerUp);

    return () => {
      element.removeEventListener('pointerdown', onPointerDown);
      element.removeEventListener('pointerup', onPointerUp);
      ctx.dispose();
      ctxRef.current = null;
    };
  }, [commit, readonly]);

  // Keyboard shortcuts.
  useEffect(() => {
    if (readonly) return;
    function onKeyDown(keyEvent: KeyboardEvent) {
      if (keyEvent.key === 'Escape') setPendingPoint(null);
      if ((keyEvent.key === 'Delete' || keyEvent.key === 'Backspace') && selectedStep !== null) {
        commit(removeStep(track, selectedStep));
        setSelectedStep(null);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [commit, readonly, selectedStep, track]);

  // Toolbar events arrive over the bus. (WS_013)
  useEffect(() => {
    if (readonly) return;
    return events.subscribe((toolbarEvent) => {
      switch (toolbarEvent.type) {
        case 'path:new-step':
          setSelectedStep(null);
          setPendingPoint(null);
          break;
        case 'path:delete-step': {
          const { selectedStep: current, track: currentTrack } = stateRef.current;
          if (current !== null) commit(removeStep(currentTrack, current));
          setSelectedStep(null);
          setPendingPoint(null);
          break;
        }
      }
    });
  }, [events, commit, readonly]);

  // Rebuild scene content on any relevant change.
  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const { trackGroup } = ctx;
    disposeObject(trackGroup);
    trackGroup.clear();
    stepLinesRef.current = [];

    trackGroup.add(buildGrid(computeBounds(track)));
    const edges = buildEdgesObject(track);
    const edgesMaterial = edges.material as THREE.LineBasicMaterial;
    edgesMaterial.transparent = true;
    edgesMaterial.opacity = 0.4;
    trackGroup.add(edges);

    const stepColor = cssColor('--tb-color-success', '#7ab87a');
    track.path.forEach((step, index) => {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(flattenSegments(step), 3),
      );
      const material = new THREE.LineBasicMaterial({
        color: new THREE.Color(index === selectedStep ? '#ffffff' : stepColor),
      });
      const lines = new THREE.LineSegments(geometry, material);
      lines.userData.stepIndex = index;
      trackGroup.add(lines);
      stepLinesRef.current.push(lines);
    });

    // Step numbers help while sequencing, regardless of show_path_labels.
    for (const sprite of buildLabelSprites(track)) trackGroup.add(sprite);

    if (pendingPoint) {
      const marker = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 12, 12),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color(cssColor('--tb-color-success', '#7ab87a')),
        }),
      );
      marker.position.set(...pendingPoint);
      trackGroup.add(marker);
    }
  }, [track, selectedStep, pendingPoint, webglFailed]);

  if (readonly) {
    return (
      <div className={styles.scenePlaceholder}>
        Read-only catalog track — clone it to edit the path.
      </div>
    );
  }

  function handleMoveStep(index: number, direction: -1 | 1) {
    commit(moveStep(track, index, index + direction));
    if (selectedStep === index) setSelectedStep(index + direction);
    else if (selectedStep === index + direction) setSelectedStep(index);
  }

  function handleRemoveStep(index: number) {
    commit(removeStep(track, index));
    setSelectedStep(null);
  }

  const hint = pendingPoint
    ? 'Click the second lattice point to finish the segment.'
    : selectedStep !== null
      ? `Adding segments to step ${selectedStep + 1} — click two lattice points. Use “New step” to start another.`
      : 'Click two lattice points to add a step; click a step line or list entry to select it.';

  return (
    <div className={styles.viewer} data-testid="path-editor">
      {webglFailed ? (
        <div className={`${styles.viewerFallback} ${styles.viewerFallbackFill}`}>
          3D view unavailable — WebGL is not supported in this environment.
        </div>
      ) : (
        <div ref={containerRef} className={styles.viewerCanvas} />
      )}

      <div className={styles.viewerOverlay}>
        <div className={styles.levelControl} role="group" aria-label="Lattice level">
          <button
            className={styles.iconBtnDark}
            aria-label="Lower level"
            onClick={() => setLevel((value) => value - 1)}
          >
            −
          </button>
          <span className={styles.levelValue}>Level {level}</span>
          <button
            className={styles.iconBtnDark}
            aria-label="Raise level"
            onClick={() => setLevel((value) => value + 1)}
          >
            +
          </button>
        </div>
        <p className={styles.viewerHint}>{hint}</p>
      </div>

      <div className={styles.stepsPanel}>
        <div className={styles.stepsPanelTitle}>Path steps</div>
        {track.path.length === 0 && (
          <p className={styles.stepsEmpty}>No steps yet — add one in the 3D view.</p>
        )}
        <ol className={styles.stepsList}>
          {track.path.map((step, index) => (
            <li key={index}>
              <div
                className={`${styles.stepRow} ${selectedStep === index ? styles.stepRowActive : ''}`}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedStep(index)}
                onKeyDown={(keyEvent) => {
                  if (keyEvent.key === 'Enter') setSelectedStep(index);
                }}
              >
                <span className={styles.stepLabel}>Step {index + 1}</span>
                <span className={styles.stepMeta}>
                  {step.length} seg{step.length === 1 ? '' : 's'}
                </span>
                <button
                  className={styles.iconBtnDark}
                  aria-label={`Move step ${index + 1} up`}
                  disabled={index === 0}
                  onClick={(clickEvent) => {
                    clickEvent.stopPropagation();
                    handleMoveStep(index, -1);
                  }}
                >
                  ↑
                </button>
                <button
                  className={styles.iconBtnDark}
                  aria-label={`Move step ${index + 1} down`}
                  disabled={index === track.path.length - 1}
                  onClick={(clickEvent) => {
                    clickEvent.stopPropagation();
                    handleMoveStep(index, 1);
                  }}
                >
                  ↓
                </button>
                <button
                  className={styles.iconBtnDark}
                  aria-label={`Remove step ${index + 1}`}
                  onClick={(clickEvent) => {
                    clickEvent.stopPropagation();
                    handleRemoveStep(index);
                  }}
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
