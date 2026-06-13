import type { Point3, Track, TrackSegment } from '../../types/tracks';

/** Center of a gate square: the midpoint of its diagonal. (VIZ_019) */
export function gateCenter(gate: TrackSegment): Point3 {
  return [
    (gate[0][0] + gate[1][0]) / 2,
    (gate[0][1] + gate[1][1]) / 2,
    (gate[0][2] + gate[1][2]) / 2,
  ];
}

/**
 * The drone's flight waypoints: the center of the *first* gate of each path
 * step, in step order. Steps with multiple gates contribute only their first
 * gate; empty steps are skipped. (VIZ_019)
 */
export function flightWaypoints(track: Track): Point3[] {
  return track.path
    .map((step) => step[0])
    .filter((gate): gate is TrackSegment => Boolean(gate))
    .map(gateCenter);
}

function sub(a: Point3, b: Point3): Point3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

/** `from` plus the unit vector `from→toward` scaled by `distance`. */
function towards(from: Point3, toward: Point3, distance: number): Point3 {
  const d = sub(toward, from);
  const len = Math.hypot(d[0], d[1], d[2]) || 1;
  const s = distance / len;
  return [from[0] + d[0] * s, from[1] + d[1] * s, from[2] + d[2] * s];
}

/**
 * Round the corners of a closed waypoint loop: replace each vertex with two
 * points filleted toward its neighbors, so a spline through the result cuts
 * each corner instead of turning sharply at the gate center. `radius` is the
 * fillet size in lattice units, clamped per-edge to half its length so the two
 * fillet points of an edge never cross. The drone then clips just inside each
 * gate rather than passing dead-center. (VIZ_019)
 */
export function roundCorners(points: Point3[], radius: number): Point3[] {
  const n = points.length;
  if (n < 3 || radius <= 0) return points;
  const rounded: Point3[] = [];
  for (let i = 0; i < n; i++) {
    const prev = points[(i - 1 + n) % n];
    const curr = points[i];
    const next = points[(i + 1) % n];
    const toPrev = Math.min(radius, Math.hypot(...sub(prev, curr)) / 2);
    const toNext = Math.min(radius, Math.hypot(...sub(next, curr)) / 2);
    rounded.push(towards(curr, prev, toPrev), towards(curr, next, toNext));
  }
  return rounded;
}
