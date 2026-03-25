// SpaceGraphJS v7.0 - Camera Controls
// Orbit-style camera controls with fly-to animation

import * as THREE from 'three';

/**
 * Camera controls configuration
 */
export interface CameraControlsConfig {
  enableRotate: boolean;
  enableZoom: boolean;
  enablePan: boolean;
  rotateSpeed: number;
  zoomSpeed: number;
  panSpeed: number;
  minDistance: number;
  maxDistance: number;
}

/**
 * Camera Controls
 * Provides orbit-style camera control with fly-to animations
 */
export class CameraControls {
  readonly camera: THREE.Camera;
  readonly domElement: HTMLElement;

  private config: CameraControlsConfig;
  private target: THREE.Vector3;
  private spherical: THREE.Spherical;
  private sphericalDelta: THREE.Spherical;
  private scale: number = 1;
  private panOffset: THREE.Vector3;
  private rotateStart: THREE.Vector2;
  private rotateEnd: THREE.Vector2;
  private isDragging = false;
  private state: 'none' | 'rotate' | 'zoom' | 'pan' = 'none';

  constructor(
    camera: THREE.Camera,
    domElement: HTMLElement,
    config: Partial<CameraControlsConfig> = {}
  ) {
    this.camera = camera;
    this.domElement = domElement;

    this.config = {
      enableRotate: true,
      enableZoom: true,
      enablePan: true,
      rotateSpeed: 1.0,
      zoomSpeed: 1.0,
      panSpeed: 1.0,
      minDistance: 10,
      maxDistance: 10000,
      ...config
    };

    // Initialize spherical coordinates
    this.target = new THREE.Vector3();
    this.spherical = new THREE.Spherical();
    this.sphericalDelta = new THREE.Spherical();
    this.panOffset = new THREE.Vector3();
    this.rotateStart = new THREE.Vector2();
    this.rotateEnd = new THREE.Vector2();

    this.updateSpherical();
    this.setupEventListeners();
  }

  /**
   * Update spherical coordinates from camera position
   */
  private updateSpherical(): void {
    const offset = new THREE.Vector3()
      .copy(this.camera.position)
      .sub(this.target);

    this.spherical.setFromVector3(offset);
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    this.domElement.addEventListener('pointerdown', this.onPointerDown);
    this.domElement.addEventListener('pointermove', this.onPointerMove);
    this.domElement.addEventListener('pointerup', this.onPointerUp);
    this.domElement.addEventListener('wheel', this.onWheel, { passive: false });
    this.domElement.addEventListener('contextmenu', this.onContextMenu);
  }

  private onPointerDown = (event: PointerEvent): void => {
    if (event.button === 0) {
      this.state = 'rotate';
    } else if (event.button === 1 || (event.button === 0 && event.shiftKey)) {
      this.state = 'pan';
    }

    this.rotateStart.set(event.clientX, event.clientY);
    this.isDragging = true;

    this.domElement.setPointerCapture(event.pointerId);
  };

  private onPointerMove = (event: PointerEvent): void => {
    if (!this.isDragging) return;

    this.rotateEnd.set(event.clientX, event.clientY);

    const deltaX = (this.rotateEnd.x - this.rotateStart.x) * this.config.rotateSpeed;
    const deltaY = (this.rotateEnd.y - this.rotateStart.y) * this.config.rotateSpeed;

    if (this.state === 'rotate' && this.config.enableRotate) {
      this.sphericalDelta.theta -= deltaX * 0.005;
      this.sphericalDelta.phi -= deltaY * 0.005;
    } else if (this.state === 'pan' && this.config.enablePan) {
      const offset = new THREE.Vector3()
        .copy(this.camera.position)
        .sub(this.target);
      const side = new THREE.Vector3()
        .crossVectors(this.camera.up, offset)
        .normalize();
      const up = this.camera.up.clone().normalize();

      this.panOffset.add(side.multiplyScalar(-deltaX * 0.1));
      this.panOffset.add(up.multiplyScalar(deltaY * 0.1));
    }

    this.rotateStart.copy(this.rotateEnd);
  };

  private onPointerUp = (event: PointerEvent): void => {
    this.isDragging = false;
    this.state = 'none';
    this.domElement.releasePointerCapture(event.pointerId);
  };

  private onWheel = (event: WheelEvent): void => {
    if (!this.config.enableZoom) return;
    event.preventDefault();

    const delta = event.deltaY > 0 ? 1.1 : 1 / 1.1;
    this.scale *= delta;
  };

  private onContextMenu = (event: MouseEvent): void => {
    event.preventDefault();
  };

  /**
   * Update camera position
   */
  update(): void {
    // Apply spherical delta
    this.spherical.theta += this.sphericalDelta.theta;
    this.spherical.phi += this.sphericalDelta.phi;

    // Clamp phi
    this.spherical.phi = Math.max(0.01, Math.min(Math.PI - 0.01, this.spherical.phi));

    // Apply zoom
    this.spherical.radius *= this.scale;

    // Clamp distance
    this.spherical.radius = Math.max(
      this.config.minDistance,
      Math.min(this.config.maxDistance, this.spherical.radius)
    );

    // Apply pan
    this.target.add(this.panOffset);

    // Update camera position
    const offset = new THREE.Vector3().setFromSpherical(this.spherical);
    this.camera.position.copy(this.target).add(offset);
    this.camera.lookAt(this.target);

    // Reset deltas
    this.sphericalDelta.set(0, 0, 0);
    this.scale = 1;
    this.panOffset.set(0, 0, 0);
  }

  /**
   * Fly to a target position
   */
  flyTo(target: THREE.Vector3, distance: number, duration: number = 1.5): void {
    const startPos = this.camera.position.clone();
    const startTarget = this.target.clone();
    const startTime = performance.now();

    const endTarget = target.clone();
    const offset = new THREE.Vector3(0, 0, distance);
    const endPos = target.clone().add(offset);

    const animate = (currentTime: number): void => {
      const elapsed = currentTime - startTime;
      const t = Math.min(elapsed / (duration * 1000), 1);

      // Ease out cubic
      const eased = 1 - Math.pow(1 - t, 3);

      this.target.lerpVectors(startTarget, endTarget, eased);
      this.camera.position.lerpVectors(startPos, endPos, eased);
      this.camera.lookAt(this.target);

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        this.updateSpherical();
      }
    };

    requestAnimationFrame(animate);
  }

  /**
   * Set the look-at target
   */
  setTarget(x: number, y: number, z: number): void {
    this.target.set(x, y, z);
    this.updateSpherical();
  }

  /**
   * Reset to default position
   */
  reset(): void {
    this.target.set(0, 0, 0);
    this.spherical.set(500, Math.PI / 4, 0);
    this.updateSpherical();
  }

  /**
   * Dispose controls
   */
  dispose(): void {
    this.domElement.removeEventListener('pointerdown', this.onPointerDown);
    this.domElement.removeEventListener('pointermove', this.onPointerMove);
    this.domElement.removeEventListener('pointerup', this.onPointerUp);
    this.domElement.removeEventListener('wheel', this.onWheel);
    this.domElement.removeEventListener('contextmenu', this.onContextMenu);
  }
}
