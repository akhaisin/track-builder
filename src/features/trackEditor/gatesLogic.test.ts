import { candidateEdges, edgeExists, snapToLattice, toggleEdge } from './gatesLogic';
import type { Track, TrackSegment } from '../../types/tracks';

function makeTrack(): Track {
  return {
    name: 't',
    edges: [
      [[0, 0, 0], [0, 1, 0]],
      [[1, 0, 0], [1, 1, 0]],
    ],
    path: [{ gates: [[[0, 0, 0], [1, 1, 0]]] }],
  };
}

function segmentKey([a, b]: TrackSegment): string {
  return [a.join(','), b.join(',')].sort().join('|');
}

describe('candidateEdges', () => {
  it('offers every unit axis edge around placed nodes, minus placed edges', () => {
    const track: Track = { name: 't', edges: [[[0, 0, 0], [0, 1, 0]]], path: [] };
    const candidates = candidateEdges(track);
    // 2 nodes × 6 axis neighbors − shared placed edge (once) − below-floor drop.
    expect(candidates).toHaveLength(9);
    const keys = candidates.map(segmentKey);
    expect(keys).toContain(segmentKey([[0, 0, 0], [1, 0, 0]]));
    expect(keys).toContain(segmentKey([[0, 1, 0], [0, 2, 0]]));
    expect(keys).not.toContain(segmentKey([[0, 0, 0], [0, 1, 0]]));
  });

  it('never offers candidates below the floor (y < 0)', () => {
    const candidates = candidateEdges(makeTrack());
    for (const [a, b] of candidates) {
      expect(Math.min(a[1], b[1])).toBeGreaterThanOrEqual(0);
    }
  });

  it('does not duplicate candidates shared between two placed nodes', () => {
    const candidates = candidateEdges(makeTrack());
    const keys = candidates.map(segmentKey);
    expect(new Set(keys).size).toBe(keys.length);
    // The rungs between the two posts appear exactly once.
    expect(keys).toContain(segmentKey([[0, 0, 0], [1, 0, 0]]));
    expect(keys).toContain(segmentKey([[0, 1, 0], [1, 1, 0]]));
  });

  it('only offers edges touching placed nodes', () => {
    const candidates = candidateEdges(makeTrack());
    const placedNodes = new Set(['0,0,0', '0,1,0', '1,0,0', '1,1,0']);
    for (const [a, b] of candidates) {
      expect(placedNodes.has(a.join(',')) || placedNodes.has(b.join(','))).toBe(true);
    }
  });

  it('seeds candidates around the origin for an empty track, none below the floor', () => {
    const candidates = candidateEdges({ name: 't', edges: [], path: [] });
    expect(candidates).toHaveLength(5);
    for (const [a, b] of candidates) {
      expect(a).toEqual([0, 0, 0]);
      expect(b[1]).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('toggleEdge', () => {
  it('places a candidate edge without mutating the original', () => {
    const track = makeTrack();
    const next = toggleEdge(track, [0, 0, 0], [1, 0, 0]);
    expect(next.edges).toHaveLength(3);
    expect(track.edges).toHaveLength(2);
  });

  it('removes a placed edge clicked in either direction', () => {
    expect(toggleEdge(makeTrack(), [0, 0, 0], [0, 1, 0]).edges).toHaveLength(1);
    expect(toggleEdge(makeTrack(), [0, 1, 0], [0, 0, 0]).edges).toHaveLength(1);
  });

  it('round-trips: toggling twice restores the edge set', () => {
    const track = makeTrack();
    const next = toggleEdge(toggleEdge(track, [0, 0, 0], [1, 0, 0]), [0, 0, 0], [1, 0, 0]);
    expect(next.edges).toEqual(track.edges);
  });

  it('leaves the path untouched', () => {
    const next = toggleEdge(makeTrack(), [0, 0, 0], [0, 1, 0]);
    expect(next.path).toEqual(makeTrack().path);
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
