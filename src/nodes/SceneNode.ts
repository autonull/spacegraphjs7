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
export class SceneNode extends Node {
    private modelRoot?: THREE.Group;
    private loader: GLTFLoader;
    private boundingBoxHelper?: THREE.Box3Helper;

    constructor(sg: SpaceGraph, spec: NodeSpec) {
        super(sg, spec);

        const url = spec.data?.url;
        const targetSize = spec.data?.targetSize ?? 100;
        const autoCenter = spec.data?.autoCenter ?? true;

        this.loader = new GLTFLoader();

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

                // Wrap in a group to preserve centering offsets
                const wrapper = new THREE.Group();
                wrapper.add(this.modelRoot);
                this.object.add(wrapper);

                // Add bounding box helper for debugging if requested or implicitly for raycast proxy sizing
                // (In a real app, you might want to create an invisible cube based on this box for faster raycasting)

                // Emitting an event ensures layouts/plugins know the model loaded
                this.sg.events.emit('node:loaded', { id: this.id });
            },
            undefined, // onProgress
            (error) => {
                console.error(`[SceneNode ${this.id}] Error loading model:`, error);
            },
        );
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
    }

    dispose(): void {
        if (this.modelRoot) {
            this.modelRoot.traverse((child) => {
                if ((child as THREE.Mesh).isMesh) {
                    const mesh = child as THREE.Mesh;
                    mesh.geometry.dispose();
                    if (Array.isArray(mesh.material)) {
                        mesh.material.forEach((m) => m.dispose());
                    } else if (mesh.material) {
                        mesh.material.dispose();
                    }
                }
            });
        }
        super.dispose();
    }
}
