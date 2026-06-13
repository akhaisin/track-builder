import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  addGateMesh,
  buildDirectionArrow,
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
  entryFromViewpoint,
  entryVector,
  moveStep,
  nextGateCandidates,
  pathStepLabels,
  removeStep,
  segmentsEqual,
  toggleStepAux,
} from './pathLogic';
import { gateCenter } from './flightPath';
import { updateTrack } from '../../store/trackActions';
import { useTrackMetadata } from '../../store/useMetadataStore';
import { DIRECTION_VECTORS } from '../../types/tracks';
import type { Gate } from './pathLogic';
import type { SceneContext } from './three/sceneSetup';
import type { Direction, Point3, Track, TrackSegment } from '../../types/tracks';
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
// Entry-direction arrow lengths (lattice units): the hovered candidate's arrow
// while choosing the first gate, and the static one drawn on placed steps.
const HOVER_ARROW_LENGTH = 0.8;
const STEP_ARROW_LENGTH = 0.6;

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
  // Entry direction for the step being created, settled from its first gate. (VIZ_021)
  const [draftEntry, setDraftEntry] = useState<Direction | null>(null);
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
  const stateRef = useRef({ selectedEdge, draft, draftEntry, selectedStep, track });
  useEffect(() => {
    stateRef.current = { selectedEdge, draft, draftEntry, selectedStep, track };
  });

  /**
   * Commit the draft gates as a new step (no-op for an empty draft). The step's
   * entry direction comes from `entryOverride`, else the one settled when the
   * first gate was placed. (VIZ_021)
   */
  const finalizeDraft = useCallback(
    (extraGate?: Gate, entryOverride?: Direction) => {
      const { draft: gates, draftEntry: entry, track: currentTrack } = stateRef.current;
      const all = extraGate ? [...gates, extraGate] : gates;
      const next = appendStep(currentTrack, all, entryOverride ?? entry ?? undefined);
      if (next) {
        commit(next);
        setSelectedStep(next.path.length - 1);
      }
      setDraft([]);
      setDraftEntry(null);
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
    const warningColor = cssColor('--tb-color-warning', '#c87d2a');
    const hoverColor = new THREE.Color(warningColor);

    // Arrow showing the entry side of the hovered candidate, away from the
    // camera (you enter from the side you look from). Lives in the scene, not
    // the rebuilt track group, and is driven per frame so it tracks orbiting. (VIZ_021)
    const hoverArrow = buildDirectionArrow([0, 0, 0], [0, 0, 1], warningColor, HOVER_ARROW_LENGTH);
    hoverArrow.visible = false;
    ctx.scene.add(hoverArrow);

    /** Entry direction a click would assign to `gate` from the current camera. */
    function entryForGate(gate: Gate): Direction | undefined {
      const p = ctx.camera.position;
      return entryFromViewpoint(gate, [p.x, p.y, p.z] as Point3) ?? undefined;
    }

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
      const { draft } = stateRef.current;

      if (pointerEvent.button === 2) {
        // Right-click: add the gate, keep the draft open for more. (VIZ_016)
        if (data?.kind === 'candidate' && data.gate) {
          // The first gate settles the step's entry direction. (VIZ_021)
          if (draft.length === 0) setDraftEntry(entryForGate(data.gate) ?? null);
          setDraft([...draft, data.gate]);
        }
        return;
      }

      if (data?.kind === 'candidate' && data.gate) {
        // A single-gate step settles its direction now; a grown draft already has one.
        finalizeDraft(data.gate, draft.length === 0 ? entryForGate(data.gate) : undefined);
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

    // Per frame: point the entry arrow at the hovered candidate, but only while
    // choosing the first gate — once the draft grows the direction is settled. (VIZ_021)
    const unsubscribeFrame = ctx.onFrame(() => {
      const data = hoveredRef.current?.userData as PickData | undefined;
      const entry =
        data?.kind === 'candidate' && data.gate && stateRef.current.draft.length === 0
          ? entryForGate(data.gate)
          : undefined;
      const vector = entry ? DIRECTION_VECTORS[entry] : null;
      if (vector && data?.gate) {
        const center = gateCenter(data.gate);
        hoverArrow.position.set(
          center[0] - vector[0] * HOVER_ARROW_LENGTH,
          center[1] - vector[1] * HOVER_ARROW_LENGTH,
          center[2] - vector[2] * HOVER_ARROW_LENGTH,
        );
        hoverArrow.setDirection(new THREE.Vector3(...vector).normalize());
        hoverArrow.visible = true;
      } else {
        hoverArrow.visible = false;
      }
    });

    element.addEventListener('pointermove', onPointerMove);
    element.addEventListener('pointerdown', onPointerDown);
    element.addEventListener('pointerup', onPointerUp);
    element.addEventListener('contextmenu', onContextMenu);

    return () => {
      unsubscribeFrame();
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
        setDraftEntry(null);
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
      for (const gate of step.gates) {
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

    // Entry-direction arrow on each placed step that carries one. (VIZ_021)
    for (const step of track.path) {
      if (!step.entry) continue;
      const gate = step.gates[0];
      if (!gate) continue;
      const vector = entryVector(gate, step.entry);
      if (vector) {
        trackGroup.add(buildDirectionArrow(gateCenter(gate), vector, stepColor, STEP_ARROW_LENGTH));
      }
    }

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

  function handleToggleAux(index: number) {
    commit(toggleStepAux(track, index));
  }

  const stepLabels = pathStepLabels(track.path);

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
                <span className={styles.stepLabel}>Step {stepLabels[index]}</span>
                <span className={styles.stepMeta}>
                  {step.gates.length} gate{step.gates.length === 1 ? '' : 's'}
                </span>
                <button
                  className={`${styles.iconBtnDark} ${step.aux ? styles.iconBtnActive : ''}`}
                  aria-label={`Toggle auxiliary for step ${stepLabels[index]}`}
                  aria-pressed={step.aux ?? false}
                  title="Auxiliary exit guide"
                  onClick={(clickEvent) => {
                    clickEvent.stopPropagation();
                    handleToggleAux(index);
                  }}
                >
                  A
                </button>
                <button
                  className={styles.iconBtnDark}
                  aria-label={`Move step ${stepLabels[index]} up`}
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
                  aria-label={`Move step ${stepLabels[index]} down`}
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
                  aria-label={`Remove step ${stepLabels[index]}`}
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
