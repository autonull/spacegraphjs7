import * as THREE from 'three';
import gsap from 'gsap';
import type { SpaceGraph } from '../SpaceGraph';

export class CameraControls {
    private sg: SpaceGraph;
    private isDragging = false;
    private dragMode: 'rotate' | 'pan' = 'rotate';
    private previousMousePosition = { x: 0, y: 0 };
    public spherical = { theta: 0, phi: Math.PI / 2, radius: 500 };
    public target = new THREE.Vector3(0, 0, 0);

    private damping = 0.9;
    private velocity = { x: 0, y: 0 };
    private panVelocity = { x: 0, y: 0 };

    // Touch tracking
    private activeTouches: Map<number, { x: number; y: number }> = new Map();
    private prevPinchDistance = 0;
    private prevPinchMidpoint = { x: 0, y: 0 };

    constructor(sg: SpaceGraph) {
        this.sg = sg;
        this.setupControls();
    }

    private updateCameraPosition() {
        const camera = this.sg.renderer.camera;
        camera.position.x =
            this.target.x +
            this.spherical.radius * Math.sin(this.spherical.phi) * Math.sin(this.spherical.theta);
        camera.position.y = this.target.y + this.spherical.radius * Math.cos(this.spherical.phi);
        camera.position.z =
            this.target.z +
            this.spherical.radius * Math.sin(this.spherical.phi) * Math.cos(this.spherical.theta);
        camera.lookAt(this.target);

        // Emitting this constantly during drag causes heavy React/Solid UI thrashing.
        // We batch it to requestAnimationFrame cadence.
        this.sg.events.emitBatched('camera:move', {
            position: camera.position,
            target: this.target.clone(),
        });
    }

    public flyTo(targetPos: THREE.Vector3, targetRadius: number, duration: number = 1.5): void {
        // Animate both the look-at target and the spherical radius
        gsap.to(this.target, {
            x: targetPos.x,
            y: targetPos.y,
            z: targetPos.z,
            duration,
            ease: 'power2.inOut',
        });

        gsap.to(this.spherical, {
            radius: targetRadius,
            duration,
            ease: 'power2.inOut',
            onUpdate: () => {
                this.updateCameraPosition();
            },
        });
    }

    public update() {
        let changed = false;

        if (
            !this.isDragging &&
            (Math.abs(this.velocity.x) > 0.0001 || Math.abs(this.velocity.y) > 0.0001)
        ) {
            this.spherical.theta -= this.velocity.x;
            this.spherical.phi = Math.max(
                0.1,
                Math.min(Math.PI - 0.1, this.spherical.phi + this.velocity.y),
            );

            this.velocity.x *= this.damping;
            this.velocity.y *= this.damping;
            changed = true;
        }

        if (
            !this.isDragging &&
            (Math.abs(this.panVelocity.x) > 0.0001 || Math.abs(this.panVelocity.y) > 0.0001)
        ) {
            const camera = this.sg.renderer.camera;
            const right = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0);
            const up = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 1);

            this.target.add(right.multiplyScalar(this.panVelocity.x));
            this.target.add(up.multiplyScalar(this.panVelocity.y));

