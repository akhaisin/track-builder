import {
  appendStep,
  entryFromViewpoint,
  entryVector,
  gateCorners,
  gateNeighbors,
  gateNormalAxis,
  gatesAlongEdge,
  gatesEqual,
  moveStep,
  nextGateCandidates,
  pathStepLabels,
  removeStep,
  toggleStepAux,
} from './pathLogic';
import type { Gate } from './pathLogic';
import type { Track, TrackSegment } from '../../types/tracks';

// Gates in the z=0 plane around the unit edge from (0,0,0) up to (0,1,0).
const edge: TrackSegment = [[0, 0, 0], [0, 1, 0]];
const gateRight: Gate = [[0, 0, 0], [1, 1, 0]]; // spans x ∈ [0,1]
const gateLeft: Gate = [[0, 0, 0], [-1, 1, 0]]; // spans x ∈ [-1,0]

function makeTrack(): Track {
  return { name: 't', edges: [], path: [{ gates: [gateRight] }, { gates: [gateLeft] }] };
}

describe('gateCorners / gatesEqual', () => {
  it('expands a diagonal into the 4 ring-ordered corners', () => {
    expect(gateCorners(gateRight)).toEqual([
      [0, 0, 0],
      [1, 0, 0],
      [1, 1, 0],
      [0, 1, 0],
    ]);
  });

  it('returns no corners for segments that are not unit-square diagonals', () => {
    expect(gateCorners([[0, 0, 0], [1, 0, 0]])).toEqual([]); // straight edge
    expect(gateCorners([[0, 0, 0], [1, 1, 1]])).toEqual([]); // 3-axis diagonal
    expect(gateCorners([[0, 0, 0], [2, 1, 0]])).toEqual([]); // not unit
  });

  it('treats both diagonals of the same square as equal', () => {
    const otherDiagonal: Gate = [[1, 0, 0], [0, 1, 0]];
    expect(gatesEqual(gateRight, otherDiagonal)).toBe(true);
    expect(gatesEqual(gateRight, gateLeft)).toBe(false);
  });

  it('never equates non-gate segments', () => {
    expect(gatesEqual([[0, 0, 0], [1, 0, 0]], [[0, 0, 0], [1, 0, 0]])).toBe(false);
  });
});

describe('gatesAlongEdge', () => {
  it('offers the 4 squares having the edge as a side', () => {
    const gates = gatesAlongEdge(edge);
    expect(gates).toHaveLength(4);
    expect(gates.some((gate) => gatesEqual(gate, gateRight))).toBe(true);
    expect(gates.some((gate) => gatesEqual(gate, gateLeft))).toBe(true);
    // The other two lie in the x=0 plane (spanning z).
    expect(gates.some((gate) => gatesEqual(gate, [[0, 0, 0], [0, 1, 1]]))).toBe(true);
    expect(gates.some((gate) => gatesEqual(gate, [[0, 0, 0], [0, 1, -1]]))).toBe(true);
  });

  it('returns nothing for non-unit or diagonal edges', () => {
    expect(gatesAlongEdge([[0, 0, 0], [0, 2, 0]])).toEqual([]);
    expect(gatesAlongEdge([[0, 0, 0], [1, 1, 0]])).toEqual([]);
  });
});

describe('gateNeighbors', () => {
  it('returns the 4 in-plane gates sharing a side', () => {
    const neighbors = gateNeighbors(gateRight);
    expect(neighbors).toHaveLength(4);
    for (const neighbor of neighbors) {
      // Same plane: z stays 0.
      expect(neighbor[0][2]).toBe(0);
      expect(neighbor[1][2]).toBe(0);
    }
    expect(neighbors.some((gate) => gatesEqual(gate, [[1, 0, 0], [2, 1, 0]]))).toBe(true);
    expect(neighbors.some((gate) => gatesEqual(gate, [[0, 1, 0], [1, 2, 0]]))).toBe(true);
  });
});

