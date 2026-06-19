import * as THREE from 'three';
import { BaseSystemPlugin } from './BaseSystemPlugin';
import type { Node } from '../nodes/Node';

type NodeLike = {
    data?: Record<string, unknown>;
    parameters?: Record<string, unknown>;
    parent?: string;
};

export class LODPlugin extends BaseSystemPlugin {
    readonly id = 'lod';
    readonly name = 'Level of Detail';
    readonly version = '1.0.0';

    public maxDistance = 3000;
    private currentZoomLevel: number = 0;
    private detailThreshold: number = 0.5;

    onPreRender(_delta: number): void {
        if (!this.sg?.renderer?.camera) return;

        const cameraPosition = this.sg.renderer.camera.position;
        const nodes = Array.from(this.sg.graph.nodes.values());

        const hiddenParentIds = this._updateGroupsAndFindHidden(nodes, cameraPosition);
        this._updateNodeVisibility(nodes, cameraPosition, hiddenParentIds);
        this._updateEdgeVisibility();
    }

    setZoomLevel(level: number, threshold?: number): void {
        this.currentZoomLevel = level;
        if (threshold !== undefined) {
            this.detailThreshold = threshold;
        }

        // Trigger visibility update
        this.onPreRender(0);
    }

    getCurrentDetailThreshold(): number {
        return this.detailThreshold;
    }

    private _updateGroupsAndFindHidden(nodes: Node[], cameraPosition: THREE.Vector3): Set<string> {
        const hiddenParentIds = new Set<string>();

        for (const node of nodes) {
            if ((node as any).isGroupNode) {
                const distance = cameraPosition.distanceTo(node.position);
                (node as any).updateLod(distance);
                if ((node.data as Record<string, unknown>)._lastLodVisible === false) {
                    hiddenParentIds.add(node.id);
                }
            }
        }

        return hiddenParentIds;
    }

    private _updateNodeVisibility(
        nodes: Node[],
        cameraPosition: THREE.Vector3,
        hiddenParentIds: Set<string>,
    ): void {
        for (const node of nodes) {
            const isHiddenByParent = this._isNodeHiddenByParent(node, hiddenParentIds);
            const distance = cameraPosition.distanceTo(node.position);

            if ((node as any).isDOMNode) {
                const visible = !isHiddenByParent && distance <= this.maxDistance;
                (node as any).setVisibility(visible);

                if (visible) {
                    // Calculate alpha based on distance if near maxDistance
                    const transitionRange = 500;
                    let opacity = 1.0;
                    if (distance > this.maxDistance - transitionRange) {
                        opacity = 1.0 - (distance - (this.maxDistance - transitionRange)) / transitionRange;
                    }
                    if ((node as any).setOpacity) {
                        (node as any).setOpacity(Math.max(0, opacity));
                    }
                    (node as any).updateLod(distance);
                }
            } else if (!(node as any).isGroupNode) {
                node.object.visible = !isHiddenByParent;
                if (node.object.visible) {
                    const transitionRange = 500;
                    let opacity = 1.0;
                    if (distance > this.maxDistance - transitionRange) {
                        opacity = 1.0 - (distance - (this.maxDistance - transitionRange)) / transitionRange;
                    }
                    if ((node.object as any).material) {
                        const mat = (node.object as any).material;
                        mat.opacity = opacity;
                        mat.transparent = opacity < 1.0;
                    }
                }
            }
        }
    }

    private _isNodeHiddenByParent(node: Node, hiddenParentIds: Set<string>): boolean {
        let currentParent = this._getParentId(node);

        while (currentParent) {
            if (hiddenParentIds.has(currentParent)) {
                return true;
            }

            const parentNode = this.sg.graph.nodes.get(currentParent);
            currentParent = this._getParentId(parentNode);
        }

        return false;
    }

    private _getParentId(node?: Node): string | undefined {
        if (!node) return undefined;
        const n = node as unknown as NodeLike;
        return (n.data?.parent ?? n.parameters?.parent ?? n.parent) as string | undefined;
    }

    private _updateEdgeVisibility(): void {
        for (const [, edge] of this.sg.graph.edges) {
            if (!edge.object) continue;

            const sourceHidden =
                edge.source?.object?.visible === false ||
                ((edge.source as any).isDOMNode && !(edge.source as any).cssObject.visible);

            const targetHidden =
                edge.target?.object?.visible === false ||
                ((edge.target as any).isDOMNode && !(edge.target as any).cssObject.visible);

            edge.object.visible = !(sourceHidden || targetHidden);
        }
    }
}
