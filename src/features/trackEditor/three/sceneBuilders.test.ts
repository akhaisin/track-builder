import * as THREE from 'three';
import {
  buildEdgesObject,
  buildGrid,
  buildPathObject,
  computeBounds,
  flattenSegments,
  pathLabelAnchors,
  pathSegments,
} from './sceneBuilders';
import type { Track } from '../../../types/tracks';
import ladder3Json from '../../../../public/tracks/elements/ladder3.json';

const ladder3 = ladder3Json as Track;

describe('computeBounds', () => {
  it('spans all edge and path points', () => {
    const bounds = computeBounds(ladder3);
    expect(bounds.min).toEqual([0, 0, 0]);
    expect(bounds.max).toEqual([1, 3, 0]);
    expect(bounds.center).toEqual([0.5, 1.5, 0]);
    expect(bounds.radius).toBeCloseTo(Math.hypot(0.5, 1.5, 0));
  });

  it('returns a safe default for an empty track', () => {
    const bounds = computeBounds({ edges: [], path: [] });
    expect(bounds.center).toEqual([0, 0, 0]);
    expect(bounds.radius).toBe(1);
  });
});

describe('flattenSegments / pathSegments', () => {
  it('flattens segments into a position buffer', () => {
    expect(flattenSegments([[[0, 0, 0], [1, 1, 0]]])).toEqual([0, 0, 0, 1, 1, 0]);
  });

  it('collects all path steps', () => {
    expect(pathSegments(ladder3)).toHaveLength(
      ladder3.path.reduce((sum, step) => sum + step.length, 0),
    );
  });
});

describe('pathLabelAnchors', () => {
  it('produces one numbered label per path step at the step centroid', () => {
    const anchors = pathLabelAnchors(ladder3);
    expect(anchors).toHaveLength(ladder3.path.length);
    expect(anchors.map((a) => a.text)).toEqual(['1', '2', '3', '4', '5']);
    // First step is a single segment [[0,0,0],[1,1,0]] → centroid [0.5, 0.5, 0], lifted.
    expect(anchors[0].position).toEqual([0.5, 0.75, 0]);
  });
});

describe('geometry builders', () => {
  it('builds edge line segments with two vertices per edge', () => {
    const edges = buildEdgesObject(ladder3);
    const positions = edges.geometry.getAttribute('position');
    expect(positions.count).toBe(ladder3.edges.length * 2);
  });

  it('builds the path with a distinct color from the edges', () => {
    const edges = buildEdgesObject(ladder3);
    const path = buildPathObject(ladder3);
    const edgeColor = (edges.material as THREE.LineBasicMaterial).color;
    const pathColor = (path.material as THREE.LineBasicMaterial).color;
    expect(pathColor.getHexString()).not.toBe(edgeColor.getHexString());
  });

  it('builds a translucent lattice grid centred on the track', () => {
    const grid = buildGrid(computeBounds(ladder3));
    expect(grid.position.x).toBe(1);
    expect(grid.position.y).toBe(0);
    const material = grid.material as { transparent: boolean; opacity: number };
    expect(material.transparent).toBe(true);
    expect(material.opacity).toBeLessThan(1);
  });
});
