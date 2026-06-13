import * as THREE from 'three';
import { flightControlPoints, flightWaypoints } from '../flightPath';
import { buildQuadcopter, cssColor, disposeObject } from './sceneBuilders';
import type { Point3, Track } from '../../../types/tracks';

/**
 * A gate to reveal only while the drone is approaching it: `object` is the
 * group toggled visible/invisible, `position` the gate center used to locate it
 * along the flight curve. (VIZ_024)
 */
export interface GateMarker {
  object: THREE.Object3D;
  position: Point3;
}

// Drone cruise speed along the flight curve, in lattice units per second.
const SPEED = 2.5;
// How long the bright trail lingers behind the drone. (VIZ_020)
const TRAIL_SECONDS = 4;
// Resting opacity of the whole flight line, and the peak at the drone's nose.
const BASE_ALPHA = 0.12;
const MAX_ALPHA = 0.9;
// Arc-length-even samples along the loop for the trail line.
const SAMPLES = 300;
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
 * A quadcopter that flies the racing path — a closed centripetal Catmull-Rom
 * curve through each step's gate (relaxed toward neighbors by `maxDeviation`
 * lattice units for smoother turns) — trailing a thin line whose opacity fades
 * behind it. Centripetal parameterization keeps the curvature even across the
 * unevenly spaced control points. Returns `null` when the path has fewer than
 * two gates, since there is nothing to fly. (VIZ_019, VIZ_020, VIZ_023)
 */
export function createFlightAnimation(
  track: Track,
  maxDeviation = 0,
  markers: GateMarker[] = [],
): FlightAnimation | null {
  // One waypoint per step with a gate; need at least two to form a loop.
  if (flightWaypoints(track).length < 2) return null;

  const points = flightControlPoints(track, maxDeviation).map((p) => new THREE.Vector3(...p));
  const curve = new THREE.CatmullRomCurve3(points, true, 'centripetal');
  const length = curve.getLength();
  const duration = length / SPEED; // seconds per loop
  const trailFrac = Math.min((TRAIL_SECONDS * SPEED) / length, MAX_TRAIL_FRAC);

  // Trail line geometry: arc-length-even samples; the final point closes the
  // loop (coincides with the first). A per-vertex `alpha` attribute drives the
  // fade, fed to a small shader since LineBasicMaterial has no per-vertex alpha.
  const sampled = curve.getSpacedPoints(SAMPLES); // SAMPLES + 1 points

  // Arc-length position (u in [0,1)) of each gate marker, found as the nearest
  // even-spaced sample to its center, so visibility can track the drone. (VIZ_024)
  const markerU = markers.map((marker) => {
    const p = new THREE.Vector3(...marker.position);
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < SAMPLES; i++) {
      const dist = p.distanceToSquared(sampled[i]);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    }
    return best / SAMPLES;
  });

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

    // Reveal only the gate the drone is flying toward — the nearest marker
    // ahead in arc length. It hides the instant the drone crosses it. (VIZ_024)
    if (markers.length > 0) {
      let nextIndex = 0;
      let nextGap = Infinity;
      for (let i = 0; i < markerU.length; i++) {
        const gap = (markerU[i] - u + 1) % 1; // distance ahead, wrapped
        if (gap < nextGap) {
          nextGap = gap;
          nextIndex = i;
        }
      }
      for (let i = 0; i < markers.length; i++) markers[i].object.visible = i === nextIndex;
    }
  }

  update(0);

  return {
    object,
    update,
    dispose: () => disposeObject(object),
  };
}
