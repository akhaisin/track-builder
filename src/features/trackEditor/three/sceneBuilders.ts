import * as THREE from 'three';
import { gateCorners } from '../pathLogic';
import type { Point3, Track, TrackSegment } from '../../../types/tracks';

/**
 * Track data is y-up: edges like ladder rails run along y, the ground is the
 * xz plane. Three.js is also y-up, so data coordinates map 1:1.
 */

export interface SceneBounds {
  min: Point3;
  max: Point3;
  center: [number, number, number];
  radius: number;
}

/** Resolve a `--tb-*` design token to a color, falling back when unset (tests). */
export function cssColor(token: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  return value || fallback;
}

function allPoints(track: Track): Point3[] {
  const points: Point3[] = [];
  for (const [a, b] of track.edges) points.push(a, b);
  for (const step of track.path) for (const [a, b] of step) points.push(a, b);
  return points;
}

export function computeBounds(track: Track): SceneBounds {
  const points = allPoints(track);
  if (points.length === 0) {
    return { min: [0, 0, 0], max: [0, 0, 0], center: [0, 0, 0], radius: 1 };
  }
  const min: Point3 = [Infinity, Infinity, Infinity];
  const max: Point3 = [-Infinity, -Infinity, -Infinity];
  for (const p of points) {
    for (let axis = 0; axis < 3; axis++) {
      min[axis] = Math.min(min[axis], p[axis]);
      max[axis] = Math.max(max[axis], p[axis]);
    }
  }
  const center: [number, number, number] = [
    (min[0] + max[0]) / 2,
    (min[1] + max[1]) / 2,
    (min[2] + max[2]) / 2,
  ];
  const radius = Math.max(
    Math.hypot(max[0] - center[0], max[1] - center[1], max[2] - center[2]),
    1,
  );
  return { min, max, center, radius };
}

/** Flatten segments into a position buffer: [x1,y1,z1, x2,y2,z2, ...]. */
export function flattenSegments(segments: TrackSegment[]): number[] {
  const positions: number[] = [];
  for (const [a, b] of segments) positions.push(...a, ...b);
  return positions;
}

/** All path segments across every gate transition step. */
export function pathSegments(track: Track): TrackSegment[] {
  return track.path.flat();
}

export interface PathLabelAnchor {
  text: string;
  position: [number, number, number];
}

// How far the step number is inset from the gate's top-right corner, in
// lattice units, so the half-size number sits inside the first gate.
const LABEL_INSET = 0.2;

/** The corner a step number anchors to: top (max y), then right (max x, then max z). */
function topRightCorner(corners: Point3[]): Point3 {
  return corners.reduce((best, corner) => {
    if (corner[1] !== best[1]) return corner[1] > best[1] ? corner : best;
    if (corner[0] !== best[0]) return corner[0] > best[0] ? corner : best;
    return corner[2] > best[2] ? corner : best;
  });
}

/** One label anchor per path step, inset inside the top-right corner of the step's first gate. (VIZ_003) */
export function pathLabelAnchors(track: Track): PathLabelAnchor[] {
  return track.path.map((step, index) => {
    const text = String(index + 1);
    const gate = step[0];
    const corners = gate ? gateCorners(gate) : [];
    if (corners.length === 0) {
      // Empty step or a non-square segment: fall back to its midpoint / origin.
      const position: Point3 = gate
        ? [
            (gate[0][0] + gate[1][0]) / 2,
            (gate[0][1] + gate[1][1]) / 2,
            (gate[0][2] + gate[1][2]) / 2,
          ]
        : [0, 0, 0];
      return { text, position };
    }
    const corner = topRightCorner(corners);
    const center: Point3 = [
      (corners[0][0] + corners[1][0] + corners[2][0] + corners[3][0]) / 4,
      (corners[0][1] + corners[1][1] + corners[2][1] + corners[3][1]) / 4,
      (corners[0][2] + corners[1][2] + corners[2][2] + corners[3][2]) / 4,
    ];
    const position = corner.map((value, axis) => {
      const toward = center[axis] - value;
      return toward === 0 ? value : value + Math.sign(toward) * LABEL_INSET;
    }) as Point3;
    return { text, position };
  });
}

function lineSegments(segments: TrackSegment[], color: string): THREE.LineSegments {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(flattenSegments(segments), 3),
  );
  const material = new THREE.LineBasicMaterial({ color: new THREE.Color(color) });
  return new THREE.LineSegments(geometry, material);
}

/** Racing path as a distinct highlighted route. (VIZ_002) */
export function buildPathObject(track: Track): THREE.LineSegments {
  return lineSegments(pathSegments(track), cssColor('--tb-color-success', '#7ab87a'));
}

const PIPE_AXIS = new THREE.Vector3(0, 1, 0);

/** Default radius for placed-edge pipes across editor modes. */
export const PIPE_RADIUS = 0.03;

/** One gate edge as a solid cylinder "pipe" between two lattice points. */
export function buildPipeMesh(
  segment: TrackSegment,
  radius: number,
  color: string,
): THREE.Mesh {
  const start = new THREE.Vector3(...segment[0]);
  const end = new THREE.Vector3(...segment[1]);
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = direction.length();
  const geometry = new THREE.CylinderGeometry(radius, radius, length, 12);
  const material = new THREE.MeshBasicMaterial({ color: new THREE.Color(color) });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(start).addScaledVector(direction, 0.5);
  mesh.quaternion.setFromUnitVectors(PIPE_AXIS, direction.normalize());
  return mesh;
}

