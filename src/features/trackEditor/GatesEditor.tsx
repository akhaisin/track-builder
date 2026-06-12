import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { buildGrid, buildPathObject, computeBounds, cssColor, disposeObject } from './three/sceneBuilders';
import { createSceneContext, isWebglAvailable } from './three/sceneSetup';
import { addEdge, deleteEdge, moveEdgeEndpoint, snapToLattice } from './gatesLogic';
import { updateTrack } from '../../store/trackActions';
import { useTrackMetadata } from '../../store/useMetadataStore';
import type { SceneContext } from './three/sceneSetup';
import type { Point3, Track } from '../../types/tracks';
import type { ToolbarEventBus } from './toolbarEventBus';
import styles from './TrackEditor.module.css';

export interface Props {
  trackId: string;
  track: Track;
  events: ToolbarEventBus;
}

type GatesTool = 'select' | 'add';

interface PickedEndpoint {
  edgeIndex: number;
  end: 0 | 1;
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
 * Interactive 3D gate-edge editor: select edges, move endpoints (pick up,
 * then drop on a lattice point), add edges with two clicks, delete the
 * selection. Every edit persists to the track store immediately. (VIZ_010–VIZ_013)
 */
export default function GatesEditor({ trackId, track, events }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const ctxRef = useRef<SceneContext | null>(null);
  const edgeLinesRef = useRef<THREE.Line[]>([]);
  const markersRef = useRef<THREE.Mesh[]>([]);
  const [webglFailed] = useState(() => !isWebglAvailable());
  const [tool, setTool] = useState<GatesTool>('select');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [pickedEndpoint, setPickedEndpoint] = useState<PickedEndpoint | null>(null);
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
  const stateRef = useRef({ tool, selectedIndex, pickedEndpoint, pendingPoint, level, track });
  useEffect(() => {
    stateRef.current = { tool, selectedIndex, pickedEndpoint, pendingPoint, level, track };
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
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

      if (state.tool === 'add') {
        const point = latticePointAt(ndc);
        if (!point) return;
        if (!state.pendingPoint) {
          setPendingPoint(point);
        } else {
          commit(addEdge(state.track, state.pendingPoint, point));
          setPendingPoint(null);
        }
        return;
      }

      raycaster.setFromCamera(ndc, ctx.camera);

      if (state.pickedEndpoint) {
        const point = latticePointAt(ndc);
        if (point) {
          commit(
            moveEdgeEndpoint(
              state.track,
              state.pickedEndpoint.edgeIndex,
              state.pickedEndpoint.end,
              point,
            ),
          );
        }
        setPickedEndpoint(null);
        return;
      }

      const markerHit = raycaster.intersectObjects(markersRef.current, false)[0];
      if (markerHit) {
        setPickedEndpoint(markerHit.object.userData as PickedEndpoint);
        return;
      }

      const lineHit = raycaster.intersectObjects(edgeLinesRef.current, false)[0];
      setSelectedIndex(
        lineHit ? (lineHit.object.userData.edgeIndex as number) : null,
      );
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
  }, [commit]);

  // Keyboard shortcuts: Delete removes the selection, Escape cancels pending ops.
  useEffect(() => {
    function onKeyDown(keyEvent: KeyboardEvent) {
      if (keyEvent.key === 'Escape') {
        setPendingPoint(null);
        setPickedEndpoint(null);
      }
      if ((keyEvent.key === 'Delete' || keyEvent.key === 'Backspace') && selectedIndex !== null) {
        commit(deleteEdge(track, selectedIndex));
        setSelectedIndex(null);
        setPickedEndpoint(null);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [commit, selectedIndex, track]);

  // Toolbar events arrive over the bus. (WS_013)
  useEffect(() => {
    return events.subscribe((toolbarEvent) => {
      switch (toolbarEvent.type) {
        case 'gates:tool:select':
          setTool('select');
          setPendingPoint(null);
          break;
        case 'gates:tool:add':
          setTool('add');
          setPickedEndpoint(null);
          setSelectedIndex(null);
          break;
        case 'gates:delete-selected': {
          const { selectedIndex: current, track: currentTrack } = stateRef.current;
          if (current !== null) commit(deleteEdge(currentTrack, current));
          setSelectedIndex(null);
          setPickedEndpoint(null);
          break;
        }
      }
    });
  }, [events, commit]);

  // Rebuild editable scene content on any relevant change.
  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const { trackGroup } = ctx;
    disposeObject(trackGroup);
    trackGroup.clear();
    edgeLinesRef.current = [];
    markersRef.current = [];

    trackGroup.add(buildGrid(computeBounds(track)));
    const pathObject = buildPathObject(track);
    (pathObject.material as THREE.LineBasicMaterial).transparent = true;
    (pathObject.material as THREE.LineBasicMaterial).opacity = 0.25;
    trackGroup.add(pathObject);

    const edgeColor = cssColor('--tb-color-canvas-line', '#c9993a');
    const selectedColor = cssColor('--tb-color-warning', '#c87d2a');

    track.edges.forEach((edge, index) => {
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(...edge[0]),
        new THREE.Vector3(...edge[1]),
      ]);
      const material = new THREE.LineBasicMaterial({
        color: new THREE.Color(index === selectedIndex ? selectedColor : edgeColor),
      });
      const line = new THREE.Line(geometry, material);
      line.userData.edgeIndex = index;
      trackGroup.add(line);
      edgeLinesRef.current.push(line);
    });

    if (selectedIndex !== null && track.edges[selectedIndex]) {
      const edge = track.edges[selectedIndex];
      ([0, 1] as const).forEach((end) => {
        const picked =
          pickedEndpoint?.edgeIndex === selectedIndex && pickedEndpoint.end === end;
        const marker = new THREE.Mesh(
          new THREE.SphereGeometry(0.12, 12, 12),
          new THREE.MeshBasicMaterial({
            color: new THREE.Color(picked ? '#ffffff' : selectedColor),
          }),
        );
        marker.position.set(...edge[end]);
        marker.userData = { edgeIndex: selectedIndex, end } satisfies PickedEndpoint;
        trackGroup.add(marker);
        markersRef.current.push(marker);
      });
    }

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
  }, [track, selectedIndex, pickedEndpoint, pendingPoint, webglFailed]);

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

  const hint =
    tool === 'add'
      ? pendingPoint
        ? 'Click the second lattice point to finish the edge.'
        : 'Click the first lattice point of the new edge.'
      : pickedEndpoint
        ? 'Click a lattice point to drop the endpoint.'
        : 'Click an edge to select it; click a selected endpoint to pick it up. Delete removes the selection.';

  return (
    <div className={styles.viewer} data-testid="gates-editor">
      <div ref={containerRef} className={styles.viewerCanvas} />
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
    </div>
  );
}
