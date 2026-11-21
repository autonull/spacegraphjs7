import type { RenderModel, RenderNode, RenderEdge, RenderModelPatch } from '@spacegraphjs/renderer';

/** The fingerprint of a node: every field a renderer redraws, including host data and emphasis. */
function fingerprint(node: RenderNode): string {
    return JSON.stringify([
        node.kind,
        node.label,
        node.summary,
        node.html,
        node.position,
        node.size,
        node.status,
        node.visible,
        node.interactive,
        node.shape,
        node.parent,
        node.emphasis,
        node.widgets,
        node.widgetSlots,
        node.data,
    ]);
}

/** The fingerprint of an edge: every field a renderer redraws. */
function edgeFingerprint(edge: RenderEdge): string {
    return JSON.stringify([
        edge.source,
        edge.target,
        edge.kind,
        edge.label,
        edge.confidence,
        edge.visible,
        edge.directed,
        edge.style,
        edge.emphasis,
        edge.data,
    ]);
}

/**
 * The difference between two render models as a patch with full node/edge data.
 * A host that streams rebuilds the model and hands the patch to the renderer for
 * incremental updates.
 */
export function diffRenderModels(previous: RenderModel, next: RenderModel): RenderModelPatch {
    const before = new Map(previous.nodes.map((node) => [node.id, fingerprint(node)]));
    const after = new Map(next.nodes.map((node) => [node.id, fingerprint(node)]));

    const addedNodes: RenderNode[] = [];
    const changedNodes: RenderNode[] = [];

    for (const node of next.nodes) {
        const beforeFingerprint = before.get(node.id);

        if (beforeFingerprint === undefined) addedNodes.push(node);
        else if (beforeFingerprint !== fingerprint(node)) changedNodes.push(node);
    }

    const removedNodeIds: string[] = [];

    for (const id of before.keys()) if (!after.has(id)) removedNodeIds.push(id);

    const beforeEdges = new Map(previous.edges.map((edge) => [edge.id, edgeFingerprint(edge)]));
    const afterEdges = new Map(next.edges.map((edge) => [edge.id, edgeFingerprint(edge)]));

    const addedEdges: RenderEdge[] = [];
    const changedEdges: RenderEdge[] = [];

    for (const edge of next.edges) {
        const beforeFingerprint = beforeEdges.get(edge.id);

        if (beforeFingerprint === undefined) addedEdges.push(edge);
        else if (beforeFingerprint !== edgeFingerprint(edge)) changedEdges.push(edge);
    }

    const removedEdgeIds: string[] = [];

    for (const id of beforeEdges.keys()) if (!afterEdges.has(id)) removedEdgeIds.push(id);

    return {
        nodes: {
            added: addedNodes,
            removed: removedNodeIds,
            changed: changedNodes,
        },
        edges: {
            added: addedEdges,
            removed: removedEdgeIds,
            changed: changedEdges,
        },
    };
}
