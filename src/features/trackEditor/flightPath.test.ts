import { flightControlPoints, flightWaypoints, gateCenter, roundCorners } from './flightPath';
import type { Point3, Track } from '../../types/tracks';
import ladder3Json from '../../../public/tracks/elements/ladder3.json';

const ladder3 = ladder3Json as Track;

describe('gateCenter', () => {
  it('is the midpoint of the gate diagonal', () => {
    expect(gateCenter([[1, 0, 0], [0, 1, 0]])).toEqual([0.5, 0.5, 0]);
    expect(gateCenter([[1, 0, 0], [2, 1, 0]])).toEqual([1.5, 0.5, 0]);
  });
});

describe('flightWaypoints', () => {
  it('takes the center of the first gate of each step, in order', () => {
    // ladder3 has 5 steps; steps 2 and 4 have two gates each — only the first
    // gate of each step contributes a waypoint.
    expect(flightWaypoints(ladder3)).toEqual([
      [0.5, 0.5, 0],
      [1.5, 0.5, 0],
      [0.5, 1.5, 0],
      [-0.5, 1.5, 0],
      [0.5, 2.5, 0],
    ]);
  });

  it('skips empty steps', () => {
    const track: Track = {
      edges: [],
      path: [
        { gates: [[[0, 0, 0], [1, 1, 0]]] },
        { gates: [] },
        { gates: [[[1, 1, 0], [2, 2, 0]]] },
      ],
    };
    expect(flightWaypoints(track)).toEqual([
      [0.5, 0.5, 0],
      [1.5, 1.5, 0],
    ]);
  });
});

describe('flightControlPoints', () => {
  it('uses the bare gate center for an undirected step', () => {
    const track: Track = { edges: [], path: [{ gates: [[[1, 0, 0], [0, 1, 0]]] }] };
    expect(flightControlPoints(track)).toEqual([[0.5, 0.5, 0]]);
  });

  it('straddles the center with a pierce pair along the entry direction', () => {
    // A z=0 gate centered at (0.5, 0.5, 0); entry "backward" is +z.
    const track: Track = {
      edges: [],
      path: [{ gates: [[[1, 0, 0], [0, 1, 0]]], entry: 'backward' }],
    };
    expect(flightControlPoints(track)).toEqual([
      [0.5, 0.5, -0.5],
      [0.5, 0.5, 0.5],
    ]);
  });

  it('flips the pierce order for the opposite entry direction', () => {
    const track: Track = {
      edges: [],
      path: [{ gates: [[[1, 0, 0], [0, 1, 0]]], entry: 'forward' }],
    };
    expect(flightControlPoints(track)).toEqual([
      [0.5, 0.5, 0.5],
      [0.5, 0.5, -0.5],
    ]);
  });

  it('ignores an entry not parallel to the gate normal, threading the center', () => {
    // The same z=0 gate cannot be entered "up" (+y lies in its plane).
    const track: Track = {
      edges: [],
      path: [{ gates: [[[1, 0, 0], [0, 1, 0]]], entry: 'up' }],
    };
    expect(flightControlPoints(track)).toEqual([[0.5, 0.5, 0]]);
  });
});

describe('roundCorners', () => {
  // A 4×4 axis-aligned square loop.
  const square: Point3[] = [
    [0, 0, 0],
    [4, 0, 0],
    [4, 4, 0],
    [0, 4, 0],
  ];

  it('replaces each corner with two fillet points toward its neighbors', () => {
    const rounded = roundCorners(square, 1);
    expect(rounded).toHaveLength(8); // two per corner
    // No fillet point lands on an original sharp corner.
    for (const corner of square) {
      expect(rounded.some((p) => p.every((v, i) => v === corner[i]))).toBe(false);
    }
    // Corner [4,0,0]: filleted 1 unit back toward [0,0,0] then toward [4,4,0].
    expect(rounded[2]).toEqual([3, 0, 0]);
    expect(rounded[3]).toEqual([4, 1, 0]);
  });

  it('clamps the fillet to half an edge so the two points never cross', () => {
    // radius 10 on edges of length 4 ⇒ clamped to 2 (the midpoint).
    const rounded = roundCorners(square, 10);
    expect(rounded[2]).toEqual([2, 0, 0]);
    expect(rounded[3]).toEqual([4, 2, 0]);
  });

  it('leaves degenerate loops and zero radius untouched', () => {
    expect(roundCorners(square, 0)).toBe(square);
    expect(roundCorners([[0, 0, 0], [1, 0, 0]], 1)).toHaveLength(2);
  });
});
