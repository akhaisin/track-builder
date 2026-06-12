import { addEdge, deleteEdge, edgeExists, moveEdgeEndpoint, snapToLattice } from './gatesLogic';
import type { Track } from '../../types/tracks';

function makeTrack(): Track {
  return {
    name: 't',
    edges: [
      [[0, 0, 0], [0, 1, 0]],
      [[1, 0, 0], [1, 1, 0]],
    ],
    path: [[[[0, 0, 0], [1, 1, 0]]]],
  };
}

describe('addEdge', () => {
  it('appends a new edge without mutating the original', () => {
    const track = makeTrack();
    const next = addEdge(track, [0, 0, 0], [1, 0, 0]);
    expect(next?.edges).toHaveLength(3);
    expect(track.edges).toHaveLength(2);
  });

  it('rejects zero-length edges', () => {
    expect(addEdge(makeTrack(), [0, 0, 0], [0, 0, 0])).toBeNull();
  });

  it('rejects duplicates in either direction', () => {
    expect(addEdge(makeTrack(), [0, 0, 0], [0, 1, 0])).toBeNull();
    expect(addEdge(makeTrack(), [0, 1, 0], [0, 0, 0])).toBeNull();
  });
});

describe('deleteEdge', () => {
  it('removes the edge at the index', () => {
    const next = deleteEdge(makeTrack(), 0);
    expect(next.edges).toEqual([[[1, 0, 0], [1, 1, 0]]]);
  });

  it('leaves the path untouched', () => {
    const next = deleteEdge(makeTrack(), 0);
    expect(next.path).toEqual(makeTrack().path);
  });
});

describe('moveEdgeEndpoint', () => {
  it('repositions a single endpoint', () => {
    const next = moveEdgeEndpoint(makeTrack(), 0, 1, [0, 2, 0]);
    expect(next?.edges[0]).toEqual([[0, 0, 0], [0, 2, 0]]);
    expect(next?.edges[1]).toEqual(makeTrack().edges[1]);
  });

  it('rejects moves that collapse the edge', () => {
    expect(moveEdgeEndpoint(makeTrack(), 0, 1, [0, 0, 0])).toBeNull();
  });

  it('rejects moves that duplicate another edge', () => {
    const track = makeTrack();
    // Move edge 0 onto edge 1.
    const collapsed = moveEdgeEndpoint(
      { ...track, edges: [[[1, 0, 0], [0, 1, 0]], track.edges[1]] },
      0,
      1,
      [1, 1, 0],
    );
    expect(collapsed).toBeNull();
  });

  it('returns null for an unknown index', () => {
    expect(moveEdgeEndpoint(makeTrack(), 9, 0, [5, 5, 5])).toBeNull();
  });
});

describe('helpers', () => {
  it('edgeExists matches both directions', () => {
    const track = makeTrack();
    expect(edgeExists(track, [0, 1, 0], [0, 0, 0])).toBe(true);
    expect(edgeExists(track, [0, 0, 0], [2, 0, 0])).toBe(false);
  });

  it('snapToLattice rounds to integers', () => {
    expect(snapToLattice(0.4, 1, 2.6)).toEqual([0, 1, 3]);
    expect(snapToLattice(-0.6, 0, -1.4)).toEqual([-1, 0, -1]);
  });
});
