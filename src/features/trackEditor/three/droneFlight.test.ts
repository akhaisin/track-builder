import * as THREE from 'three';
import { createFlightAnimation, trailAlpha } from './droneFlight';
import { gateCenter } from '../flightPath';
import type { Track } from '../../../types/tracks';
import ladder3Json from '../../../../public/tracks/elements/ladder3.json';

const ladder3 = ladder3Json as Track;

describe('trailAlpha', () => {
  const trailFrac = 0.3;

  it('peaks at the drone (behind = 0) and fades monotonically over the trail', () => {
    const atHead = trailAlpha(0, trailFrac);
    const midTrail = trailAlpha(0.15, trailFrac);
    const trailEnd = trailAlpha(trailFrac, trailFrac);
    expect(atHead).toBeGreaterThan(midTrail);
    expect(midTrail).toBeGreaterThan(trailEnd);
  });

  it('rests at the base opacity at the trail end and everywhere ahead of it', () => {
    const base = trailAlpha(trailFrac, trailFrac);
    expect(trailAlpha(0.5, trailFrac)).toBe(base); // beyond the trail
    expect(trailAlpha(0.99, trailFrac)).toBe(base); // just ahead of the drone
  });
});

describe('createFlightAnimation', () => {
  it('returns null when there are fewer than two gates to fly between', () => {
    expect(createFlightAnimation({ edges: [], path: [] })).toBeNull();
    expect(
      createFlightAnimation({ edges: [], path: [{ gates: [[[0, 0, 0], [1, 1, 0]]] }] }),
    ).toBeNull();
  });

  it('builds a quad + trail line that flies the path', () => {
    const flight = createFlightAnimation(ladder3);
    expect(flight).not.toBeNull();
    const line = flight!.object.children.find((c) => c instanceof THREE.Line);
    expect(line).toBeInstanceOf(THREE.Line);
    // One alpha value per sampled trail vertex.
    const lineGeom = (line as THREE.Line).geometry;
    expect(lineGeom.getAttribute('alpha').count).toBe(
      lineGeom.getAttribute('position').count,
    );
  });

  it('positions the quad on the flight curve, not at the origin', () => {
    const flight = createFlightAnimation(ladder3)!;
    flight.update(0);
    const quad = flight.object.children.find((c) => !(c instanceof THREE.Line))!;
    expect(quad.position.length()).toBeGreaterThan(0);
  });

  it('drives the trail brightest at the drone, dim just ahead of it', () => {
    const flight = createFlightAnimation(ladder3)!;
    flight.update(0); // drone parked at the loop start (sample 0)
    const line = flight.object.children.find((c) => c instanceof THREE.Line) as THREE.Line;
    const alphas = Array.from(line.geometry.getAttribute('alpha').array);
    // Sample 0 sits under the drone → the brightest vertex.
    expect(alphas[0]).toBe(Math.max(...alphas));
    // Sample 1 is just *ahead* of the drone (outside the trailing window) → base.
    expect(alphas[1]).toBe(Math.min(...alphas));
  });

  it('disposes its geometries and materials without throwing', () => {
    const flight = createFlightAnimation(ladder3)!;
    expect(() => flight.dispose()).not.toThrow();
  });

  it('reveals exactly one gate marker at a time, cycling through them all', () => {
    const track: Track = {
      edges: [],
      path: [
        { gates: [[[0, 0, 0], [1, 1, 0]]] },
        { gates: [[[2, 0, 0], [3, 1, 0]]] },
        { gates: [[[2, 2, 0], [3, 3, 0]]] },
      ],
    };
    const markers = track.path.map((step) => ({
      object: new THREE.Object3D(),
      position: gateCenter(step.gates[0]!),
    }));
    const flight = createFlightAnimation(track, 0, markers)!;

    const seen = new Set<number>();
    for (let t = 0; t < 200; t++) {
      flight.update(t * 0.05);
      const visible = markers.filter((m) => m.object.visible);
      expect(visible).toHaveLength(1);
      seen.add(markers.indexOf(visible[0]));
    }
    // Over a few loops every gate gets its turn as the next one ahead.
    expect(seen.size).toBe(markers.length);
  });
});
