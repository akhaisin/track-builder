import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  buildGrid,
  buildPathObject,
  buildPipeMesh,
  computeBounds,
  cssColor,
  disposeObject,
  PIPE_RADIUS,
} from './three/sceneBuilders';
import { createSceneContext, isWebglAvailable } from './three/sceneSetup';
import { candidateEdges, toggleEdge } from './gatesLogic';
import { updateTrack } from '../../store/trackActions';
import { useTrackMetadata } from '../../store/useMetadataStore';
import type { SceneContext } from './three/sceneSetup';
import type { Track, TrackSegment } from '../../types/tracks';
import styles from './TrackEditor.module.css';

export interface Props {
  trackId: string;
  track: Track;
}

const CLICK_TOLERANCE_PX = 5;
const CANDIDATE_OPACITY = 0.5;
const CANDIDATE_HOVER_OPACITY = 0.85;

type EdgeMaterial = THREE.MeshBasicMaterial | THREE.LineBasicMaterial;

function ndcFromPointer(event: PointerEvent, element: HTMLElement): THREE.Vector2 {
  const rect = element.getBoundingClientRect();
  return new THREE.Vector2(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1,
  );
}

/**
 * Interactive 3D gate-edge editor. Placed edges render as solid pipes;
 * candidate edges (unit lattice edges touching placed nodes) render as
 * half-opacity lines. Hovering either highlights it; clicking a candidate
 * places it, clicking a placed edge turns it back into a candidate. Every
 * edit persists to the track store immediately. (VIZ_010–VIZ_013, VIZ_018)
 */
export default function GatesEditor({ trackId, track }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const ctxRef = useRef<SceneContext | null>(null);
  const edgeObjectsRef = useRef<THREE.Object3D[]>([]);
  const hoveredRef = useRef<THREE.Object3D | null>(null);
  const [webglFailed] = useState(() => !isWebglAvailable());
  const metadata = useTrackMetadata(trackId);
  const readonly = metadata?.readonly ?? false;
  const initialTrackRef = useRef(track);

  // Latest track for native event handlers.
  const trackRef = useRef(track);
  useEffect(() => {
    trackRef.current = track;
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ctx = createSceneContext(container, initialTrackRef.current, trackId);
    ctxRef.current = ctx;
    const element = ctx.renderer.domElement;

    const raycaster = new THREE.Raycaster();
    raycaster.params.Line.threshold = 0.1;
    const downPosition = { x: 0, y: 0 };
    const hoverColor = new THREE.Color(cssColor('--tb-color-warning', '#c87d2a'));

    function pick(pointerEvent: PointerEvent): THREE.Object3D | null {
      raycaster.setFromCamera(ndcFromPointer(pointerEvent, element), ctx.camera);
      return raycaster.intersectObjects(edgeObjectsRef.current, false)[0]?.object ?? null;
    }

    function paint(object: THREE.Object3D, hovered: boolean) {
      const material = (object as THREE.Mesh).material as EdgeMaterial;
      material.color.set(hovered ? hoverColor : (object.userData.baseColor as string));
      if (material.transparent) {
        material.opacity = hovered ? CANDIDATE_HOVER_OPACITY : CANDIDATE_OPACITY;
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

    function onPointerMove(pointerEvent: PointerEvent) {
      setHovered(pick(pointerEvent));
    }

    function onPointerDown(pointerEvent: PointerEvent) {
      downPosition.x = pointerEvent.clientX;
      downPosition.y = pointerEvent.clientY;
    }

    function onPointerUp(pointerEvent: PointerEvent) {
      // Don't treat orbit drags as clicks.
      const moved = Math.hypot(
        pointerEvent.clientX - downPosition.x,
        pointerEvent.clientY - downPosition.y,
      );
      if (moved > CLICK_TOLERANCE_PX || pointerEvent.button !== 0) return;
      const hit = pick(pointerEvent);
      if (!hit) return;
      const segment = hit.userData.segment as TrackSegment;
      updateTrack(trackId, toggleEdge(trackRef.current, segment[0], segment[1]));
    }

    element.addEventListener('pointermove', onPointerMove);
    element.addEventListener('pointerdown', onPointerDown);
    element.addEventListener('pointerup', onPointerUp);

    return () => {
      element.removeEventListener('pointermove', onPointerMove);
      element.removeEventListener('pointerdown', onPointerDown);
      element.removeEventListener('pointerup', onPointerUp);
      ctx.dispose();
      ctxRef.current = null;
    };
  }, [trackId]);

  // Rebuild placed pipes + candidate lines whenever the track changes.
  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const { trackGroup } = ctx;
    disposeObject(trackGroup);
    trackGroup.clear();
    edgeObjectsRef.current = [];
    // Hovered object was just disposed; cursor resets on the next pointer move.
    hoveredRef.current = null;
    ctx.renderer.domElement.style.cursor = '';

    trackGroup.add(buildGrid(computeBounds(track)));
    const pathObject = buildPathObject(track);
    (pathObject.material as THREE.LineBasicMaterial).transparent = true;
    (pathObject.material as THREE.LineBasicMaterial).opacity = 0.25;
    trackGroup.add(pathObject);

    const edgeColor = cssColor('--tb-color-canvas-line', '#c9993a');

    for (const segment of track.edges) {
      const pipe = buildPipeMesh(segment, PIPE_RADIUS, edgeColor);
      pipe.userData.segment = segment;
      pipe.userData.baseColor = edgeColor;
      trackGroup.add(pipe);
      edgeObjectsRef.current.push(pipe);
    }

    for (const segment of candidateEdges(track)) {
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(...segment[0]),
        new THREE.Vector3(...segment[1]),
      ]);
      const material = new THREE.LineBasicMaterial({
        color: new THREE.Color(edgeColor),
        transparent: true,
        opacity: CANDIDATE_OPACITY,
      });
      const line = new THREE.Line(geometry, material);
      line.userData.segment = segment;
      line.userData.baseColor = edgeColor;
      trackGroup.add(line);
      edgeObjectsRef.current.push(line);
    }
  }, [track, webglFailed]);

  if (readonly) {
    return (
      <div className={styles.scenePlaceholder}>
        Read-only catalog track — clone it to edit gates.
      </div>
    );
  }

  if (webglFailed) {
    return (
      <div className={styles.viewerFallback}>
        3D view unavailable — WebGL is not supported in this environment.
      </div>
    );
  }

  return (
    <div className={styles.viewer} data-testid="gates-editor">
      <div ref={containerRef} className={styles.viewerCanvas} />
      <div className={styles.viewerOverlay}>
        <p className={styles.viewerHint}>
          Click a faint candidate edge to place it; click a placed pipe to remove it.
        </p>
      </div>
    </div>
  );
}
