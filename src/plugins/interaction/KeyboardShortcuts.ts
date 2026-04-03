import type { SpaceGraph } from '../../SpaceGraph';
import type { Node } from '../../nodes/Node';
import type { Edge } from '../../edges/Edge';

export interface SelectionState {
    nodes: Set<Node>;
    edges: Set<Edge>;
}

/**
 * Keyboard shortcuts handler for InteractionPlugin
 * Centralizes all keyboard shortcut logic
 */
export class KeyboardShortcuts {
    private readonly sg: SpaceGraph;
    private onSelectionChange?: (selection: SelectionState) => void;

    constructor(sg: SpaceGraph) {
        this.sg = sg;
    }

    setSelectionChangeHandler(handler: (selection: SelectionState) => void): void {
        this.onSelectionChange = handler;
    }

    handleDelete(selectedNodes: Node[], selectedEdges: Edge[]): void {
        const primaryNode = selectedNodes[0] ?? null;

        if (primaryNode) {
            const message =
                selectedNodes.length > 1
                    ? `Delete ${selectedNodes.length} selected nodes?`
                    : `Delete node "${primaryNode.id.substring(0, 10)}..."?`;

            this.sg.events.emit('ui:request:confirm', {
                message,
                onConfirm: () => {
                    selectedNodes.forEach((node) => {
                        this.sg.events.emit('node:delete', { node });
                    });
                    this.onSelectionChange?.({ nodes: new Set(), edges: new Set() });
                },
            });
        } else if (selectedEdges.length > 0) {
            const message =
                selectedEdges.length > 1
                    ? `Delete ${selectedEdges.length} selected edges?`
                    : `Delete edge?`;

            this.sg.events.emit('ui:request:confirm', {
                message,
                onConfirm: () => {
                    selectedEdges.forEach((edge) => {
                        this.sg.graph.removeEdge(edge.id);
                    });
                    this.onSelectionChange?.({ nodes: new Set(), edges: new Set() });
                },
            });
        }
    }

    handleSelectAll(nodes: Node[]): void {
        for (const node of nodes) {
            (this.sg.events as any).emit('selection:addNode', node);
        }
    }

    handleZoomIn(node: Node): void {
        if (!node || !this.sg.cameraControls) return;
        const targetPos = node.position.clone();
        const targetRadius = (node.data as any)?.width
            ? Math.max((node.data as any).width * 1.5, 150)
            : 150;
        this.sg.cameraControls.flyTo(targetPos, targetRadius);
    }
}
