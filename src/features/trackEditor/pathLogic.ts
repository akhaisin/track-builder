import { pointsEqual } from './gatesLogic';
import type { Point3, Track, TrackSegment } from '../../types/tracks';

/**
 * A gate is a 1×1 axis-aligned lattice square, stored as a diagonal segment:
 * the two endpoints are opposite corners, differing by ±1 on exactly two
 * axes. A path step is one or more coplanar, edge-connected gates. (VIZ_014)
 */
export type Gate = TrackSegment;

export function segmentsEqual(a: TrackSegment, b: TrackSegment): boolean {
  return (
    (pointsEqual(a[0], b[0]) && pointsEqual(a[1], b[1])) ||
    (pointsEqual(a[0], b[1]) && pointsEqual(a[1], b[0]))
  );
}

/** The two axes a gate's diagonal spans, or null if the segment is not a gate. */
function gateAxes(gate: Gate): [number, number] | null {
  const axes = [0, 1, 2].filter((axis) => gate[0][axis] !== gate[1][axis]);
  if (axes.length !== 2) return null;
  if (axes.some((axis) => Math.abs(gate[0][axis] - gate[1][axis]) !== 1)) return null;
  return [axes[0], axes[1]];
}

/** The gate's 4 corners in ring order, or [] if the segment is not a gate. */
export function gateCorners(gate: Gate): Point3[] {
  const axes = gateAxes(gate);
  if (!axes) return [];
  const [p, q] = gate;
  const [i, j] = axes;
  const second: Point3 = [...p];
  second[i] = q[i];
  const fourth: Point3 = [...p];
  fourth[j] = q[j];
  return [p, second, q, fourth];
}

/** Canonical identity of the square, independent of which diagonal encodes it. */
export function gateKey(gate: Gate): string {
  return gateCorners(gate)
    .map((corner) => corner.join(','))
    .sort()
    .join('|');
}

export function gatesEqual(a: Gate, b: Gate): boolean {
  const key = gateKey(a);
  return key !== '' && key === gateKey(b);
}

function translateGate(gate: Gate, delta: Point3): Gate {
  return gate.map(
    (point) => point.map((value, axis) => value + delta[axis]) as Point3,
  ) as Gate;
}

/**
 * The 4 gates that have `edge` as one of their sides. Empty when the edge is
 * not a unit axis-aligned lattice edge. (VIZ_016)
 */
export function gatesAlongEdge(edge: TrackSegment): Gate[] {
  const [a, b] = edge;
  const diff = [0, 1, 2].filter((axis) => a[axis] !== b[axis]);
  if (diff.length !== 1 || Math.abs(a[diff[0]] - b[diff[0]]) !== 1) return [];
  const gates: Gate[] = [];
  for (const axis of [0, 1, 2]) {
    if (axis === diff[0]) continue;
    for (const sign of [1, -1]) {
      const far: Point3 = [...b];
      far[axis] += sign;
      gates.push([a, far]);
    }
  }
  return gates;
}

/** The 4 in-plane gates sharing a side with `gate`. */
export function gateNeighbors(gate: Gate): Gate[] {
  const axes = gateAxes(gate);
  if (!axes) return [];
  const neighbors: Gate[] = [];
  for (const axis of axes) {
    for (const sign of [1, -1]) {
      const delta: Point3 = [0, 0, 0];
      delta[axis] = sign;
      neighbors.push(translateGate(gate, delta));
    }
  }
  return neighbors;
}

/** The gate's side facing `sign` along `axis`: the two corners at that extreme. */
function gateSide(gate: Gate, axis: number, sign: number): TrackSegment | null {
  const corners = gateCorners(gate);
  if (corners.length === 0) return null;
  const values = corners.map((corner) => corner[axis]);
  const extreme = sign > 0 ? Math.max(...values) : Math.min(...values);
  const side = corners.filter((corner) => corner[axis] === extreme);
  return side.length === 2 ? [side[0], side[1]] : null;
}

/**
 * A gate must touch the structure: at least one of its corners is a node of
 * a placed edge (a side lying on a placed edge implies this too). This keeps
 * every gate at most one tile from the track while letting steps wrap around
 * corners of the structure in shoulder shapes.
 */
function gateAnchored(track: Track, gate: Gate): boolean {
  return gateCorners(gate).some((corner) =>
    track.edges.some(
      (edge) => pointsEqual(edge[0], corner) || pointsEqual(edge[1], corner),
    ),
  );
}

/**
 * Gates lying flat on the floor or dipping below it are never offered.
 * The diagonal endpoints always carry the gate's min/max y.
 */
function gateAboveFloor(gate: Gate): boolean {
  const [p, q] = gate;
  return Math.min(p[1], q[1]) >= 0 && Math.max(p[1], q[1]) > 0;
}

/**
 * Candidate gates for a step being created from `initialEdge`. With an empty
 * draft these are the 4 gates along the edge; afterwards, the in-plane
 * neighbors of the last added gate, excluding gates already in the draft,
 * gates reached by crossing a placed edge (a pipe divides the opening), and
 * unanchored gates not touching any placed node. Gates on or below the floor
 * are never offered. Stepping straight back across the initiating edge is
 * blocked by the crossing rule (the initiating edge is itself placed), but a
 * step may still wrap around the structure and reach that gate from another
 * direction — so it is not banned outright. (VIZ_016)
 */
export function nextGateCandidates(
  track: Track,
  initialEdge: TrackSegment,
  draft: Gate[],
): Gate[] {
  if (draft.length === 0) return gatesAlongEdge(initialEdge).filter(gateAboveFloor);
  const last = draft[draft.length - 1];
  const axes = gateAxes(last);
  if (!axes) return [];

  const candidates: Gate[] = [];
  for (const axis of axes) {
    for (const sign of [1, -1]) {
      const delta: Point3 = [0, 0, 0];
      delta[axis] = sign;
      const neighbor = translateGate(last, delta);
      if (!gateAboveFloor(neighbor)) continue;
      if (!gateAnchored(track, neighbor)) continue;
      const side = gateSide(last, axis, sign);
      if (side && track.edges.some((edge) => segmentsEqual(edge, side))) continue;
      if (draft.some((existing) => gatesEqual(existing, neighbor))) continue;
      candidates.push(neighbor);
    }
  }
  return candidates;
}

/** Append a finished step of one or more gates. (VIZ_014, VIZ_016) */
export function appendStep(track: Track, gates: Gate[]): Track | null {
  if (gates.length === 0) return null;
  return { ...track, path: [...track.path, gates] };
}

/** Remove a whole path step. (VIZ_016) */
export function removeStep(track: Track, stepIndex: number): Track {
  return { ...track, path: track.path.filter((_, i) => i !== stepIndex) };
}

/** Reorder: move the step at `from` to position `to`. (VIZ_015) */
export function moveStep(track: Track, from: number, to: number): Track {
  if (
    from === to ||
    from < 0 ||
    to < 0 ||
    from >= track.path.length ||
    to >= track.path.length
  ) {
    return track;
  }
  const path = [...track.path];
  const [step] = path.splice(from, 1);
  path.splice(to, 0, step);
  return { ...track, path };
}
