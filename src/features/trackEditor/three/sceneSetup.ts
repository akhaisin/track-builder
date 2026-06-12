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
  dispose: () => void;
}

export function isWebglAvailable(): boolean {
  const canvas = document.createElement('canvas');
  return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
}

/**
 * Shared 3D scene shell: dark background (VIZ_005), camera framed on the
 * track, orbit/zoom/pan controls (VIZ_004), resize handling, render loop.
 */
export function createSceneContext(container: HTMLElement, framingTrack: Track): SceneContext {
  const renderer = new THREE.WebGLRenderer({ antialias: true });

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(cssColor('--tb-color-canvas-bg', '#1e1a14'));

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
  const bounds = computeBounds(framingTrack);
  const distance = Math.max(bounds.radius * 2.2, 6);
  camera.position.set(
    bounds.center[0] + distance,
    bounds.center[1] + distance * 0.8,
    bounds.center[2] + distance,
  );

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(...bounds.center);
  controls.enableDamping = true;

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

  let frame = 0;
  function animate() {
    frame = requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();

  return {
    renderer,
    scene,
    camera,
    controls,
    trackGroup,
    dispose: () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      disposeObject(scene);
      scene.clear();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
