// The second host's own domain: a release pipeline, with a vocabulary of its own.
//
// Nothing here is session vocabulary and nothing here is OpenCode's. The point of this host is to
// prove that the library's generic modules carry a host they have never seen: the model, the level
// table, the lane names, the layout, the card markup and the statuses are all this host's, and the
// library only supplies the algorithms.

import { escapeHtml, ModelAdapter } from '@spacegraphjs/adapter';
import type { NodeStatus, RenderEdge } from '@spacegraphjs/renderer';
import { Levels, type LevelConfig } from 'spacegraphjs/levels';
import type { LayoutConfig } from 'spacegraphjs/layout';

export type BuildLevel = 'overview' | 'execution' | 'detail'

/** The layouts the host can draw. The two summaries are the host's own; the rest are the library's. */
export type HostView = 'ribbon' | 'matrix' | 'lanes' | 'timeline' | 'hierarchy' | 'tree' | 'force'

/** The views in the order the picker shows them: the summaries first, then the geometries. */
export const HOST_VIEWS: readonly HostView[] = [
    'ribbon',
    'matrix',
    'lanes',
    'timeline',
    'hierarchy',
    'tree',
    'force',
]

/** The views with no lane gutter: a summary has rows and columns, and the two free geometries have
 * no lanes at all — a card's place in the tree or the simulation says nothing about its lane. */
export const LANELESS_VIEWS: readonly HostView[] = ['ribbon', 'matrix', 'tree', 'force']

/**
 * The leaves a tree block holds before it folds to the next row. Two, not the library's default of
 * four: the pipeline's stages each own a row of work, and four leaves per block make the tree wider
 * than the canvas, so the frame shows its beginning and the reader pans the rest.
 */
export const TREE_COLUMNS = 2;
export type BuildStatus = 'queued' | 'running' | 'passed' | 'changed' | 'failed' | 'retried';
export type BuildKind = 'stage' | 'step' | 'note' | 'tool' | 'artifact' | 'failure' | 'retry';
export type BuildLane = 'plan' | 'fetch' | 'compile' | 'test' | 'package' | 'publish';
export type BuildOutcome = 'planned' | 'changed' | 'failed' | 'retried';
export type BuildEdgeKind = 'sequence' | 'evidence' | 'part-of';

export interface BuildNode {
    id: string;
    kind: BuildKind;
    label: string;
    summary?: string;
    status: BuildStatus;
    lane: BuildLane;
    /** The stage the node belongs to; the root belongs to none. */
    stage?: string;
    outcome: BuildOutcome;
    size: readonly [number, number];
}

export interface BuildEdge {
    id: string;
    source: string;
    target: string;
    kind: BuildEdgeKind;
    label?: string;
    confidence: 'explicit' | 'structural' | 'inferred';
}

export interface BuildModel {
    nodes: readonly BuildNode[];
    edges: readonly BuildEdge[];
    /** The root of the pipeline. */
    root: string;
    /** The stages, in order; they are the columns of the summary representations. */
    turns: readonly string[];
}

export const LANES: readonly BuildLane[] = ['plan', 'fetch', 'compile', 'test', 'package', 'publish'];

/** The zoom bands the host declares; the controller and the zoom module both read this table. */
export const BANDS = [
    { id: 'overview', min: 0, max: 0.45, label: 'Overview' },
    { id: 'execution', min: 0.45, max: 0.8, label: 'Execution' },
    { id: 'detail', min: 0.8, max: 1, label: 'Detail' },
] as const;

export const STAGES: readonly string[] = ['stage:plan', 'stage:build', 'stage:verify', 'stage:ship'];

/** The host's name for each stage; the summary representations caption their rows with it. */
export const STAGE_LABELS: Readonly<Record<string, string>> = {
    'stage:plan': 'Plan',
    'stage:build': 'Build',
    'stage:verify': 'Verify',
    'stage:ship': 'Ship',
};

