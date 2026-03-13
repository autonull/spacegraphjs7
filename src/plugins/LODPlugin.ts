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
        const cameraPosition = this.sg.renderer.camera.position;

        const nodes = Array.from(this.sg.graph.nodes.values());

        // Find which nodes are inside GroupNodes that are currently collapsed/hidden
        // This stops nested DOMNodes from re-appearing independently when they shouldn't.
        const hiddenParentIds = new Set<string>();

        // Pass 1: Update GroupNodes and register hidden children
        for (const node of nodes) {
            if (node instanceof GroupNode) {
                const distance = cameraPosition.distanceTo(node.position);
                node.updateLod(distance);

                if (node.data._lastLodVisible === false) {
                    hiddenParentIds.add(node.id);
                }
            }
        }

        // Pass 2: Update remaining nodes and enforce parent visibility restrictions
        for (const node of nodes) {
            // Check if node is nested within a hidden parent
            let isHiddenByParent = false;
            let currentParent = node.data?.parent || (node as any).parameters?.parent || (node as any).parent;

            // Check ancestry loop
            while (currentParent) {
                if (hiddenParentIds.has(currentParent)) {
                    isHiddenByParent = true;
                    break;
                }
                const parentNode = this.sg.graph.nodes.get(currentParent);
                currentParent = parentNode?.data?.parent || (parentNode as any)?.parameters?.parent || (parentNode as any)?.parent;
            }

            if (node instanceof DOMNode) {
                const distance = cameraPosition.distanceTo(node.position);
                if (isHiddenByParent) {
                    node.setVisibility(false);
                } else {
                    node.setVisibility(distance <= this.maxDistance);
                    node.updateLod(distance);
                }
            } else if (!(node instanceof GroupNode)) {
                // Non-DOM, Non-Group Nodes (e.g. standard WebGL ShapeNodes)
                if (isHiddenByParent) {
                    node.object.visible = false;
                } else {
                    node.object.visible = true; // CullingManager handles actual frustum culling
                }
            }

            // Edges logic could optionally live here to hide internal edges of collapsed groups
        }

        // Hide edges whose source or target is hidden
        for (const edge of this.sg.graph.edges) {
            if (edge.object) {
                const sourceHidden = edge.source?.object?.visible === false || (edge.source instanceof DOMNode && !edge.source.cssObject.visible);
                const targetHidden = edge.target?.object?.visible === false || (edge.target instanceof DOMNode && !edge.target.cssObject.visible);

                // If either end is hidden by LOD/Group folding, hide the edge
                edge.object.visible = !(sourceHidden || targetHidden);
            }
        }
    }
}
