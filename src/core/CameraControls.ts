// SpaceGraphJS - Camera Controls
// Pure camera state machine - all input handled via Fingering

import * as THREE from 'three';
import type { KeyboardScope } from '../types';
import type { Surface } from './Surface';

export interface CameraControlsConfig {
  enableRotate: boolean;
  enableZoom: boolean;
  enablePan: boolean;
  rotateSpeed: number;
  zoomSpeed: number;
  panSpeed: number;
  minDistance: number;
  maxDistance: number;
  keyboard: KeyboardScope;
}

// Keys typed into these never drive the camera.
const EDITABLE_SELECTOR = 'input, textarea, select, [contenteditable=""], [contenteditable="true"], .monaco-editor';

const KEY_CONFIG = {
  pan: [
    { key: 'a', axis: 'right', dir: -1 },
    { key: 'd', axis: 'right', dir: 1 },
    { key: 'w', axis: 'forward', dir: 1 },
    { key: 's', axis: 'forward', dir: -1 },
    { key: 'q', axis: 'up', dir: 1 },
    { key: 'e', axis: 'up', dir: -1 },
  ] as const,
  rotate: [
    { key: 'j', delta: 'theta', dir: -1 },
    { key: 'l', delta: 'theta', dir: 1 },
    { key: 'i', delta: 'phi', dir: -1 },
    { key: 'k', delta: 'phi', dir: 1 },
  ] as const,
  zoom: [
    { key: 'z', factor: 0.9 },
    { key: 'x', factor: 1.1 },
  ] as const,
  speed: { pan: 10.0, zoom: 0.1, rotate: 0.05 },
} as const;

const MIN_ORTHO_ZOOM = 0.01;
const MAX_ORTHO_ZOOM = 100;

export class CameraControls {
  camera!: THREE.Camera;
  readonly domElement: HTMLElement;
  public sg?: any; // To emit events
  target: THREE.Vector3;
  spherical: THREE.Spherical;

  private config: CameraControlsConfig;
  readonly sphericalDelta = new THREE.Spherical();
  private scale = 1;
  readonly panOffset = new THREE.Vector3();
  private zoomStack: Array<{
    target: THREE.Vector3;
    distance: number;
    phi: number;
    theta: number;
  }> = [];
  readonly MAX_ZOOM_DEPTH = 8;
  private keyState = new Map<string, boolean>();
  private targetNext: THREE.Vector3 | null = null;
  private radiusNext: number | null = null;
  private animStartTime = 0;
  private animDuration = 0;
  private startTarget = new THREE.Vector3();
  private startRadius = 0;
  private isOrthographic = false;
  private orthoCamera: THREE.OrthographicCamera | null = null;
  private perspectiveCamera: THREE.Camera;
  private keyboardScope: KeyboardScope = 'container';
  private keyboardTarget: EventTarget | null = null;

  // Cached vectors for update loop - avoids per-frame allocations
  private _camRight = new THREE.Vector3();
  private _camForward = new THREE.Vector3();
  private _camUp = new THREE.Vector3();
  private _tempVec = new THREE.Vector3();
  private _tempOffset = new THREE.Vector3();
  private _tempSide = new THREE.Vector3();

  constructor(
    camera: THREE.Camera,
    domElement: HTMLElement,
    config: Partial<CameraControlsConfig> = {}
  ) {
    this.perspectiveCamera = camera;
    this.domElement = domElement;
    this.setCamera(camera);
    this.config = {
      enableRotate: true,
      enableZoom: true,
      enablePan: true,
      rotateSpeed: 1.0,
      zoomSpeed: 1.0,
      panSpeed: 1.0,
      minDistance: 10,
      maxDistance: 10000,
      keyboard: 'container',
      ...config,
    };
    this.target = new THREE.Vector3();
    this.spherical = new THREE.Spherical();
    this.sphericalDelta = new THREE.Spherical();
    this.panOffset = new THREE.Vector3();
    this.updateSpherical();
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.setKeyboardScope(this.config.keyboard);
  }

  get hasZoomHistory(): boolean {
    return this.canZoomOut();
  }

  get isUsingOrthographic(): boolean {
    return this.isOrthographic;
  }

  rotate(dx: number, dy: number): void {
    if (!this.config.enableRotate || this.isOrthographic) return;
    this.sphericalDelta.theta -= dx * this.config.rotateSpeed * 0.005;
    this.sphericalDelta.phi -= dy * this.config.rotateSpeed * 0.005;
    this.sg?.requestFrame?.();
  }