/** The column of each outcome in the matrix representation. */
export const OUTCOME_INDEX: Record<BuildOutcome, number> = {
    planned: 0,
    changed: 1,
    failed: 2,
    retried: 3,
};

export const OUTCOME_COLUMNS: Readonly<Record<number, string>> = {
    0: 'planned',
    1: 'changed',
    2: 'failed',
    3: 'retried',
};

const CARD: readonly [number, number] = [200, 64];
const BADGE: readonly [number, number] = [200, 44];

function node(
    id: string,
    kind: BuildKind,
    label: string,
    lane: BuildLane,
    stage: string | undefined,
    outcome: BuildOutcome,
    status: BuildStatus,
    summary?: string,
): BuildNode {
    const size = kind === 'failure' || kind === 'retry' ? BADGE : CARD;

    return { id, kind, label, lane, stage, outcome, status, summary, size };
}

function edge(
    source: string,
    target: string,
    kind: BuildEdgeKind,
    confidence: BuildEdge['confidence'],
    label?: string,
): BuildEdge {
    return { id: `${source}->${target}:${kind}`, source, target, kind, confidence, label };
}

/** The pipeline this host draws: scope, build, verify, ship — with one failure and one retry. */
export function buildModel(): BuildModel {
    const nodes: BuildNode[] = [
        node('release', 'stage', 'Release 4.2', 'plan', undefined, 'planned', 'running'),
        node('stage:plan', 'stage', 'Plan', 'plan', 'stage:plan', 'planned', 'passed'),
        node('plan:scope', 'step', 'Scope the release', 'plan', 'stage:plan', 'planned', 'passed', '2 hotfixes, 1 feature'),
        node('plan:notes', 'note', 'Freeze the branch', 'plan', 'stage:plan', 'planned', 'passed', 'no schema change'),
        node('stage:build', 'stage', 'Build', 'compile', 'stage:build', 'changed', 'passed'),
        node('fetch:deps', 'tool', 'pnpm install', 'fetch', 'stage:build', 'changed', 'passed', 'frozen lockfile'),
        node('build:compile', 'tool', 'tsc -b', 'compile', 'stage:build', 'changed', 'passed', '12 packages'),
        node('build:bundle', 'tool', 'vite build', 'compile', 'stage:build', 'changed', 'passed', '184 kB gzip'),
        node('build:tarball', 'artifact', 'dist/4.2.0.tgz', 'package', 'stage:build', 'changed', 'passed', '2.1 MB'),
        node('stage:verify', 'stage', 'Verify', 'test', 'stage:verify', 'changed', 'failed'),
        node('test:unit', 'tool', 'vitest run', 'test', 'stage:verify', 'changed', 'passed', '511 passed'),
        node('test:failure', 'failure', 'expected 12 to equal 13', 'test', 'stage:verify', 'failed', 'failed', 'billing/totals.test.ts'),
        node('test:retry', 'retry', 'retry #1', 'test', 'stage:verify', 'retried', 'retried', 'round before summing'),
        node('test:pass', 'tool', 'vitest run', 'test', 'stage:verify', 'changed', 'passed', '512 passed'),
        node('stage:ship', 'stage', 'Ship', 'publish', 'stage:ship', 'changed', 'queued'),
        node('ship:sign', 'tool', 'cosign sign', 'publish', 'stage:ship', 'changed', 'queued', 'keyless'),
        node('ship:publish', 'tool', 'npm publish', 'publish', 'stage:ship', 'changed', 'queued', 'dist-tag latest'),
        node('ship:note', 'note', 'Awaiting the registry', 'publish', 'stage:ship', 'planned', 'queued'),
    ];

    const edges: BuildEdge[] = [
        edge('stage:plan', 'release', 'part-of', 'explicit'),
        edge('stage:build', 'release', 'part-of', 'explicit'),
        edge('stage:verify', 'release', 'part-of', 'explicit'),
        edge('stage:ship', 'release', 'part-of', 'explicit'),
        edge('plan:scope', 'stage:plan', 'part-of', 'explicit'),
        edge('plan:notes', 'stage:plan', 'part-of', 'explicit'),
        edge('fetch:deps', 'stage:build', 'part-of', 'explicit'),
        edge('build:compile', 'stage:build', 'part-of', 'explicit'),
        edge('build:bundle', 'stage:build', 'part-of', 'explicit'),
        edge('build:tarball', 'stage:build', 'part-of', 'explicit'),
        edge('test:unit', 'stage:verify', 'part-of', 'explicit'),
        edge('test:failure', 'stage:verify', 'part-of', 'explicit'),
        edge('test:retry', 'stage:verify', 'part-of', 'explicit'),
        edge('test:pass', 'stage:verify', 'part-of', 'explicit'),
        edge('ship:sign', 'stage:ship', 'part-of', 'explicit'),
        edge('ship:publish', 'stage:ship', 'part-of', 'explicit'),
        edge('ship:note', 'stage:ship', 'part-of', 'explicit'),
        edge('release', 'stage:plan', 'sequence', 'explicit'),
        edge('stage:plan', 'stage:build', 'sequence', 'explicit'),
        edge('stage:build', 'stage:verify', 'sequence', 'explicit'),
        edge('stage:verify', 'stage:ship', 'sequence', 'explicit'),
        edge('plan:scope', 'fetch:deps', 'sequence', 'explicit'),
        edge('fetch:deps', 'build:compile', 'sequence', 'explicit'),
        edge('build:compile', 'build:bundle', 'sequence', 'explicit'),
        edge('build:bundle', 'build:tarball', 'sequence', 'explicit'),
        edge('build:compile', 'test:unit', 'sequence', 'explicit'),
        edge('test:unit', 'test:failure', 'sequence', 'explicit'),
        edge('test:retry', 'test:pass', 'sequence', 'explicit'),
        edge('test:pass', 'ship:sign', 'sequence', 'explicit'),
        edge('ship:sign', 'ship:publish', 'sequence', 'explicit'),
        edge('ship:publish', 'ship:note', 'sequence', 'explicit'),
        edge('test:failure', 'test:retry', 'evidence', 'structural', 'evidence'),
    ];

    return { nodes, edges, root: 'release', turns: STAGES };
}

