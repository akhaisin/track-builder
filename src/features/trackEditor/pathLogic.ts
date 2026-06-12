import { pointsEqual } from './gatesLogic';
import type { Track, TrackSegment } from '../../types/tracks';

function segmentsEqual(a: TrackSegment, b: TrackSegment): boolean {
  return (
    (pointsEqual(a[0], b[0]) && pointsEqual(a[1], b[1])) ||
    (pointsEqual(a[0], b[1]) && pointsEqual(a[1], b[0]))
  );
}

/** Append a new path step containing one segment. (VIZ_014, VIZ_016) */
export function appendStep(track: Track, segment: TrackSegment): Track | null {
  if (pointsEqual(segment[0], segment[1])) return null;
  return { ...track, path: [...track.path, [segment]] };
}

/** Add a segment to an existing step; rejects degenerate and duplicate segments. */
export function addSegmentToStep(
  track: Track,
  stepIndex: number,
  segment: TrackSegment,
): Track | null {
  const step = track.path[stepIndex];
  if (!step) return null;
  if (pointsEqual(segment[0], segment[1])) return null;
  if (step.some((existing) => segmentsEqual(existing, segment))) return null;
  return {
    ...track,
    path: track.path.map((s, i) => (i === stepIndex ? [...s, segment] : s)),
  };
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
