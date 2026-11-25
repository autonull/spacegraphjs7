// Trace classification: compute answer, context, and visible edges for a trace kind.

import type {
    TraceConfig,
    TraceKind,
    TraceModel,
    TraceNode,
    TraceOverlay,
} from './types';

function traceAnswerIds(config: TraceConfig, kind: TraceKind, from: string): Set<string> {
    const { model, traversal, vocabulary } = config;
    const { incoming, outgoing, ancestors, forwardChain, downstreamChain, sequenceIndex } = traversal;
    const { provenanceEdgeKinds } = vocabulary;

    switch (kind) {
        case 'why': {
            const result = new Set<string>();
            const incomingEdges = incoming(model, from);
            for (const edge of incomingEdges) {
                if (provenanceEdgeKinds.has(edge.kind)) result.add(edge.source);
            }
            for (const ancestor of ancestors(model, from)) result.add(ancestor.id);
            const seqIndex = sequenceIndex(model);
            if (seqIndex.previous.has(from)) result.add(seqIndex.previous.get(from)!);
            return result;
        }
        case 'led-here': {
            const result = new Set<string>();
            const chain = forwardChain(model, from);
            for (const node of chain) result.add(node.id);
            return result;
        }
        case 'related': {
            const result = new Set<string>();
            for (const edge of incoming(model, from)) result.add(edge.source);
            for (const edge of outgoing(model, from)) result.add(edge.target);
            return result;
        }
        case 'downstream': {
            const result = new Set<string>();
            const chain = downstreamChain(model, from);
            for (const { node } of chain) result.add(node.id);
            return result;
        }
    }
}

function traceContextIds(config: TraceConfig, answerIds: Set<string>): Set<string> {
    const { model, traversal } = config;
    const { ancestors } = traversal;

    const context = new Set<string>();
    for (const id of answerIds) {
        for (const ancestor of ancestors(model, id)) {
            context.add(ancestor.id);
        }
    }
    return context;
}

const edgeIdsMatching = (
    edges: readonly { readonly id: string; readonly source: string; readonly target: string }[],
    matches: (edge: { readonly source: string; readonly target: string }) => boolean,
): Set<string> => new Set(edges.filter(matches).map((edge) => edge.id));

function traceAnswerEdgeIds(
    config: TraceConfig,
    answerIds: Set<string>,
    contextIds: Set<string>,
    from: string,
): Set<string> {
    return edgeIdsMatching(config.model.edges, (edge) => {
        const sourceInAnswer = answerIds.has(edge.source);
        const targetInAnswer = answerIds.has(edge.target);
        return (sourceInAnswer && targetInAnswer)
            || (contextIds.has(edge.source) && targetInAnswer)
            || (sourceInAnswer && contextIds.has(edge.target))
            || (sourceInAnswer && edge.target === from)
            || (edge.source === from && targetInAnswer);
    });
}

function traceVisibleEdgeIds(
    config: TraceConfig,
    answerIds: Set<string>,
    contextIds: Set<string>,
    answerEdgeIds: Set<string>,
    from: string,
): Set<string> {
    return new Set([
        ...answerEdgeIds,
        ...edgeIdsMatching(config.model.edges, (edge) => {
            const sourceInAnswer = answerIds.has(edge.source);
            const targetInAnswer = answerIds.has(edge.target);
            const sourceInContext = contextIds.has(edge.source);
            const targetInContext = contextIds.has(edge.target);
            return (sourceInContext && targetInContext && !(sourceInAnswer || targetInAnswer))
                || (sourceInContext && edge.target === from)
                || (edge.source === from && targetInContext);
        }),
    ]);
}

/**
 * Classify a trace overlay over the model.
 * @param config The trace configuration (model, traversal, vocabulary)
 * @param kind The trace kind ("why" | "led-here" | "related" | "downstream")
 * @param from The node ID to trace from
 * @returns The trace overlay classification
 */
