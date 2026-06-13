import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
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
import { createSceneContext, isWebglAvailable } from './three/sceneSetup';
import {
  appendStep,
  moveStep,
  nextGateCandidates,
  removeStep,
  segmentsEqual,
} from './pathLogic';
import { updateTrack } from '../../store/trackActions';
import { useTrackMetadata } from '../../store/useMetadataStore';
import type { Gate } from './pathLogic';
import type { SceneContext } from './three/sceneSetup';
import type { Track, TrackSegment } from '../../types/tracks';
import styles from './TrackEditor.module.css';

export interface Props {
  trackId: string;
  track: Track;
}

const CLICK_TOLERANCE_PX = 5;
const STEP_FILL_OPACITY = 0.3;
const SELECTED_STEP_FILL_OPACITY = 0.5;
const DRAFT_FILL_OPACITY = 0.5;
const CANDIDATE_FILL_OPACITY = 0.12;
const HOVER_MIN_FILL_OPACITY = 0.5;

/** What a raycast hit means; stored on the fill/pipe meshes. */
interface PickData {
  kind: 'pipe' | 'candidate' | 'step';
  edge?: TrackSegment;
  gate?: Gate;
  stepIndex?: number;
  baseColor: string;
  baseOpacity?: number;
}

function ndcFromPointer(event: PointerEvent, element: HTMLElement): THREE.Vector2 {
  const rect = element.getBoundingClientRect();
  return new THREE.Vector2(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1,
  );
}

/**
 * Path editor. A step is one or more coplanar, edge-connected gates (1×1
 * lattice planes). Creating a step: select a placed edge, then pick from the
 * candidate gates along it — left-click adds the gate and finishes the step,
 * right-click adds it and offers the in-plane neighbors to keep growing the
 * step. Click-away finishes an open draft, Escape discards it. Steps are
 * selected, reordered, and removed via the steps panel. Every edit persists
 * immediately. (VIZ_014–VIZ_017)
 */