describe('nextGateCandidates', () => {
  // A ladder: two vertical pipes (x=0 and x=1) of two segments each. The
  // initiating edge is the lower-left pipe segment.
  const rightLower: TrackSegment = [[1, 0, 0], [1, 1, 0]];
  const leftUpper: TrackSegment = [[0, 1, 0], [0, 2, 0]];
  const rightUpper: TrackSegment = [[1, 1, 0], [1, 2, 0]];
  const ladder: Track = {
    name: 't',
    edges: [edge, rightLower, leftUpper, rightUpper],
    path: [],
  };
  const gateUp: Gate = [[0, 1, 0], [1, 2, 0]]; // the cell above gateRight

  it('starts with the 4 gates along the edge for an empty draft', () => {
    expect(nextGateCandidates(ladder, edge, [])).toHaveLength(4);
  });

  it('continues with anchored in-plane neighbors, excluding the gate across the initial edge', () => {
    const candidates = nextGateCandidates(ladder, edge, [gateRight]);
    // Of the 4 neighbors: across the initial edge (gateLeft) and below the
    // floor are excluded; rightwards crosses the placed right pipe; only the
    // cell between the upper pipe segments remains.
    expect(candidates).toHaveLength(1);
    expect(gatesEqual(candidates[0], gateUp)).toBe(true);
    expect(candidates.some((gate) => gatesEqual(gate, gateLeft))).toBe(false);
  });

  it('excludes gates already in the draft', () => {
    const candidates = nextGateCandidates(ladder, edge, [gateRight, gateUp]);
    // gateRight (down from gateUp) is in the draft; sideways crosses the
    // pipes; only the cell above the ladder top (anchored via its corner
    // nodes) remains.
    expect(candidates.some((gate) => gatesEqual(gate, gateRight))).toBe(false);
    expect(candidates).toHaveLength(1);
    expect(gatesEqual(candidates[0], [[0, 2, 0], [1, 3, 0]])).toBe(true);
  });

  it('never offers gates lying on or below the floor', () => {
    // Edge lying in the floor plane: of its 4 gates, two are flat on the
    // floor and one hangs below — only the upward gate remains.
    const floorEdge: TrackSegment = [[0, 0, 0], [1, 0, 0]];
    const floorTrack: Track = { name: 't', edges: [floorEdge], path: [] };
    const candidates = nextGateCandidates(floorTrack, floorEdge, []);
    expect(candidates).toHaveLength(1);
    expect(candidates.some((gate) => gatesEqual(gate, [[0, 0, 0], [1, 1, 0]]))).toBe(true);

    // Chaining from a vertical gate never descends below the floor either.
    for (const gate of nextGateCandidates(ladder, edge, [gateRight])) {
      expect(Math.min(gate[0][1], gate[1][1])).toBeGreaterThanOrEqual(0);
      expect(Math.max(gate[0][1], gate[1][1])).toBeGreaterThan(0);
    }
  });

  it('does not extend across a placed edge', () => {
    // Without a rung above gateRight, extending up is allowed.
    const open: Track = { name: 't', edges: [edge, rightLower, leftUpper], path: [] };
    expect(
      nextGateCandidates(open, edge, [gateRight]).some((gate) => gatesEqual(gate, gateUp)),
    ).toBe(true);
    // A rung along the shared side blocks the same extension.
    const rung: TrackSegment = [[0, 1, 0], [1, 1, 0]];
    const blocked: Track = { ...open, edges: [...open.edges, rung] };
    expect(nextGateCandidates(blocked, edge, [gateRight])).toHaveLength(0);
  });

  it('only offers gates touching the structure (placed node or edge)', () => {
    // A single pipe: the cell above gateRight still touches the pipe's top
    // node at a corner — offered; drifting sideways into empty space is not.
    const single: Track = { name: 't', edges: [edge], path: [] };
    const candidates = nextGateCandidates(single, edge, [gateRight]);
    expect(candidates).toHaveLength(1);
    expect(gatesEqual(candidates[0], gateUp)).toBe(true);
    // Continuing straight up leaves the structure behind — not offered.
    const further = nextGateCandidates(single, edge, [gateRight, gateUp]);
    expect(further.some((gate) => gatesEqual(gate, [[0, 2, 0], [1, 3, 0]]))).toBe(false);
  });

  it('wraps all the way around one pipe to the opposite side', () => {
    // A single pipe. Starting on its right, a step can arch over the top and
    // come back down the left — reaching the gate across the initiating edge,
    // which must not be banned outright. (regression)
    const single: Track = { name: 't', edges: [edge], path: [] };
    const aboveLeft: Gate = [[0, 1, 0], [-1, 2, 0]];

    // gateRight → gateUp → aboveLeft → gateLeft.
    expect(
      nextGateCandidates(single, edge, [gateRight, gateUp]).some((g) => gatesEqual(g, aboveLeft)),
    ).toBe(true);
    const closing = nextGateCandidates(single, edge, [gateRight, gateUp, aboveLeft]);
    expect(closing.some((g) => gatesEqual(g, gateLeft))).toBe(true);
  });

  it('wraps around the structure via shared placed nodes (shoulder steps)', () => {
    // A two-segment vertical pole; the draft grows in the x=0 plane beside it.
    const pole: Track = {
      name: 't',
      edges: [[[0, 0, 0], [0, 1, 0]], [[0, 1, 0], [0, 2, 0]]],
      path: [],
    };
    const sideGate: Gate = [[0, 1, 0], [0, 2, 1]]; // beside the upper segment
    const candidates = nextGateCandidates(pole, [[0, 1, 0], [0, 2, 0]], [sideGate]);
    // The cell above the pole touches its top node only at a corner — offered,
    // so the step can continue around the pole's end.
    expect(candidates.some((gate) => gatesEqual(gate, [[0, 2, 0], [0, 3, 1]]))).toBe(true);
    // Drifting away from the pole stays forbidden.
    expect(candidates.some((gate) => gatesEqual(gate, [[0, 1, 1], [0, 2, 2]]))).toBe(false);
  });
});

