import * as THREE from 'three';
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

const LABEL_LIFT = 0.25;

/** One label anchor per path step, at the centroid of the step's segments. (VIZ_003) */
export function pathLabelAnchors(track: Track): PathLabelAnchor[] {
  return track.path.map((step, index) => {
    let x = 0;
    let y = 0;
    let z = 0;
    let count = 0;
    for (const [a, b] of step) {
      x += a[0] + b[0];
      y += a[1] + b[1];
      z += a[2] + b[2];
      count += 2;
    }
    const divisor = Math.max(count, 1);
    return {
      text: String(index + 1),
      position: [x / divisor, y / divisor + LABEL_LIFT, z / divisor],
    };
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

/** Structural edges as amber line segments. (VIZ_001) */
export function buildEdgesObject(track: Track): THREE.LineSegments {
  return lineSegments(track.edges, cssColor('--tb-color-canvas-line', '#c9993a'));
}

/** Racing path as a distinct highlighted route. (VIZ_002) */
export function buildPathObject(track: Track): THREE.LineSegments {
  return lineSegments(pathSegments(track), cssColor('--tb-color-success', '#7ab87a'));
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
    sprite.scale.set(0.6, 0.6, 1);
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
