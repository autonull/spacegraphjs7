import * as THREE from 'three';
import type { SpaceGraph } from '../SpaceGraph';
export declare class CameraControls {
    private sg;
    private isDragging;
    private dragMode;
    private previousMousePosition;
    spherical: {
        theta: number;
        phi: number;
        radius: number;
    };
    target: THREE.Vector3;
    private damping;
    private velocity;
    private panVelocity;
    private activeTouches;
    private prevPinchDistance;
    private prevPinchMidpoint;
    constructor(sg: SpaceGraph);
    private updateCameraPosition;
    flyTo(targetPos: THREE.Vector3, targetRadius: number, duration?: number): void;
    update(): void;
    private setupControls;
}
