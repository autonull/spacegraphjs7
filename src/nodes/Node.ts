import * as THREE from 'three';
import gsapPkg from 'gsap';
const gsap = gsapPkg.gsap || gsapPkg;
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

    updateSpec(updates: Partial<NodeSpec>): this {
        if (updates.label !== undefined) this.label = updates.label;
        if (updates.data) this.data = { ...this.data, ...updates.data };
        if (updates.position)
            this.updatePosition(updates.position[0], updates.position[1], updates.position[2]);
        return this;
    }

    updatePosition(x: number, y: number, z: number): this {
        this.position.set(x, y, z);
        this.object.position.copy(this.position);
        return this;
    }

    setPosition(x: number, y: number, z: number = 0): this {
        return this.updatePosition(x, y, z);
    }

    scale(s: number): this {
        this.object.scale.set(s, s, s);
        return this;
    }

    animate(props: any): this {
        const positionProps = { ...props };
        delete positionProps.scale; // Remove scale to avoid GSAP warning on position

        gsap.to(this.position, {
            ...positionProps,
            onUpdate: () => {
                this.object.position.copy(this.position);
                if (props.onUpdate) props.onUpdate();
            }
        });
        if (props.scale !== undefined) {
            gsap.to(this.object.scale, {
                x: props.scale,
                y: props.scale,
                z: props.scale,
                duration: props.duration,
                ease: props.ease,
                delay: props.delay
            });
        }
        return this;
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
