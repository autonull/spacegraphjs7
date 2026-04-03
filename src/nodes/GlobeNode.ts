import * as THREE from 'three';

import { Node } from './Node';
import type { NodeSpec, GlobeNodeData } from '../types';
import type { SpaceGraph } from '../SpaceGraph';

export class GlobeNode extends Node {
    private readonly _object: THREE.Group;

    get object(): THREE.Object3D {
        return this._object;
    }

    private mesh!: THREE.Mesh;
    private wireframe?: THREE.Mesh;
    private markersGroup!: THREE.Group;
    private textureLoader = new THREE.TextureLoader();

    constructor(sg: SpaceGraph, spec: NodeSpec) {
        super(sg, spec);

        this._object = new THREE.Group();

        const r = (spec.data?.radius as number) ?? 50;
        const color = (spec.data?.color as number) ?? 0x3b82f6;
        const textureUrl = spec.data?.textureUrl as string;
        const showWireframe = (spec.data?.wireframe as boolean) ?? true;
        const segments = (spec.data?.segments as number) ?? 32;

        const geo = new THREE.SphereGeometry(r, segments, segments);
        const mat = new THREE.MeshBasicMaterial({ color });

        if (textureUrl) {
            this.textureLoader.load(textureUrl, (tex) => {
                mat.map = tex;
                mat.color.setHex(0xffffff);
                mat.needsUpdate = true;
            });
        }

        this.mesh = new THREE.Mesh(geo, mat);
        this.object.add(this.mesh);

        if (showWireframe) {
            const wireMat = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                wireframe: true,
                transparent: true,
                opacity: 0.2,
            });
            this.wireframe = new THREE.Mesh(geo, wireMat);
            this.object.add(this.wireframe);
        }

        const haloGeo = new THREE.SphereGeometry(r * 1.1, segments, segments);
        const haloMat = new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.1,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
        });
        const halo = new THREE.Mesh(haloGeo, haloMat);
        this.object.add(halo);

        this.markersGroup = new THREE.Group();
        this.object.add(this.markersGroup);

        if (spec.data?.markers) {
            this._renderMarkers(spec.data.markers as GlobeNodeData['markers'], r);
        }

        this.updatePosition(this.position.x, this.position.y, this.position.z);
    }

    private _renderMarkers(markers: GlobeNodeData['markers'], radius: number) {
        while (this.markersGroup.children.length > 0) {
            const child = this.markersGroup.children[0] as THREE.Mesh;
            this.markersGroup.remove(child);
            child.geometry.dispose();
            (child.material as THREE.Material).dispose();
        }

        for (const marker of markers ?? []) {
            const { lat, lng, size = 2, color = 0xff0000 } = marker;

            const phi = (90 - lat) * (Math.PI / 180);
            const theta = (lng + 180) * (Math.PI / 180);

            const x = -(radius * Math.sin(phi) * Math.cos(theta));
            const z = radius * Math.sin(phi) * Math.sin(theta);
            const y = radius * Math.cos(phi);

            const geo = new THREE.SphereGeometry(size, 8, 8);
            const mat = new THREE.MeshBasicMaterial({ color });
            const mesh = new THREE.Mesh(geo, mat);

            mesh.position.set(x, y, z);
            this.markersGroup.add(mesh);
        }
    }

    updateSpec(updates: Partial<NodeSpec>): this {
        super.updateSpec(updates);

        if (!updates.data) return this;

        const r = (this.data?.radius as number) ?? 50;

        if (updates.data.textureUrl !== undefined) {
            const mat = this.mesh.material as THREE.MeshBasicMaterial;
            if (updates.data.textureUrl) {
                this.textureLoader.load(updates.data.textureUrl as string, (tex) => {
                    mat.map?.dispose();
                    mat.map = tex;
                    mat.color.setHex(0xffffff);
                    mat.needsUpdate = true;
                });
            } else {
                mat.map?.dispose();
                mat.map = null;
                mat.color.setHex(
                    (updates.data.color as number) ?? (this.data?.color as number) ?? 0x3b82f6,
                );
                mat.needsUpdate = true;
            }
        } else if (updates.data.color !== undefined) {
            const mat = this.mesh.material as THREE.MeshBasicMaterial;
            if (!mat.map) {
                mat.color.setHex(updates.data.color as number);
            }
        }

        if (updates.data.markers !== undefined) {
            this._renderMarkers(updates.data.markers as GlobeNodeData['markers'], r);
        }

        return this;
    }

    dispose(): void {
        this.mesh.geometry.dispose();
        const mat = this.mesh.material as THREE.MeshBasicMaterial;
        mat.map?.dispose();
        mat.dispose();

        this.wireframe?.geometry.dispose();
        (this.wireframe?.material as THREE.Material)?.dispose();

        const halo = this.object.children.find(
            (c) => c !== this.mesh && c !== this.wireframe,
        ) as THREE.Mesh;
        if (halo) {
            halo.geometry.dispose();
            (halo.material as THREE.Material).dispose();
        }

        super.dispose();
    }
}
