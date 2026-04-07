import * as THREE from 'three';
import { Node } from './Node';
import type { NodeSpec } from '../types';
import type { SpaceGraph } from '../SpaceGraph';

/**
 * TexturedMeshNode — Abstract base for nodes that render a texture on a plane.
 * Subclasses provide the texture source (URL, canvas, video, etc.).
 */
export abstract class TexturedMeshNode extends Node {
    protected readonly _object: THREE.Group;
    protected texture: THREE.Texture | null = null;
    protected plane: THREE.Mesh;
    protected planeGeometry: THREE.PlaneGeometry;
    protected planeMaterial: THREE.MeshBasicMaterial;

    get object(): THREE.Object3D {
        return this._object;
    }

    constructor(sg: SpaceGraph, spec: NodeSpec, width: number, height: number) {
        super(sg, spec);

        this._object = new THREE.Group();
        this.planeGeometry = new THREE.PlaneGeometry(width, height);
        this.planeMaterial = new THREE.MeshBasicMaterial({
            transparent: true,
            side: THREE.DoubleSide,
        });
        this.plane = new THREE.Mesh(this.planeGeometry, this.planeMaterial);
        this._object.add(this.plane);
        this.updatePosition(this.position.x, this.position.y, this.position.z);
    }

    protected setTexture(texture: THREE.Texture): void {
        this.texture?.dispose();
        this.texture = texture;
        this.planeMaterial.map = texture;
        this.planeMaterial.needsUpdate = true;
    }

    dispose(): void {
        this.texture?.dispose();
        this.planeGeometry?.dispose();
        this.planeMaterial?.dispose();
        super.dispose();
    }
}
