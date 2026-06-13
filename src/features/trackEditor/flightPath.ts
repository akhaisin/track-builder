import { entryVector } from './pathLogic';
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
    .map((step) => step.gates[0])
    .filter((gate): gate is TrackSegment => Boolean(gate))
    .map(gateCenter);
}

// How far before/after a gate center the directed pierce points sit, in lattice
// units. Threading both forces the curve perpendicular through the gate, in the
// step's entry direction, instead of cutting the shortest diagonal. (VIZ_021)
const PIERCE = 0.2;

/** Move `from` toward `to`, but at most `maxDist` lattice units. */
function clampToward(from: Point3, to: Point3, maxDist: number): Point3 {
  const d: Point3 = [to[0] - from[0], to[1] - from[1], to[2] - from[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  if (len === 0 || len <= maxDist) return to;
  const s = maxDist / len;
  return [from[0] + d[0] * s, from[1] + d[1] * s, from[2] + d[2] * s];
}

/**
 * Relax a closed loop of waypoints toward each point's neighbor midpoint
 * (corner cutting), clamped so none moves more than `maxDeviation` lattice
 * units from where it started. Rounds sharp turns into a smoother flight line
 * while keeping the curve within `maxDeviation` of every gate center. (VIZ_023)
 */
export function relaxWaypoints(points: Point3[], maxDeviation: number): Point3[] {
  const n = points.length;
  if (n < 3 || maxDeviation <= 0) return points;
  return points.map((p, i) => {
    const prev = points[(i - 1 + n) % n];
    const next = points[(i + 1) % n];
    const mid: Point3 = [
      (prev[0] + next[0]) / 2,
      (prev[1] + next[1]) / 2,
      (prev[2] + next[2]) / 2,
    ];
    return clampToward(p, mid, maxDeviation);
  });
}

/**
 * Control points for the flight curve. Gate centers — relaxed toward their
 * neighbors by up to `maxDeviation` for softer turns — thread the loop; a step
 * whose `entry` is parallel to its gate normal contributes a pierce pair
 * straddling its (relaxed) center along the entry direction, so the curve still
 * crosses the gate perpendicular on the intended side. (VIZ_019, VIZ_021, VIZ_023)
 */
export function flightControlPoints(track: Track, maxDeviation = 0): Point3[] {
  const raw: Point3[] = [];
  for (const step of track.path) {
    const gate = step.gates[0];
    if (!gate) continue;
    const c = gateCenter(gate);
    const dir = step.entry ? entryVector(gate, step.entry) : null;
    if (dir) {
      raw.push(
        [c[0] - dir[0] * PIERCE, c[1] - dir[1] * PIERCE, c[2] - dir[2] * PIERCE],
        [c[0] + dir[0] * PIERCE, c[1] + dir[1] * PIERCE, c[2] + dir[2] * PIERCE],
      );
    } else {
      raw.push(c);
    }
  }
  // Relax the whole control polygon — centers *and* pierce points together — so
  // raising the deviation rounds turns coherently (more curvature) instead of
  // kinking the pierce segment at each directed gate. (VIZ_023)
  return relaxWaypoints(raw, maxDeviation);
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
