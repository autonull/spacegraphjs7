import type { AgentView } from '@spacegraphjs/agent';

const PROVENANCE = new Set(['writes', 'delegates', 'evidence', 'sequence', 'reads', 'contains']);

/** Ordered, de-duplicated provenance walk from a node. Pure: no camera, no DOM, host clock-free. */
export const traceOrder = (view: AgentView, startId: string): readonly string[] => {
    if (!view.nodes.some((node) => node.id === startId)) return [];
    const ordered = [startId];
    const seen = new Set(ordered);
    const queue = [startId];
    for (let cursor = 0; cursor < queue.length; cursor++) {
        for (const edge of view.edges) {
            if (!PROVENANCE.has(edge.kind)) continue;
            const next =
                edge.source === queue[cursor]
                    ? edge.target
                    : edge.target === queue[cursor]
                      ? edge.source
                      : undefined;
            if (next && !seen.has(next)) {
                seen.add(next);
                ordered.push(next);
                queue.push(next);
            }
        }
    }
    return ordered;
};
