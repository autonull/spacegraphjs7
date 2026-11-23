import {
    Color,
    InstancedMesh,
    Matrix4,
    MeshBasicMaterial,
    Quaternion,
    SphereGeometry,
    Vector3,
} from 'three';

import type { SpaceGraph } from '../SpaceGraph';
import { growInstancedMesh } from '../rendering/InstancedMeshLifecycle';
import type { NodeSpec } from '../types';
import { BaseInstancedNode } from './BaseInstancedNode';

const instancedMeshRegistry = new WeakMap<SpaceGraph, InstancedMesh>();
const capacityRegistry = new WeakMap<SpaceGraph, number>();
const nodeCountRegistry = new WeakMap<SpaceGraph, number>();
const nodeIndexRegistry = new WeakMap<InstancedShapeNode, number>();
const colorHelper = new Color();
const matrixHelper = new Matrix4();
const positionHelper = new Vector3();
const rotationHelper = new Quaternion();
const scaleHelper = new Vector3(1, 1, 1);

export class InstancedShapeNode extends BaseInstancedNode {
    static readonly typeName: string = 'InstancedShapeNode';
    private instanceIndex = -1;

    constructor(sg: SpaceGraph | undefined, spec: NodeSpec) {
        super(sg, spec);
        this.registerInstance();
        this.syncSpecTransform();
    }

    dispose(): void {
        if (this.instanceIndex !== -1) {
            const mesh = instancedMeshRegistry.get(this.sg!);
            if (mesh) {
                scaleHelper.set(0, 0, 0);
                matrixHelper.compose(this.position, rotationHelper, scaleHelper);
                mesh.setMatrixAt(this.instanceIndex, matrixHelper);
                mesh.instanceMatrix.needsUpdate = true;
                scaleHelper.set(1, 1, 1);
            }
        }
        nodeIndexRegistry.delete(this);
        super.dispose();
    }

    protected registerInstance() {
        const capacity = capacityRegistry.get(this.sg!) ?? 0;
        const count = nodeCountRegistry.get(this.sg!) ?? 0;

        if (!instancedMeshRegistry.has(this.sg!) || count >= capacity) {
            this.rebuildInstancedMesh(Math.max(1000, capacity * 2));
        }

        const mesh = instancedMeshRegistry.get(this.sg!)!;
        this.instanceIndex = nodeCountRegistry.get(this.sg!) ?? 0;
        nodeCountRegistry.set(this.sg!, this.instanceIndex + 1);
        nodeIndexRegistry.set(this, this.instanceIndex);

        this.updateInstanceMatrix();
        this.updateInstanceColor();
        mesh.count = nodeCountRegistry.get(this.sg!)!;
    }

    protected updateInstanceTransform() {
        this.updateInstanceMatrix();
        this.updateInstanceColor();
    }

    private rebuildInstancedMesh(newCapacity: number) {
        const mesh = growInstancedMesh(
            instancedMeshRegistry.get(this.sg!),
            new SphereGeometry(20, 16, 16),
            new MeshBasicMaterial(),
            newCapacity,
            this.sg!.renderer.scene,
        );

        instancedMeshRegistry.set(this.sg!, mesh);
        capacityRegistry.set(this.sg!, newCapacity);
    }

    private updateInstanceMatrix() {
        if (this.instanceIndex === -1) return;
        const mesh = instancedMeshRegistry.get(this.sg!);
        if (!mesh) return;

        positionHelper.copy(this.position);
        matrixHelper.compose(positionHelper, rotationHelper, scaleHelper);
        mesh.setMatrixAt(this.instanceIndex, matrixHelper);
        mesh.instanceMatrix.needsUpdate = true;
    }

    private updateInstanceColor() {
        if (this.instanceIndex === -1) return;
        const mesh = instancedMeshRegistry.get(this.sg!);
        if (!mesh) return;

        colorHelper.setHex(this.colorHex);
        mesh.setColorAt(this.instanceIndex, colorHelper);
        if (mesh.instanceColor) {
            mesh.instanceColor.needsUpdate = true;
        }
    }
}
