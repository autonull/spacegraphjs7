import * as THREE from 'three';
import type { Node } from '../nodes/Node';
import type { Edge } from '../edges/Edge';

export class PickState {
    private dragStartPosition: THREE.Vector2 | null = null;
    private isDragging = false;
    private dragThreshold = 5;

    constructor(
        private lastPickedNode: Node | null = null,
        private lastPickedEdge: Edge | null = null,
    ) {}

    startPick(node: Node | null, edge: Edge | null, position: THREE.Vector2): void {
        this.lastPickedNode = node;
        this.lastPickedEdge = edge;
        this.dragStartPosition = position.clone();
        this.isDragging = false;
    }

    checkDragThreshold(currentPosition: THREE.Vector2): boolean {
        if (!this.dragStartPosition || !this.lastPickedNode) return false;
        if (this.dragStartPosition.distanceTo(currentPosition) > this.dragThreshold && !this.isDragging) {
            this.isDragging = true;
            return true;
        }
        return this.isDragging;
    }

    getPickedNode(): Node | null { return this.lastPickedNode; }
    getPickedEdge(): Edge | null { return this.lastPickedEdge; }
    getIsDragging(): boolean { return this.isDragging; }
    setThreshold(pixels: number): void { this.dragThreshold = pixels; }
    clear(): void { this.lastPickedNode = null; this.lastPickedEdge = null; this.dragStartPosition = null; this.isDragging = false; }
}