import { Kernel, type Node, type NodeID } from './kernel';

/**
 * Generic card budget: keep the highest-priority nodes and their connecting edges. Weights are host
 * data keyed by node kind, so the kernel stays domain-agnostic. A protected id is never dropped,
 * because selection follows a stable id and must survive any budget.
 */
export type NodeBudget = {
    readonly maxNodes: number;
    readonly weights: Readonly<Record<string, number>>;
    readonly protectedIds?: Iterable<NodeID>;
};

const priority = (node: Node, weights: Readonly<Record<string, number>>): number =>
    weights[node.kind] ?? 0;

export const applyNodeBudget = (kernel: Kernel, budget: NodeBudget): Kernel => {
    if (kernel.nodes.length <= budget.maxNodes) return kernel;
    const protectedIds = new Set(budget.protectedIds ?? []);
    const ordered = [...kernel.nodes].sort(
        (a, b) =>
            Number(protectedIds.has(b.id)) - Number(protectedIds.has(a.id)) ||
            priority(b, budget.weights) - priority(a, budget.weights) ||
            a.id.localeCompare(b.id),
    );
    const kept = ordered.slice(0, Math.max(0, budget.maxNodes)).map((node) => node.id);
    return kernel.subgraph(kept);
};
