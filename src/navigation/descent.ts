// Cross-scale descent as host policy. The library registers policies and walks them; the host
// supplies its own kinds and relationships, so no session vocabulary lives in the library.

export interface DescentNode {
    readonly id: string;
    readonly kind: string;
    readonly children?: readonly string[];
}

export interface DescentContext {
    readonly nodes: ReadonlyMap<string, DescentNode>;
}

export interface DescentPolicy {
    readonly id: string;
    /** Node kinds this policy descends; omitted means every kind. */
    readonly kinds?: readonly string[];
    /** Child ids to descend into, or undefined when the policy does not apply. */
    readonly children: (
        node: DescentNode,
        context: DescentContext,
    ) => readonly string[] | undefined;
}

/** A policy that follows the next kind in a host-defined ladder. */
export function kindDescent(id: string, kinds: readonly string[]): DescentPolicy {
    return {
        id,
        kinds,
        children: (node, context) => {
            const next = kinds[kinds.indexOf(node.kind) + 1];
            return next === undefined
                ? undefined
                : (node.children ?? []).filter((childID) => context.nodes.get(childID)?.kind === next);
        },
    };
}

export class DescentRegistry {
    readonly #policies: DescentPolicy[];

    constructor(policies: readonly DescentPolicy[] = []) {
        this.#policies = [...policies];
    }

    get ids(): readonly string[] {
        return this.#policies.map((policy) => policy.id);
    }

    register(policy: DescentPolicy): this {
        this.#policies.push(policy);
        return this;
    }

    /** The first matching policy's children, limited to ids the host model actually contains. */
    childrenOf(node: DescentNode, context: DescentContext): readonly string[] {
        const policy = this.#policies.find(
            (entry) =>
                (!entry.kinds || entry.kinds.includes(node.kind)) &&
                entry.children(node, context) !== undefined,
        );
        return policy?.children(node, context)?.filter((id) => context.nodes.has(id)) ?? [];
    }

    /** A root-inclusive path from one node to another, or undefined when no policy connects them. */
    path(from: string, to: string, context: DescentContext): readonly string[] | undefined {
        const queue: string[][] = [[from]];
        const seen = new Set([from]);

        while (queue.length > 0) {
            const path = queue.shift()!;
            const current = path[path.length - 1]!;
            if (current === to) return path;
            const node = context.nodes.get(current);
            if (!node) continue;

            for (const child of this.childrenOf(node, context)) {
                if (seen.has(child)) continue;
                seen.add(child);
                queue.push([...path, child]);
            }
        }

        return undefined;
    }
}
