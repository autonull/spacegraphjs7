// One-canvas world host binding. All four domains share a single ScopeSimulation (the one position
// authority) and a single renderer model, so a cross-domain trace is one camera flight. The
// four-canvas InterGraphEdge demo stays the separate-surface embedding case.

import type { NodeStatus, RenderEdge, RenderModel, RenderNode } from '@spacegraphjs/renderer';
import { ScopeSimulation, type Position, type ScopeLayoutOptions } from 'spacegraphjs/layout';
import { crossTracePath, type CrossTraceLink } from './cross-trace';
import { worldScopes, worldTrace, type WorldDomain, type WorldScopes } from './world-scopes';

export interface WorldHostNode {
    readonly id: string;
    readonly label?: string;
    readonly kind?: string;
    readonly status?: NodeStatus;
    readonly size?: readonly [number, number];
    readonly data?: Record<string, unknown>;
}

export interface WorldHostEdge {
    readonly id: string;
    readonly source: string;
    readonly target: string;
    readonly kind?: string;
    readonly label?: string;
}

export interface WorldHostDomain {
    readonly id: string;
    readonly nodes: readonly WorldHostNode[];
    readonly edges?: readonly WorldHostEdge[];
}

export interface WorldHostOptions {
    /** Cross-domain links; rendered as ordinary edges inside the one graph, never InterGraphEdges. */
    readonly links?: readonly CrossTraceLink[];
    readonly seed?: number;
    readonly gap?: number;
    readonly depthStep?: number;
    readonly instant?: boolean;
    readonly labelDomains?: boolean;
}

export interface WorldCameraStep {
    readonly id: string;
    readonly domain: string;
    readonly node: string;
    readonly via?: string;
}

export interface WorldHost {
    readonly world: WorldScopes;
    readonly simulation: ScopeSimulation;
    readonly domains: readonly WorldHostDomain[];
    readonly qualifiedByNode: ReadonlyMap<string, string>;
    renderModel(): RenderModel;
    /** One ordered list of path-qualified ids for a single camera flight. */
    trace(start: string, direction?: 'forward' | 'backward'): readonly string[];
    /** The same walk with domain/node/via detail for status readouts. */
    traceSteps(start: string, direction?: 'forward' | 'backward'): readonly WorldCameraStep[];
    focusPositions(start: string, direction?: 'forward' | 'backward'): readonly Position[];
    advance(seconds: number): void;
    settle(): void;
}

const position = (value: Position): [number, number, number] => [value.x, value.y, value.z];

export const createWorldHost = (
    domains: readonly WorldHostDomain[],
    options: WorldHostOptions = {},
): WorldHost => {
    const links = options.links ?? [];
    const worldDomains: readonly WorldDomain[] = domains.map((domain) => ({
        id: domain.id,
        nodes: domain.nodes.map((node) => ({ id: node.id, size: node.size })),
        edges: (domain.edges ?? []).map((edge) => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            kind: edge.kind,
        })),
    }));
    const world = worldScopes(worldDomains);
    const depthStep = options.depthStep ?? 140;
    const layout: ScopeLayoutOptions = {
        seed: options.seed ?? 7,
        gap: options.gap ?? 180,
        depthStep,
    };
    const simulation = new ScopeSimulation({ instant: options.instant ?? true, layout });
    simulation.setSpecs(world.specs);

    const nodesByDomain = Object.fromEntries(
        domains.map((domain) => [domain.id, domain.nodes.map((node) => node.id)]),
    );

    const walk = (start: string, direction: 'forward' | 'backward') => {
        const steps = crossTracePath(links, nodesByDomain, start, direction);
        return steps.map((step) => ({
            ...step,
            id: worldTrace(world, [{ domain: step.domain, node: step.node }])[0]!,
        }));
    };

    const renderModel = (): RenderModel => {
        const view = simulation.view();
        const nodes: RenderNode[] = [];
        const edges: RenderEdge[] = [];

        for (const domain of domains) {
            const portal = `${world.root}/portal:${domain.id}`;
            const portalPosition = view.positions.get(portal);
            if (portalPosition) {
                nodes.push({
                    id: portal,
                    kind: 'portal',
                    label: domain.id,
                    shape: 'group',
                    position: position(portalPosition),
                    size: [180, 60, depthStep],
                    status: 'neutral',
                    data: { domain: domain.id, role: 'portal' },
                });
            }
            for (const node of domain.nodes) {
                const qualified = world.qualifiedByNode.get(node.id);
                const nodePosition = qualified ? view.positions.get(qualified) : undefined;
                if (!qualified || !nodePosition) continue;
                nodes.push({
                    id: qualified,
                    kind: node.kind ?? 'node',
                    label:
                        options.labelDomains === false
                            ? (node.label ?? node.id)
                            : `${domain.id} · ${node.label ?? node.id}`,
                    position: position(nodePosition),
                    size: node.size ? [node.size[0], node.size[1], depthStep] : undefined,
                    status: node.status ?? 'neutral',
                    parent: portal,
                    data: { domain: domain.id, sourceId: node.id, ...node.data },
                });
            }
            for (const edge of domain.edges ?? []) {
                const source = world.qualifiedByNode.get(edge.source);
                const target = world.qualifiedByNode.get(edge.target);
                if (!source || !target) continue;
                edges.push({
                    id: `${domain.id}/${edge.id}`,
                    source,
                    target,
                    kind: edge.kind ?? 'related',
                    label: edge.label,
                    directed: true,
                });
            }
        }

        for (const link of links) {
            const source = world.qualifiedByNode.get(link.from[1]);
            const target = world.qualifiedByNode.get(link.to[1]);
            if (!source || !target) continue;
            edges.push({
                id: link.id,
                source,
                target,
                kind: 'cross-domain',
                style: 'dashed',
                directed: true,
                data: { from: link.from[0], to: link.to[0] },
            });
        }

        const { size } = view.bounds;
        return { nodes, edges, extent: { width: size[0], height: size[1], depth: size[2] } };
    };

    return {
        world,
        simulation,
        domains,
        qualifiedByNode: world.qualifiedByNode,
        renderModel,
        trace: (start, direction = 'forward') => walk(start, direction).map((step) => step.id),
        traceSteps: (start, direction = 'forward') => walk(start, direction),
        focusPositions: (start, direction = 'forward') =>
            walk(start, direction)
                .map((step) => viewPosition(simulation, step.id))
                .filter((value): value is Position => value !== undefined),
        advance: (seconds) => simulation.advance(seconds),
        settle: () => simulation.settle(),
    };
};

const viewPosition = (simulation: ScopeSimulation, id: string): Position | undefined => {
    const view = simulation.view();
    return view.positions.get(id) ?? view.frames.get(id)?.origin;
};
