import {
  flightControlPoints,
  flightWaypoints,
  gateCenter,
  relaxWaypoints,
  roundCorners,
} from './flightPath';
import type { Point3, Track } from '../../types/tracks';

describe('gateCenter', () => {
  it('is the midpoint of the gate diagonal', () => {
    expect(gateCenter([[1, 0, 0], [0, 1, 0]])).toEqual([0.5, 0.5, 0]);
    expect(gateCenter([[1, 0, 0], [2, 1, 0]])).toEqual([1.5, 0.5, 0]);
  });
});

describe('flightWaypoints', () => {
  it('takes the center of the first gate of each step, in order', () => {
    // A multi-gate step contributes only its first gate's center.
    const track: Track = {
      edges: [],
      path: [
        { gates: [[[1, 0, 0], [0, 1, 0]]] },
        { gates: [[[1, 0, 0], [2, 1, 0]], [[1, 1, 0], [2, 2, 0]]] },
      ],
    };
    expect(flightWaypoints(track)).toEqual([
      [0.5, 0.5, 0],
      [1.5, 0.5, 0],
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
    // A z=0 gate centered at (0.5, 0.5, 0); entry "backward" is +z. PIERCE = 0.2.
    const track: Track = {
      edges: [],
      path: [{ gates: [[[1, 0, 0], [0, 1, 0]]], entry: 'backward' }],
    };
    expect(flightControlPoints(track)).toEqual([
      [0.5, 0.5, -0.2],
      [0.5, 0.5, 0.2],
    ]);
  });

  it('flips the pierce order for the opposite entry direction', () => {
    const track: Track = {
      edges: [],
      path: [{ gates: [[[1, 0, 0], [0, 1, 0]]], entry: 'forward' }],
    };
    expect(flightControlPoints(track)).toEqual([
      [0.5, 0.5, 0.2],
      [0.5, 0.5, -0.2],
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

  it('relaxes gate centers toward their neighbors under a max deviation', () => {
    const track: Track = {
      edges: [],
      path: [
        { gates: [[[0, 0, 0], [1, 1, 0]]] }, // center 0.5,0.5,0
        { gates: [[[1, 0, 0], [2, 1, 0]]] }, // center 1.5,0.5,0
        { gates: [[[1, 1, 0], [2, 2, 0]]] }, // center 1.5,1.5,0
      ],
    };
    expect(flightControlPoints(track)[1]).toEqual([1.5, 0.5, 0]);
    // Middle center slides toward the (0.5,0.5,0)/(1.5,1.5,0) midpoint (1,1,0) by 0.3.
    const relaxed = flightControlPoints(track, 0.3)[1];
    expect(relaxed).not.toEqual([1.5, 0.5, 0]);
    expect(Math.hypot(relaxed[0] - 1.5, relaxed[1] - 0.5, relaxed[2])).toBeCloseTo(0.3);
  });
});

describe('relaxWaypoints', () => {
  it('leaves loops untouched for zero deviation or fewer than three points', () => {
    const pts: Point3[] = [[0, 0, 0], [2, 0, 0], [2, 2, 0]];
    expect(relaxWaypoints(pts, 0)).toBe(pts);
    expect(relaxWaypoints([[0, 0, 0], [1, 0, 0]], 0.5)).toHaveLength(2);
  });

  it('slides each point toward its neighbor midpoint, capped at maxDeviation', () => {
    const pts: Point3[] = [[-2, 0, 0], [0, 0, 0], [0, 2, 0]];
    const moved = relaxWaypoints(pts, 0.5)[1]; // neighbor midpoint (-1,1,0)
    expect(Math.hypot(moved[0], moved[1], moved[2])).toBeCloseTo(0.5);
    expect(moved[0]).toBeLessThan(0);
    expect(moved[1]).toBeGreaterThan(0);
  });

  it('reaches the midpoint when it is nearer than maxDeviation', () => {
    const pts: Point3[] = [[-0.2, 0, 0], [0, 0, 0], [0, 0.2, 0]];
    const moved = relaxWaypoints(pts, 0.5)[1]; // midpoint (-0.1, 0.1, 0)
    expect(moved[0]).toBeCloseTo(-0.1);
    expect(moved[1]).toBeCloseTo(0.1);
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
