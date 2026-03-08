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
        // Fractal LOD infinite drill-down logic
        const threshold = 800; // Define distance threshold

        if (distance < threshold) {
            this.meshMaterial.opacity = 0.05;
        } else {
            this.meshMaterial.opacity = 0.2;
        }

        // Recursively toggle visibility of children based on zoom level
        const shouldShowChildren = distance < threshold;
        if (this.sg && this.sg.graph && this.sg.graph.nodes) {
            this.sg.graph.nodes.forEach((node) => {
                // Find all nodes that are immediate children of this group
                if (node.parameters?.parent === this.id || node.data?.parent === this.id || (node as any).parent === this.id) {
                    // Determine if node is a DOMNode
                    if (typeof (node as any).setVisibility === 'function') {
                        (node as any).setVisibility(shouldShowChildren);
                    } else if (node.object) {
                        node.object.visible = shouldShowChildren;
                    }
                }
            });
        }
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
