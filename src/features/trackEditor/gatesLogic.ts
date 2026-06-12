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

/** Add an edge; rejects zero-length and duplicate edges. (VIZ_010) */
export function addEdge(track: Track, a: Point3, b: Point3): Track | null {
  if (pointsEqual(a, b) || edgeExists(track, a, b)) return null;
  return { ...track, edges: [...track.edges, [a, b]] };
}

/** Delete the edge at `index`. (VIZ_012) */
export function deleteEdge(track: Track, index: number): Track {
  return { ...track, edges: track.edges.filter((_, i) => i !== index) };
}

/** Reposition one endpoint of an edge; rejects degenerate results. (VIZ_011) */
export function moveEdgeEndpoint(
  track: Track,
  index: number,
  end: 0 | 1,
  point: Point3,
): Track | null {
  const edge = track.edges[index];
  if (!edge) return null;
  const other = edge[end === 0 ? 1 : 0];
  if (pointsEqual(point, other)) return null;
  const moved: TrackSegment = end === 0 ? [point, other] : [other, point];
  const duplicate = track.edges.some(
    (candidate, i) => i !== index && segmentMatches(candidate, moved[0], moved[1]),
  );
  if (duplicate) return null;
  return {
    ...track,
    edges: track.edges.map((candidate, i) => (i === index ? moved : candidate)),
  };
}

/** Snap a world-space position to the integer lattice. */
export function snapToLattice(x: number, y: number, z: number): Point3 {
  return [Math.round(x), Math.round(y), Math.round(z)];
}
