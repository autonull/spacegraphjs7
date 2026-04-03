import * as THREE from 'three';

import { Node } from './Node';
import type { NodeSpec } from '../types';
import type { SpaceGraph } from '../SpaceGraph';

const instancedMeshRegistry = new WeakMap<SpaceGraph, THREE.InstancedMesh>();
const capacityRegistry = new WeakMap<SpaceGraph, number>();
const nodeCountRegistry = new WeakMap<SpaceGraph, number>();
const nodeIndexRegistry = new WeakMap<InstancedShapeNode, number>();
const colorHelper = new THREE.Color();
const matrixHelper = new THREE.Matrix4();
const positionHelper = new THREE.Vector3();
const rotationHelper = new THREE.Quaternion();
const scaleHelper = new THREE.Vector3(1, 1, 1);

export class InstancedShapeNode extends Node {
    private _object = new THREE.Object3D();
    get object(): THREE.Object3D { return this._object; }

    private instanceIndex: number = -1;
    private colorHex: number;

    constructor(sg: SpaceGraph, spec: NodeSpec) {
        super(sg, spec);
        this.colorHex = (spec.data?.color as number) ?? 0x3366ff;

        this.registerInstance();

        this.updatePosition(this.position.x, this.position.y, this.position.z);
    }

    private registerInstance() {
        const capacity = capacityRegistry.get(this.sg) ?? 0;
        const count = nodeCountRegistry.get(this.sg) ?? 0;

        if (!instancedMeshRegistry.has(this.sg) || count >= capacity) {
            this.rebuildInstancedMesh(Math.max(1000, capacity * 2));
        }

        const mesh = instancedMeshRegistry.get(this.sg)!;
        this.instanceIndex = nodeCountRegistry.get(this.sg) ?? 0;
        nodeCountRegistry.set(this.sg, this.instanceIndex + 1);
        nodeIndexRegistry.set(this, this.instanceIndex);

        this.updateInstanceMatrix();
        this.updateInstanceColor();
        mesh.count = nodeCountRegistry.get(this.sg)!;
    }

    private rebuildInstancedMesh(newCapacity: number) {
        const oldMesh = instancedMeshRegistry.get(this.sg);
        const geometry = new THREE.SphereGeometry(20, 16, 16);
        const material = new THREE.MeshBasicMaterial();
        const newMesh = new THREE.InstancedMesh(geometry, material, newCapacity);
        newMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

        if (newMesh.instanceColor) {
            newMesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
        } else {
            newMesh.instanceColor = new THREE.InstancedBufferAttribute(
                new Float32Array(newCapacity * 3),
                3,
            );
            newMesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
        }

        if (oldMesh) {
            newMesh.count = oldMesh.count;
            for (let i = 0; i < oldMesh.count; i++) {
                oldMesh.getMatrixAt(i, matrixHelper);
                newMesh.setMatrixAt(i, matrixHelper);
                oldMesh.getColorAt(i, colorHelper);
                newMesh.setColorAt(i, colorHelper);
            }
            this.sg.renderer.scene.remove(oldMesh);
            oldMesh.geometry.dispose();
            (oldMesh.material as THREE.Material).dispose();
            oldMesh.dispose();
        } else {
            newMesh.count = 0;
        }

        instancedMeshRegistry.set(this.sg, newMesh);
        capacityRegistry.set(this.sg, newCapacity);
        this.sg.renderer.scene.add(newMesh);
    }

    private updateInstanceMatrix() {
        if (this.instanceIndex === -1) return;
        const mesh = instancedMeshRegistry.get(this.sg);
        if (!mesh) return;

        positionHelper.copy(this.position);
        matrixHelper.compose(positionHelper, rotationHelper, scaleHelper);
        mesh.setMatrixAt(this.instanceIndex, matrixHelper);
        mesh.instanceMatrix.needsUpdate = true;
    }

    private updateInstanceColor() {
        if (this.instanceIndex === -1) return;
        const mesh = instancedMeshRegistry.get(this.sg);
        if (!mesh) return;

        colorHelper.setHex(this.colorHex);
        mesh.setColorAt(this.instanceIndex, colorHelper);
        if (mesh.instanceColor) {
            mesh.instanceColor.needsUpdate = true;
        }
    }

    updatePosition(x: number, y: number, z: number): this {
        super.updatePosition(x, y, z);
        this.updateInstanceMatrix();
        return this;
    }

    updateSpec(updates: Partial<NodeSpec>): this {
        super.updateSpec(updates);

        if (updates.data?.color) {
            this.colorHex = updates.data.color as number;
            this.updateInstanceColor();
        }
        return this;
    }

    dispose(): void {
        if (this.instanceIndex !== -1) {
            const mesh = instancedMeshRegistry.get(this.sg);
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
}
