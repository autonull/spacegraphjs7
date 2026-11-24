import type { Kernel } from '@spacegraphjs/kernel';

export type ThreadStep = { readonly id: string; readonly via: string; readonly kind: string };

/** Only recorded order and checkpoint edges form a thread; no link is invented. */
const THREAD_KINDS = new Set(['orders', 'checkpoint']);

export const threadFrom = (
    kernel: Pick<Kernel, 'nodes' | 'edges'>,
    id: string,
): readonly ThreadStep[] => {
    const ids = new Set(kernel.nodes.map((node) => node.id));
    if (!ids.has(id)) return [];
    const seen = new Set([id]);
    const queue = [id];
    const steps: ThreadStep[] = [];
    while (queue.length) {
        const current = queue.shift()!;
        for (const edge of kernel.edges) {
            if (!THREAD_KINDS.has(edge.kind) || edge.source !== current) continue;
            if (!ids.has(edge.target) || seen.has(edge.target)) continue;
            seen.add(edge.target);
            steps.push({ id: edge.target, via: current, kind: edge.kind });
            queue.push(edge.target);
        }
    }
    return steps;
};
