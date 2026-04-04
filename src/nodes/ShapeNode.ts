import * as THREE from 'three';

import { Node } from './Node';
import { DOMUtils } from '../utils/DOMUtils';
import type { NodeSpec, ShapeNodeData } from '../types';
import type { SpaceGraph } from '../SpaceGraph';

type ShapeType = 'sphere' | 'box' | 'circle' | 'plane' | 'cone' | 'cylinder' | 'torus' | 'ring';

const GEOMETRY_FACTORIES: Record<ShapeType, (size: number) => THREE.BufferGeometry> = {
    sphere: (size) => new THREE.SphereGeometry(size / 2, 32, 32),
    box: (size) => new THREE.BoxGeometry(size, size, size),
    circle: (size) => new THREE.CircleGeometry(size / 2, 32),
    plane: (size) => new THREE.CircleGeometry(size / 2, 32),
    cone: (size) => new THREE.ConeGeometry(size / 2, size, 32),
    cylinder: (size) => new THREE.CylinderGeometry(size / 2, size / 2, size, 32),
    torus: (size) => new THREE.TorusGeometry(size / 3, size / 8, 16, 48),
    ring: (size) => new THREE.RingGeometry(size / 4, size / 2, 32),
};

export class ShapeNode extends Node {
    private meshGeometry: THREE.BufferGeometry;
    private meshMaterial: THREE.MeshBasicMaterial;
    private labelSprite?: THREE.Sprite;
    private shapeType: ShapeType = 'sphere';
    private nodeSize: number = 40;
    private readonly _object: THREE.Group;

    get object(): THREE.Object3D {
        return this._object;
    }

    constructor(sg: SpaceGraph, spec: NodeSpec) {
        super(sg, spec);

        this._object = new THREE.Group();

        const data = spec.data as ShapeNodeData;
        this.shapeType = (data?.shape as ShapeType) ?? 'sphere';
        this.nodeSize = data?.size ?? 40;
        const color = (data?.color as THREE.ColorRepresentation) ?? 0x3366ff;

        this.meshGeometry = this.createGeometry(this.shapeType, this.nodeSize);
        this.meshMaterial = new THREE.MeshBasicMaterial({ color });
        const mesh = new THREE.Mesh(this.meshGeometry, this.meshMaterial);

        this._object.add(mesh);

        if (spec.label) {
            this.labelSprite = this.createLabel(spec.label);
            this.labelSprite.position.y = -this.nodeSize * 0.8;
            this._object.add(this.labelSprite);
        }

        this.updatePosition(this.position.x, this.position.y, this.position.z);
    }

    private createGeometry(shape: ShapeType, size: number): THREE.BufferGeometry {
        return GEOMETRY_FACTORIES[shape]?.(size) ?? GEOMETRY_FACTORIES.sphere(size);
    }

    private _getMesh(): THREE.Mesh | undefined {
        return this.object.children.find((c) => c instanceof THREE.Mesh) as THREE.Mesh | undefined;
    }

    updateSpec(updates: Partial<NodeSpec>): this {
        super.updateSpec(updates);

        if (updates.data) {
            const data = updates.data as ShapeNodeData;

            if (data.color && typeof data.color === 'number') {
                this.meshMaterial.color.setHex(data.color);
            }

            if (data.shape && data.shape !== this.shapeType) {
                this.shapeType = data.shape as ShapeType;
                this.disposeGeometry();
                this.meshGeometry = this.createGeometry(this.shapeType, this.nodeSize);
                const mesh = this._getMesh();
                if (mesh) mesh.geometry = this.meshGeometry;
            }

            if (data.size && data.size !== this.nodeSize) {
                this.nodeSize = data.size;
                this.disposeGeometry();
                this.meshGeometry = this.createGeometry(this.shapeType, this.nodeSize);
                const mesh = this._getMesh();
                if (mesh) mesh.geometry = this.meshGeometry;
                if (this.labelSprite) {
                    this.labelSprite.position.y = -this.nodeSize * 0.8;
                }
            }
        }

        if (updates.label !== undefined) {
            if (this.labelSprite) {
                this.labelSprite.material.map?.dispose();
                this.labelSprite.material.dispose();
                this.object.remove(this.labelSprite);
                this.labelSprite = undefined;
            }

            if (updates.label) {
                this.labelSprite = this.createLabel(updates.label);
                this.labelSprite.position.y = -this.nodeSize * 0.8;
                this.object.add(this.labelSprite);
            }
        }
        return this;
    }

    private disposeGeometry(): void {
        this.meshGeometry?.dispose();
    }

    private createLabel(text: string): THREE.Sprite {
        const canvas = DOMUtils.createElement('canvas');
        const context = canvas.getContext('2d');

        canvas.width = 256;
        canvas.height = 64;

        if (context) {
            context.font = '24px Arial';
            context.fillStyle = 'white';
            context.textAlign = 'center';
            context.fillText(text, canvas.width / 2, canvas.height / 2 + 8);
        }

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture, depthTest: false });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(this.nodeSize * 1.5, this.nodeSize * 0.4, 1);

        return sprite;
    }

    getBoundingSphereRadius(): number {
        return this.nodeSize / 2;
    }

    dispose(): void {
        this.disposeGeometry();
        this.meshMaterial?.dispose();
        if (this.labelSprite) {
            this.labelSprite.material.map?.dispose();
            this.labelSprite.material.dispose();
        }
        super.dispose();
    }
}
