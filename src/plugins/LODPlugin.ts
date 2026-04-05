import * as THREE from 'three';
import { BaseSystemPlugin } from './BaseSystemPlugin';
import type { Node } from '../nodes/Node';
import { DOMNode } from '../nodes/DOMNode';
import { GroupNode } from '../nodes/GroupNode';

type NodeLike = {
    data?: Record<string, unknown>;
    parameters?: Record<string, unknown>;
    parent?: string;
};

export class LODPlugin extends BaseSystemPlugin {
    readonly id = 'lod';
    readonly name = 'Level of Detail';
    readonly version = '1.0.0';

    private maxDistance = 3000;

    onPreRender(_delta: number): void {
        if (!this.sg?.renderer?.camera) return;

        const cameraPosition = this.sg.renderer.camera.position;
        const nodes = Array.from(this.sg.graph.nodes.values());

        const hiddenParentIds = this._updateGroupsAndFindHidden(nodes, cameraPosition);
        this._updateNodeVisibility(nodes, cameraPosition, hiddenParentIds);
        this._updateEdgeVisibility();
    }

    private _updateGroupsAndFindHidden(nodes: Node[], cameraPosition: THREE.Vector3): Set<string> {
        const hiddenParentIds = new Set<string>();

        for (const node of nodes) {
            if (node instanceof GroupNode) {
                const distance = cameraPosition.distanceTo(node.position);
                node.updateLod(distance);
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

            if (node instanceof DOMNode) {
                const distance = cameraPosition.distanceTo(node.position);
                node.setVisibility(!isHiddenByParent && distance <= this.maxDistance);
                if (!isHiddenByParent) node.updateLod(distance);
            } else if (!(node instanceof GroupNode)) {
                node.object.visible = !isHiddenByParent;
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
                (edge.source instanceof DOMNode && !edge.source.cssObject.visible);

            const targetHidden =
                edge.target?.object?.visible === false ||
                (edge.target instanceof DOMNode && !edge.target.cssObject.visible);

            edge.object.visible = !(sourceHidden || targetHidden);
        }
    }
}
