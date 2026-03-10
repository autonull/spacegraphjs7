import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Node } from './Node';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec } from '../types';

/**
 * SceneNode — Loads an external 3D model (GLTF/GLB) into the node.
 * Automatically computes bounding box and scales it to fit requested size.
 *
 * data options:
 *   url         : Model URL (required)
 *   targetSize  : Scale model so its max bounds match this size (default 100)
 *   autoCenter  : Center the model's geometry origin (default true)
 */
import { computeBoundsTree, disposeBoundsTree } from 'three-mesh-bvh';

export class SceneNode extends Node {
    private modelRoot?: THREE.Group;
    private loader: GLTFLoader;
    private proxyMesh?: THREE.Mesh;
    private wrapper: THREE.Group;
    private rotationSpeed: number = 0;

    constructor(sg: SpaceGraph, spec: NodeSpec) {
        super(sg, spec);

        const url = spec.data?.url;
        const targetSize = spec.data?.targetSize ?? 100;
        const autoCenter = spec.data?.autoCenter ?? true;
        this.rotationSpeed = spec.data?.rotationSpeed ?? 0;

        this.loader = new GLTFLoader();
        this.wrapper = new THREE.Group();
        this.object.add(this.wrapper);

        if (url) {
            this.loadModel(url, targetSize, autoCenter);
        } else {
            console.warn(`[SceneNode ${this.id}] No URL provided.`);
        }

        this.updatePosition(this.position.x, this.position.y, this.position.z);
    }

    private loadModel(url: string, targetSize: number, autoCenter: boolean) {
        this.loader.load(
            url,
            (gltf) => {
                this.modelRoot = gltf.scene;

                // Compute bounding box
                const box = new THREE.Box3().setFromObject(this.modelRoot);
                const size = new THREE.Vector3();
                box.getSize(size);
                const center = new THREE.Vector3();
                box.getCenter(center);

                // Scale to target size
                const maxDim = Math.max(size.x, size.y, size.z);
                if (maxDim > 0) {
                    const scale = targetSize / maxDim;
                    this.modelRoot.scale.setScalar(scale);
                }

                // Center position locally
                if (autoCenter) {
                    // re-evaluate box after scale
                    const newBox = new THREE.Box3().setFromObject(this.modelRoot);
                    newBox.getCenter(center);
                    this.modelRoot.position.sub(center);
                }

                this.wrapper.add(this.modelRoot);

                // Create an invisible proxy geometry for much faster raycasting instead of deep traversing GLTFs
                const finalBox = new THREE.Box3().setFromObject(this.wrapper);
                const finalSize = new THREE.Vector3();
                finalBox.getSize(finalSize);

                const proxyGeo = new THREE.BoxGeometry(finalSize.x, finalSize.y, finalSize.z);
                // Compute BVH for the simple proxy box
                if (proxyGeo.computeBoundsTree) proxyGeo.computeBoundsTree();

                const proxyMat = new THREE.MeshBasicMaterial({ visible: false });
                this.proxyMesh = new THREE.Mesh(proxyGeo, proxyMat);

                // Align proxy center to object center
                const finalCenter = new THREE.Vector3();
                finalBox.getCenter(finalCenter);
                // Convert world space center back to local space relative to the node
                this.wrapper.worldToLocal(finalCenter);
                this.proxyMesh.position.copy(finalCenter);

                this.wrapper.add(this.proxyMesh);

                // Emitting an event ensures layouts/plugins know the model loaded
                this.sg.events.emit('node:loaded', { id: this.id });
            },
            undefined, // onProgress
            (error) => {
                console.error(`[SceneNode ${this.id}] Error loading model:`, error);
            },
        );
    }

    update() {
        if (this.rotationSpeed !== 0 && this.wrapper) {
            // Apply rotation to the wrapper (which holds the centered model and proxy)
            this.wrapper.rotation.y += this.rotationSpeed;
        }
    }

    updateSpec(updates: Partial<NodeSpec>): void {
        super.updateSpec(updates);
        if (updates.data?.url && updates.data.url !== this.data.url) {
            // Hot swapping models
            if (this.modelRoot && this.modelRoot.parent) {
                this.modelRoot.parent.remove(this.modelRoot);
            }
            this.loadModel(
                updates.data.url,
                updates.data.targetSize ?? 100,
                updates.data.autoCenter ?? true,
            );
        }

        if (updates.data?.rotationSpeed !== undefined) {
             this.rotationSpeed = updates.data.rotationSpeed;
        }
    }

    dispose(): void {
        if (this.modelRoot) {
            this.modelRoot.traverse((child) => {
                if ((child as THREE.Mesh).isMesh) {
                    const mesh = child as THREE.Mesh;
                    mesh.geometry.dispose();
                    if (mesh.geometry.disposeBoundsTree) mesh.geometry.disposeBoundsTree();
                    if (Array.isArray(mesh.material)) {
                        mesh.material.forEach((m) => m.dispose());
                    } else if (mesh.material) {
                        mesh.material.dispose();
                    }
                }
            });
        }
        if (this.proxyMesh) {
             this.proxyMesh.geometry.dispose();
             if (this.proxyMesh.geometry.disposeBoundsTree) this.proxyMesh.geometry.disposeBoundsTree();
             (this.proxyMesh.material as THREE.Material).dispose();
        }
        super.dispose();
    }
}
