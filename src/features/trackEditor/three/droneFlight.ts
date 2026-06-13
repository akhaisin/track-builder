import * as THREE from 'three';
import { flightWaypoints, roundCorners } from '../flightPath';
import { buildQuadcopter, cssColor, disposeObject } from './sceneBuilders';
import type { Track } from '../../../types/tracks';

// Drone cruise speed along the flight curve, in lattice units per second.
const SPEED = 2.5;
// How long the bright trail lingers behind the drone. (VIZ_020)
const TRAIL_SECONDS = 4;
// Resting opacity of the whole flight line, and the peak at the drone's nose.
const BASE_ALPHA = 0.12;
const MAX_ALPHA = 0.9;
// Arc-length-even samples along the loop for the trail line.
const SAMPLES = 300;
// Corner fillet size, in lattice units: how far before/after each gate center
// the path starts rounding. Larger = softer turns (drone clips further inside
// the gate); clamped per-edge so it never exceeds half an edge. (VIZ_019)
const CORNER_RADIUS = 0.0;
// Cap the trail so it never wraps far enough to overlap its own head on a
// short loop (which would put a brightness seam right at the drone).
const MAX_TRAIL_FRAC = 0.9;

export interface FlightAnimation {
  /** Quadcopter + trail line, ready to add to the scene's track group. */
  object: THREE.Group;
  /** Advance the drone + trail to absolute elapsed time, in seconds. */
  update: (elapsedSeconds: number) => void;
  dispose: () => void;
}

/**
 * Per-vertex trail opacity. `behindFrac` is how far behind the drone a point
 * sits as a fraction of the whole loop, wrapped into [0, 1): brightest
 * (MAX_ALPHA) at the drone, fading linearly to BASE_ALPHA over the trailing
 * `trailFrac` of the loop, and BASE_ALPHA everywhere ahead of it. (VIZ_020)
 */
export function trailAlpha(behindFrac: number, trailFrac: number): number {
  if (trailFrac <= 0 || behindFrac > trailFrac) return BASE_ALPHA;
  return MAX_ALPHA + (BASE_ALPHA - MAX_ALPHA) * (behindFrac / trailFrac);
}

const TRAIL_VERTEX_SHADER = `
  attribute float alpha;
  varying float vAlpha;
  void main() {
    vAlpha = alpha;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const TRAIL_FRAGMENT_SHADER = `
  uniform vec3 color;
  varying float vAlpha;
  void main() {
    gl_FragColor = vec4(color, vAlpha);
  }
`;

/**
 * A quadcopter that flies the racing path — a closed Catmull-Rom curve through
 * the center of each step's first gate — trailing a thin line whose opacity
 * fades behind it. Returns `null` when the path has fewer than two gates, since
 * there is nothing to fly. (VIZ_019, VIZ_020)
 */
export function createFlightAnimation(track: Track): FlightAnimation | null {
  const waypoints = flightWaypoints(track);
  if (waypoints.length < 2) return null;

  const points = roundCorners(waypoints, CORNER_RADIUS).map((p) => new THREE.Vector3(...p));
  const curve = new THREE.CatmullRomCurve3(points, true, 'catmullrom');
  const length = curve.getLength();
  const duration = length / SPEED; // seconds per loop
  const trailFrac = Math.min((TRAIL_SECONDS * SPEED) / length, MAX_TRAIL_FRAC);

  // Trail line geometry: arc-length-even samples; the final point closes the
  // loop (coincides with the first). A per-vertex `alpha` attribute drives the
  // fade, fed to a small shader since LineBasicMaterial has no per-vertex alpha.
  const sampled = curve.getSpacedPoints(SAMPLES); // SAMPLES + 1 points
  const positions = new Float32Array(sampled.length * 3);
  sampled.forEach((p, i) => p.toArray(positions, i * 3));
  const alphas = new Float32Array(sampled.length).fill(BASE_ALPHA);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const alphaAttr = new THREE.BufferAttribute(alphas, 1);
  geometry.setAttribute('alpha', alphaAttr);

  const material = new THREE.ShaderMaterial({
    uniforms: { color: { value: new THREE.Color(cssColor('--tb-color-accent-bg', '#f3e4c8')) } },
    vertexShader: TRAIL_VERTEX_SHADER,
    fragmentShader: TRAIL_FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
  });
  const trail = new THREE.Line(geometry, material);
  trail.frustumCulled = false; // the whole loop is always relevant

  const quad = buildQuadcopter();

  const object = new THREE.Group();
  object.add(trail, quad);

  const headPos = new THREE.Vector3();
  const tangent = new THREE.Vector3();
  const lookTarget = new THREE.Vector3();

  function update(elapsedSeconds: number): void {
    const u = (((elapsedSeconds / duration) % 1) + 1) % 1; // [0, 1)
    curve.getPointAt(u, headPos);
    curve.getTangentAt(u, tangent);
    quad.position.copy(headPos);
    quad.lookAt(lookTarget.copy(headPos).add(tangent));

    for (let i = 0; i < sampled.length; i++) {
      let behind = u - i / SAMPLES;
      if (behind < 0) behind += 1;
      alphas[i] = trailAlpha(behind, trailFrac);
    }
    alphaAttr.needsUpdate = true;
  }

  update(0);

  return {
    object,
    update,
    dispose: () => disposeObject(object),
  };
}