export interface GateStyle {
  fill: string;
  fillOpacity: number;
  outline: string;
}

/**
 * Add a gate (1×1 lattice plane, stored as a diagonal) to `target` as a
 * translucent fill quad plus an outline loop. Returns the fill mesh (a usable
 * raycast target) or null for a segment that is not a unit square — those fall
 * back to a plain line so hand-edited data still shows. (VIZ_014)
 */
export function addGateMesh(
  target: THREE.Object3D,
  gate: TrackSegment,
  style: GateStyle,
): THREE.Mesh | null {
  const corners = gateCorners(gate);
  if (corners.length === 0) {
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(...gate[0]),
      new THREE.Vector3(...gate[1]),
    ]);
    target.add(
      new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: new THREE.Color(style.fill) })),
    );
    return null;
  }
  const vectors = corners.map((corner) => new THREE.Vector3(...corner));
  const fillGeometry = new THREE.BufferGeometry().setFromPoints([
    vectors[0], vectors[1], vectors[2],
    vectors[0], vectors[2], vectors[3],
  ]);
  const fillMesh = new THREE.Mesh(
    fillGeometry,
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(style.fill),
      transparent: true,
      opacity: style.fillOpacity,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  target.add(fillMesh);

  const outlineGeometry = new THREE.BufferGeometry().setFromPoints(vectors);
  target.add(
    new THREE.LineLoop(
      outlineGeometry,
      new THREE.LineBasicMaterial({ color: new THREE.Color(style.outline) }),
    ),
  );
  return fillMesh;
}

/**
 * A small stylized quadcopter: a crossed X-frame, four translucent rotor
 * disks, a body, and a nose marker. Built unlit (MeshBasicMaterial) like the
 * rest of the scene. Its local −Z is the forward/heading axis (so a plain
 * `Object3D.lookAt` aims it along travel) and rotor disks face local +Y (up).
 * (VIZ_019)
 */
export function buildQuadcopter(): THREE.Group {
  const quad = new THREE.Group();
  const frameColor = new THREE.Color('#d8d2c4');
  const motorR = 0.16; // motor distance from center, lattice units
  const rotorRadius = 0.1;
  const armDiag = 2 * motorR * Math.SQRT2; // a bar spans two opposite motors

  // X-frame: two thin bars crossing at the center, each reaching two motors.
  const frameMat = new THREE.MeshBasicMaterial({ color: frameColor });
  for (const angle of [Math.PI / 4, -Math.PI / 4]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(armDiag, 0.025, 0.03), frameMat);
    bar.rotation.y = angle;
    quad.add(bar);
  }

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.06, 0.14),
    new THREE.MeshBasicMaterial({ color: frameColor }),
  );
  quad.add(body);

  const rotorMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(cssColor('--tb-color-warning', '#c87d2a')),
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
  });
  for (const sx of [1, -1]) {
    for (const sz of [1, -1]) {
      const rotor = new THREE.Mesh(
        new THREE.CylinderGeometry(rotorRadius, rotorRadius, 0.012, 16),
        rotorMat,
      );
      rotor.position.set(sx * motorR, 0.03, sz * motorR);
      quad.add(rotor);
    }
  }

  // Nose marker at the front (local −Z) so heading reads at a glance.
  const nose = new THREE.Mesh(
    new THREE.ConeGeometry(0.04, 0.1, 12),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(cssColor('--tb-color-danger', '#b94040')) }),
  );
  nose.position.set(0, 0.02, -motorR);
  nose.rotation.x = -Math.PI / 2; // cone tip toward −Z
  quad.add(nose);

  quad.scale.setScalar(0.3); // 30% of the modeled size
  return quad;
}

/** Lattice ground grid with 1-unit cells, sized to the track bounds. (VIZ_001) */
export function buildGrid(bounds: SceneBounds): THREE.GridHelper {
  const size = 2 * Math.ceil(bounds.radius + 2);
  const color = new THREE.Color('#d8cfbf');
  const grid = new THREE.GridHelper(size, size, color, color);
  grid.position.set(Math.round(bounds.center[0]), 0, Math.round(bounds.center[2]));
  const material = grid.material as THREE.Material;
  material.transparent = true;
  material.opacity = 0.15;
  return grid;
}

/** Numbered sprite labels for path steps; empty when 2D canvas is unavailable. */
export function buildLabelSprites(track: Track): THREE.Sprite[] {
  const sprites: THREE.Sprite[] = [];
  for (const anchor of pathLabelAnchors(track)) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return [];
    ctx.font = 'bold 80px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = cssColor('--tb-color-accent-bg', '#f3e4c8');
    ctx.fillText(anchor.text, 64, 64);
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, depthTest: false });
    const sprite = new THREE.Sprite(material);
    sprite.position.set(...anchor.position);
    sprite.scale.set(0.3, 0.3, 1);
    sprites.push(sprite);
  }
  return sprites;
}

/** Dispose geometries, materials, and textures under an object. */
export function disposeObject(root: THREE.Object3D): void {
  root.traverse((node) => {
    const mesh = node as Partial<THREE.Mesh> & THREE.Object3D;
    if (mesh.geometry) mesh.geometry.dispose();
    const material = mesh.material;
    const materials = Array.isArray(material) ? material : material ? [material] : [];
    for (const m of materials) {
      const map = (m as THREE.SpriteMaterial).map;
      if (map) map.dispose();
      m.dispose();
    }
  });
}
