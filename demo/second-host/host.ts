// The second host's state: its model, its adapter, its controller, and the view it is currently
// showing. The page owns the DOM and the renderer; this owns everything else, so a test can drive
// the same host the page drives.

import type { AdapterAxisLabel, AdapterLaneLabel } from '@spacegraphjs/adapter';
import type { RenderModel, RenderTheme } from '@spacegraphjs/renderer';
import { GraphController } from 'spacegraphjs/control';
import type { DepthMode } from 'spacegraphjs/depth';
import { Strategies, type GraphLayout } from 'spacegraphjs/layout';
import { extractSubgraph, type CodeDiff, type ScopedSubgraph } from 'spacegraphjs/overlays';
import { Representations } from 'spacegraphjs/representations';
import type { CapabilityContext, HostView, MirrorState } from './gallery';
import {
    adapterConfig,
    BANDS,
    BuildAdapter,
    buildModel,
    LAYOUT_CONFIG,
    OUTCOME_COLUMNS,
    OUTCOME_INDEX,
    STAGE_LABELS,
    type BuildEdge,
    type BuildLevel,
    type BuildModel,
    type BuildNode,
} from './model';

function summaryConfig() {
    return {
        nodeSizeFn: (node: BuildNode) => node.size,
        cellSize: [200, 64] as const,
        rowKeyFn: (node: BuildNode) => node.stage,
        rowOrderFn: (nodes: readonly BuildNode[]) => [...nodes],
        columnKeyFn: (node: BuildNode) => OUTCOME_INDEX[node.outcome],
        levelFilter: (node: BuildNode) => node.kind !== 'stage',
    };
}

/** The changed files of the last finished stage, as a host would report them. */
function stageDiffs(): readonly CodeDiff[] {
    return [
        {
            file: 'src/billing/totals.ts',
            patch: [
                '--- a/src/billing/totals.ts',
                '+++ b/src/billing/totals.ts',
                '@@ -18,7 +18,11 @@ export function sum(lines: Line[]): number {',
                '   let total = 0',
                '-  for (const line of lines) total += line.amount',
                '+  for (const line of lines) {',
                '+    const cents = Math.round(line.amount * 100)',
                '+    total += cents / 100',
                '+  }',
                '   return total',
            ].join('\n'),
            additions: 4,
            deletions: 1,
            status: 'modified',
        },
        {
            file: 'src/billing/totals.test.ts',
            patch: [
                '--- a/src/billing/totals.test.ts',
                '+++ b/src/billing/totals.test.ts',
                '@@ -4,3 +4,4 @@',
                " it('sums the lines', () => {",
                '-  expect(sum(lines)).toEqual(12)',
                '+  expect(sum(lines)).toEqual(12.5)',
            ].join('\n'),
            additions: 1,
            deletions: 1,
            status: 'modified',
        },
    ];
}

export class SecondHost {
    readonly model: BuildModel = buildModel();
    readonly adapter = new BuildAdapter(adapterConfig(() => this.placed()));
    readonly controller = new GraphController({
        bands: { bands: [...BANDS], hysteresis: 0.02 },
        trailMaxDepth: 8,
    });

    // The pipeline is wide: four stages of cards side by side do not fit a legible frame, so the
    // host's default view is the summary and the lane view is a panned detail (the same trade the
    // OpenCode host made when the fit gained a floor).
    view: HostView = 'ribbon';
    level: BuildLevel = 'execution';
    depth: DepthMode = 'flat';

    /** The scope the pipeline draws; undefined means "whatever the current view places". */
    #scope: ReadonlySet<string> | undefined;

    constructor() {
        this.controller.setModel({
            nodes: this.model.nodes.map((node) => ({
                id: node.id,
                label: node.label,
                kind: node.kind,
                summary: node.summary,
                status: node.status,
            })),
            edges: this.model.edges.map((edge) => ({
                id: edge.id,
                source: edge.source,
                target: edge.target,
                kind: edge.kind,
                label: edge.label,
                confidence: edge.confidence,
            })),
        });
    }

    /** The layout of the current view, produced by the library's strategies or representations. */
    layout(): GraphLayout {
        if (this.view === 'ribbon') {
            return Representations.ribbonLayout(this.summaryModel(), summaryConfig());
        }
        if (this.view === 'matrix') {
            return Representations.matrixLayout(this.summaryModel(), summaryConfig());
        }

        return Strategies.layoutGraph(
            {
                nodes: this.model.nodes,
                edges: this.model.edges,
                root: this.model.root,
                turns: this.model.turns,
            },
            LAYOUT_CONFIG,
            { strategy: this.view },
        );
    }

