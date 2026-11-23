// Recursive scopes. A subgraph is a first-class body in its parent's layout: the parent solves for
// a portal that represents the whole child, while the child solves its own interior with its own
// strategy. Identity is path-qualified, so a node keeps its name when it moves between scopes.
//
// This module owns the tree, its validation and its references. Geometry lives in scope-layout.ts.

import { appendTo } from '../utils/collection';
import type { Position } from './placement';

export type ScopeStrategy = 'force' | 'grid' | 'tree';

export type ScopeErrorCode =
    | 'invalid-id'
    | 'duplicate-scope'
    | 'unknown-parent'
    | 'cycle'
    | 'duplicate-node'
    | 'unknown-portal'
    | 'unknown-endpoint';

export class ScopeError extends Error {
    readonly code: ScopeErrorCode;

    constructor(code: ScopeErrorCode, message: string) {
        super(message);
        this.name = 'ScopeError';
        this.code = code;
    }
}

export interface ScopeNode {
    id: string;
    /** The footprint the solvers use for collision and bounds. */
    size?: readonly [number, number];
    /** Hierarchy depth, recorded in Z. */
    depth?: number;
    /** Opens a direct child scope here; this node becomes the child's portal. */
    scope?: string;
    /** Grid strategy: the column this node belongs to. */
    lane?: string;
    /** Grid strategy: an explicit row index. */
    row?: number;
    /** Tree strategy: the id of the parent node inside this scope. */
    parent?: string;
}

export interface ScopeEdge {
    id: string;
    /** A local node id, a direct child scope id, or an absolute qualified path. */
    source: string;
    target: string;
    kind?: string;
}

export interface ScopeSpec {
    id: string;
    parent?: string;
    nodes: readonly ScopeNode[];
    edges?: readonly ScopeEdge[];
    strategy?: ScopeStrategy;
    /** Frame offset in parent space, applied after the portal is placed. */
    offset?: Position;
    /** Content scale relative to the parent. */
    scale?: number;
}

export interface ScopeEntry {
    readonly spec: ScopeSpec;
    /** Path-qualified id, e.g. `session/turn-1`. */
    readonly path: string;
    readonly depth: number;
    readonly parent?: ScopeEntry;
    readonly children: ScopeEntry[];
    readonly nodes: ScopeNode[];
    readonly edges: readonly ScopeEdge[];
}

export interface ScopeTree {
    readonly roots: readonly ScopeEntry[];
    readonly byPath: ReadonlyMap<string, ScopeEntry>;
    /** Qualified node id -> the path of the scope that owns it. */
    readonly nodePaths: ReadonlyMap<string, string>;
}

const isSafeId = (id: string): boolean => id.length > 0 && !id.includes('/');

/**
 * Validate and index a scope forest. Every error is raised here, at the boundary, so layout can
 * assume the tree is acyclic, ids are unique and every reference resolves.
 */
