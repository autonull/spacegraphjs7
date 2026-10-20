// The capability gallery: one entry per library surface the second host uses.
//
// Every entry *runs* its module against the host's model and reports what it produced. A gallery
// entry that only claimed to work would be a caption; these are measurements, and the unit test
// runs every one of them against the real model.

import {
    ContrastAuditor,
    negotiateContract,
    type RendererCapabilities,
    type RenderModel,
    type RenderTheme,
} from '@spacegraphjs/renderer';
import type { GraphController } from 'spacegraphjs/control';
import { depthTreatment, type DepthMode } from 'spacegraphjs/depth';
import { Strategies, type GraphLayout } from 'spacegraphjs/layout';
import { Levels } from 'spacegraphjs/levels';
import { Navigation } from 'spacegraphjs/navigation';
import { extractSubgraph, parsePatch, type CodeDiff } from 'spacegraphjs/overlays';
import { Representations } from 'spacegraphjs/representations';
import { ZoomBands } from 'spacegraphjs/zoom';
import {
    BANDS,
    LAYOUT_CONFIG,
    LEVELS,
    OUTCOME_COLUMNS,
    OUTCOME_INDEX,
    searchableFields,
    type BuildAdapter,
    type BuildLevel,
    type BuildModel,
    type BuildNode,
} from './model';

export type HostView = 'lanes' | 'timeline' | 'hierarchy' | 'ribbon' | 'matrix';

export interface MirrorState {
    /** The nodes the accessibility mirror lists. */
    nodes: readonly { id: string; label: string }[];
    /** The edges the accessibility mirror lists. */
    edges: readonly { id: string; source: string; target: string }[];
    /** The announcement the mirror makes for the current selection. */
    announcement: string;
}

/** What a capability is allowed to read. The gallery never touches the DOM. */
export interface CapabilityContext {
    readonly model: BuildModel;
    readonly adapter: BuildAdapter;
    readonly controller: GraphController;
    readonly theme: RenderTheme;
    readonly level: BuildLevel;
    readonly view: HostView;
    readonly depth: DepthMode;
    readonly selection: readonly string[];
    /** The name of the mounted renderer, or undefined when none is mounted. */
    readonly rendererName?: string;
    /** The renderer's capabilities, when one is mounted. */
    readonly capabilities?: RendererCapabilities;
    /** The layout of the current view. */
    layout(): GraphLayout;
    /** The render model of the current view. */
    renderModel(): RenderModel;
    /** The accessibility mirror's state. */
    mirror(): MirrorState;
    /** The changed files of the last finished stage. */
    diffs(): readonly CodeDiff[];
}

export interface Capability {
    id: string;
    title: string;
    /** The library surfaces this entry exercises. */
    modules: readonly string[];
    summary: string;
    /** The view the canvas shows when this entry runs, when it changes the canvas. */
    view?: HostView;
    /** The level the canvas draws when this entry runs. */
    level?: BuildLevel;
    /** The depth treatment the canvas applies when this entry runs. */
    depth?: DepthMode;
    /** The node the scoped overlay opens around. */
    overlay?: string;
    /** Whether the diff panel opens when this entry runs. */
    diff?: boolean;
    /** The evidence this entry produced. */
    run: (context: CapabilityContext) => readonly string[];
}

const SEARCH_QUERY = 'vitest';
const SCOPE_ROOT = 'stage:verify';

function round(value: number): number {
    return Math.round(value * 100) / 100;
}

function summaryConfig() {
    return {
        nodeSizeFn: (node: BuildNode) => node.size,
        cellSize: [200, 64] as const,
        rowKeyFn: (node: BuildNode) => node.stage,
        rowOrderFn: (nodes: readonly BuildNode[]) => [...nodes],
        columnKeyFn: (node: BuildNode) => OUTCOME_INDEX[node.outcome],
        levelFilter: (node: BuildNode) => node.kind !== 'stage',
        categoryMap: OUTCOME_COLUMNS,
    };
}

