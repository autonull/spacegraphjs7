import type * as THREE from 'three';
import type { SpaceGraph } from '../../SpaceGraph';
import type { InteractionRaycaster } from '../../plugins/interaction/RaycasterHelper';
import type { Finger, Fingering } from '../Fingering';

export abstract class BaseFingering implements Fingering {
    protected sg: SpaceGraph;
    protected raycaster: InteractionRaycaster;
    protected active = false;
    protected startPosition = { x: 0, y: 0 };
    protected lastPosition = { x: 0, y: 0 };
    protected delta = { x: 0, y: 0 };
    protected totalDelta = { x: 0, y: 0 };
    protected startTime = 0;
    protected pointerId = -1;

    constructor(sg: SpaceGraph, raycaster: InteractionRaycaster) {
        this.sg = sg;
        this.raycaster = raycaster;
    }

    abstract start(finger: Finger): boolean;
    abstract update(finger: Finger): boolean;
    abstract stop(finger: Finger): void;

    defer(_finger: Finger): boolean {
        return true;
    }

    isActive(): boolean {
        return this.active;
    }

    protected get scene(): THREE.Scene {
        return this.sg.renderer.scene;
    }

    protected get camera(): THREE.PerspectiveCamera {
        return this.sg.renderer.camera as THREE.PerspectiveCamera;
    }

    protected get container(): HTMLElement {
        return this.sg.container;
    }

    protected getDelta(): { x: number; y: number } {
        return { ...this.delta };
    }

    protected getTotalDelta(): { x: number; y: number } {
        return { ...this.totalDelta };
    }

    protected getDistanceFromStart(): number {
        return Math.sqrt(this.totalDelta.x ** 2 + this.totalDelta.y ** 2);
    }

    protected getElapsedTime(): number {
        return Date.now() - this.startTime;
    }

    protected isDragThreshold(movementThreshold = 5): boolean {
        return this.getDistanceFromStart() > movementThreshold;
    }

    protected isTimeThreshold(ms = 300): boolean {
        return this.getElapsedTime() > ms;
    }

    protected screenToWorld(screenX: number, screenY: number, targetZ = 0): THREE.Vector3 {
        const rect = this.container.getBoundingClientRect();
        const x = ((screenX - rect.left) / rect.width) * 2 - 1;
        const y = -((screenY - rect.top) / rect.height) * 2 + 1;
        const vector = new THREE.Vector3(x, y, 0.5);
        vector.unproject(this.camera);
        const dir = vector.sub(this.camera.position).normalize();
        const distance = (targetZ - this.camera.position.z) / dir.z;
        return this.camera.position.clone().add(dir.multiplyScalar(distance));
    }

    protected getWorldPosition(finger: Finger): THREE.Vector3 {
        return this.screenToWorld(finger.position.x, finger.position.y);
    }

    protected getScreenDelta(): number {
        return Math.sqrt(this.delta.x ** 2 + this.delta.y ** 2);
    }

    protected getVelocity(): { x: number; y: number } {
        const elapsed = Math.max(1, this.getElapsedTime());
        return {
            x: this.totalDelta.x / elapsed,
            y: this.totalDelta.y / elapsed,
        };
    }

    protected resetState(): void {
        this.active = false;
        this.startPosition = { x: 0, y: 0 };
        this.lastPosition = { x: 0, y: 0 };
        this.delta = { x: 0, y: 0 };
        this.totalDelta = { x: 0, y: 0 };
        this.startTime = 0;
        this.pointerId = -1;
    }

    protected initState(finger: Finger): void {
        this.active = true;
        this.pointerId = finger.pointerId;
        this.startPosition = { x: finger.position.x, y: finger.position.y };
        this.lastPosition = { x: finger.position.x, y: finger.position.y };
        this.delta = { x: 0, y: 0 };
        this.totalDelta = { x: 0, y: 0 };
        this.startTime = Date.now();
    }

    protected updateDelta(finger: Finger): void {
        this.delta = {
            x: finger.position.x - this.lastPosition.x,
            y: finger.position.y - this.lastPosition.y,
        };
        this.totalDelta = {
            x: finger.position.x - this.startPosition.x,
            y: finger.position.y - this.startPosition.y,
        };
        this.lastPosition = { x: finger.position.x, y: finger.position.y };
    }

    protected emit<K extends string>(event: K, data: Record<string, unknown>): void {
        this.sg.events.emit(event, data);
    }

    protected raycastNodes(): ReturnType<InteractionRaycaster['raycastNodes']> {
        return this.raycaster.raycastNodes();
    }

    protected raycastEdges(): ReturnType<InteractionRaycaster['raycastEdges']> {
        return this.raycaster.raycastEdges();
    }
}