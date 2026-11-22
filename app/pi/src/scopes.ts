import type { AgentView } from '@spacegraphjs/agent';
import type { ScopeEdge, ScopeNode, ScopeSpec } from 'spacegraphjs/layout';

export type AgentScopes = {
    readonly specs: readonly ScopeSpec[];
    /** Qualified scope id -> source node id. */
    readonly nodeById: ReadonlyMap<string, string>;
    /** Source node id -> qualified scope id. */
    readonly qualifiedById: ReadonlyMap<string, string>;
    /** Portal node id -> child scope id. */
    readonly portalByNode: ReadonlyMap<string, string>;
};

/** Root-first scope chain for a node that opens `scope`; parent links are followed until the root. */
export const portalChain = (scope: string, specs: readonly ScopeSpec[]): readonly string[] => {
    const parentByScope = new Map(specs.map((spec) => [spec.id, spec.parent]));
    const chain: string[] = [];
    const seen = new Set<string>();
    let current: string | undefined = scope;
    while (current && !seen.has(current)) {
        seen.add(current);
        chain.unshift(current);
        current = parentByScope.get(current);
    }
    return chain;
};

export const DEPTH: Readonly<Record<string, number>> = {
    run: 0,
    unit: 1,
    state: 2,
    message: 2,
    action: 3,
    artifact: 4,
    retry: 4,
};

const safe = (id: string): string => id.replace(/[^\w:.+-]/g, '_');
const unitOf = (node: { readonly data?: Readonly<Record<string, unknown>> }): string =>
    typeof node.data?.unitId === 'string' ? safe(node.data.unitId) : 'run';

/**
 * Maps an agent view to recursive scopes. The run owns turns; turns own their actions and artifacts;
 * a delegated action opens a nested scope for its subtree. Edges that cross scopes are declared once,
 * in the source scope, with the target's qualified path.
 */
