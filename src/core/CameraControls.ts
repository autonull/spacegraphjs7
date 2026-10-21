// SpaceGraphJS - Camera Controls
// Pure camera state machine - all input handled via Fingering

import gsap from 'gsap';
import * as THREE from 'three';
import type { KeyboardScope } from '../types';
import { fitOrthoFrustum, visibleWorldExtent } from '../utils/CameraUtils';
import { clamp } from '../utils/math';
import type { Surface } from './Surface';

// The flight curve. gsap's `power2.out` is the cubic-out curve the camera has always used.
const cubicOut = gsap.parseEase('power2.out');

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

/** T1.8: how far past the fitted frame the orthographic camera may travel before the scene empties. */
export const ORTHO_ZOOM_SPAN = { out: 1 / 3, in: 2.5 };

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
  private phiNext: number | null = null;
  private thetaNext: number | null = null;
  private zoomNext: number | null = null;
  private animStartTime = 0;
  private animDuration = 0;
  private startTarget = new THREE.Vector3();
  private startRadius = 0;
  private startPhi = 0;
  private startTheta = 0;
  private startZoom = 1;
  private isOrthographic = false;
  private orthoCamera: THREE.OrthographicCamera | null = null;
  private perspectiveCamera: THREE.Camera;
  private keyboardTarget: EventTarget | null = null;
  private orthoZoomRange: { min: number; max: number } | null = null;

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

  /**
   * The world units one screen pixel covers at the current zoom. A drag is measured in pixels and
   * applied in world units, so the view follows the cursor at every zoom level.
   */
  get worldUnitsPerPixel(): number {
    const height = this.sg?.renderer?.surfaceSize?.height || this.domElement.clientHeight || 1;
    return visibleWorldExtent(this.camera, this.spherical.radius).height / height;
  }

  /** Pan by a screen delta: the view follows the cursor. */
  pan(dx: number, dy: number): void {
    if (!this.config.enablePan) return;
    // A hand on the mouse outranks a camera that is still flying.
    this.cancelTweens();
    const scale = this.config.panSpeed * this.worldUnitsPerPixel;
    this.applyPan(dx * scale, dy * scale);
    this.sg?.requestFrame?.();
  }

  zoom(factor: number): void {
    if (!this.config.enableZoom) return;
    this.cancelTweens();
    this.scale *= factor;
    this.sg?.requestFrame?.();
  }

  /**
   * Zoom by a factor about a point in NDC, so the content under the pointer stays under it. A
   * factor above one moves the camera away (the view shows more), below one moves it closer.
   */
  zoomAt(ndc: { x: number; y: number }, factor: number): void {
    if (!this.config.enableZoom) return;
    const extent = visibleWorldExtent(this.camera, this.spherical.radius);
    // The visible extent grows by the factor, so the target moves to keep the pointed-at place put.
    this.shiftTarget(
      ndc.x * (extent.width / 2) * (1 - factor),
      ndc.y * (extent.height / 2) * (1 - factor)
    );
    this.zoom(factor);
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
    this.spherical.phi = clamp(this.spherical.phi, 0.01, Math.PI - 0.01);
    if (this.isOrthographic) {
      const cam = this.camera as THREE.OrthographicCamera;
      cam.zoom = this.clampOrthoZoom(cam.zoom / this.scale);
      cam.updateProjectionMatrix();
    } else {
      this.spherical.radius *= this.scale;
      this.spherical.radius = clamp(
        this.spherical.radius,
        this.config.minDistance,
        this.config.maxDistance
      );
    }
    this.target.add(this.panOffset);

    if (this.targetNext || this.phiNext !== null || this.zoomNext !== null) {
      const elapsed = performance.now() - this.animStartTime;
      const t = Math.min(elapsed / this.animDuration, 1);
      const eased = cubicOut(t);

      if (this.sg?.events) {
        this.sg.events.emit('camera:fly:progress', t);
      }

      if (this.targetNext) this.target.lerpVectors(this.startTarget, this.targetNext, eased);
      if (this.radiusNext)
        this.spherical.radius = this.startRadius + (this.radiusNext - this.startRadius) * eased;
      if (this.phiNext !== null)
        this.spherical.phi = this.startPhi + (this.phiNext - this.startPhi) * eased;
      if (this.thetaNext !== null)
        this.spherical.theta = this.startTheta + (this.thetaNext - this.startTheta) * eased;
      if (this.zoomNext !== null) {
        const ortho = this.camera as THREE.OrthographicCamera;
        ortho.zoom = this.startZoom + (this.zoomNext - this.startZoom) * eased;
        ortho.updateProjectionMatrix();
      }
      if (t >= 1) {
        this.targetNext = null;
        this.radiusNext = null;
        this.phiNext = null;
        this.thetaNext = null;
        this.zoomNext = null;
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
    if (
      this.targetNext ||
      this.phiNext !== null ||
      this.zoomNext !== null ||
      [...this.keyState.values()].some(Boolean)
    )
      this.sg?.requestFrame?.();
  }

  panBy(dx: number, dy: number): void {
    this.applyPan(dx, dy);
  }

  /** Shift the camera sideways and upwards, along the camera's own axes. */
  private applyPan(dx: number, dy: number): void {
    this.shiftTarget(-dx, dy);
  }

  /** Move the target along the camera's own axes, in world units. */
  private shiftTarget(worldRight: number, worldUp: number): void {
    this._tempOffset.copy(this.camera.position).sub(this.target);
    this._tempSide.crossVectors(this.camera.up, this._tempOffset).normalize();
    this._camUp.copy(this.camera.up).normalize();
    this.panOffset.add(this._tempSide.multiplyScalar(worldRight));
    this.panOffset.add(this._camUp.multiplyScalar(worldUp));
  }

  updateSpherical(): void {
    this._tempOffset.copy(this.camera.position).sub(this.target);
    this.spherical.setFromVector3(this._tempOffset);
  }

  flyTo(target: THREE.Vector3, distance: number, duration = 1.5, zoom?: number): void {
    this.setTargetSmooth(target, distance, duration, zoom);
  }

  zoomTo(target: THREE.Vector3, distance: number, duration = 1.5): void {
    this.zoomToPoint(target, distance, duration);
  }

  zoomToSurface3D(surface: Surface, duration = 1.5): void {
    if (!surface.bounds3D) return;
    const bounds = surface.bounds3D;
    const maxDim = Math.max(bounds.size.x, bounds.size.y, bounds.size.z);
    this.zoomToPoint(bounds.center, maxDim * 2.5, duration);
  }

  /** Move the camera to a point, remembering where it came from so a zoom-out returns there. */
  private zoomToPoint(target: THREE.Vector3, distance: number, duration: number): void {
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

  zoomOut(): void {
    if (this.zoomStack.length === 0) return;
    const entry = this.zoomStack.pop()!;
    this.flyTo(entry.target, entry.distance);
  }

  getZoomDepth(): number {
    return this.zoomStack.length;
  }

  /** T1.8: the fitted frame is the zoom reference; limits keep the camera a couple of steps from it. */
  setOrthoZoomRange(fitZoom?: number): void {
    this.orthoZoomRange = fitZoom
      ? { min: fitZoom * ORTHO_ZOOM_SPAN.out, max: fitZoom * ORTHO_ZOOM_SPAN.in }
      : null;
  }

  getOrthoZoomRange(): { min: number; max: number } | null {
    return this.orthoZoomRange;
  }

  private clampOrthoZoom(zoom: number): number {
    const range = this.orthoZoomRange;
    const min = Math.max(MIN_ORTHO_ZOOM, range?.min ?? MIN_ORTHO_ZOOM);
    const max = Math.min(MAX_ORTHO_ZOOM, range?.max ?? MAX_ORTHO_ZOOM);

    return THREE.MathUtils.clamp(zoom, min, max);
  }

  canZoomOut(): boolean {
    return this.zoomStack.length > 0;
  }

  setTargetSmooth(target: THREE.Vector3, radius: number, duration = 1.0, zoom?: number): void {
    this.startTarget.copy(this.target);
    this.startRadius = this.spherical.radius;
    this.targetNext = target.clone();
    this.radiusNext = radius;
    if (zoom !== undefined && this.isOrthographic) {
      this.startZoom = (this.camera as THREE.OrthographicCamera).zoom;
      this.zoomNext = this.clampOrthoZoom(zoom);
    } else {
      this.zoomNext = null;
    }
    this.animStartTime = performance.now();
    this.animDuration = duration * 1000;
    this.sg?.requestFrame?.();
  }

  // Abandon any in-flight camera animation so an explicit programmatic move is authoritative.
  cancelTweens(): void {
    this.targetNext = null;
    this.radiusNext = null;
    this.phiNext = null;
    this.thetaNext = null;
    this.zoomNext = null;
  }

  setTarget(x: number, y: number, z: number): void {
    // The camera moves with the target: a jump to a node is a pan, not a re-aim. Leaving the camera
    // in place and looking at the new target tilts the view, so a top-down camera stops being
    // top-down (T1.19).
    this.camera.position.x += x - this.target.x;
    this.camera.position.y += y - this.target.y;
    this.camera.position.z += z - this.target.z;
    this.target.set(x, y, z);
    this.updateSpherical();
  }

  // Gate orbit input without swapping the camera; ortho never orbits regardless (see rotate()).
  setOrbitEnabled(enabled: boolean): void {
    this.config.enableRotate = enabled;
  }

  /** Gate the camera's pan: a host that gives the left button to the void can take the right one. */
  setPanEnabled(enabled: boolean): void {
    this.config.enablePan = enabled;
  }

  /** Gate the camera's zoom, so a host can own the wheel itself. */
  setZoomEnabled(enabled: boolean): void {
    this.config.enableZoom = enabled;
  }

  // Point the camera at a polar (from +Y) and azimuth angle, animating when a duration is given.
  setPolar(phi: number, theta: number, duration = 0): void {
    const targetPhi = Math.max(0.01, Math.min(Math.PI - 0.01, phi));
    if (duration <= 0) {
      this.spherical.phi = targetPhi;
      this.spherical.theta = theta;
      this.phiNext = null;
      this.thetaNext = null;
    } else {
      this.startPhi = this.spherical.phi;
      this.startTheta = this.spherical.theta;
      this.phiNext = targetPhi;
      this.thetaNext = theta;
      this.animStartTime = performance.now();
      this.animDuration = duration * 1000;
    }
    this.sg?.requestFrame?.();
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
      const perspective = this.perspectiveCamera as THREE.PerspectiveCamera;
      this.orthoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100000);
      fitOrthoFrustum(this.orthoCamera, perspective.fov ?? 75, this.spherical.radius, aspect);
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
