import { buildScopeTree, type ScopeSpec } from 'spacegraphjs/layout';

export type ScopeGroup = {
    readonly id: string;
    readonly members: readonly string[];
};

export type ScopeInputNode = {
    readonly id: string;
    readonly lane: string;
    readonly row: number;
    readonly size: readonly [number, number];
};

export type ScopeForest = {
    readonly specs: readonly ScopeSpec[];
    /** Node id -> path-qualified id used by the simulation. */
    readonly nodePaths: ReadonlyMap<string, string>;
    /** Qualified id -> node id, for reading positions back. */
    readonly nodesByPath: ReadonlyMap<string, string>;
    /** Group id -> path-qualified scope, so band policy can fold nested frames. */
    readonly groupPaths: ReadonlyMap<string, string>;
};

const safeID = (id: string): string => id.replaceAll('/', ':');

/**
 * Turn recorded subgraphs into a scope forest. Every node keeps one owner, group owners become
 * portals in their parent, and all coordinates stay external: the layout authority still supplies
 * the world positions, while band policy only decides which frames are active.
 */
export const buildScopeForest = (
    nodes: readonly ScopeInputNode[],
    edges: readonly { readonly id: string; readonly source: string; readonly target: string }[],
    groups: readonly ScopeGroup[],
    strategy: NonNullable<ScopeSpec['strategy']>,
): ScopeForest => {
    const known = new Set(nodes.map((node) => node.id));
    const families = groups
        .filter((group) => known.has(group.id) && group.members.length > 1)
        .map((group) => ({
            id: group.id,
            members: new Set(group.members.filter((id) => known.has(id))),
        }))
        .filter((group) => group.members.size > 1);
    const portalOf = new Map(
        families.map((group) => [
            group.id,
            group.members.has(group.id) ? group.id : [...group.members][0]!,
        ] as const),
    );
    const parentOf = new Map<string, string>();
    for (const group of families) {
        const portal = portalOf.get(group.id)!;
        const container = families
            .filter((other) =>
                other.id !== group.id &&
                other.members.size > group.members.size &&
                other.members.has(portal) &&
                [...group.members].every((id) => other.members.has(id)))
            .sort((a, b) => a.members.size - b.members.size)[0];
        if (container) parentOf.set(group.id, container.id);
    }
    const pathOf = (id: string): string => {
        const chain: string[] = [];
        for (let cursor: string | undefined = id; cursor; cursor = parentOf.get(cursor))
            chain.unshift(safeID(cursor));
        return ['root', ...chain].join('/');
    };
    const groupPaths = new Map(families.map((group) => [group.id, pathOf(group.id)] as const));
    const forcedOwner = new Map(
        [...portalOf].map(([groupID, portal]) => [portal, parentOf.get(groupID) ?? 'root'] as const),
    );
    const ownerOf = (id: string): string => {
        const forced = forcedOwner.get(id);
        if (forced) return forced;
        const candidates = families
            .filter((group) => group.members.has(id) && portalOf.get(group.id) !== id)
            .sort((a, b) => a.members.size - b.members.size);
        return candidates[0]?.id ?? 'root';
    };
    const ownerPaths = new Map(groupPaths);
    ownerPaths.set('root', 'root');
    const nodePaths = new Map(
        nodes.map((node) =>
            [node.id, `${ownerPaths.get(ownerOf(node.id))!}/${safeID(node.id)}`] as const),
    );
    const portalScopes = new Map(
        [...portalOf].map(([groupID, portal]) => [safeID(portal), safeID(groupID)] as const),
    );
    const specOf = (specID: string): ScopeSpec => ({
        id: safeID(specID),
        parent: parentOf.get(specID)
            ? safeID(parentOf.get(specID)!)
            : specID === 'root' ? undefined : 'root',
        strategy,
        nodes: nodes.filter((node) => ownerOf(node.id) === specID).map((node) => ({
            id: safeID(node.id),
            lane: node.lane,
            row: node.row,
            size: node.size,
            ...(portalScopes.has(safeID(node.id)) ? { scope: portalScopes.get(safeID(node.id)) } : {}),
        })),
    });
    const specs = [specOf('root'), ...families.map((group) => specOf(group.id))];
    const root = specs[0]!;
    const forest: ScopeForest = {
        specs: [{
            ...root,
            edges: edges.map((edge) => ({
                id: safeID(edge.id),
                source: nodePaths.get(edge.source)!,
                target: nodePaths.get(edge.target)!,
            })),
        }, ...specs.slice(1)],
        nodePaths,
        nodesByPath: new Map([...nodePaths].map(([id, path]) => [path, id] as const)),
        groupPaths,
    };
    buildScopeTree(forest.specs);
    return forest;
};
