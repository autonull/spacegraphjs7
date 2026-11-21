import { buildScopeTree, type ScopeEdge, type ScopeNode, type ScopeSpec } from 'spacegraphjs/layout';

export interface WorldDomain {
    readonly id: string;
    readonly nodes: readonly ScopeNode[];
    readonly edges?: readonly ScopeEdge[];
}

export interface WorldScopes {
    readonly root: string;
    readonly specs: readonly ScopeSpec[];
    /** Domain node id -> path-qualified id inside the one graph. */
    readonly qualifiedByNode: ReadonlyMap<string, string>;
    /** Path-qualified id -> domain id. */
    readonly domainByQualified: ReadonlyMap<string, string>;
}

/** One root with isolated domain child scopes. Kernels stay host-side; only geometry is composed. */
export const worldScopes = (domains: readonly WorldDomain[]): WorldScopes => {
    const root = 'world';
    const portals: ScopeNode[] = domains.map((domain) => ({
        id: `portal:${domain.id}`,
        label: domain.id,
        scope: `domain:${domain.id}`,
    })) as ScopeNode[];
    const qualifiedByNode = new Map<string, string>();
    const domainByQualified = new Map<string, string>();
    const specs: ScopeSpec[] = [
        { id: root, nodes: portals },
        ...domains.map((domain) => {
            const scope = `domain:${domain.id}`;
            for (const node of domain.nodes) {
                const qualified = `${root}/${scope}/${node.id}`;
                qualifiedByNode.set(node.id, qualified);
                domainByQualified.set(qualified, domain.id);
            }
            return {
                id: scope,
                parent: root,
                nodes: domain.nodes,
                edges: domain.edges ?? [],
            };
        }),
    ];
    const tree = buildScopeTree(specs);
    const unknown = [...domainByQualified.keys()].filter((qualified) => !tree.nodePaths.has(qualified));
    if (unknown.length) throw new Error(`worldScopes: unresolved nodes ${unknown.join(', ')}`);
    return { root, specs, qualifiedByNode, domainByQualified };
};

/** A cross-domain trace becomes one ordered list of qualified ids in the single world graph. */
export const worldTrace = (
    world: WorldScopes,
    steps: readonly { domain: string; node: string }[],
): readonly string[] =>
    steps.map((step) => {
        const qualified = world.qualifiedByNode.get(step.node);
        if (!qualified) throw new Error(`worldTrace: unknown node ${step.domain}:${step.node}`);
        return qualified;
    });
