// SpaceGraphJS - Camera Controls
// Pure camera state machine - all input handled via Fingering

import * as THREE from 'three';

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

export class CameraControls {
    readonly camera: THREE.Camera;
    readonly domElement: HTMLElement;
    target: THREE.Vector3;
    spherical: THREE.Spherical;

    private config: CameraControlsConfig;
    private sphericalDelta: THREE.Spherical;
    private scale: number = 1;
    private panOffset: THREE.Vector3;

    private zoomStack: Array<{ target: THREE.Vector3; distance: number }> = [];
    private readonly MAX_ZOOM_DEPTH = 8;

    private targetNext: THREE.Vector3 | null = null;
    private radiusNext: number | null = null;
    private animStartTime = 0;
    private animDuration = 0;
    private startTarget = new THREE.Vector3();
    private startRadius = 0;

    private isOrthographic = false;
    private orthoCamera: THREE.OrthographicCamera | null = null;

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
    }

    private updateSpherical(): void {
        const offset = new THREE.Vector3().copy(this.camera.position).sub(this.target);
        this.spherical.setFromVector3(offset);
    }

    rotate(dx: number, dy: number): void {
        if (!this.config.enableRotate) return;
        this.sphericalDelta.theta -= dx * this.config.rotateSpeed * 0.005;
        this.sphericalDelta.phi -= dy * this.config.rotateSpeed * 0.005;
    }

    pan(dx: number, dy: number): void {
        if (!this.config.enablePan) return;
        const offset = new THREE.Vector3().copy(this.camera.position).sub(this.target);
        const side = new THREE.Vector3().crossVectors(this.camera.up, offset).normalize();
        const up = this.camera.up.clone().normalize();
        this.panOffset.add(side.multiplyScalar(-dx * this.config.panSpeed * 0.1));
        this.panOffset.add(up.multiplyScalar(dy * this.config.panSpeed * 0.1));
    }

    zoom(factor: number): void {
        if (!this.config.enableZoom) return;
        this.scale *= factor;
    }

    update(): void {
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
            if (this.radiusNext) {
                this.spherical.radius =
                    this.startRadius + (this.radiusNext - this.startRadius) * eased;
            }

            if (t >= 1) {
                this.targetNext = null;
                this.radiusNext = null;
            }
        }

        const offset = new THREE.Vector3().setFromSpherical(this.spherical);
        this.camera.position.copy(this.target).add(offset);
        this.camera.lookAt(this.target);

        this.sphericalDelta.set(0, 0, 0);
        this.scale = 1;
        this.panOffset.set(0, 0, 0);
    }

    panBy(dx: number, dy: number): void {
        const offset = new THREE.Vector3().copy(this.camera.position).sub(this.target);
        const side = new THREE.Vector3().crossVectors(this.camera.up, offset).normalize();
        const up = this.camera.up.clone().normalize();
        this.panOffset.add(side.multiplyScalar(-dx));
        this.panOffset.add(up.multiplyScalar(dy));
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

        this.zoomStack.push({ target: this.target.clone(), distance: this.spherical.radius });
        if (this.zoomStack.length > this.MAX_ZOOM_DEPTH) this.zoomStack.shift();

        this.flyTo(target, distance, duration);
    }

    zoomOut(): void {
        if (this.zoomStack.length === 0) return;
        const prev = this.zoomStack.pop()!;
        this.flyTo(prev.target, prev.distance);
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
    }
}