export function classifyTrace(config: TraceConfig, kind: TraceKind, from: string): TraceOverlay {
    const answerIds = traceAnswerIds(config, kind, from);
    const contextIds = traceContextIds(config, answerIds);
    const answerEdgeIds = traceAnswerEdgeIds(config, answerIds, contextIds, from);
    const visibleEdgeIds = traceVisibleEdgeIds(config, answerIds, contextIds, answerEdgeIds, from);

    return {
        answerIds,
        contextIds,
        answerEdgeIds,
        visibleEdgeIds,
    };
}

/**
 * Get all lit node IDs (answer + context) for a trace overlay.
 */
export function litNodeIds(overlay: TraceOverlay): ReadonlySet<string> {
    const result = new Set(overlay.answerIds);
    for (const id of overlay.contextIds) result.add(id);
    return result;
}

/**
 * Check if a node is lit (answer or context) in a trace overlay.
 */
export function isLit(overlay: TraceOverlay, nodeId: string): boolean {
    return overlay.answerIds.has(nodeId) || overlay.contextIds.has(nodeId);
}

/**
 * Check if a node is an answer node in a trace overlay.
 */
export function isAnswer(overlay: TraceOverlay, nodeId: string): boolean {
    return overlay.answerIds.has(nodeId);
}

/**
 * Check if an edge is visible in a trace overlay.
 */
export function isEdgeVisible(overlay: TraceOverlay, edgeId: string): boolean {
    return overlay.visibleEdgeIds.has(edgeId);
}

/**
 * Check if an edge is an answer edge in a trace overlay.
 */
export function isAnswerEdge(overlay: TraceOverlay, edgeId: string): boolean {
    return overlay.answerEdgeIds.has(edgeId);
}

/**
 * Build a trace overlay for "Why?" — the edges that point at the node, its ancestors, and sequence predecessor.
 */
export function traceWhy(config: TraceConfig, from: string): TraceOverlay {
    return classifyTrace(config, 'why', from);
}

/**
 * Build a trace overlay for "What led here?" — the forward chain in the turn's sequence.
 */
export function traceLedHere(config: TraceConfig, from: string): TraceOverlay {
    return classifyTrace(config, 'led-here', from);
}

/**
 * Build a trace overlay for "Related" — incoming and outgoing neighbors.
 */
export function traceRelated(config: TraceConfig, from: string): TraceOverlay {
    return classifyTrace(config, 'related', from);
}

/**
 * Build a trace overlay for "Downstream impact" — follow sequence/produces/writes edges forward.
 */
export function traceDownstream(config: TraceConfig, from: string): TraceOverlay {
    return classifyTrace(config, 'downstream', from);
}

/**
 * Step through lit nodes in a trace overlay.
 * @param overlay The trace overlay
 * @param current The current node ID (or undefined for first)
 * @param direction 1 for next, -1 for previous
 * @returns The next/previous lit node ID, or undefined
 */
export function stepLitNode(
    overlay: TraceOverlay,
    current: string | undefined,
    direction: 1 | -1,
): string | undefined {
    const litIds = Array.from(litNodeIds(overlay));
    if (litIds.length === 0) return undefined;

    if (!current) {
        return direction === 1 ? litIds[0] : litIds[litIds.length - 1];
    }

    const index = litIds.indexOf(current);
    if (index === -1) {
        return direction === 1 ? litIds[0] : litIds[litIds.length - 1];
    }

    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= litIds.length) return undefined;
    return litIds[nextIndex];
}

/**
 * Copy a trace overlay as a markdown outline using breadcrumbs for each lit node.
 */
export function copyTraceAsOutline(
    model: TraceModel,
    overlay: TraceOverlay,
    breadcrumbs: (model: TraceModel, id: string) => TraceNode[],
): string {
    const lines: string[] = [];
    const litIds = Array.from(litNodeIds(overlay));

    for (const id of litIds) {
        const nodes = breadcrumbs(model, id);
        if (nodes.length === 0) continue;

        const path = nodes.map((n) => n.label).join(' › ');
        const prefix = overlay.answerIds.has(id) ? '▸ ' : '  ';
        lines.push(`${prefix}${path}`);
    }

    return lines.join('\n');
}