/** The host's level table: which kinds and edge kinds exist at which level, and what each may spend. */
export const LEVELS: LevelConfig<BuildLevel, BuildKind, BuildEdgeKind, BuildNode, BuildEdge> = {
    levelRank: { overview: 0, execution: 1, detail: 2 },
    kindMinLevel: {
        stage: 'overview',
        step: 'overview',
        note: 'overview',
        tool: 'execution',
        artifact: 'execution',
        failure: 'detail',
        retry: 'detail',
    },
    edgeMinLevel: { sequence: 'execution', evidence: 'detail', 'part-of': 'overview' },
    domBudget: { overview: 6, execution: 14, detail: 20 },
    isClusterExpanded: (level) => level !== 'overview',
};

/** The parent of a node: the `part-of` edge that names it. The tree hangs a node under its parent. */
function parentOf(model: BuildModel, id: string): string | undefined {
    return model.edges.find((edge) => edge.kind === 'part-of' && edge.source === id)?.target;
}

/**
 * The nodes the force layout pulls a node towards: the structure around it — what it belongs to and
 * what came before it. A link is a claim about the pipeline's shape, not about cause, so the
 * evidence edge stays out of it.
 */
function structureLinks(model: BuildModel, id: string): readonly string[] {
    return model.edges.flatMap((edge) => {
        if (edge.kind === 'evidence') return [];
        if (edge.source === id) return [edge.target];
        if (edge.target === id) return [edge.source];
        return [];
    });
}

