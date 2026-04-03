import * as THREE from 'three';
import type { SpaceGraph } from '../SpaceGraph';
import type { ISpaceGraphPlugin } from '../types';
import type { Node } from '../nodes/Node';
import { DOMNode } from '../nodes/DOMNode';
import { GroupNode } from '../nodes/GroupNode';

export class LODPlugin implements ISpaceGraphPlugin {
    readonly id = 'lod';
    readonly name = 'Level of Detail';
    readonly version = '1.0.0';

    private sg!: SpaceGraph;
    private maxDistance = 3000;

    init(sg: SpaceGraph): void {
        this.sg = sg;
    }

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
                if ((node.data as any)._lastLodVisible === false) {
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
        let currentParent =
            (node.data as any)?.parent ?? (node as any).parameters?.parent ?? (node as any).parent;

        while (currentParent) {
            if (hiddenParentIds.has(currentParent)) {
                return true;
            }

            const parentNode = this.sg.graph.nodes.get(currentParent);
            currentParent =
                (parentNode?.data as any)?.parent ??
                (parentNode as any)?.parameters?.parent ??
                (parentNode as any)?.parent;
        }

        return false;
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