export const CAPABILITIES: readonly Capability[] = [
    {
        id: 'contract',
        title: 'The renderer contract',
        modules: ['@spacegraphjs/renderer'],
        summary: 'One model, one negotiated contract, three renderers.',
        run: (context) => {
            const negotiation = negotiateContract(2);

            return [
                `contract v2 · negotiation ${negotiation.ok ? 'accepted' : 'refused'}`,
                `model: ${context.model.nodes.length} nodes, ${context.model.edges.length} edges`,
                `renderer: ${context.rendererName ?? 'none mounted'} · ${
                    context.capabilities?.projections.join(' + ') ?? 'no projection'
                }`,
            ];
        },
    },
    {
        id: 'theme',
        title: 'Theme and contrast',
        modules: ['@spacegraphjs/renderer'],
        summary: 'The host maps its tokens; the contract audits the result against WCAG.',
        run: (context) => {
            const report = new ContrastAuditor().audit(context.theme);

            return [
                `text ${round(report.ratios.text ?? 0)}:1 · muted text ${round(report.ratios.textMuted ?? 0)}:1 · target 4.5`,
                report.passed
                    ? 'every role clears its target'
                    : `failing: ${report.failures
                          .map((failure) => `${failure.role} ${round(failure.ratio ?? 0)}:1`)
                          .join(', ')}`,
            ];
        },
    },
    {
        id: 'renderers',
        title: 'The three renderers',
        modules: [
            '@spacegraphjs/spacegraph-renderer',
            '@spacegraphjs/cytoscape-renderer',
            '@spacegraphjs/svg-renderer',
        ],
        summary: 'The same RenderModel, drawn by WebGL, by Canvas, and as static SVG.',
        run: (context) => {
            const capabilities = context.capabilities;

            if (!capabilities) return ['no renderer is mounted'];

            return [
                `${context.rendererName} · contract v${capabilities.contractVersion}`,
                `DOM cards: ${capabilities.domNodes ? `yes, up to ${capabilities.maxDomNodes}` : 'no'}`,
                `projections: ${capabilities.projections.join(', ')}`,
            ];
        },
    },
    {
        id: 'adapter',
        title: 'The model adapter',
        modules: ['@spacegraphjs/adapter'],
        summary: 'The host model becomes the renderer model through one pipeline.',
        run: (context) => {
            const model = context.renderModel();
            const cards = model.nodes.filter((node) => node.html && node.kind !== 'lane').length;
            const chrome = model.nodes.filter((node) => node.kind === 'stage').length;
            const captions = model.nodes.filter((node) => node.kind === 'lane').length;

            return [
                `${model.nodes.length} nodes mapped · ${cards} cards drawn (budget ${Levels.domBudget(
                    context.level,
                    LEVELS,
                )})`,
                `${model.edges.length} edges emitted · ${chrome} chrome nodes, ${captions} gutter captions`,
            ];
        },
    },
    {
        id: 'levels',
        title: 'Semantic levels',
        modules: ['spacegraphjs/levels'],
        summary: 'The host decides what exists at each level; the library filters and budgets.',
        level: 'execution',
        run: (context) =>
            (['overview', 'execution', 'detail'] as const).map((level) => {
                const nodes = Levels.nodesAtLevel(context.model, level, LEVELS);
                const edges = Levels.edgesAtLevel(context.model, level, undefined, LEVELS);

                return `${level} · ${nodes.length} nodes · ${edges.length} edges · budget ${Levels.domBudget(
                    level,
                    LEVELS,
                )}`;
            }),
    },
    {
        id: 'layout',
        title: 'Layout strategies',
        modules: ['spacegraphjs/layout'],
        summary: 'Lanes, a timeline and a hierarchy, all from one configuration.',
        view: 'lanes',
        run: (context) => {
            const layout = context.layout();
            const width = layout.bounds.max.x - layout.bounds.min.x;
            const height = layout.bounds.max.y - layout.bounds.min.y;

            return [
                `${layout.strategy} · ${layout.positions.size} nodes placed`,
                `bounds ${Math.round(width)} × ${Math.round(height)}`,
                `lanes: ${LAYOUT_CONFIG.laneList.join(', ')}`,
            ];
        },
    },
    {
        id: 'representations',
        title: 'Summary representations',
        modules: ['spacegraphjs/representations'],
        summary: 'A ribbon of the stages and a matrix of the outcomes.',
        view: 'ribbon',
        run: (context) => {
            const config = summaryConfig();
            const model = { nodes: context.model.nodes, rows: context.model.turns };
            const rows = Representations.summaryRows(model, config);
            const ribbon = Representations.ribbonLayout(model, config);
            const matrix = Representations.matrixLayout(model, config);
            const columns = Representations.summaryColumns(config);

            return [
                `ribbon · ${rows.length} rows (${rows.map((row) => row.length).join(' + ')}) · ${
                    ribbon.positions.size
                } placed`,
                `matrix · ${columns.length} columns: ${columns
                    .map((column) => column.label)
                    .join(', ')} · ${matrix.positions.size} placed`,
            ];
        },
    },
    {
        id: 'navigation',
        title: 'Search, minimap and trail',
        modules: ['spacegraphjs/navigation'],
        summary: 'The host owns the fields and the dots; the library owns the matching and the geometry.',
        run: (context) => {
            const hits = Navigation.search(context.model, SEARCH_QUERY, searchableFields);
            const projection = Navigation.project({
                positions: context.layout().positions,
                box: { width: 220, height: 140 },
                padding: 8,
            });

            return [
                `search "${SEARCH_QUERY}" → ${hits.length} nodes (${hits.map((hit) => hit.id).join(', ')})`,
                `minimap scale ${round(projection.scale)} · content ${Math.round(
                    projection.bounds.maxX - projection.bounds.minX,
                )} × ${Math.round(projection.bounds.maxY - projection.bounds.minY)}`,
                `trail: ${context.controller.trail.entries.length} entries`,
            ];
        },
    },
    {
        id: 'bands',
        title: 'Zoom bands and the controller',
        modules: ['spacegraphjs/control', 'spacegraphjs/zoom'],
        summary: 'One state machine owns the selection, the trail and the band.',
        run: (context) => {
            const snapshot = context.controller.bands.snapshot();
            const definition = new ZoomBands({ bands: [...BANDS] });

            return [
                `band: ${snapshot.label ?? snapshot.band} · zoom ${round(snapshot.normalized * 100)}%`,
                `bands: ${definition.bands
                    .map((band) => `${band.label ?? band.id} ${band.min}–${band.max}`)
                    .join(', ')}`,
                `selection: ${context.selection.length ? context.selection.join(', ') : 'none'}`,
                `trail: ${context.controller.trail.toLabels().join(' → ') || 'empty'}`,
            ];
        },
    },
    {
        id: 'a11y',
        title: 'The accessibility mirror',
        modules: ['spacegraphjs/a11y'],
        summary: 'Every node and every connection, reachable without the canvas.',
        run: (context) => {
            const mirror = context.mirror();

            return [
                `${mirror.nodes.length} nodes and ${mirror.edges.length} edges listed`,
                `announcement: "${mirror.announcement}"`,
            ];
        },
    },
    {
        id: 'depth',
        title: 'The depth spectrum',
        modules: ['spacegraphjs/depth'],
        summary: 'Depth is a spectrum, not a two-dimensional switch.',
        depth: 'layered',
        run: (context) => {
            const treatment = depthTreatment(context.depth);

            return [
                `${context.depth} · ${treatment.projection} · phi ${round(treatment.phi)}`,
                `fade ${treatment.fade} · orbit ${treatment.orbit ? 'on' : 'off'}`,
            ];
        },
    },
    {
        id: 'overlay',
        title: 'The scoped overlay',
        modules: ['spacegraphjs/overlays'],
        summary: 'A neighbourhood around one node, and nothing else.',
        overlay: SCOPE_ROOT,
        run: (context) => {
            const scope = extractSubgraph(context.model, SCOPE_ROOT, { childEdgeKind: 'part-of' });

            return [
                `scope around "${scope.root?.label ?? SCOPE_ROOT}": ${scope.nodes.length} nodes, ${
                    scope.edges.length
                } edges`,
                `members: ${scope.nodes.map((node) => node.id).join(', ')}`,
            ];
        },
    },
    {
        id: 'diff',
        title: 'The code diff',
        modules: ['spacegraphjs/overlays'],
        summary: 'A unified patch as selectable text, never as markup.',
        diff: true,
        run: (context) => {
            const diffs = context.diffs();
            const lines = diffs.flatMap((diff) => parsePatch(diff.patch));
            const added = lines.filter((line) => line.tone === 'added').length;
            const removed = lines.filter((line) => line.tone === 'removed').length;

            return [
                `${diffs.length} files · ${added} added lines, ${removed} removed lines`,
                ...diffs.map((diff) => `${diff.file} (+${diff.additions} −${diff.deletions})`),
            ];
        },
    },
];

/** Every library surface the gallery exercises. A new module needs an entry. */
export const GALLERY_MODULES: readonly string[] = [
    ...new Set(CAPABILITIES.flatMap((capability) => capability.modules)),
];