/** The host's lane names and the box each node occupies. */
export const LAYOUT_CONFIG: LayoutConfig<BuildNode, BuildEdge, BuildLane> = {
    nodeSizeFn: (node) => node.size,
    laneList: LANES,
    laneOfFn: (node) => node.lane,
    depthMap: { stage: 0, step: 1, note: 1, tool: 1, artifact: 2, failure: 2, retry: 2 },
    turnIdFn: (node) => node.stage,
    parentOfFn: (model, node) => parentOf(model, node.id),
    forceLinksFn: (model, node) => structureLinks(model, node.id),
    geometry: { standardSize: CARD, indentStep: 120, depthLevels: 3, padding: 24 },
};

const STATUS: Record<BuildStatus, NodeStatus> = {
    queued: 'pending',
    running: 'running',
    passed: 'success',
    changed: 'success',
    failed: 'error',
    retried: 'warning',
};

/** The host's card markup. The library escapes the text that reaches it. */
export function cardMarkup(node: BuildNode): string {
    const body = node.summary ?? node.outcome;

    return (
        `<div class="card" data-kind="${node.kind}" data-status="${node.status}">` +
        `<b>${escapeHtml(node.label)}</b><span>${escapeHtml(body)}</span></div>`
    );
}

/** The host's adapter: its own kinds, statuses, chrome and edge mapping. */
export class BuildAdapter extends ModelAdapter<BuildNode, BuildEdge, BuildLevel, BuildModel> {
    nodeShape(node: BuildNode): 'panel' | 'card' | 'badge' {
        if (node.kind === 'stage') return 'panel';
        if (node.kind === 'failure' || node.kind === 'retry') return 'badge';
        return 'card';
    }

    nodeStatus(node: BuildNode): NodeStatus {
        return STATUS[node.status];
    }

    isStructuralKind(kind: BuildKind): boolean {
        return kind === 'stage';
    }

    nodeData(node: BuildNode, _level: BuildLevel, _dimmed: boolean): Record<string, unknown> {
        return { stage: node.stage ?? '', outcome: node.outcome };
    }

    toRenderEdge(edge: BuildEdge, _level: BuildLevel): RenderEdge {
        return {
            id: edge.id,
            source: edge.source,
            target: edge.target,
            kind: edge.kind,
            label: edge.label,
            confidence: edge.confidence,
            directed: true,
        };
    }
}

/** The adapter configuration: the host's level rules, its budget, its neighbours and its chrome. */
export function adapterConfig(placed: () => ReadonlySet<string>) {
    return {
        nodeFilter: (model: BuildModel, level: BuildLevel) =>
            Levels.nodesAtLevel(model, level, LEVELS).filter((node) => placed().has(node.id)),
        edgeFilter: (model: BuildModel, level: BuildLevel, focus: string | undefined) =>
            Levels.edgesAtLevel(model, level, focus, LEVELS).filter(
                (edge) => placed().has(edge.source) && placed().has(edge.target),
            ),
        cardBudget: (level: BuildLevel) => Levels.domBudget(level, LEVELS),
        neighbors: (model: BuildModel, id: string) =>
            model.edges.flatMap((edge) =>
                edge.source === id ? [edge.target] : edge.target === id ? [edge.source] : [],
            ),
        renderCardTemplate: cardMarkup,
        isClusterExpanded: (level: BuildLevel) => LEVELS.isClusterExpanded(level),
        nodeSizeFn: (node: BuildNode) => node.size,
        geometry: {
            panelSize: [200, 64, 0] as [number, number, number],
            chipSize: [200, 44, 0] as [number, number, number],
            laneLabelSize: [120, 24, 0] as [number, number, number],
            axisLabelSize: [120, 24, 0] as [number, number, number],
        },
    };
}

/** The host's own searchable fields: a label, a summary, a lane and an outcome. */
export function searchableFields(node: BuildNode): readonly string[] {
    return [node.label, node.summary ?? '', node.lane, node.outcome];
}