  pan(dx: number, dy: number): void {
    if (!this.config.enablePan) return;
    this._tempOffset.copy(this.camera.position).sub(this.target);
    this._tempSide.crossVectors(this.camera.up, this._tempOffset).normalize();
    this._camUp.copy(this.camera.up).normalize();
    this.panOffset.add(this._tempSide.multiplyScalar(-dx * this.config.panSpeed * 0.1));
    this.panOffset.add(this._camUp.multiplyScalar(dy * this.config.panSpeed * 0.1));
    this.sg?.requestFrame?.();
  }

  zoom(factor: number): void {
    if (!this.config.enableZoom) return;
    this.scale *= factor;
    this.sg?.requestFrame?.();
  }

  update(): void {
    this._camRight.setFromMatrixColumn(this.camera.matrix, 0);
    this._camForward.setFromMatrixColumn(this.camera.matrix, 2).negate();
    this._camUp.copy(this.camera.up);

    for (const { key, axis, dir } of KEY_CONFIG.pan) {
      if (this.keyState.get(key)) {
        const vec =
          axis === 'right' ? this._camRight : axis === 'forward' ? this._camForward : this._camUp;
        this.panOffset.add(this._tempVec.copy(vec).multiplyScalar(dir * KEY_CONFIG.speed.pan));
      }
    }

    for (const { key, delta, dir } of KEY_CONFIG.rotate) {
      if (!this.isOrthographic && this.keyState.get(key)) {
        this.sphericalDelta[delta] += dir * KEY_CONFIG.speed.rotate;
      }
    }

    for (const { key, factor } of KEY_CONFIG.zoom) {
      if (this.keyState.get(key)) this.scale *= factor;
    }

    this.spherical.theta += this.sphericalDelta.theta;
    this.spherical.phi += this.sphericalDelta.phi;
    this.spherical.phi = Math.max(0.01, Math.min(Math.PI - 0.01, this.spherical.phi));
    if (this.isOrthographic) {
      const cam = this.camera as THREE.OrthographicCamera;
      cam.zoom = THREE.MathUtils.clamp(cam.zoom / this.scale, MIN_ORTHO_ZOOM, MAX_ORTHO_ZOOM);
      cam.updateProjectionMatrix();
    } else {
      this.spherical.radius *= this.scale;
      this.spherical.radius = Math.max(
        this.config.minDistance,
        Math.min(this.config.maxDistance, this.spherical.radius)
      );
    }
    this.target.add(this.panOffset);

    if (this.targetNext) {
      const elapsed = performance.now() - this.animStartTime;
      const t = Math.min(elapsed / this.animDuration, 1);
      const eased = 1 - (1 - t) ** 3;

      if (this.sg?.events) {
        this.sg.events.emit('camera:fly:progress', t);
      }

      this.target.lerpVectors(this.startTarget, this.targetNext, eased);
      if (this.radiusNext)
        this.spherical.radius = this.startRadius + (this.radiusNext - this.startRadius) * eased;
      if (t >= 1) {
        this.targetNext = null;
        this.radiusNext = null;
        if (this.sg?.events) {
          this.sg.events.emit('camera:fly:end');
        }
      }
    }

    this.camera.position.copy(this.target).add(this._tempVec.setFromSpherical(this.spherical));
    this.camera.lookAt(this.target);
    this.sphericalDelta.set(0, 0, 0);
    this.scale = 1;
    this.panOffset.set(0, 0, 0);
    if (this.targetNext || [...this.keyState.values()].some(Boolean)) this.sg?.requestFrame?.();
  }

  panBy(dx: number, dy: number): void {
    this._tempOffset.copy(this.camera.position).sub(this.target);
    this._tempSide.crossVectors(this.camera.up, this._tempOffset).normalize();
    this._camUp.copy(this.camera.up).normalize();
    this.panOffset.add(this._tempSide.multiplyScalar(-dx));
    this.panOffset.add(this._camUp.multiplyScalar(dy));
  }

  updateSpherical(): void {
    this._tempOffset.copy(this.camera.position).sub(this.target);
    this.spherical.setFromVector3(this._tempOffset);
  }

  flyTo(target: THREE.Vector3, distance: number, duration = 1.5): void {
    this.setTargetSmooth(target, distance, duration);
  }

  zoomTo(target: THREE.Vector3, distance: number, duration = 1.5): void {
    const top = this.zoomStack.at(-1);
    if (top && top.target.distanceTo(target) < distance * 0.1) {
      this.zoomOut();
      return;
    }
    this.zoomStack.push({
      target: this.target.clone(),
      distance: this.spherical.radius,
      phi: this.spherical.phi,
      theta: this.spherical.theta,
    });
    if (this.zoomStack.length > this.MAX_ZOOM_DEPTH) this.zoomStack.shift();
    this.flyTo(target, distance, duration);
  }

