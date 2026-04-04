import * as THREE from 'three';

import { Node } from './Node';
import type { NodeSpec, GroupNodeData } from '../types';
import type { SpaceGraph } from '../SpaceGraph';

type NodeLike = {
    data?: Record<string, unknown>;
    parameters?: Record<string, unknown>;
    parent?: string;
};

export class GroupNode extends Node {
    private _object = new THREE.Object3D();
    get object() {
        return this._object;
    }

    private meshGeometry: THREE.BoxGeometry;
    private meshMaterial: THREE.MeshBasicMaterial;

    constructor(sg: SpaceGraph, spec: NodeSpec) {
        super(sg, spec);

        const data = spec.data as GroupNodeData;
        const { width = 300, height = 200, depth = 100, color = 0x4488ff } = data;

        this.meshGeometry = new THREE.BoxGeometry(width, height, depth);
        this.meshMaterial = new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.2,
            side: THREE.DoubleSide,
        });

        const mesh = new THREE.Mesh(this.meshGeometry, this.meshMaterial);

        const edgesGeometry = new THREE.EdgesGeometry(this.meshGeometry);
        const edgesMaterial = new THREE.LineBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.5,
        });
        const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
        mesh.add(edges);

        this._object.add(mesh);
        this.updatePosition(this.position.x, this.position.y, this.position.z);
    }

    updateSpec(updates: Partial<NodeSpec>): this {
        super.updateSpec(updates);

        if (updates.data?.color) {
            this.meshMaterial.color.setHex(updates.data.color as number);
        }

        if (updates.data && (updates.data.width || updates.data.height || updates.data.depth)) {
            const { width, height, depth } = this.meshGeometry.parameters;
            const newGeometry = new THREE.BoxGeometry(
                (updates.data.width as number) ?? width,
                (updates.data.height as number) ?? height,
                (updates.data.depth as number) ?? depth,
            );

            const mesh = this._object.children[0] as THREE.Mesh;
            if (mesh) {
                mesh.geometry.dispose();
                mesh.geometry = newGeometry;

                const oldEdges = mesh.children[0] as THREE.LineSegments;
                if (oldEdges) {
                    oldEdges.geometry.dispose();
                    oldEdges.geometry = new THREE.EdgesGeometry(newGeometry);
                }
            }

            this.meshGeometry = newGeometry;
        }
        return this;
    }

    updateLod(distance: number): void {
        const threshold = (this.data?.lodThreshold as number) ?? 1200;

        this.meshMaterial.opacity = distance < threshold ? 0.05 : 0.2;

        const isHiddenByParent = this._isAncestorHidden();
        const shouldShowChildren = !isHiddenByParent && distance < threshold;

        this.data._lastLodVisible = shouldShowChildren;
    }

    private _getParentId(node?: Node): string | undefined {
        if (!node) return undefined;
        const n = node as unknown as NodeLike;
        return n.data?.parent ?? n.parameters?.parent ?? n.parent;
    }

    private _isAncestorHidden(): boolean {
        let currentParent = this._getParentId(this);
        const visited = new Set<string>();

        while (currentParent && this.sg?.graph?.nodes) {
            if (visited.has(currentParent)) break;
            visited.add(currentParent);

            const parentNode = this.sg.graph.nodes.get(currentParent);
            if (parentNode instanceof GroupNode && parentNode.data._lastLodVisible === false) {
                return true;
            }
            currentParent = this._getParentId(parentNode);
        }

        return false;
    }

    dispose(): void {
        this.meshGeometry?.dispose();
        this.meshMaterial?.dispose();
        const mesh = this._object.children[0] as THREE.Mesh;
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
