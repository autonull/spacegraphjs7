// SpaceGraphJS - Camera Controls
// Pure camera state machine - all input handled via Fingering

import * as THREE from 'three';
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
}

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

export class CameraControls {
    readonly camera: THREE.Camera;
    readonly domElement: HTMLElement;
    target: THREE.Vector3;
    spherical: THREE.Spherical;

    private config: CameraControlsConfig;
    private sphericalDelta = new THREE.Spherical();
    private scale = 1;
    private panOffset = new THREE.Vector3();
    private zoomStack: Array<{
        target: THREE.Vector3;
        distance: number;
        phi: number;
        theta: number;
    }> = [];
    private readonly MAX_ZOOM_DEPTH = 8;
    private keyState = new Map<string, boolean>();
    private targetNext: THREE.Vector3 | null = null;
    private radiusNext: number | null = null;
    private animStartTime = 0;
    private animDuration = 0;
    private startTarget = new THREE.Vector3();
    private startRadius = 0;
    private isOrthographic = false;
    private orthoCamera: THREE.OrthographicCamera | null = null;

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
        config: Partial<CameraControlsConfig> = {},
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
            ...config,
        };
        this.target = new THREE.Vector3();
        this.spherical = new THREE.Spherical();
        this.sphericalDelta = new THREE.Spherical();
        this.panOffset = new THREE.Vector3();
        this.updateSpherical();
        this.onKeyDown = this.onKeyDown.bind(this);
        this.onKeyUp = this.onKeyUp.bind(this);
        window.addEventListener('keydown', this.onKeyDown);
        window.addEventListener('keyup', this.onKeyUp);
    }

    private onKeyDown(e: KeyboardEvent): void {
        this.keyState.set(e.key.toLowerCase(), true);
    }
    private onKeyUp(e: KeyboardEvent): void {
        this.keyState.set(e.key.toLowerCase(), false);
    }

    rotate(dx: number, dy: number): void {
        if (!this.config.enableRotate) return;
        this.sphericalDelta.theta -= dx * this.config.rotateSpeed * 0.005;
        this.sphericalDelta.phi -= dy * this.config.rotateSpeed * 0.005;
    }

    pan(dx: number, dy: number): void {
        if (!this.config.enablePan) return;
        this._tempOffset.copy(this.camera.position).sub(this.target);
        this._tempSide.crossVectors(this.camera.up, this._tempOffset).normalize();
        this._camUp.copy(this.camera.up).normalize();
        this.panOffset.add(this._tempSide.multiplyScalar(-dx * this.config.panSpeed * 0.1));
        this.panOffset.add(this._camUp.multiplyScalar(dy * this.config.panSpeed * 0.1));
    }

    zoom(factor: number): void {
        if (!this.config.enableZoom) return;
        this.scale *= factor;
    }

    update(): void {
        this._camRight.setFromMatrixColumn(this.camera.matrix, 0);
        this._camForward.setFromMatrixColumn(this.camera.matrix, 2).negate();
        this._camUp.copy(this.camera.up);

        for (const { key, axis, dir } of KEY_CONFIG.pan) {
            if (this.keyState.get(key)) {
                const vec =
                    axis === 'right'
                        ? this._camRight
                        : axis === 'forward'
                          ? this._camForward
                          : this._camUp;
                this.panOffset.add(
                    this._tempVec.copy(vec).multiplyScalar(dir * KEY_CONFIG.speed.pan),
                );
            }
        }

        for (const { key, delta, dir } of KEY_CONFIG.rotate) {
            if (this.keyState.get(key)) this.sphericalDelta[delta] += dir * KEY_CONFIG.speed.rotate;
        }

        for (const { key, factor } of KEY_CONFIG.zoom) {
            if (this.keyState.get(key)) this.scale *= factor;
        }

        this.spherical.theta += this.sphericalDelta.theta;
        this.spherical.phi += this.sphericalDelta.phi;
        this.spherical.phi = Math.max(0.01, Math.min(Math.PI - 0.01, this.spherical.phi));
        this.spherical.radius *= this.scale;
        this.spherical.radius = Math.max(
            this.config.minDistance,
            Math.min(this.config.maxDistance, this.spherical.radius),
        );
        this.target.add(this.panOffset);

        if (this.targetNext) {
            const elapsed = performance.now() - this.animStartTime;
            const t = Math.min(elapsed / this.animDuration, 1);
            const eased = 1 - Math.pow(1 - t, 3);
            this.target.lerpVectors(this.startTarget, this.targetNext, eased);
            if (this.radiusNext)
                this.spherical.radius =
                    this.startRadius + (this.radiusNext - this.startRadius) * eased;
            if (t >= 1) {
                this.targetNext = null;
                this.radiusNext = null;
            }
        }

        this.camera.position.copy(this.target).add(this._tempVec.setFromSpherical(this.spherical));
        this.camera.lookAt(this.target);
        this.sphericalDelta.set(0, 0, 0);
        this.scale = 1;
        this.panOffset.set(0, 0, 0);
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

    flyTo(target: THREE.Vector3, distance: number, duration: number = 1.5): void {
        this.setTargetSmooth(target, distance, duration);
    }

    zoomTo(target: THREE.Vector3, distance: number, duration: number = 1.5): void {
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

    zoomToSurface3D(surface: Surface, duration: number = 1.5): void {
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
    get hasZoomHistory(): boolean {
        return this.canZoomOut();
    }
    flyBack(): void {
        this.zoomOut();
    }

    setTargetSmooth(target: THREE.Vector3, radius: number, duration: number = 1.0): void {
        this.startTarget.copy(this.target);
        this.startRadius = this.spherical.radius;
        this.targetNext = target.clone();
        this.radiusNext = radius;
        this.animStartTime = performance.now();
        this.animDuration = duration * 1000;
    }

    setTarget(x: number, y: number, z: number): void {
        this.target.set(x, y, z);
        this.updateSpherical();
    }

    toggleOrthographic(): void {
        this.isOrthographic = !this.isOrthographic;
        if (this.isOrthographic) {
            if (!this.orthoCamera) {
                const renderer = this.domElement.ownerDocument.defaultView;
                const aspect = renderer
                    ? this.domElement.clientWidth / this.domElement.clientHeight
                    : 1;
                const frustum = this.spherical.radius;
                this.orthoCamera = new THREE.OrthographicCamera(
                    -frustum * aspect,
                    frustum * aspect,
                    frustum,
                    -frustum,
                    0.1,
                    100000,
                );
            }
            this.orthoCamera.position.copy(this.camera.position);
            this.orthoCamera.quaternion.copy(this.camera.quaternion);
        }
    }

    get isUsingOrthographic(): boolean {
        return this.isOrthographic;
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
        window.removeEventListener('keydown', this.onKeyDown);
        window.removeEventListener('keyup', this.onKeyUp);
    }
}
