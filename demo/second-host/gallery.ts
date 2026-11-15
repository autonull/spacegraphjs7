// The capability gallery: one entry per library surface the second host uses.
//
// Every entry *runs* its module against the host's model and reports what it produced. A gallery
// entry that only claimed to work would be a caption; these are measurements, and the unit test
// runs every one of them against the real model.

import {
    ContrastAuditor,
    type RendererCapabilities,
    type RenderModel,
    type RenderTheme,
} from '@spacegraphjs/renderer';
import type { GraphController } from 'spacegraphjs/control';
import { depthTreatment, type DepthMode } from 'spacegraphjs/depth';
import { type GraphLayout } from 'spacegraphjs/layout';
import { Levels } from 'spacegraphjs/levels';
import { Navigation } from 'spacegraphjs/navigation';
import { extractSubgraph, parsePatch, type CodeDiff, computeFocusOverlay, getFocusOpacity, isDimmed, FOCUS_OPACITY_STOPS, collapseGroups } from '@spacegraphjs/kernel';
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
    type HostView,
} from './model';
import {
    type TraceConfig,
    type TraceKind,
    type TraceModel,
    type TraceNode,
    type TraceEdge,
    classifyTrace,
    traceWhy,
    traceLedHere,
    traceRelated,
    traceDownstream,
    litNodeIds,
    isLit,
    isAnswer,
    isEdgeVisible,
    isAnswerEdge,
    stepLitNode,
} from '@spacegraphjs/trace';
import { SessionKernel, Kernel, GraphHistory, createGraphHistory, type GraphSnapshot, type KernelOp } from '@spacegraphjs/kernel';

const addNode = (id: string, kind = 'node', label = id): KernelOp => ({
    op: 'add-node',
    node: { id, kind, label },
});

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
    /** The layout of another view, over the same model. */
    layoutOf(view: HostView): GraphLayout;
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

/** The size of a layout's content, in the units the renderer draws. */
function extent(layout: GraphLayout): string {
    const width = layout.bounds.max.x - layout.bounds.min.x;
    const height = layout.bounds.max.y - layout.bounds.min.y;

    return `${Math.round(width)} × ${Math.round(height)}`;
}