export default function PathEditor({ trackId, track }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const ctxRef = useRef<SceneContext | null>(null);
  const pickablesRef = useRef<THREE.Object3D[]>([]);
  const hoveredRef = useRef<THREE.Object3D | null>(null);
  const [webglFailed] = useState(() => !isWebglAvailable());
  const [selectedEdge, setSelectedEdge] = useState<TrackSegment | null>(null);
  const [draft, setDraft] = useState<Gate[]>([]);
  const [selectedStep, setSelectedStep] = useState<number | null>(null);
  const metadata = useTrackMetadata(trackId);
  const readonly = metadata?.readonly ?? false;
  const initialTrackRef = useRef(track);

  const commit = useCallback(
    (next: Track | null) => {
      if (next) updateTrack(trackId, next);
    },
    [trackId],
  );

  // Latest interaction state for native event handlers.
  const stateRef = useRef({ selectedEdge, draft, selectedStep, track });
  useEffect(() => {
    stateRef.current = { selectedEdge, draft, selectedStep, track };
  });

  /** Commit the draft gates as a new step (no-op for an empty draft). */
  const finalizeDraft = useCallback(
    (extraGate?: Gate) => {
      const { draft: gates, track: currentTrack } = stateRef.current;
      const all = extraGate ? [...gates, extraGate] : gates;
      const next = appendStep(currentTrack, all);
      if (next) {
        commit(next);
        setSelectedStep(next.path.length - 1);
      }
      setDraft([]);
      setSelectedEdge(null);
    },
    [commit],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container || readonly) return;
    const ctx = createSceneContext(container, initialTrackRef.current, trackId);
    ctxRef.current = ctx;
    const element = ctx.renderer.domElement;

    const raycaster = new THREE.Raycaster();
    const downPosition = { x: 0, y: 0 };
    const hoverColor = new THREE.Color(cssColor('--tb-color-warning', '#c87d2a'));

    function pick(pointerEvent: PointerEvent): THREE.Object3D | null {
      raycaster.setFromCamera(ndcFromPointer(pointerEvent, element), ctx.camera);
      return raycaster.intersectObjects(pickablesRef.current, false)[0]?.object ?? null;
    }

    function paint(object: THREE.Object3D, hovered: boolean) {
      const data = object.userData as PickData;
      const material = (object as THREE.Mesh).material as THREE.MeshBasicMaterial;
      material.color.set(hovered ? hoverColor : data.baseColor);
      if (typeof data.baseOpacity === 'number') {
        material.opacity = hovered
          ? Math.max(data.baseOpacity, HOVER_MIN_FILL_OPACITY)
          : data.baseOpacity;
      }
    }

    function setHovered(next: THREE.Object3D | null) {
      const previous = hoveredRef.current;
      if (previous === next) return;
      if (previous) paint(previous, false);
      if (next) paint(next, true);
      hoveredRef.current = next;
      element.style.cursor = next ? 'pointer' : '';
    }

    function handleClick(pointerEvent: PointerEvent) {
      const data = pick(pointerEvent)?.userData as PickData | undefined;

      if (pointerEvent.button === 2) {
        // Right-click: add the gate, keep the draft open for more. (VIZ_016)
        if (data?.kind === 'candidate' && data.gate) {
          setDraft([...stateRef.current.draft, data.gate]);
        }
        return;
      }

      if (data?.kind === 'candidate' && data.gate) {
        finalizeDraft(data.gate);
        return;
      }
      // Click-away: an open draft is finished as-is before anything else.
      finalizeDraft();
      if (data?.kind === 'pipe' && data.edge) {
        setSelectedEdge(data.edge);
        setSelectedStep(null);
      } else if (data?.kind === 'step' && data.stepIndex !== undefined) {
        setSelectedStep(data.stepIndex);
        setSelectedEdge(null);
      } else {
        setSelectedEdge(null);
        setSelectedStep(null);
      }
    }

    function onPointerMove(pointerEvent: PointerEvent) {
      setHovered(pick(pointerEvent));
    }

    function onPointerDown(pointerEvent: PointerEvent) {
      downPosition.x = pointerEvent.clientX;
      downPosition.y = pointerEvent.clientY;
    }

    function onPointerUp(pointerEvent: PointerEvent) {
      // Don't treat orbit/pan drags as clicks.
      const moved = Math.hypot(
        pointerEvent.clientX - downPosition.x,
        pointerEvent.clientY - downPosition.y,
      );
      if (moved <= CLICK_TOLERANCE_PX && (pointerEvent.button === 0 || pointerEvent.button === 2)) {
        handleClick(pointerEvent);
      }
    }

    function onContextMenu(menuEvent: Event) {
      menuEvent.preventDefault();
    }

    element.addEventListener('pointermove', onPointerMove);
    element.addEventListener('pointerdown', onPointerDown);
    element.addEventListener('pointerup', onPointerUp);
    element.addEventListener('contextmenu', onContextMenu);

    return () => {
      element.removeEventListener('pointermove', onPointerMove);
      element.removeEventListener('pointerdown', onPointerDown);
      element.removeEventListener('pointerup', onPointerUp);
      element.removeEventListener('contextmenu', onContextMenu);
      ctx.dispose();
      ctxRef.current = null;
    };
  }, [finalizeDraft, readonly, trackId]);

  // Keyboard: Escape discards the draft; Delete removes the selected step.
  useEffect(() => {
    if (readonly) return;
    function onKeyDown(keyEvent: KeyboardEvent) {
      if (keyEvent.key === 'Escape') {
        setDraft([]);
        setSelectedEdge(null);
      }
      if ((keyEvent.key === 'Delete' || keyEvent.key === 'Backspace') && selectedStep !== null) {
        commit(removeStep(track, selectedStep));
        setSelectedStep(null);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [commit, readonly, selectedStep, track]);

  // Rebuild scene content on any relevant change.
  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const { trackGroup } = ctx;
    disposeObject(trackGroup);
    trackGroup.clear();
    pickablesRef.current = [];
    hoveredRef.current = null;
    ctx.renderer.domElement.style.cursor = '';

    trackGroup.add(buildGrid(computeBounds(track)));

    const edgeColor = cssColor('--tb-color-canvas-line', '#c9993a');
    const selectedEdgeColor =
      '#' + new THREE.Color(edgeColor).lerp(new THREE.Color('#ffffff'), 0.5).getHexString();
    const stepColor = cssColor('--tb-color-success', '#7ab87a');

    // Placed edges as pipes; the selected one is brighter and thicker. (VIZ_016)
    for (const segment of track.edges) {
      const isSelected = selectedEdge !== null && segmentsEqual(segment, selectedEdge);
      const color = isSelected ? selectedEdgeColor : edgeColor;
      const pipe = buildPipeMesh(segment, isSelected ? PIPE_RADIUS * 1.8 : PIPE_RADIUS, color);
      pipe.userData = { kind: 'pipe', edge: segment, baseColor: color } satisfies PickData;
      trackGroup.add(pipe);
      pickablesRef.current.push(pipe);
    }

    // A gate as a translucent fill quad (the raycast target) plus an outline.
    function addGate(
      gate: Gate,
      fill: string,
      fillOpacity: number,
      outline: string,
      pickData: PickData | null,
    ) {
      const fillMesh = addGateMesh(trackGroup, gate, { fill, fillOpacity, outline });
      if (fillMesh && pickData) {
        fillMesh.userData = pickData;
        pickablesRef.current.push(fillMesh);
      }
    }

    // Existing steps. (VIZ_014)
    track.path.forEach((step, index) => {
      const isSelected = index === selectedStep;
      for (const gate of step) {
        addGate(
          gate,
          stepColor,
          isSelected ? SELECTED_STEP_FILL_OPACITY : STEP_FILL_OPACITY,
          isSelected ? '#ffffff' : stepColor,
          {
            kind: 'step',
            stepIndex: index,
            baseColor: stepColor,
            baseOpacity: isSelected ? SELECTED_STEP_FILL_OPACITY : STEP_FILL_OPACITY,
          },
        );
      }
    });

    // Draft gates of the step being created (not pickable).
    for (const gate of draft) {
      addGate(gate, stepColor, DRAFT_FILL_OPACITY, '#ffffff', null);
    }

    // Candidate gates around the selected edge / last draft gate. (VIZ_016)
    if (selectedEdge) {
      for (const gate of nextGateCandidates(track, selectedEdge, draft)) {
        addGate(gate, edgeColor, CANDIDATE_FILL_OPACITY, edgeColor, {
          kind: 'candidate',
          gate,
          baseColor: edgeColor,
          baseOpacity: CANDIDATE_FILL_OPACITY,
        });
      }
    }

    // Step numbers help while sequencing, regardless of show_path_labels.
    for (const sprite of buildLabelSprites(track)) trackGroup.add(sprite);
  }, [track, selectedEdge, draft, selectedStep, webglFailed]);

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

  const hint =
    draft.length > 0
      ? 'Right-click adds another gate; left-click a gate adds it and finishes the step. Click away to finish, Esc to cancel.'
      : selectedEdge
        ? 'Left-click a candidate gate to create the step; right-click to add it and keep growing the step.'
        : 'Click a placed pipe to start a step; click a gate to select its step.';

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
                  {step.length} gate{step.length === 1 ? '' : 's'}
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
