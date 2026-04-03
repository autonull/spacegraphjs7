import * as THREE from 'three';

import { Node } from './Node';
import type { NodeSpec } from '../types';
import type { SpaceGraph } from '../SpaceGraph';

export class ImageNode extends Node {
    private meshGeometry: THREE.PlaneGeometry;
    private meshMaterial: THREE.MeshBasicMaterial;
    private readonly _object: THREE.Group;

    get object(): THREE.Object3D {
        return this._object;
    }

    constructor(sg: SpaceGraph, spec: NodeSpec) {
        super(sg, spec);

        this._object = new THREE.Group();
        this.meshGeometry = new THREE.PlaneGeometry(100, 100);
        this.meshMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true });

        if (spec.data?.url) {
            new THREE.TextureLoader().load(spec.data.url as string, (texture) => {
                this.meshMaterial.map = texture;
                this.meshMaterial.needsUpdate = true;
            });
        }

        const mesh = new THREE.Mesh(this.meshGeometry, this.meshMaterial);
        mesh.rotation.y = 0;

        this._object.add(mesh);
        this.updatePosition(this.position.x, this.position.y, this.position.z);
    }

    updateSpec(updates: Partial<NodeSpec>): this {
        super.updateSpec(updates);

        if (updates.data?.url) {
            new THREE.TextureLoader().load(updates.data.url as string, (texture) => {
                this.meshMaterial.map?.dispose();
                this.meshMaterial.map = texture;
                this.meshMaterial.needsUpdate = true;
            });
        }

        return this;
    }

    dispose(): void {
        this.meshGeometry?.dispose();
        if (this.meshMaterial) {
            this.meshMaterial.map?.dispose();
            this.meshMaterial.dispose();
        }
        super.dispose();
    }
}
