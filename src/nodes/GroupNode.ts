import * as THREE from 'three';
import { Node } from './Node';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec } from '../types';

export class GroupNode extends Node {
    private meshGeometry: THREE.BoxGeometry;
    private meshMaterial: THREE.MeshBasicMaterial;

    constructor(sg: SpaceGraph, spec: NodeSpec) {
        super(sg, spec);

        const width = spec.data?.width || 300;
        const height = spec.data?.height || 200;
        const depth = spec.data?.depth || 100;
        const color = spec.data?.color || 0x4488ff;

        this.meshGeometry = new THREE.BoxGeometry(width, height, depth);
        this.meshMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.2,
            side: THREE.DoubleSide,
        });

        const mesh = new THREE.Mesh(this.meshGeometry, this.meshMaterial);

        // Add edges for better visibility
        const edgesGeometry = new THREE.EdgesGeometry(this.meshGeometry);
        const edgesMaterial = new THREE.LineBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.5,
        });
        const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
        mesh.add(edges);

        this.object.add(mesh);
        this.updatePosition(this.position.x, this.position.y, this.position.z);
    }

    updateSpec(updates: Partial<NodeSpec>) {
        super.updateSpec(updates);

        if (updates.data && updates.data.color) {
            this.meshMaterial.color.setHex(updates.data.color);
        }

        if (updates.data && (updates.data.width || updates.data.height || updates.data.depth)) {
            const width = updates.data.width || this.meshGeometry.parameters.width;
            const height = updates.data.height || this.meshGeometry.parameters.height;
            const depth = updates.data.depth || this.meshGeometry.parameters.depth;

            const newGeometry = new THREE.BoxGeometry(width, height, depth);

            // Find existing mesh
            const mesh = this.object.children[0] as THREE.Mesh;
            if (mesh) {
                mesh.geometry.dispose();
                mesh.geometry = newGeometry;

                // Recreate edges
                const oldEdges = mesh.children[0] as THREE.LineSegments;
                if (oldEdges) {
                    oldEdges.geometry.dispose();
                    oldEdges.geometry = new THREE.EdgesGeometry(newGeometry);
                }
            }

            this.meshGeometry = newGeometry;
        }
    }

    updateLod(distance: number): void {
        const threshold = this.data?.lodThreshold || 1200;

        this.meshMaterial.opacity = distance < threshold ? 0.05 : 0.2;

        const isHiddenByParent = this._isAncestorHidden();
        const shouldShowChildren = !isHiddenByParent && (distance < threshold);

        this.data._lastLodVisible = shouldShowChildren;
    }

    private _isAncestorHidden(): boolean {
        let currentParent = this.data?.parent || (this as any).parameters?.parent || (this as any).parent;
        const visited = new Set<string>();

        while (currentParent && this.sg?.graph?.nodes) {
            if (visited.has(currentParent)) break;
            visited.add(currentParent);

            const parentNode = this.sg.graph.nodes.get(currentParent);
            if (parentNode instanceof GroupNode && parentNode.data._lastLodVisible === false) {
                return true;
            }
            currentParent = parentNode?.data?.parent || (parentNode as any)?.parameters?.parent || (parentNode as any)?.parent;
        }

        return false;
    }

    dispose(): void {
        if (this.meshGeometry) {
            this.meshGeometry.dispose();
        }
        if (this.meshMaterial) {
            this.meshMaterial.dispose();
        }
        const mesh = this.object.children[0] as THREE.Mesh;
        if (mesh) {
            const edges = mesh.children[0] as THREE.LineSegments;
            if (edges) {
                edges.geometry.dispose();
                (edges.material as THREE.Material).dispose();
            }
        }
        super.dispose();
    }
}
