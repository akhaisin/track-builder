import type { Point3, Track, TrackSegment } from '../../types/tracks';

export function pointsEqual(a: Point3, b: Point3): boolean {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
}

function segmentMatches(segment: TrackSegment, a: Point3, b: Point3): boolean {
  return (
    (pointsEqual(segment[0], a) && pointsEqual(segment[1], b)) ||
    (pointsEqual(segment[0], b) && pointsEqual(segment[1], a))
  );
}

export function edgeExists(track: Track, a: Point3, b: Point3): boolean {
  return track.edges.some((edge) => segmentMatches(edge, a, b));
}

const AXIS_OFFSETS: Point3[] = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
];

/**
 * Candidate edges: every unit axis-aligned lattice edge touching a node of a
 * placed edge, minus the placed edges themselves. Candidates never extend
 * below the floor (y < 0). An empty track seeds candidates around the origin
 * so there is always something to click. (VIZ_010)
 */
export function candidateEdges(track: Track): TrackSegment[] {
  const nodes: Point3[] = [];
  const nodeKeys = new Set<string>();
  function addNode(point: Point3) {
    const key = point.join(',');
    if (nodeKeys.has(key)) return;
    nodeKeys.add(key);
    nodes.push(point);
  }
  for (const [a, b] of track.edges) {
    addNode(a);
    addNode(b);
  }
  if (nodes.length === 0) addNode([0, 0, 0]);

  const candidates: TrackSegment[] = [];
  const seen = new Set<string>();
  for (const node of nodes) {
    for (const offset of AXIS_OFFSETS) {
      const neighbor: Point3 = [
        node[0] + offset[0],
        node[1] + offset[1],
        node[2] + offset[2],
      ];
      if (Math.min(node[1], neighbor[1]) < 0) continue;
      const key = [node.join(','), neighbor.join(',')].sort().join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      if (!edgeExists(track, node, neighbor)) candidates.push([node, neighbor]);
    }
  }
  return candidates;
}

/** Toggle an edge: placed → removed (back to candidate), otherwise → placed. (VIZ_011, VIZ_012) */
export function toggleEdge(track: Track, a: Point3, b: Point3): Track {
  if (edgeExists(track, a, b)) {
    return { ...track, edges: track.edges.filter((edge) => !segmentMatches(edge, a, b)) };
  }
  return { ...track, edges: [...track.edges, [a, b]] };
}

/** Snap a world-space position to the integer lattice. */
export function snapToLattice(x: number, y: number, z: number): Point3 {
  return [Math.round(x), Math.round(y), Math.round(z)];
}