export function buildScopeTree(specs: readonly ScopeSpec[]): ScopeTree {
    const byId = new Map<string, ScopeSpec>();

    for (const spec of specs) {
        if (!isSafeId(spec.id)) {
            throw new ScopeError('invalid-id', `scope id must be a non-empty string without '/': ${spec.id}`);
        }
        if (byId.has(spec.id)) {
            throw new ScopeError('duplicate-scope', `duplicate scope id: ${spec.id}`);
        }
        byId.set(spec.id, spec);
    }

    const state = new Map<string, 1 | 2>();
    const checkChain = (id: string, chain: string[]): void => {
        const seen = state.get(id);
        if (seen === 2) return;
        if (seen === 1) {
            throw new ScopeError('cycle', `scope cycle: ${[...chain, id].join(' -> ')}`);
        }
        const spec = byId.get(id);
        if (!spec) throw new ScopeError('unknown-parent', `unknown parent scope: ${id}`);
        state.set(id, 1);
        if (spec.parent) checkChain(spec.parent, [...chain, id]);
        state.set(id, 2);
    };
    for (const id of byId.keys()) checkChain(id, []);

    const childrenOf = new Map<string, ScopeSpec[]>();
    const roots: ScopeSpec[] = [];
    for (const spec of specs) {
        if (spec.parent === undefined) {
            roots.push(spec);
            continue;
        }
        appendTo(childrenOf, spec.parent, spec);
    }

    const byPath = new Map<string, ScopeEntry>();
    const nodePaths = new Map<string, string>();

    const build = (spec: ScopeSpec, parent?: ScopeEntry): ScopeEntry => {
        const path = parent ? `${parent.path}/${spec.id}` : spec.id;
        const seenNodes = new Set<string>();

        for (const node of spec.nodes) {
            if (!isSafeId(node.id)) {
                throw new ScopeError('invalid-id', `node id must be a non-empty string without '/': ${node.id}`);
            }
            if (seenNodes.has(node.id)) {
                throw new ScopeError('duplicate-node', `duplicate node ${node.id} in scope ${path}`);
            }
            seenNodes.add(node.id);
            nodePaths.set(`${path}/${node.id}`, path);
        }

        const entry: ScopeEntry = {
            spec,
            path,
            depth: parent ? parent.depth + 1 : 0,
            parent,
            children: [],
            nodes: [...spec.nodes],
            edges: spec.edges ?? [],
        };
        byPath.set(path, entry);

        entry.children.push(...(childrenOf.get(spec.id) ?? []).map((child) => build(child, entry)));

        for (const node of spec.nodes) {
            if (!node.scope) continue;
            if (!entry.children.some((child) => child.spec.id === node.scope)) {
                throw new ScopeError(
                    'unknown-portal',
                    `node ${path}/${node.id} opens unknown child scope ${node.scope}`,
                );
            }
        }
        return entry;
    };

    const builtRoots = roots.map((root) => build(root));

    const tree: ScopeTree = { roots: builtRoots, byPath, nodePaths };
    const validateEdges = (entry: ScopeEntry): void => {
        for (const edge of entry.edges) {
            resolveScopeRef(tree, entry.path, edge.source);
            resolveScopeRef(tree, entry.path, edge.target);
        }
        for (const child of entry.children) validateEdges(child);
    };
    for (const root of builtRoots) validateEdges(root);

    return tree;
}

/** Resolve a local node id, a direct child scope id, or an absolute qualified path. */
export function resolveScopeRef(tree: ScopeTree, path: string, ref: string): string {
    if (ref.includes('/')) {
        if (tree.byPath.has(ref) || tree.nodePaths.has(ref)) return ref;
        const relative = `${path}/${ref}`;
        if (tree.byPath.has(relative) || tree.nodePaths.has(relative)) return relative;
        throw new ScopeError('unknown-endpoint', `unresolved endpoint ${ref} in scope ${path}`);
    }
    const local = `${path}/${ref}`;
    if (tree.byPath.has(local) || tree.nodePaths.has(local)) return local;
    throw new ScopeError('unknown-endpoint', `unresolved endpoint ${ref} in scope ${path}`);
}

/** The path of the scope that owns a qualified node id, or the scope id itself for a frame. */
export function scopeOf(tree: ScopeTree, id: string): string | undefined {
    const direct = tree.byPath.get(id);
    if (direct) return direct.path;
    return tree.nodePaths.get(id);
}

/** A scope and its ancestors, nearest first. Accepts a qualified node id. */
export function scopeAncestors(tree: ScopeTree, id: string): readonly ScopeEntry[] {
    const path = tree.nodePaths.get(id) ?? id;
    const ancestors: ScopeEntry[] = [];
    let entry = tree.byPath.get(path);
    while (entry) {
        ancestors.push(entry);
        entry = entry.parent;
    }
    return ancestors;
}

/** A scope and all of its descendants in tree order. */
export function scopeDescendants(tree: ScopeTree, id: string): readonly ScopeEntry[] {
    const entry = tree.byPath.get(id);
    if (!entry) return [];
    const result: ScopeEntry[] = [];
    const visit = (current: ScopeEntry): void => {
        result.push(current);
        for (const child of current.children) visit(child);
    };
    visit(entry);
    return result;
}