describe('gate direction', () => {
  const zGate: Gate = [[1, 0, 0], [0, 1, 0]]; // lies in z=0; normal axis is z (2)

  it('finds the axis perpendicular to the gate plane', () => {
    expect(gateNormalAxis(zGate)).toBe(2);
    expect(gateNormalAxis([[0, 0, 0], [0, 1, 1]])).toBe(0); // x-normal
    expect(gateNormalAxis([[0, 0, 0], [1, 0, 0]])).toBeNull(); // not a gate
  });

  it('keeps only entry directions parallel to the gate normal', () => {
    expect(entryVector(zGate, 'backward')).toEqual([0, 0, 1]);
    expect(entryVector(zGate, 'forward')).toEqual([0, 0, -1]);
    expect(entryVector(zGate, 'up')).toBeNull(); // +y lies in the gate plane
  });

  it('enters away from the viewpoint along the gate normal', () => {
    expect(entryFromViewpoint(zGate, [0.5, 0.5, -5])).toBe('backward'); // travel +z
    expect(entryFromViewpoint(zGate, [0.5, 0.5, 5])).toBe('forward'); // travel −z
  });
});

describe('appendStep', () => {
  it('adds the draft gates as a new step at the end', () => {
    const second: Gate = [[1, 0, 0], [2, 1, 0]];
    const next = appendStep(makeTrack(), [gateRight, second]);
    expect(next?.path).toHaveLength(3);
    expect(next?.path[2]).toEqual({ gates: [gateRight, second] });
  });

  it('records the entry direction when given', () => {
    const next = appendStep(makeTrack(), [gateRight], 'backward');
    expect(next?.path[2]).toEqual({ gates: [gateRight], entry: 'backward' });
  });

  it('rejects an empty draft', () => {
    expect(appendStep(makeTrack(), [])).toBeNull();
  });

  it('does not mutate the original', () => {
    const track = makeTrack();
    appendStep(track, [gateRight]);
    expect(track.path).toHaveLength(2);
  });
});

describe('removeStep', () => {
  it('removes the step at the index', () => {
    const next = removeStep(makeTrack(), 0);
    expect(next.path).toEqual([{ gates: [gateLeft] }]);
  });
});

describe('pathStepLabels', () => {
  it('numbers main steps and sub-numbers aux steps against the prior main', () => {
    const path = [
      { gates: [gateRight] },
      { gates: [gateRight], aux: true },
      { gates: [gateRight], aux: true },
      { gates: [gateRight] },
      { gates: [gateRight], aux: true },
    ];
    expect(pathStepLabels(path)).toEqual(['1', '1-1', '1-2', '2', '2-1']);
  });

  it('hangs leading aux steps off step zero', () => {
    expect(pathStepLabels([{ gates: [gateRight], aux: true }, { gates: [gateRight] }])).toEqual([
      '0-1',
      '1',
    ]);
  });
});

describe('toggleStepAux', () => {
  it('turns a step aux on, then off (dropping the flag)', () => {
    const auxed = toggleStepAux(makeTrack(), 0);
    expect(auxed.path[0]).toEqual({ gates: [gateRight], aux: true });
    expect(toggleStepAux(auxed, 0).path[0]).toEqual({ gates: [gateRight] });
  });

  it('does not mutate the original', () => {
    const track = makeTrack();
    toggleStepAux(track, 0);
    expect(track.path[0]).toEqual({ gates: [gateRight] });
  });
});

describe('moveStep', () => {
  it('reorders steps', () => {
    const next = moveStep(makeTrack(), 0, 1);
    expect(next.path).toEqual([{ gates: [gateLeft] }, { gates: [gateRight] }]);
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
    expect(track.path[0]).toEqual({ gates: [gateRight] });
  });
});
