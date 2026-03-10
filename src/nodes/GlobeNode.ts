import * as THREE from 'three';
import { Node } from './Node';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec } from '../types';

/**
 * GlobeNode — A 3D sphere node, optionally with a texture map.
 * Demonstrates a primitive-based 3D node.
 *
 * data options:
 *   radius     : radius of the globe (default 50)
 *   textureUrl : URL to an equirectangular map (optional)
 *   color      : base color if no texture (default 0x3b82f6)
 *   wireframe  : boolean overlay wireframe (default true)
 *   segments   : sphere segments (default 32)
 */
export class GlobeNode extends Node {
    private mesh: THREE.Mesh;
    private wireframe?: THREE.Mesh;
    private markersGroup: THREE.Group;
    private textureLoader = new THREE.TextureLoader();

    constructor(sg: SpaceGraph, spec: NodeSpec) {
        super(sg, spec);

        const r = spec.data?.radius ?? 50;
        const color = spec.data?.color ?? 0x3b82f6;
        const textureUrl = spec.data?.textureUrl;
        const showWireframe = spec.data?.wireframe ?? true;
        const segments = spec.data?.segments ?? 32;

        const geo = new THREE.SphereGeometry(r, segments, segments);

        // Always create material, map will be assigned if available
        const mat = new THREE.MeshBasicMaterial({ color });

        if (textureUrl) {
            this.textureLoader.load(textureUrl, (tex) => {
                mat.map = tex;
                mat.color.setHex(0xffffff); // Reset base color if textured
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

        // Add a simple halo/atmosphere effect
        const haloGeo = new THREE.SphereGeometry(r * 1.1, segments, segments);
        const haloMat = new THREE.MeshBasicMaterial({
            color: color,
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
            this._renderMarkers(spec.data.markers, r);
        }

        this.updatePosition(this.position.x, this.position.y, this.position.z);
    }

    private _renderMarkers(markers: any[], radius: number) {
        // Clear existing markers
        while (this.markersGroup.children.length > 0) {
            const child = this.markersGroup.children[0] as THREE.Mesh;
            this.markersGroup.remove(child);
            child.geometry.dispose();
            (child.material as THREE.Material).dispose();
        }

        markers.forEach(marker => {
            const lat = marker.lat;
            const lng = marker.lng;
            const size = marker.size || 2;
            const color = marker.color || 0xff0000;

            // Convert lat/lng to 3D spherical coordinates
            const phi = (90 - lat) * (Math.PI / 180);
            const theta = (lng + 180) * (Math.PI / 180);

            const x = -(radius * Math.sin(phi) * Math.cos(theta));
            const z = (radius * Math.sin(phi) * Math.sin(theta));
            const y = (radius * Math.cos(phi));

            const geo = new THREE.SphereGeometry(size, 8, 8);
            const mat = new THREE.MeshBasicMaterial({ color });
            const mesh = new THREE.Mesh(geo, mat);

            mesh.position.set(x, y, z);
            this.markersGroup.add(mesh);
        });
    }

    updateSpec(updates: Partial<NodeSpec>): void {
        super.updateSpec(updates);

        if (!updates.data) return;

        const r = this.data?.radius ?? 50;

        if (updates.data.textureUrl !== undefined) {
             const mat = this.mesh.material as THREE.MeshBasicMaterial;
             if (updates.data.textureUrl) {
                 this.textureLoader.load(updates.data.textureUrl, (tex) => {
                     if (mat.map) mat.map.dispose();
                     mat.map = tex;
                     mat.color.setHex(0xffffff);
                     mat.needsUpdate = true;
                 });
             } else {
                 if (mat.map) {
                     mat.map.dispose();
                     mat.map = null;
                 }
                 mat.color.setHex(updates.data.color ?? this.data.color ?? 0x3b82f6);
                 mat.needsUpdate = true;
             }
        } else if (updates.data.color !== undefined) {
            const mat = this.mesh.material as THREE.MeshBasicMaterial;
            if (!mat.map) {
                mat.color.setHex(updates.data.color);
            }
        }

        if (updates.data.markers !== undefined) {
            this._renderMarkers(updates.data.markers, r);
        }
    }

    dispose(): void {
        this.mesh.geometry.dispose();
        if ((this.mesh.material as THREE.MeshBasicMaterial).map) {
            (this.mesh.material as THREE.MeshBasicMaterial).map?.dispose();
        }
        (this.mesh.material as THREE.Material).dispose();

        if (this.wireframe) {
            (this.wireframe.material as THREE.Material).dispose();
        }

        // Halo
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