export function agentScopes(
    view: AgentView,
    options: { laneScope?: string; packed?: boolean } = {},
): AgentScopes {
    const nodes = new Map(view.nodes.map((node) => [node.id, node]));
    const root = view.root && nodes.has(view.root) ? view.root : (view.nodes.find((n) => n.kind === 'run')?.id ?? '');

    const delegateParent = new Map<string, string>();
    const ownerUnit = new Map<string, string>();
    for (const edge of view.edges) {
        if (edge.kind === 'delegates' && nodes.has(edge.source) && nodes.has(edge.target)) {
            delegateParent.set(edge.target, edge.source);
        }
        if (edge.kind === 'contains' && nodes.get(edge.source)?.kind === 'unit' && nodes.has(edge.target)) {
            const parent = nodes.get(edge.source)!;
            ownerUnit.set(edge.target, typeof parent.data?.unitId === 'string' ? safe(parent.data.unitId) : 'run');
        }
    }
    const delegateRoot = (id: string): string => {
        let current = id;
        while (delegateParent.has(current)) current = delegateParent.get(current)!;
        return current;
    };

    const scopeOfNode = new Map<string, string>();
    const scopeIds = new Set<string>(['run']);
    for (const node of view.nodes) {
        if (node.id === root || node.kind === 'run' || node.kind === 'unit') {
            scopeOfNode.set(node.id, 'run');
            continue;
        }
        const owner = delegateRoot(node.id);
        if (owner !== node.id && nodes.has(owner)) {
            const id = `delegate-${safe(owner)}`;
            scopeOfNode.set(node.id, id);
            scopeIds.add(id);
        } else {
            const id = `unit-${ownerUnit.get(node.id) ?? unitOf(node)}`;
            scopeOfNode.set(node.id, id);
            scopeIds.add(id);
        }
    }

    const parentOfScope = new Map<string, string>();
    for (const id of scopeIds) {
        if (id === 'run') continue;
        const owner = id.startsWith('delegate-') ? id.slice('delegate-'.length) : undefined;
        const parentNode = owner ? [...nodes.values()].find((node) => safe(node.id) === owner) : undefined;
        parentOfScope.set(id, parentNode ? (scopeOfNode.get(parentNode.id) ?? 'run') : 'run');
    }

    const pathOfScope = new Map<string, string>();
    const path = (id: string): string => {
        const known = pathOfScope.get(id);
        if (known) return known;
        const parent = parentOfScope.get(id);
        const result = parent ? `${path(parent)}/${id}` : id;
        pathOfScope.set(id, result);
        return result;
    };
    pathOfScope.set('run', 'run');

    const nodeById = new Map<string, string>();
    const qualifiedById = new Map<string, string>();
    const content = new Map<string, ScopeNode[]>();
    const addScope = (id: string): ScopeNode[] => {
        let nodesIn = content.get(id);
        if (!nodesIn) {
            nodesIn = [];
            content.set(id, nodesIn);
        }
        return nodesIn;
    };
    addScope('run');
    for (const id of scopeIds) addScope(id);

    for (const node of view.nodes) {
        const scope = scopeOfNode.get(node.id) ?? 'run';
        const qualified = `${path(scope)}/${node.id}`;
        qualifiedById.set(node.id, qualified);
        nodeById.set(qualified, node.id);
        addScope(scope).push({
            id: node.id,
            size: [200, 64],
            depth: DEPTH[node.kind] ?? 2,
        });
    }

    const portalOf = new Map<string, string>();
    for (const id of scopeIds) {
        if (id.startsWith('unit-')) {
            const unit = id.slice('unit-'.length);
            const node = view.nodes.find((candidate) => candidate.kind === 'unit' && unitOf(candidate) === unit);
            if (node && scopeOfNode.get(node.id) === parentOfScope.get(id)) portalOf.set(node.id, id);
            continue;
        }
        if (!id.startsWith('delegate-')) continue;
        const owner = id.slice('delegate-'.length);
        const node = [...nodes.values()].find((candidate) => safe(candidate.id) === owner);
        if (node && scopeOfNode.get(node.id) === parentOfScope.get(id)) portalOf.set(node.id, id);
    }
    for (const [scope, list] of content) {
        for (const node of list) {
            const child = portalOf.get(node.id);
            if (child && child !== scope) node.scope = child;
        }
    }

    const edgeIds = new Set<string>();
    const edges = new Map<string, ScopeEdge[]>();
    const addEdge = (scope: string, edge: ScopeEdge): void => {
        let list = edges.get(scope);
        if (!list) {
            list = [];
            edges.set(scope, list);
        }
        list.push(edge);
    };
    for (const edge of view.edges) {
        const source = nodes.get(edge.source);
        const target = nodes.get(edge.target);
        if (!source || !target || edgeIds.has(edge.id)) continue;
        edgeIds.add(edge.id);
        const sourceScope = scopeOfNode.get(source.id) ?? 'run';
        const targetScope = scopeOfNode.get(target.id) ?? 'run';
        addEdge(sourceScope, {
            id: edge.id,
            source: source.id,
            target:
                sourceScope === targetScope
                    ? target.id
                    : `${path(targetScope)}/${target.id}`,
            kind: edge.kind,
        });
    }

    const specs: ScopeSpec[] = [...scopeIds].map((id) => {
        const list = content.get(id) ?? [];
        const packed =
            id === options.laneScope ||
            (options.packed === true && (id.startsWith('unit-') || id.startsWith('delegate-')));
        if (packed) {
            const kindByNode = new Map(view.nodes.map((node) => [node.id, node.kind]));
            list.forEach((node, index) => {
                node.lane = id === options.laneScope ? (kindByNode.get(node.id) ?? 'action') : 'packed';
                node.row = index;
            });
        }
        return {
            id,
            parent: parentOfScope.get(id),
            strategy: packed ? 'grid' : 'force',
            offset: packed ? { x: 0, y: -240, z: 0 } : undefined,
            nodes: list,
            edges: edges.get(id) ?? [],
        };
    });

    return { specs, nodeById, qualifiedById, portalByNode: portalOf };
}