            this.panVelocity.x *= this.damping;
            this.panVelocity.y *= this.damping;
            changed = true;
        }

        if (changed) {
            this.updateCameraPosition();
        }
    }

    private setupControls() {
        const canvas = this.sg.renderer.renderer.domElement;

        canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });

        canvas.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.dragMode = e.button === 2 ? 'pan' : 'rotate';
            this.previousMousePosition = { x: e.clientX, y: e.clientY };
            if (this.dragMode === 'rotate') this.velocity = { x: 0, y: 0 };
            if (this.dragMode === 'pan') this.panVelocity = { x: 0, y: 0 };
        });

        canvas.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;

            const deltaX = e.clientX - this.previousMousePosition.x;
            const deltaY = e.clientY - this.previousMousePosition.y;

            if (this.dragMode === 'rotate') {
                this.velocity.x = deltaX * 0.005;
                this.velocity.y = deltaY * 0.005;

                this.spherical.theta -= this.velocity.x;
                this.spherical.phi = Math.max(
                    0.1,
                    Math.min(Math.PI - 0.1, this.spherical.phi + this.velocity.y),
                );
            } else if (this.dragMode === 'pan') {
                // Calculate pan distance based on camera distance to maintain perceived speed
                const panSpeed = this.spherical.radius * 0.002;
                this.panVelocity.x = -deltaX * panSpeed;
                this.panVelocity.y = deltaY * panSpeed;

                const camera = this.sg.renderer.camera;
                const right = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0);
                const up = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 1);

                this.target.add(right.multiplyScalar(this.panVelocity.x));
                this.target.add(up.multiplyScalar(this.panVelocity.y));
            }

            this.updateCameraPosition();
            this.previousMousePosition = { x: e.clientX, y: e.clientY };
        });

        canvas.addEventListener('mouseup', () => {
            this.isDragging = false;
        });

        canvas.addEventListener('mouseleave', () => {
            this.isDragging = false;
        });

        // --- Touch Gestures ---

        canvas.addEventListener(
            'touchstart',
            (e) => {
                // e.preventDefault(); // allow default to handle taps, let InteractionPlugin catch taps
                for (let i = 0; i < e.changedTouches.length; i++) {
                    const touch = e.changedTouches[i];
                    this.activeTouches.set(touch.identifier, {
                        x: touch.clientX,
                        y: touch.clientY,
                    });
                }

                if (this.activeTouches.size === 1) {
                    this.isDragging = true;
                    this.dragMode = 'rotate';
                    const t = Array.from(this.activeTouches.values())[0];
                    this.previousMousePosition = { x: t.x, y: t.y };
                    this.velocity = { x: 0, y: 0 };
                } else if (this.activeTouches.size === 2) {
                    // Initiate pinch/pan
                    this.isDragging = true;
                    this.dragMode = 'pan'; // 2 fingers pan by default + pinched
                    const t = Array.from(this.activeTouches.values());

                    // Initial distance between two fingers
                    const dx = t[0].x - t[1].x;
                    const dy = t[0].y - t[1].y;
                    this.prevPinchDistance = Math.sqrt(dx * dx + dy * dy);

                    // Midpoint
                    this.prevPinchMidpoint = {
                        x: (t[0].x + t[1].x) / 2,
                        y: (t[0].y + t[1].y) / 2,
                    };
                    this.panVelocity = { x: 0, y: 0 };
                }
            },
            { passive: false },
        ); // Needs to be false to optionally preventDefault on move

        canvas.addEventListener(
            'touchmove',
            (e) => {
                e.preventDefault(); // Stop page scrolling when manipulating graph

                for (let i = 0; i < e.changedTouches.length; i++) {
                    const touch = e.changedTouches[i];
                    this.activeTouches.set(touch.identifier, {
                        x: touch.clientX,
                        y: touch.clientY,
                    });
                }

                if (!this.isDragging) return;

                if (this.activeTouches.size === 1) {
                    // Standard 1-finger rotate
                    const t = Array.from(this.activeTouches.values())[0];
                    const deltaX = t.x - this.previousMousePosition.x;
                    const deltaY = t.y - this.previousMousePosition.y;

                    this.velocity.x = deltaX * 0.005;
                    this.velocity.y = deltaY * 0.005;

                    this.spherical.theta -= this.velocity.x;
                    this.spherical.phi = Math.max(
                        0.1,
                        Math.min(Math.PI - 0.1, this.spherical.phi + this.velocity.y),
                    );

                    this.previousMousePosition = { x: t.x, y: t.y };
                    this.updateCameraPosition();
                } else if (this.activeTouches.size === 2) {
                    const t = Array.from(this.activeTouches.values());

                    // 1. Pinch-to-zoom calculation
                    const dx = t[0].x - t[1].x;
                    const dy = t[0].y - t[1].y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    const distanceDelta = distance - this.prevPinchDistance;
                    const zoomSpeed = this.spherical.radius * 0.005; // speed scales with distance
                    this.spherical.radius = Math.max(
                        10,
                        Math.min(5000, this.spherical.radius - distanceDelta * zoomSpeed),
                    );

                    this.prevPinchDistance = distance;

                    // 2. Midpoint 2-finger panning calculation
                    const currentMidpoint = {
                        x: (t[0].x + t[1].x) / 2,
                        y: (t[0].y + t[1].y) / 2,
                    };

                    const midDeltaX = currentMidpoint.x - this.prevPinchMidpoint.x;
                    const midDeltaY = currentMidpoint.y - this.prevPinchMidpoint.y;

                    const panSpeed = this.spherical.radius * 0.002;
                    this.panVelocity.x = -midDeltaX * panSpeed;
                    this.panVelocity.y = midDeltaY * panSpeed;

                    const camera = this.sg.renderer.camera;
                    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0);
                    const up = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 1);

                    this.target.add(right.multiplyScalar(this.panVelocity.x));
                    this.target.add(up.multiplyScalar(this.panVelocity.y));

                    this.prevPinchMidpoint = currentMidpoint;
                    this.updateCameraPosition();
                }
            },
            { passive: false },
        );

        const handleTouchEnd = (e: TouchEvent) => {
            for (let i = 0; i < e.changedTouches.length; i++) {
                this.activeTouches.delete(e.changedTouches[i].identifier);
            }

            if (this.activeTouches.size === 0) {
                this.isDragging = false;
            } else if (this.activeTouches.size === 1) {
                // Drop down to 1 finger rotation safely
                const remains = Array.from(this.activeTouches.values())[0];
                this.dragMode = 'rotate';
                this.previousMousePosition = { x: remains.x, y: remains.y };
            }
        };

        canvas.addEventListener('touchend', handleTouchEnd);
        canvas.addEventListener('touchcancel', handleTouchEnd);

        // --- Mouse Wheel ---
        canvas.addEventListener(
            'wheel',
            (e) => {
                this.spherical.radius = Math.max(
                    10,
                    Math.min(5000, this.spherical.radius + e.deltaY),
                );
                this.updateCameraPosition();
                e.preventDefault();
            },
            { passive: false },
        );

        this.updateCameraPosition();
    }
}
