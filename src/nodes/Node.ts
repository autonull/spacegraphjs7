import * as THREE from 'three';
import gsap from 'gsap';
import { ThreeDisposer } from '../utils/ThreeDisposer';
import { EventEmitter } from '../core/EventEmitter';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec, NodeData, AnimationProps } from '../types';

type NodeEventMap = {
    updated: { node: Node; changes: Partial<NodeSpec>; timestamp: number };
    destroying: { node: Node; timestamp: number };
};

export abstract class Node extends EventEmitter<NodeEventMap> {
    readonly id: string;
    readonly type: string;
    public sg?: SpaceGraph;
    public label?: string;
    public data: NodeData;
    public position: THREE.Vector3;
    public rotation: THREE.Vector3;
    public scale: THREE.Vector3;
    abstract readonly object: THREE.Object3D;

    constructor(sg?: SpaceGraph, spec?: NodeSpec);
    constructor(sgOrSpec?: SpaceGraph | NodeSpec, maybeSpec?: NodeSpec) {
        super();
        const isSpecOnly = !!(sgOrSpec && 'id' in sgOrSpec);
        this.sg = isSpecOnly ? undefined : (sgOrSpec as SpaceGraph);
        const spec = isSpecOnly ? (sgOrSpec as NodeSpec) : maybeSpec;
        this.id = spec?.id ?? '';
        this.type = spec?.type ?? '';
        this.label = spec?.label;
        this.data = spec?.data ?? {};
        this.position = new THREE.Vector3(
            spec?.position?.[0] ?? 0,
            spec?.position?.[1] ?? 0,
            spec?.position?.[2] ?? 0,
        );
        this.rotation = new THREE.Vector3(
            spec?.rotation?.[0] ?? 0,
            spec?.rotation?.[1] ?? 0,
            spec?.rotation?.[2] ?? 0,
        );
        this.scale = new THREE.Vector3(
            spec?.scale?.[0] ?? 1,
            spec?.scale?.[1] ?? 1,
            spec?.scale?.[2] ?? 1,
        );
    }

    requireSpaceGraph(): SpaceGraph {
        if (!this.sg) {
            throw new Error(`Node '${this.id}' requires SpaceGraph but sg is not initialized`);
        }
        return this.sg;
    }

    updateSpec(updates: Partial<NodeSpec>): this {
        const changes: Partial<NodeSpec> = {};

        if (updates.label !== undefined && updates.label !== this.label) {
            this.label = updates.label;
            changes.label = updates.label;
        }

        if (updates.data !== undefined) {
            this.data = { ...this.data, ...updates.data };
            changes.data = updates.data;
        }

        if (updates.position !== undefined) {
            this.position.fromArray(updates.position);
            changes.position = updates.position;
        }

        if (updates.rotation !== undefined) {
            this.rotation.fromArray(updates.rotation);
            changes.rotation = updates.rotation;
        }

        if (updates.scale !== undefined) {
            this.scale.fromArray(updates.scale);
            changes.scale = updates.scale;
        }

        if (Object.keys(changes).length > 0) {
            this.emitWithTimestamp('updated', { node: this, changes });
        }

        return this;
    }

    updatePosition(x: number, y: number, z: number): this {
        this.position.set(x, y, z);
        this.object?.position.copy(this.position);
        return this;
    }

    scaleUniform(s: number): this {
        this.object.scale.set(s, s, s);
        return this;
    }

    animate(props: AnimationProps): this {
        const { scale, onUpdate: _onUpdate, ...positionProps } = props;

        gsap.to(this.position, {
            ...positionProps,
            onUpdate: () => void this.object.position.copy(this.position),
        });

        if (scale !== undefined) {
            gsap.to(this.object.scale, {
                x: scale,
                y: scale,
                z: scale,
                duration: props.duration,
                ease: props.ease,
                delay: props.delay,
            });
        }

        return this;
    }

    applyPosition(
        target: THREE.Vector3,
        {
            animate = true,
            duration = 1.0,
            delay = 0,
        }: { animate?: boolean; duration?: number; delay?: number } = {},
    ): this {
        if (animate && typeof process === 'undefined') {
            gsap.to(this.position, {
                x: target.x,
                y: target.y,
                z: target.z,
                duration,
                ease: 'power2.out',
                delay,
                onUpdate: () => void this.object.position.copy(this.position),
            });
        } else {
            this.position.copy(target);
            this.object.position.copy(target);
        }
        return this;
    }

    toJSON(): NodeSpec {
        return {
            id: this.id,
            type: this.type,
            label: this.label,
            position: [this.position.x, this.position.y, this.position.z] as [
                number,
                number,
                number,
            ],
            rotation: [this.rotation.x, this.rotation.y, this.rotation.z] as [
                number,
                number,
                number,
            ],
            scale: [this.scale.x, this.scale.y, this.scale.z] as [number, number, number],
            data: { ...this.data },
        };
    }

    dispose(): void {
        this.emitWithTimestamp('destroying', { node: this });
        this.object.parent?.remove(this.object);
        ThreeDisposer.dispose(this.object);
        this.removeAllListeners();
    }
}
