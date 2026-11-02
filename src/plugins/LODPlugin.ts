import type * as THREE from 'three';
import type { Node } from '../nodes/Node';
import { parentIdOf } from '../utils/nodeParent';
import { BaseSystemPlugin } from './BaseSystemPlugin';

export class LODPlugin extends BaseSystemPlugin {
    readonly id = 'lod';
    readonly name = 'Level of Detail';
    readonly version = '1.0.0';

    public maxDistance = 3000;
    private detailThreshold = 0.5;

    onPreRender(_delta: number): void {
        if (!this.sg?.renderer?.camera) return;

        const cameraPosition = this.sg.renderer.camera.position;
        const nodes = Array.from(this.sg.graph.nodes.values());

        const hiddenParentIds = this._updateGroupsAndFindHidden(nodes, cameraPosition);
        this._updateNodeVisibility(nodes, cameraPosition, hiddenParentIds);
        this._updateEdgeVisibility();
    }

    setZoomLevel(_level: number, threshold?: number): void {
        if (threshold !== undefined) this.detailThreshold = threshold;
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
                if ((node.data as Record<string, unknown>)._lastLodVisible === false)
                    hiddenParentIds.add(node.id);
            }
        }
        return hiddenParentIds;
    }

    private _updateNodeVisibility(
        nodes: Node[],
        cameraPosition: THREE.Vector3,
        hiddenParentIds: Set<string>,
    ): void {
        const transitionRange = 500;
        const opacityForDistance = (distance: number) =>
            Math.max(
                0,
                1 - Math.max(0, distance - (this.maxDistance - transitionRange)) / transitionRange,
            );

        for (const node of nodes) {
            const isHiddenByParent = this._isNodeHiddenByParent(node, hiddenParentIds);
            const distance = cameraPosition.distanceTo(node.position);
            const visible = !isHiddenByParent && distance <= this.maxDistance;

            if ((node as any).isDOMNode) {
                (node as any).setVisibility(visible);
                if (visible) {
                    const opacity = opacityForDistance(distance);
                    if ((node as any).setOpacity) (node as any).setOpacity(opacity);
                    (node as any).updateLod(distance);
                }
            } else if (!(node as any).isGroupNode) {
                node.object.visible = visible;
                if (visible) {
                    const opacity = opacityForDistance(distance);
                    if ((node.object as any).material) {
                        const mat = (node.object as any).material;
                        mat.opacity = opacity;
                        mat.transparent = opacity < 1;
                    }
                }
            }
        }
    }

    private _isNodeHiddenByParent(node: Node, hiddenParentIds: Set<string>): boolean {
        let currentParent = parentIdOf(node);
        while (currentParent) {
            if (hiddenParentIds.has(currentParent)) return true;
            const parentNode = this.sg?.graph.nodes.get(currentParent);
            currentParent = parentIdOf(parentNode);
        }
        return false;
    }

    private _updateEdgeVisibility(): void {
        for (const [, edge] of this.sg!.graph.edges) {
            if (!edge.object) continue;
            const sourceHidden =
                edge.source?.object?.visible === false ||
                ((edge.source as any).isDOMNode && !(edge.source as any).cssObject?.visible);
            const targetHidden =
                edge.target?.object?.visible === false ||
                ((edge.target as any).isDOMNode && !(edge.target as any).cssObject?.visible);
            edge.object.visible = !(sourceHidden || targetHidden);
        }
    }
}
