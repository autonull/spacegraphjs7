import type { RenderModel, RenderNode, RenderEdge, RenderModelPatch } from '@spacegraphjs/renderer';

/** The fingerprint of a node: everything a renderer would have to redraw for it. */
function fingerprint(node: RenderNode): string {
    return [
        node.kind,
        node.label,
        node.summary ?? '',
        node.status,
        node.shape,
        node.position.join(','),
        node.size?.join(',') ?? '',
        node.html ?? '',
    ].join('^@');
}

/** The fingerprint of an edge: everything a renderer would have to redraw for it. */
function edgeFingerprint(edge: RenderEdge): string {
    return [
        edge.source,
        edge.target,
        edge.kind,
        edge.label ?? '',
        edge.confidence ?? '',
        edge.visible?.toString() ?? '',
        edge.directed?.toString() ?? '',
        edge.style ?? '',
    ].join('^@');
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
