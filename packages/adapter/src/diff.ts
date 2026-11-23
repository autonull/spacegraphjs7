import { diffCollectionById } from '@spacegraphjs/kernel';
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
    const nodes = diffCollectionById(previous.nodes, next.nodes, fingerprint);
    const edges = diffCollectionById(previous.edges, next.edges, edgeFingerprint);
    return {
        nodes: {
            added: nodes.added,
            removed: nodes.removed.map((node) => node.id),
            changed: nodes.changed.map((change) => change.after),
        },
        edges: {
            added: edges.added,
            removed: edges.removed.map((edge) => edge.id),
            changed: edges.changed.map((change) => change.after),
        },
    };
}
