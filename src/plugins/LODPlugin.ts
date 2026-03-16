import type { SpaceGraph } from '../SpaceGraph';
import type { ISpaceGraphPlugin } from '../types';
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
        if (!this.sg || !this.sg.renderer || !this.sg.renderer.camera) return;
        const cameraPosition = this.sg.renderer.camera.position;
        const nodes = Array.from(this.sg.graph.nodes.values());

        const hiddenParentIds = this._updateGroupsAndFindHidden(nodes, cameraPosition);
        this._updateNodeVisibility(nodes, cameraPosition, hiddenParentIds);
        this._updateEdgeVisibility();
    }

    private _updateGroupsAndFindHidden(nodes: any[], cameraPosition: THREE.Vector3): Set<string> {
        const hiddenParentIds = new Set<string>();
        for (const node of nodes) {
            if (node instanceof GroupNode) {
                const distance = cameraPosition.distanceTo(node.position);
                node.updateLod(distance);
                if (node.data._lastLodVisible === false) {
                    hiddenParentIds.add(node.id);
                }
            }
        }
        return hiddenParentIds;
    }

    private _updateNodeVisibility(nodes: any[], cameraPosition: THREE.Vector3, hiddenParentIds: Set<string>): void {
        for (const node of nodes) {
            let isHiddenByParent = false;
            let currentParent = node.data?.parent || node.parameters?.parent || node.parent;

            while (currentParent) {
                if (hiddenParentIds.has(currentParent)) {
                    isHiddenByParent = true;
                    break;
                }
                const parentNode = this.sg.graph.nodes.get(currentParent);
                currentParent = parentNode?.data?.parent || parentNode?.parameters?.parent || parentNode?.parent;
            }

            if (node instanceof DOMNode) {
                const distance = cameraPosition.distanceTo(node.position);
                node.setVisibility(!isHiddenByParent && distance <= this.maxDistance);
                if (!isHiddenByParent) node.updateLod(distance);
            } else if (!(node instanceof GroupNode)) {
                node.object.visible = !isHiddenByParent;
            }
        }
    }

    private _updateEdgeVisibility(): void {
        for (const edge of this.sg.graph.edges) {
            if (edge.object) {
                const sourceHidden = edge.source?.object?.visible === false || (edge.source instanceof DOMNode && !edge.source.cssObject.visible);
                const targetHidden = edge.target?.object?.visible === false || (edge.target instanceof DOMNode && !edge.target.cssObject.visible);
                edge.object.visible = !(sourceHidden || targetHidden);
            }
        }
    }
}
