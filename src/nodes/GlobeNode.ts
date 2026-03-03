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

    constructor(sg: SpaceGraph, spec: NodeSpec) {
        super(sg, spec);

        const r = spec.data?.radius ?? 50;
        const color = spec.data?.color ?? 0x3b82f6;
        const textureUrl = spec.data?.textureUrl;
        const showWireframe = spec.data?.wireframe ?? true;
        const segments = spec.data?.segments ?? 32;

        const geo = new THREE.SphereGeometry(r, segments, segments);
        let mat: THREE.Material;

        if (textureUrl) {
            const loader = new THREE.TextureLoader();
            const tex = loader.load(textureUrl);
            mat = new THREE.MeshBasicMaterial({ map: tex });
        } else {
            mat = new THREE.MeshBasicMaterial({ color });
        }

        this.mesh = new THREE.Mesh(geo, mat);
        this.object.add(this.mesh);

        if (showWireframe) {
            const wireMat = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                wireframe: true,
                transparent: true,
                opacity: 0.2
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
            blending: THREE.AdditiveBlending
        });
        const halo = new THREE.Mesh(haloGeo, haloMat);
        this.object.add(halo);

        this.updatePosition(this.position.x, this.position.y, this.position.z);
    }

    updateSpec(updates: Partial<NodeSpec>): void {
        super.updateSpec(updates);
        // Globe updates could trigger texture reloads here, but for simplicity
        // in this scaffold we mainly allow color changes if untextured.
        if (updates.data?.color !== undefined) {
            const mat = this.mesh.material as THREE.MeshBasicMaterial;
            if (!mat.map && mat.color) {
                mat.color.setHex(updates.data.color);
            }
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
        const halo = this.object.children.find(c => c !== this.mesh && c !== this.wireframe) as THREE.Mesh;
        if (halo) {
            halo.geometry.dispose();
            (halo.material as THREE.Material).dispose();
        }

        super.dispose();
    }
}
