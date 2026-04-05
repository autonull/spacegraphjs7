// SpaceGraphJS - Camera Controls
// Orbit-style camera controls with fly-to animation, zoom stack, and keyboard controls

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
    keyPanSpeed?: number;
    keyZoomSpeed?: number;
    keyPanLeft?: string;
    keyPanRight?: string;
    keyPanFront?: string;
    keyPanBack?: string;
    keyZoomIn?: string;
    keyZoomOut?: string;
    enableKeyboard?: boolean;
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
    private rotateStart: THREE.Vector2;
    private rotateEnd: THREE.Vector2;
    private isDragging = false;
    private state: 'none' | 'rotate' | 'zoom' | 'pan' = 'none';

    private zoomStack: Array<{ target: THREE.Vector3; distance: number }> = [];
    private readonly MAX_ZOOM_DEPTH = 8;

    private targetNext: THREE.Vector3 | null = null;
    private radiusNext: number | null = null;
    private animStartTime = 0;
    private animDuration = 0;
    private startTarget = new THREE.Vector3();
    private startRadius = 0;

    private keyState = new Map<string, boolean>();
    private boundKeyHandlers: Array<{ type: string; handler: (e: KeyboardEvent) => void }> = [];

    private isOrthographic = false;
    private orthoCamera: THREE.OrthographicCamera | null = null;
    private perspectiveCamera: THREE.PerspectiveCamera | null = null;
    private isRightDragging = false;
    private rightDragStart = new THREE.Vector2();

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
            keyPanSpeed: 5.0,
            keyZoomSpeed: 0.4,
            keyPanLeft: 'l',
            keyPanRight: 'r',
            keyPanFront: 'f',
            keyPanBack: 'b',
            keyZoomIn: 'z',
            keyZoomOut: 'x',
            enableKeyboard: true,
            ...config,
        };

        this.target = new THREE.Vector3();
        this.spherical = new THREE.Spherical();
        this.sphericalDelta = new THREE.Spherical();
        this.panOffset = new THREE.Vector3();
        this.rotateStart = new THREE.Vector2();
        this.rotateEnd = new THREE.Vector2();

        this.updateSpherical();
        this.setupEventListeners();
    }

    private updateSpherical(): void {
        const offset = new THREE.Vector3().copy(this.camera.position).sub(this.target);
        this.spherical.setFromVector3(offset);
    }

    private setupEventListeners(): void {
        this.domElement.addEventListener('pointerdown', this.onPointerDown);
        this.domElement.addEventListener('pointermove', this.onPointerMove);
        this.domElement.addEventListener('pointerup', this.onPointerUp);
        this.domElement.addEventListener('wheel', this.onWheel, { passive: false });
        this.domElement.addEventListener('contextmenu', this.onContextMenu);

        const onKeyDown = (e: KeyboardEvent) => this.onKeyDown(e);
        const onKeyUp = (e: KeyboardEvent) => this.onKeyUp(e);
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        this.boundKeyHandlers = [
            { type: 'keydown', handler: onKeyDown },
            { type: 'keyup', handler: onKeyUp },
        ];
    }

    private onKeyDown = (e: KeyboardEvent): void => {
        if (!this.config.enableKeyboard) return;
        this.keyState.set(e.key, true);
    };

    private onKeyUp = (e: KeyboardEvent): void => {
        this.keyState.set(e.key, false);
    };

    private onPointerDown = (event: PointerEvent): void => {
        if (event.button === 0) {
            this.state = 'rotate';
        } else if (event.button === 1 || (event.button === 0 && event.shiftKey)) {
            this.state = 'pan';
        } else if (event.button === 2) {
            this.setRightDragStart(event.clientX, event.clientY);
            return;
        }

        this.rotateStart.set(event.clientX, event.clientY);
        this.isDragging = true;
        this.domElement.setPointerCapture(event.pointerId);
    };

    private onPointerMove = (event: PointerEvent): void => {
        if (this.isRightDragging) {
            this.updateRightDrag(event.clientX, event.clientY);
            return;
        }
        if (!this.isDragging) return;

        this.rotateEnd.set(event.clientX, event.clientY);

        const deltaX = (this.rotateEnd.x - this.rotateStart.x) * this.config.rotateSpeed;
        const deltaY = (this.rotateEnd.y - this.rotateStart.y) * this.config.rotateSpeed;

        if (this.state === 'rotate' && this.config.enableRotate) {
            this.sphericalDelta.theta -= deltaX * 0.005;
            this.sphericalDelta.phi -= deltaY * 0.005;
        } else if (this.state === 'pan' && this.config.enablePan) {
            const offset = new THREE.Vector3().copy(this.camera.position).sub(this.target);
            const side = new THREE.Vector3().crossVectors(this.camera.up, offset).normalize();
            const up = this.camera.up.clone().normalize();

            this.panOffset.add(side.multiplyScalar(-deltaX * 0.1));
            this.panOffset.add(up.multiplyScalar(deltaY * 0.1));
        }

        this.rotateStart.copy(this.rotateEnd);
    };

    private onPointerUp = (event: PointerEvent): void => {
        if (this.isRightDragging) {
            this.endRightDrag();
            return;
        }
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

        this.processKeyboardInput();

        const offset = new THREE.Vector3().setFromSpherical(this.spherical);
        this.camera.position.copy(this.target).add(offset);
        this.camera.lookAt(this.target);

        this.sphericalDelta.set(0, 0, 0);
        this.scale = 1;
        this.panOffset.set(0, 0, 0);
    }

    private processKeyboardInput(): void {
        const { keyPanSpeed, keyZoomSpeed } = this.config;
        const isPressed = (key: string) => this.keyState.get(key);

        if (isPressed(this.config.keyPanLeft)) this.panBy(-keyPanSpeed, 0);
        if (isPressed(this.config.keyPanRight)) this.panBy(keyPanSpeed, 0);
        if (isPressed(this.config.keyPanFront)) this.panBy(0, keyPanSpeed);
        if (isPressed(this.config.keyPanBack)) this.panBy(0, -keyPanSpeed);
        if (isPressed(this.config.keyZoomIn)) this.spherical.radius *= 1 - keyZoomSpeed * 0.01;
        if (isPressed(this.config.keyZoomOut)) this.spherical.radius *= 1 + keyZoomSpeed * 0.01;
        if (isPressed('o')) this.toggleOrthographic();
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

    setRightDragStart(x: number, y: number): void {
        this.isRightDragging = true;
        this.rightDragStart.set(x, y);
    }

    updateRightDrag(x: number, y: number): void {
        if (!this.isRightDragging || !this.config.enableZoom) return;
        const dy = y - this.rightDragStart.y;
        const factor = dy > 0 ? 1.02 : 1 / 1.02;
        this.scale *= Math.pow(factor, Math.abs(dy) * 0.1);
        this.rightDragStart.set(x, y);
    }

    endRightDrag(): void {
        this.isRightDragging = false;
    }

    reset(): void {
        this.target.set(0, 0, 0);
        this.spherical.set(500, Math.PI / 4, 0);
        this.updateSpherical();
    }

    dispose(): void {
        this.domElement.removeEventListener('pointerdown', this.onPointerDown);
        this.domElement.removeEventListener('pointermove', this.onPointerMove);
        this.domElement.removeEventListener('pointerup', this.onPointerUp);
        this.domElement.removeEventListener('wheel', this.onWheel);
        this.domElement.removeEventListener('contextmenu', this.onContextMenu);

        for (const { type, handler } of this.boundKeyHandlers) {
            window.removeEventListener(type, handler);
        }
        this.boundKeyHandlers = [];
        this.keyState.clear();
        this.zoomStack = [];
    }
}
