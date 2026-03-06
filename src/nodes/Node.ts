import * as THREE from 'three';
import { ThreeDisposer } from '../utils/ThreeDisposer';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec } from '../types';

export class Node {
    public id: string;
    public sg: SpaceGraph;
    public label?: string;
    public data: any;
    public object: THREE.Object3D;
    public position: THREE.Vector3;

    constructor(sg: SpaceGraph, spec: NodeSpec) {
        this.sg = sg;
        this.id = spec.id;
        this.label = spec.label;
        this.data = spec.data || {};
        this.position = new THREE.Vector3(
            spec.position?.[0] || 0,
            spec.position?.[1] || 0,
            spec.position?.[2] || 0,
        );
        this.object = new THREE.Object3D();
    }

    updateSpec(updates: Partial<NodeSpec>) {
        if (updates.label !== undefined) this.label = updates.label;
        if (updates.data) this.data = { ...this.data, ...updates.data };
        if (updates.position)
            this.updatePosition(updates.position[0], updates.position[1], updates.position[2]);
    }

    updatePosition(x: number, y: number, z: number) {
        this.position.set(x, y, z);
        this.object.position.copy(this.position);
    }

    /**
     * Cleanly destroy this node and recursively free geometry, materials, and textures
     * to prevent WebGL context memory leaks.
     */
    dispose(): void {
        this.object.parent?.remove(this.object);
        ThreeDisposer.dispose(this.object);
    }
}
