import { addSegmentToStep, appendStep, moveStep, removeStep } from './pathLogic';
import type { Track, TrackSegment } from '../../types/tracks';

const segA: TrackSegment = [[0, 0, 0], [1, 1, 0]];
const segB: TrackSegment = [[1, 0, 0], [0, 1, 0]];
const segC: TrackSegment = [[0, 1, 0], [1, 2, 0]];

function makeTrack(): Track {
  return { name: 't', edges: [], path: [[segA], [segB]] };
}

describe('appendStep', () => {
  it('adds a new single-segment step at the end', () => {
    const next = appendStep(makeTrack(), segC);
    expect(next?.path).toHaveLength(3);
    expect(next?.path[2]).toEqual([segC]);
  });

  it('rejects degenerate segments', () => {
    expect(appendStep(makeTrack(), [[1, 1, 1], [1, 1, 1]])).toBeNull();
  });
});

describe('addSegmentToStep', () => {
  it('appends a segment to the given step', () => {
    const next = addSegmentToStep(makeTrack(), 0, segC);
    expect(next?.path[0]).toEqual([segA, segC]);
    expect(next?.path[1]).toEqual([segB]);
  });

  it('rejects duplicates within the step (either direction)', () => {
    expect(addSegmentToStep(makeTrack(), 0, segA)).toBeNull();
    expect(addSegmentToStep(makeTrack(), 0, [segA[1], segA[0]])).toBeNull();
  });

  it('rejects unknown step indices', () => {
    expect(addSegmentToStep(makeTrack(), 5, segC)).toBeNull();
  });
});

describe('removeStep', () => {
  it('removes the step at the index', () => {
    const next = removeStep(makeTrack(), 0);
    expect(next.path).toEqual([[segB]]);
  });
});

describe('moveStep', () => {
  it('reorders steps', () => {
    const next = moveStep(makeTrack(), 0, 1);
    expect(next.path).toEqual([[segB], [segA]]);
  });

  it('returns the track unchanged for no-op or out-of-range moves', () => {
    const track = makeTrack();
    expect(moveStep(track, 0, 0)).toBe(track);
    expect(moveStep(track, 0, 5)).toBe(track);
    expect(moveStep(track, -1, 0)).toBe(track);
  });

  it('does not mutate the original', () => {
    const track = makeTrack();
    moveStep(track, 0, 1);
    expect(track.path[0]).toEqual([segA]);
  });
});