    /** The lane captions, anchored to the lane each node sits in. */
    laneLabels(layout: GraphLayout): AdapterLaneLabel[] {
        if (this.view === 'ribbon' || this.view === 'matrix') return [];

        const top = new Map<string, number>();

        for (const node of this.model.nodes) {
            const position = layout.positions.get(node.id);
            if (!position) continue;
            const current = top.get(node.lane);
            if (current === undefined || position.y < current) top.set(node.lane, position.y);
        }

        return [...top.entries()].map(([lane, y]) => ({ id: lane, label: lane, y }));
    }

    /** The ids the current view places. A node the view does not draw is not in the model. */
    placed(): ReadonlySet<string> {
        return this.#scope ?? new Set(this.layout().positions.keys());
    }

    /** The captions of a summary: a row per stage in the ribbon, a column per outcome in the matrix. */
    axisLabels(layout: GraphLayout): AdapterAxisLabel[] {
        if (this.view === 'ribbon') return this.rowLabels(layout);
        if (this.view === 'matrix') return this.columnLabels(layout);
        return [];
    }

    rowLabels(layout: GraphLayout): AdapterAxisLabel[] {
        const rows = new Map<string, number>();

        for (const node of this.model.nodes) {
            if (!node.stage) continue;
            const position = layout.positions.get(node.id);
            if (!position) continue;
            const current = rows.get(node.stage);
            if (current === undefined || position.x < current) rows.set(node.stage, position.x);
        }

        return [...rows.entries()].map(([stage, x]) => ({
            id: `row:${stage}`,
            label: STAGE_LABELS[stage] ?? stage,
            x: x - 180,
            y: this.rowY(layout, stage),
            role: 'row' as const,
        }));
    }

    columnLabels(layout: GraphLayout): AdapterAxisLabel[] {
        const columns = new Map<number, { min: number; max: number; top: number }>();

        for (const node of this.model.nodes) {
            const position = layout.positions.get(node.id);
            if (!position) continue;
            const column = OUTCOME_INDEX[node.outcome];
            const current = columns.get(column);
            if (!current) columns.set(column, { min: position.x, max: position.x, top: position.y });
            else {
                current.min = Math.min(current.min, position.x);
                current.max = Math.max(current.max, position.x);
                current.top = Math.min(current.top, position.y);
            }
        }

        return [...columns.entries()].map(([column, span]) => ({
            id: `column:${column}`,
            label: OUTCOME_COLUMNS[column] ?? String(column),
            x: (span.min + span.max) / 2,
            y: span.top - 60,
            role: 'column' as const,
        }));
    }

    rowY(layout: GraphLayout, stage: string): number {
        for (const node of this.model.nodes) {
            if (node.stage !== stage) continue;
            const position = layout.positions.get(node.id);
            if (position) return position.y;
        }

        return 0;
    }

    renderModel(): RenderModel {
        const layout = this.layout();

        return this.adapter.build(this.model, {
            level: this.level,
            positions: layout.positions,
            focus: this.controller.selection[0],
            bands: this.view !== 'ribbon' && this.view !== 'matrix',
            edges: true,
            laneLabels: this.laneLabels(layout),
            axisLabels: this.axisLabels(layout),
        });
    }

    select(ids: readonly string[]) {
        this.controller.select(ids);
    }

    /** The render model of another model, for a host that wants to draw something else. */
    renderModelOf(model: BuildModel): RenderModel {
        const previous = this.#scope;
        this.#scope = new Set(model.nodes.map((node) => node.id));

        try {
            return this.adapter.build(model, { level: this.level, positions: new Map(), edges: true });
        } finally {
            this.#scope = previous;
        }
    }

    /** The scope around one node: the node, its children, and the edges between them. */
    scope(nodeID: string): ScopedSubgraph<BuildNode, BuildEdge> {
        return extractSubgraph(this.model, nodeID, { childEdgeKind: 'part-of' });
    }

    mirrorState(): MirrorState {
        const nodes = this.model.nodes.map((node) => ({ id: node.id, label: node.label }));
        const edges = this.model.edges.map((edge) => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
        }));
        const selected = this.controller.selectedNode;
        const connections = selected ? this.controller.connections(selected.id) : [];

        return {
            nodes,
            edges,
            announcement: selected
                ? `${selected.label} · ${connections.length} connection${connections.length === 1 ? '' : 's'}`
                : 'Nothing selected',
        };
    }

    diffs(): readonly CodeDiff[] {
        return stageDiffs();
    }

    summaryModel() {
        return { nodes: this.model.nodes, rows: this.model.turns };
    }

    context(theme: RenderTheme, extra: Partial<CapabilityContext> = {}): CapabilityContext {
        return {
            model: this.model,
            adapter: this.adapter,
            controller: this.controller,
            theme,
            level: this.level,
            view: this.view,
            depth: this.depth,
            selection: this.controller.selection,
            layout: () => this.layout(),
            renderModel: () => this.renderModel(),
            mirror: () => this.mirrorState(),
            diffs: () => this.diffs(),
            ...extra,
        };
    }
}
