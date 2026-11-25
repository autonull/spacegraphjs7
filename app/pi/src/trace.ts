import type { AgentView } from '@spacegraphjs/agent';
import { edgePath } from 'spacegraphjs/navigation';

const PROVENANCE = ['writes', 'delegates', 'evidence', 'sequence', 'reads', 'contains'] as const;

/** Ordered, de-duplicated provenance walk from a node. Pure: no camera, no DOM, host clock-free. */
export const traceOrder = (view: AgentView, startId: string): readonly string[] => {
    if (!view.nodes.some((node) => node.id === startId)) return [];
    return [
        startId,
        ...edgePath(view, startId, { kinds: PROVENANCE, directed: false }).map((step) => step.id),
    ];
};
