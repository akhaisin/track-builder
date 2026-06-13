import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { computeBounds, cssColor, disposeObject } from './sceneBuilders';
import type { Track } from '../../../types/tracks';

export interface SceneContext {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  /** Mode views put their (re)buildable content here. */
  trackGroup: THREE.Group;
  /**
   * Register a callback invoked once per rendered frame with the absolute
   * elapsed time (seconds) since the context was created. Returns a function
   * that unregisters it.
   */
  onFrame: (cb: (elapsedSeconds: number) => void) => () => void;
  dispose: () => void;
}

export function isWebglAvailable(): boolean {
  const canvas = document.createElement('canvas');
  return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
}

export interface CameraPose {
  position: [number, number, number];
  target: [number, number, number];
}

// Session-only camera poses per track, so switching workspace modes (each
// mode owns its own scene context) keeps the track oriented the same way.
const cameraPoses = new Map<string, CameraPose>();

export function saveCameraPose(key: string, pose: CameraPose): void {
  cameraPoses.set(key, pose);
}

export function getCameraPose(key: string): CameraPose | undefined {
  return cameraPoses.get(key);
}

export function clearCameraPoses(): void {
  cameraPoses.clear();
}

/**
 * Shared 3D scene shell: dark background (VIZ_005), camera framed on the
 * track, orbit/zoom/pan controls (VIZ_004), resize handling, render loop.
 *
 * When `poseKey` is given, the camera pose is saved on dispose and restored
 * on the next context created with the same key (instead of reframing).
 */
export function createSceneContext(
  container: HTMLElement,
  framingTrack: Track,
  poseKey?: string,
): SceneContext {
  const renderer = new THREE.WebGLRenderer({ antialias: true });

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(cssColor('--tb-color-canvas-bg', '#1e1a14'));

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  const savedPose = poseKey ? getCameraPose(poseKey) : undefined;
  if (savedPose) {
    camera.position.set(...savedPose.position);
    controls.target.set(...savedPose.target);
  } else {
    const bounds = computeBounds(framingTrack);
    const distance = Math.max(bounds.radius * 2.2, 6);
    camera.position.set(
      bounds.center[0] + distance,
      bounds.center[1] + distance * 0.8,
      bounds.center[2] + distance,
    );
    controls.target.set(...bounds.center);
  }

  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  const trackGroup = new THREE.Group();
  scene.add(trackGroup);

  function resize() {
    const { clientWidth, clientHeight } = container;
    renderer.setSize(clientWidth, clientHeight);
    camera.aspect = clientWidth / Math.max(clientHeight, 1);
    camera.updateProjectionMatrix();
  }
  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(container);

  const frameCallbacks = new Set<(elapsedSeconds: number) => void>();
  const clock = new THREE.Clock();
  let frame = 0;
  function animate() {
    frame = requestAnimationFrame(animate);
    const elapsed = clock.getElapsedTime();
    controls.update();
    for (const cb of frameCallbacks) cb(elapsed);
    renderer.render(scene, camera);
  }
  animate();

  return {
    renderer,
    scene,
    camera,
    controls,
    trackGroup,
    onFrame: (cb) => {
      frameCallbacks.add(cb);
      return () => frameCallbacks.delete(cb);
    },
    dispose: () => {
      if (poseKey) {
        saveCameraPose(poseKey, {
          position: [camera.position.x, camera.position.y, camera.position.z],
          target: [controls.target.x, controls.target.y, controls.target.z],
        });
      }
      cancelAnimationFrame(frame);
      frameCallbacks.clear();
      observer.disconnect();
      controls.dispose();
      disposeObject(scene);
      scene.clear();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