  zoomToSurface3D(surface: Surface, duration = 1.5): void {
    if (!surface.bounds3D) return;
    const bounds = surface.bounds3D;
    const center = bounds.center;
    const size = bounds.size;
    const maxDim = Math.max(size.x, size.y, size.z);
    const distance = maxDim * 2.5;
    const top = this.zoomStack.at(-1);
    if (top && center.distanceTo(top.target) < distance * 0.1) {
      this.zoomOut();
      return;
    }
    this.zoomStack.push({
      target: this.target.clone(),
      distance: this.spherical.radius,
      phi: this.spherical.phi,
      theta: this.spherical.theta,
    });
    if (this.zoomStack.length > this.MAX_ZOOM_DEPTH) this.zoomStack.shift();
    this.flyTo(center, distance, duration);
  }

  zoomOut(): void {
    if (this.zoomStack.length === 0) return;
    const entry = this.zoomStack.pop()!;
    this.flyTo(entry.target, entry.distance);
  }

  getZoomDepth(): number {
    return this.zoomStack.length;
  }

  canZoomOut(): boolean {
    return this.zoomStack.length > 0;
  }

  setTargetSmooth(target: THREE.Vector3, radius: number, duration = 1.0): void {
    this.startTarget.copy(this.target);
    this.startRadius = this.spherical.radius;
    this.targetNext = target.clone();
    this.radiusNext = radius;
    this.animStartTime = performance.now();
    this.animDuration = duration * 1000;
    this.sg?.requestFrame?.();
  }

  setTarget(x: number, y: number, z: number): void {
    this.target.set(x, y, z);
    this.updateSpherical();
  }

  toggleOrthographic(): void {
    if (this.isOrthographic) {
      this.setCamera(this.perspectiveCamera);
      return;
    }
    if (!this.orthoCamera) {
      const aspect = this.domElement.clientHeight
        ? this.domElement.clientWidth / this.domElement.clientHeight
        : 1;
      const height = 2 * this.spherical.radius * Math.tan(THREE.MathUtils.degToRad(75 / 2));
      const width = height * aspect;
      this.orthoCamera = new THREE.OrthographicCamera(
        -width / 2,
        width / 2,
        height / 2,
        -height / 2,
        0.1,
        100000
      );
    }
    this.orthoCamera.position.copy(this.camera.position);
    this.orthoCamera.quaternion.copy(this.camera.quaternion);
    this.setCamera(this.orthoCamera);
  }

  // Point the controls at the renderer's active camera; ortho behaviour follows the camera type.
  setCamera(camera: THREE.Camera): void {
    this.camera = camera;
    if ((camera as THREE.OrthographicCamera).isOrthographicCamera) {
      this.orthoCamera = camera as THREE.OrthographicCamera;
      this.isOrthographic = true;
    } else {
      this.isOrthographic = false;
    }
  }

  getOrthoCamera(): THREE.OrthographicCamera | null {
    return this.orthoCamera;
  }

  reset(): void {
    this.target.set(0, 0, 0);
    this.spherical.set(500, Math.PI / 4, 0);
    this.updateSpherical();
  }

  dispose(): void {
    this.zoomStack = [];
    this.setKeyboardScope(false);
  }

  // Scope camera keyboard input: off, the graph container, or the whole window.
  setKeyboardScope(scope: KeyboardScope): void {
    if (this.keyboardTarget) {
      this.keyboardTarget.removeEventListener('keydown', this.onKeyDown as EventListener);
      this.keyboardTarget.removeEventListener('keyup', this.onKeyUp as EventListener);
      this.keyboardTarget = null;
    }
    this.keyboardScope = scope;
    this.keyState.clear();
    if (scope === false) return;
    this.keyboardTarget = scope === 'window' ? window : this.domElement;
    this.keyboardTarget.addEventListener('keydown', this.onKeyDown as EventListener);
    this.keyboardTarget.addEventListener('keyup', this.onKeyUp as EventListener);
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (this.#isEditable(e)) return;
    this.keyState.set(e.key.toLowerCase(), true);
    this.sg?.requestFrame?.();
  }

  private onKeyUp(e: KeyboardEvent): void {
    this.keyState.set(e.key.toLowerCase(), false);
  }

  #isEditable(e: KeyboardEvent): boolean {
    const target = e.target as HTMLElement | null;
    if (!target?.closest) return false;
    return !!target.closest(EDITABLE_SELECTOR);
  }
}