export const CAPABILITIES: readonly Capability[] = [
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
                `${context.rendererName}`,
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

            return [
                `${layout.strategy} · ${layout.positions.size} nodes placed`,
                `bounds ${extent(layout)}`,
                `lanes: ${LAYOUT_CONFIG.laneList.join(', ')}`,
            ];
        },
    },
    {
        id: 'placements',
        title: 'The placement engines',
        modules: ['spacegraphjs/layout'],
        summary: 'A tree and a force simulation place the same boxes in two different shapes.',
        view: 'tree',
        run: (context) => {
            const tree = context.layoutOf('tree');
            const force = context.layoutOf('force');

            return [
                `tree · ${tree.positions.size} boxes placed · bounds ${extent(tree)}`,
                `force · ${force.positions.size} boxes placed · bounds ${extent(force)}`,
                `the same ${tree.positions.size} boxes, two shapes`,
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
        summary:
            'The host owns the fields and the dots; the library owns the matching and the geometry.',
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
    {
        id: 'trace',
        title: 'Trace classification',
        modules: ['@spacegraphjs/trace'],
        summary: 'Classify why/led-here/related/downstream overlays over a cause graph.',
        run: (context) => {
            const model = context.model as unknown as TraceModel;
            const traversal = {
                incoming: (m: TraceModel, id: string) => m.edges.filter((e) => e.target === id),
                outgoing: (m: TraceModel, id: string) => m.edges.filter((e) => e.source === id),
                ancestors: (m: TraceModel, id: string) => {
                    const result: TraceNode[] = [];
                    const parents = new Map<string, string>();
                    for (const edge of m.edges) if (edge.kind === 'part-of') parents.set(edge.source, edge.target);
                    const nodes = new Map(m.nodes.map((n) => [n.id, n]));
                    let current = id;
                    for (;;) {
                        const parent = parents.get(current);
                        if (!parent) break;
                        const node = nodes.get(parent);
                        if (!node) break;
                        result.push(node);
                        current = parent;
                    }
                    return result;
                },
                forwardChain: (m: TraceModel, id: string) => {
                    const result: TraceNode[] = [];
                    const next = new Map<string, string>();
                    for (const edge of m.edges) if (edge.kind === 'sequence') next.set(edge.source, edge.target);
                    const nodes = new Map(m.nodes.map((n) => [n.id, n]));
                    let current = id;
                    for (;;) {
                        const n = next.get(current);
                        if (!n) break;
                        const node = nodes.get(n);
                        if (!node) break;
                        result.push(node);
                        current = n;
                    }
                    return result;
                },
                downstreamChain: (m: TraceModel, id: string) => {
                    const result: { node: TraceNode; edge: TraceEdge; confidence: string }[] = [];
                    const seen = new Set([id]);
                    const nodes = new Map(m.nodes.map((n) => [n.id, n]));
                    const queue = [id];
                    for (let index = 0; index < queue.length; index++) {
                        const current = queue[index];
                        for (const edge of m.edges) {
                            if (edge.source !== current) continue;
                            if (!['sequence', 'produces', 'writes'].includes(edge.kind)) continue;
                            if (seen.has(edge.target)) continue;
                            const node = nodes.get(edge.target);
                            if (!node) continue;
                            seen.add(edge.target);
                            queue.push(edge.target);
                            result.push({ node, edge, confidence: edge.confidence ?? 'explicit' });
                        }
                    }
                    return result;
                },
                nodeIndex: (m: TraceModel) => new Map(m.nodes.map((n) => [n.id, n])),
                parentIndex: (m: TraceModel) => {
                    const map = new Map<string, string>();
                    for (const edge of m.edges) if (edge.kind === 'part-of') map.set(edge.source, edge.target);
                    return map;
                },
                childIndex: (m: TraceModel) => {
                    const map = new Map<string, string[]>();
                    for (const edge of m.edges) {
                        if (edge.kind === 'part-of') {
                            const arr = map.get(edge.target) ?? [];
                            arr.push(edge.source);
                            map.set(edge.target, arr);
                        }
                    }
                    return map;
                },
                sequenceIndex: (m: TraceModel) => {
                    const next = new Map<string, string>();
                    const previous = new Map<string, string>();
                    for (const edge of m.edges) {
                        if (edge.kind === 'sequence') {
                            next.set(edge.source, edge.target);
                            previous.set(edge.target, edge.source);
                        }
                    }
                    return { next, previous };
                },
            };
            const vocabulary = {
                provenanceEdgeKinds: new Set(['reads', 'writes', 'produces', 'evidence']),
                readEdgeKinds: new Set(['reads', 'searches', 'references']),
                downstreamEdgeKinds: new Set(['sequence', 'produces', 'writes']),
            };
            const config: TraceConfig = { model, traversal, vocabulary };

            const why = traceWhy(config, 'file:a.ts');
            const led = traceLedHere(config, 'tool:1');
            const related = traceRelated(config, 'tool:2');
            const downstream = traceDownstream(config, 'tool:1');

            return [
                `why(file:a.ts) → ${why.answerIds.size} answers, ${why.contextIds.size} context`,
                `led-here(tool:1) → ${led.answerIds.size} answers`,
                `related(tool:2) → ${related.answerIds.size} answers`,
                `downstream(tool:1) → ${downstream.answerIds.size} answers`,
                `lit nodes: ${litNodeIds(why).size}`,
                `isLit: ${isLit(why, 'tool:1')}`,
                `isAnswer: ${isAnswer(why, 'tool:1')}`,
                `step: ${stepLitNode(why, undefined, 1)}`,
            ];
        },
    },
    {
        id: 'time-travel',
        title: 'Time-travel history',
        modules: ['@spacegraphjs/kernel'],
        summary: 'Capture, checkout, fork, and bounded snapshots over a SessionKernel.',
        run: (context) => {
            // Build a session kernel with some history
            let session = new SessionKernel();
            for (let i = 0; i < 5; i++) {
                session = session.append({ id: `e${i}`, op: addNode(`n${i}`, 'step', `Step ${i}`) });
            }

            const history = createGraphHistory(session, 3, (v) => `v${v}`);

            // Capture at versions 1, 3, 5
            session = session.checkpoint().state.version === 5 ? session : session; // already at 5
            const snap1 = history.captureAt(1);
            const snap3 = history.captureAt(3);
            const snap5 = history.captureAt(5);

            // Checkout version 2
            const checkedOut = history.checkout(2);
            // Fork from version 2
            const forked = history.fork(2);
            const diverged = forked.append({ id: 'e-fork', op: addNode('n-fork', 'fork', 'Forked Step') });

            // Test getSnapshotAtOrBefore (fallback)
            const fallback = history.getSnapshotAtOrBefore(4);

            return [
                `captured: ${history.size} snapshots (limit 3)`,
                `snapshots: ${history.all.map((s) => `${s.version}(${s.label})`).join(', ')}`,
                `checkout(2): ${checkedOut.version} nodes=${checkedOut.state().nodes.length}`,
                `fork(2) + append: ${diverged.version} nodes=${diverged.state().nodes.length}`,
                `fallback at 4: ${fallback?.version ?? 'none'}`,
                `latest: ${history.latest?.version ?? 'none'}`,
            ];
        },
    },
    {
        id: 'focus',
        title: 'Focus overlay',
        modules: ['@spacegraphjs/overlays'],
        summary: 'BFS distance overlay for neighborhood highlighting.',
        run: (context) => {
            // Build a simple model for focus testing
            const model = context.model;
            const selection = context.selection;

            // Test with selection
            const overlay = computeFocusOverlay({
                model,
                selection,
                maxDistance: 3,
            });

            // Test opacity stops
            const opacities = [0, 1, 2, 3, 4].map((d) => getFocusOpacity(d));
            const dimmed = [0, 1, 2, 3, 4].map((d) => isDimmed(d, 3));

            return [
                `focus nodes: ${overlay.size}`,
                `distances: ${Array.from(overlay.entries()).map(([k, v]) => `${k}=${v}`).join(', ')}`,
                `opacities: ${opacities.join(', ')}`,
                `dimmed: ${dimmed.join(', ')}`,
                `stops: ${FOCUS_OPACITY_STOPS.join(', ')}`,
            ];
        },
    },
    {
        id: 'collapse',
        title: 'Group collapse',
        modules: ['@spacegraphjs/kernel'],
        summary: 'Collapse group members and their incident edges.',
        run: (context) => {
            // Build a model with groups
            const model = context.model;

            // Find group nodes
            const groups = model.nodes.filter((n) => n.clusterOf && n.clusterOf.length > 0);

            if (groups.length === 0) {
                return ['no groups in model'];
            }

            const groupId = groups[0]!.id;
            const collapsed = new Set([groupId]);
            const result = collapseGroups(model, collapsed);

            const hiddenMembers = groups[0]!.clusterOf?.filter((m) => !result.nodes.some((n) => n.id === m)) ?? [];
            const hiddenEdges = model.edges.filter((e) =>
                collapsed.has(e.source) || collapsed.has(e.target) ||
                hiddenMembers.includes(e.source) || hiddenMembers.includes(e.target)
            ).length;

            return [
                `original nodes: ${model.nodes.length}, edges: ${model.edges.length}`,
                `collapsed group: ${groupId} (${groups[0]!.clusterOf?.length ?? 0} members)`,
                `result nodes: ${result.nodes.length}, edges: ${result.edges.length}`,
                `hidden members: ${hiddenMembers.length}`,
                `hidden edges: ${hiddenEdges}`,
            ];
        },
    },
];

/** Every library surface the gallery exercises. A new module needs an entry. */
export const GALLERY_MODULES: readonly string[] = [
    ...new Set(CAPABILITIES.flatMap((capability) => capability.modules)),
];
