import type { Edge } from '../../edges/Edge';
import type { Node } from '../../nodes/Node';
import type { SpaceGraph } from '../../SpaceGraph';
import { focusNodeCamera } from '../../utils/CameraUtils';

/** Keyboard shortcuts handler for InteractionPlugin. */
export class KeyboardShortcuts {
    readonly sg: SpaceGraph;
    private onSelectionChange?: () => void;
    constructor(sg: SpaceGraph) {
        this.sg = sg;
    }
    setSelectionChangeHandler(handler: () => void): void {
        this.onSelectionChange = handler;
    }
    handleDelete(selectedNodes: Node[], selectedEdges: Edge[]): void {
        if (!selectedNodes.length && !selectedEdges.length) return;
        const nodes =
            selectedNodes.length === 1 && !selectedEdges.length
                ? `node "${selectedNodes[0].id.substring(0, 10)}..."`
                : `${selectedNodes.length} nodes`;
        const edges = selectedEdges.length === 1 ? 'edge' : `${selectedEdges.length} edges`;
        const subject = [selectedNodes.length && nodes, selectedEdges.length && edges].filter(
            Boolean,
        );
        this.sg.events.emit('ui:request:confirm', {
            message: `Delete ${subject.join(' and ')}?`,
            onConfirm: () => {
                for (const node of selectedNodes) this.sg.events.emit('node:delete', { node });
                for (const edge of selectedEdges) this.sg.graph.removeEdge(edge.id);
                this.onSelectionChange?.();
            },
        });
    }
    handleSelectAll(nodes: Node[]): void {
        this.sg.selection.select(nodes.map((node) => node.id));
    }
    handleZoomIn(node: Node): void {
        if (!node || !this.sg.cameraControls) return;
        focusNodeCamera(this.sg, node);
    }
}
