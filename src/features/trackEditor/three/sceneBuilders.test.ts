import * as THREE from 'three';
import {
  addGateMesh,
  buildGrid,
  buildPathObject,
  buildPipeMesh,
  buildQuadcopter,
  computeBounds,
  cssColor,
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
    expect(bounds.min).toEqual([-1, 0, 0]);
    expect(bounds.max).toEqual([2, 3, 0]);
    expect(bounds.center).toEqual([0.5, 1.5, 0]);
    expect(bounds.radius).toBeCloseTo(Math.hypot(1.5, 1.5, 0));
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
      ladder3.path.reduce((sum, step) => sum + step.gates.length, 0),
    );
  });
});

describe('pathLabelAnchors', () => {
  it('numbers each step, inset inside the top-right corner of its first gate', () => {
    const anchors = pathLabelAnchors(ladder3);
    expect(anchors).toHaveLength(ladder3.path.length);
    expect(anchors.map((a) => a.text)).toEqual(['1', '2', '3', '4', '5']);
    // First gate [[0,0,0],[1,1,0]] → top-right corner (1,1,0), inset 0.2 inward.
    expect(anchors[0].position).toEqual([0.8, 0.8, 0]);
  });
});

describe('geometry builders', () => {
  it('builds the path with a color distinct from the structural edges', () => {
    const path = buildPathObject(ladder3);
    const pathColor = (path.material as THREE.LineBasicMaterial).color;
    const edgeColor = new THREE.Color(cssColor('--tb-color-canvas-line', '#c9993a'));
    expect(pathColor.getHexString()).not.toBe(edgeColor.getHexString());
  });

  it('builds a pipe cylinder spanning the segment', () => {
    const pipe = buildPipeMesh([[0, 0, 0], [0, 2, 0]], 0.06, '#c9993a');
    // Positioned at the segment midpoint, as long as the segment.
    expect(pipe.position.toArray()).toEqual([0, 1, 0]);
    const geometry = pipe.geometry as THREE.CylinderGeometry;
    expect(geometry.parameters.height).toBe(2);
    expect(geometry.parameters.radiusTop).toBe(0.06);
    // Oriented along the segment: a local +y unit vector maps onto the edge direction.
    const tip = new THREE.Vector3(0, 1, 0).applyQuaternion(pipe.quaternion);
    expect(tip.y).toBeCloseTo(1);
  });

  it('orients pipes along non-vertical segments', () => {
    const pipe = buildPipeMesh([[0, 0, 0], [1, 0, 0]], 0.06, '#c9993a');
    expect(pipe.position.toArray()).toEqual([0.5, 0, 0]);
    const tip = new THREE.Vector3(0, 1, 0).applyQuaternion(pipe.quaternion);
    expect(tip.x).toBeCloseTo(1);
    expect(tip.y).toBeCloseTo(0);
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

describe('buildQuadcopter', () => {
  it('builds a group of unlit meshes with four rotor disks', () => {
    const quad = buildQuadcopter();
    expect(quad).toBeInstanceOf(THREE.Group);
    const meshes = quad.children.filter((c): c is THREE.Mesh => c instanceof THREE.Mesh);
    expect(meshes.length).toBe(quad.children.length);
    // ConeGeometry (the nose) also extends CylinderGeometry, so match by type.
    const rotors = meshes.filter((m) => m.geometry.type === 'CylinderGeometry');
    expect(rotors).toHaveLength(4);
  });
});

describe('addGateMesh', () => {
  it('adds a translucent fill quad plus an outline, returning the fill mesh', () => {
    const group = new THREE.Group();
    const fill = addGateMesh(group, [[0, 0, 0], [1, 1, 0]], {
      fill: '#7ab87a',
      fillOpacity: 0.3,
      outline: '#7ab87a',
    });
    expect(fill).toBeInstanceOf(THREE.Mesh);
    const material = fill!.material as THREE.MeshBasicMaterial;
    expect(material.transparent).toBe(true);
    expect(material.opacity).toBe(0.3);
    // Fill is two triangles (6 vertices); outline is a 4-corner loop.
    expect(fill!.geometry.getAttribute('position').count).toBe(6);
    expect(group.children.some((child) => child instanceof THREE.LineLoop)).toBe(true);
  });

  it('falls back to a line and returns null for a non-square segment', () => {
    const group = new THREE.Group();
    const result = addGateMesh(group, [[0, 0, 0], [1, 0, 0]], {
      fill: '#ffffff',
      fillOpacity: 0.3,
      outline: '#ffffff',
    });
    expect(result).toBeNull();
    expect(group.children).toHaveLength(1);
    expect(group.children[0]).toBeInstanceOf(THREE.Line);
  });
});
