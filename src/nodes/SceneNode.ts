import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { Node } from './Node';
import { createLogger } from '../utils/logger';
import type { NodeSpec } from '../types';
import type { SpaceGraph } from '../SpaceGraph';

const logger = createLogger('SceneNode');

export class SceneNode extends Node {
    private _object = new THREE.Object3D();
    get object(): THREE.Object3D {
        return this._object;
    }

    private modelRoot?: THREE.Group;
    private loader: GLTFLoader;
    private proxyMesh?: THREE.Mesh;
    private wrapper: THREE.Group;
    private rotationSpeed: number = 0;

    constructor(sg: SpaceGraph, spec: NodeSpec) {
        super(sg, spec);

        const url = (spec.data?.url as string) ?? undefined;
        const targetSize = (spec.data?.targetSize as number) ?? 100;
        const autoCenter = (spec.data?.autoCenter as boolean) ?? true;
        this.rotationSpeed = (spec.data?.rotationSpeed as number) ?? 0;

        this.loader = new GLTFLoader();
        this.wrapper = new THREE.Group();
        this._object.add(this.wrapper);

        if (url) {
            this.loadModel(url, targetSize, autoCenter);
        } else {
            logger.warn('Node %s: No URL provided.', this.id);
        }

        this.updatePosition(this.position.x, this.position.y, this.position.z);
    }

    private loadModel(url: string, targetSize: number, autoCenter: boolean) {
        this.loader.load(
            url,
            (gltf) => {
                this.modelRoot = gltf.scene;

                const box = new THREE.Box3().setFromObject(this.modelRoot);
                const size = new THREE.Vector3();
                box.getSize(size);
                const center = new THREE.Vector3();
                box.getCenter(center);

                const maxDim = Math.max(size.x, size.y, size.z);
                if (maxDim > 0) {
                    const scale = targetSize / maxDim;
                    this.modelRoot.scale.setScalar(scale);
                }

                if (autoCenter) {
                    const newBox = new THREE.Box3().setFromObject(this.modelRoot);
                    newBox.getCenter(center);
                    this.modelRoot.position.sub(center);
                }

                this.wrapper.add(this.modelRoot);

                const finalBox = new THREE.Box3().setFromObject(this.wrapper);
                const finalSize = new THREE.Vector3();
                finalBox.getSize(finalSize);

                const proxyGeo = new THREE.BoxGeometry(finalSize.x, finalSize.y, finalSize.z);
                if (proxyGeo.computeBoundsTree) proxyGeo.computeBoundsTree();

                const proxyMat = new THREE.MeshBasicMaterial({ visible: false });
                this.proxyMesh = new THREE.Mesh(proxyGeo, proxyMat);

                const finalCenter = new THREE.Vector3();
                finalBox.getCenter(finalCenter);
                this.wrapper.worldToLocal(finalCenter);
                this.proxyMesh.position.copy(finalCenter);

                this.wrapper.add(this.proxyMesh);

                this.sg!.events.emit('node:loaded', { id: this.id });
            },
            undefined,
            (error) => {
                logger.error('Node %s: Error loading model:', this.id, error);
            },
        );
    }

    update() {
        if (this.rotationSpeed !== 0 && this.wrapper) {
            this.wrapper.rotation.y += this.rotationSpeed;
        }
    }

    updateSpec(updates: Partial<NodeSpec>): this {
        super.updateSpec(updates);
        if (updates.data?.url && (updates.data.url as string) !== this.data.url) {
            if (this.modelRoot && this.modelRoot.parent) {
                this.modelRoot.parent.remove(this.modelRoot);
            }
            this.loadModel(
                updates.data.url as string,
                (updates.data.targetSize as number) ?? 100,
                (updates.data.autoCenter as boolean) ?? true,
            );
        }

        if (updates.data?.rotationSpeed !== undefined) {
            this.rotationSpeed = updates.data.rotationSpeed as number;
        }
        return this;
    }

    dispose(): void {
        if (this.modelRoot) {
            this.modelRoot.traverse((child) => {
                if ((child as THREE.Mesh).isMesh) {
                    const mesh = child as THREE.Mesh;
                    mesh.geometry.dispose();
                    if (mesh.geometry.disposeBoundsTree) mesh.geometry.disposeBoundsTree();
                    if (Array.isArray(mesh.material)) {
                        for (const m of mesh.material) m.dispose();
                    } else if (mesh.material) {
                        mesh.material.dispose();
                    }
                }
            });
        }
        if (this.proxyMesh) {
            this.proxyMesh.geometry.dispose();
            if (this.proxyMesh.geometry.disposeBoundsTree)
                this.proxyMesh.geometry.disposeBoundsTree();
            (this.proxyMesh.material as THREE.Material).dispose();
        }
        super.dispose();
    }
}
