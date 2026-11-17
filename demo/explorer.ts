// P0.3 runtime explorer. One page lists every discoverable axis, switches values without a rebuild,
// encodes the full state in the URL hash, and renders the same state against two OpenCode-free
// hosts: the renderer contract fixture and the framework-free second host. The representation
// ladder (P1.2) supplies the visible LOD swap.

import {
    applyPreset,
    axisDiff,
    ConfigState,
    EXAMPLE_PRESETS,
    manifestSpace,
    negotiate,
    randomize,
    resetToBaseline,
    type ConfigValue,
} from '@spacegraphjs/config';
import { libraryManifest } from '@spacegraphjs/config/library';
import type { RenderModel, RenderNode } from '@spacegraphjs/renderer';
import { InlineGraph } from '@spacegraphjs/svg-renderer';
import { DEFAULT_EDGE_STYLES, EDGE_RUNG_IDS, EdgeLadder } from 'spacegraphjs/edges/ladder';
import {
    DEFAULT_RUNG_IDS,
    ladderFromStops,
    type LadderContext,
    type LadderNode,
} from 'spacegraphjs/representations';
import { ScaleDomain } from 'spacegraphjs/zoom';
import { activityHostFixture } from './activity-host';
import { SecondHost } from './second-host/host';
import { HOST_VIEWS, LEVELS, type BuildLevel, type HostView } from './second-host/model';

type Appearance = Pick<RenderNode, 'shape' | 'size'>;

interface ExplorerApi {
    axes: () => readonly string[];
    config: () => Readonly<Record<string, ConfigValue>>;
    effective: () => Readonly<Record<string, ConfigValue>>;
    set: (axis: string, value: string) => ConfigValue | undefined;
    randomize: () => void;
    reset: () => void;
    compare: (enabled: boolean) => void;
    presets: () => readonly string[];
    applyPreset: (id: string) => boolean;
    hash: () => string;
    source: () => ConfigValue | undefined;
    nodes: () => readonly number[];
    diff: () => readonly { axis: string; left: ConfigValue | undefined; right: ConfigValue | undefined }[];
}

declare global {
    interface Window {
        __explorer?: ExplorerApi;
        __ready?: boolean;
    }
}

const library = libraryManifest();
const levelNames = Object.keys(LEVELS.levelRank) as BuildLevel[];
const space = manifestSpace({
    contractVersion: library.contractVersion,
    entries: [
        ...library.entries,
        {
            id: 'source',
            values: ['contract', 'secondHost'],
            source: 'explorer/graph sources',
            default: 'contract',
        },
        { id: 'view', values: [...HOST_VIEWS], source: 'second-host/HOST_VIEWS', default: 'ribbon' },
        { id: 'level', values: levelNames, source: 'second-host/LEVELS', default: 'execution' },
    ],
});

const capabilities = new Set<string>();
const flags = new Set<string>();
const APPEARANCE: Readonly<Record<string, Appearance>> = {
    dot: { shape: 'dot', size: [18, 18, 0] },
    glyph: { shape: 'badge', size: [96, 24, 0] },
    card: { shape: 'card', size: [180, 64, 0] },
    widget: { shape: 'card', size: [220, 96, 0] },
    detail: { shape: 'panel', size: [260, 140, 0] },
};
const STOPS = DEFAULT_RUNG_IDS.map((id, index) => ({
    id,
    at: index / (DEFAULT_RUNG_IDS.length - 1),
}));
const BUILDERS = Object.fromEntries(
    DEFAULT_RUNG_IDS.map((id) => [id, () => APPEARANCE[id]!]),
) as Partial<Record<string, (node: LadderNode, context: LadderContext) => Appearance>>;
const domain = new ScaleDomain({
    stops: STOPS,
    range: { min: 1, max: 100, closerIsLarger: false },
});
const EDGE_STOPS = EDGE_RUNG_IDS.map((id, index) => ({
    id,
    at: index / (EDGE_RUNG_IDS.length - 1),
}));
const edgeDomain = new ScaleDomain({
    stops: EDGE_STOPS,
    range: { min: 1, max: 100, closerIsLarger: false },
});
const edgeLadder = new EdgeLadder(
    EDGE_STOPS.map((stop) => ({ ...stop, style: DEFAULT_EDGE_STYLES[stop.id] })),
);

const host = new SecondHost();
const leftGraph = new InlineGraph(element('left-graph'));
const rightGraph = new InlineGraph(element('right-graph'));

let left = ConfigState.fromSearch(space, location.hash);
let right = randomize(space, seeded(41));
let compare = false;

function element<T extends HTMLElement = HTMLElement>(id: string): T {
    const found = document.getElementById(id);
    if (!found) throw new Error(`explorer: missing #${id}`);
    return found as T;
}

function seeded(seed: number): () => number {
    let value = seed >>> 0;
    return () => ((value = (value * 1103515245 + 12345) >>> 0) / 0x1_0000_0000);
}

function effective(state: ConfigState): ConfigState {
    return negotiate(space, state, { capabilities, flags }).state;
}

function graphModel(state: ConfigState): RenderModel {
    const source = state.get('source');
    const model =
        source === 'secondHost'
            ? hostModel(state)
            : activityHostFixture();
    return withRepresentation(
        withEdgeLadder(model, state.get('edgeLod') ?? 'arrow'),
        state.get('lod') ?? 'card',
    );
}

function withEdgeLadder(model: RenderModel, lod: string): RenderModel {
    const index = Math.max(0, EDGE_RUNG_IDS.indexOf(lod as (typeof EDGE_RUNG_IDS)[number]));
    const sample = edgeDomain.sample(index / (EDGE_RUNG_IDS.length - 1));
    return {
        ...model,
        edges: model.edges.map((edge) => {
            const selection = edgeLadder.select({ id: edge.id, kind: edge.kind }, sample);
            if (!selection) return edge;
            const { thickness, dashed, labelLod } = selection.style;
            return {
                ...edge,
                confidence: thickness === 1 ? 'inferred' : thickness === 4 ? 'explicit' : 'structural',
                style: dashed ? ('dashed' as const) : ('solid' as const),
                label: labelLod ? (edge.label ?? edge.kind) : edge.label,
            };
        }),
    };
}

function hostModel(state: ConfigState): RenderModel {
    host.view = HOST_VIEWS.find((view) => view === state.get('view')) ?? ('ribbon' as HostView);
    host.level = levelNames.find((level) => level === state.get('level')) ?? ('execution' as BuildLevel);
    return host.renderModel();
}

function withRepresentation(model: RenderModel, lod: string): RenderModel {
    const index = Math.max(0, DEFAULT_RUNG_IDS.indexOf(lod as (typeof DEFAULT_RUNG_IDS)[number]));
    const sample = domain.sample(index / (DEFAULT_RUNG_IDS.length - 1));
    const ladder = ladderFromStops<LadderNode, Appearance>(STOPS, BUILDERS);
    return {
        ...model,
        nodes: model.nodes.map((node) => {
            const selection = ladder.select({ id: node.id, kind: node.kind }, sample);
            return selection ? { ...node, ...selection.value } : node;
        }),
    };
}

function renderAxes(result: ReturnType<typeof negotiate>): void {
    const root = element('axes');
    root.replaceChildren();

    for (const axis of space.axes) {
        const field = document.createElement('fieldset');
        const legend = document.createElement('legend');
        legend.textContent = axis.id;
        field.append(legend);

        const values = document.createElement('div');
        values.className = 'values';
        for (const value of axis.values) {
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = value;
            button.dataset.axis = axis.id;
            button.dataset.value = value;
            button.setAttribute('aria-pressed', String(left.get(axis.id) === value));
            button.addEventListener('click', () => {
                left = left.set(axis.id, value);
                render();
            });
            values.append(button);
        }
        field.append(values);

        const status = result.axes.find((entry) => entry.axis === axis.id);
        const meta = document.createElement('div');
        meta.className = 'meta';
        meta.textContent =
            status && status.status !== 'supported'
                ? `${status.status}: ${status.reason}${status.value !== status.requested ? ` → ${status.value}` : ''}`
                : `${axis.source}${axis.reducedMotion ? ` · ${axis.reducedMotion}` : ''}`;
        field.append(meta);
        root.append(field);
    }
}

function renderPresets(): void {
    const root = element('presets');
    root.replaceChildren();
    for (const preset of EXAMPLE_PRESETS) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = preset.label;
        button.title = preset.note ?? 'Example, not default';
        button.dataset.preset = preset.id;
        button.addEventListener('click', () => {
            left = applyPreset(space, preset, left);
            render();
        });
        root.append(button);
    }
}

function renderDiff(): void {
    const diff = element('diff');
    diff.hidden = !compare;
    diff.textContent = compare
        ? axisDiff(left, right)
              .map((entry) => `${entry.axis}: ${entry.left ?? '—'} → ${entry.right ?? '—'}`)
              .join('\n') || 'No axes differ.'
        : '';
}

function render(): void {
    const result = negotiate(space, left, { capabilities, flags });
    history.replaceState(null, '', left.toHash());
    element('hash').textContent = left.toHash();
    element('compare').setAttribute('aria-pressed', String(compare));
    element('stage').dataset.compare = String(compare);
    element('right-pane').hidden = !compare;
    element('left-title').textContent = `Configuration · ${left.get('source')}`;
    element('right-title').textContent = `Comparison · ${right.get('source')}`;

    renderAxes(result);
    renderPresets();
    leftGraph.setModel(graphModel(result.state));
    if (compare) rightGraph.setModel(graphModel(effective(right)));
    renderDiff();
}

element('randomize').addEventListener('click', () => {
    left = randomize(space, seeded(Date.now()));
    render();
});
element('reset').addEventListener('click', () => {
    left = resetToBaseline(space);
    render();
});
element('compare').addEventListener('click', () => {
    compare = !compare;
    render();
});
window.addEventListener('hashchange', () => {
    const restored = ConfigState.fromSearch(space, location.hash);
    if (restored.equals(left)) return;
    left = restored;
    render();
});

window.__explorer = {
    axes: () => space.ids(),
    config: () => left.toRecord(),
    effective: () => effective(left).toRecord(),
    set: (axis, value) => {
        left = left.set(axis, value);
        render();
        return left.get(axis);
    },
    randomize: () => {
        left = randomize(space, seeded(Date.now()));
        render();
    },
    reset: () => {
        left = resetToBaseline(space);
        render();
    },
    compare: (enabled) => {
        compare = enabled;
        render();
    },
    presets: () => EXAMPLE_PRESETS.map((preset) => preset.id),
    applyPreset: (id) => {
        const preset = EXAMPLE_PRESETS.find((entry) => entry.id === id);
        if (!preset) return false;
        left = applyPreset(space, preset, left);
        render();
        return true;
    },
    hash: () => left.toHash(),
    source: () => left.get('source'),
    nodes: () => [
        graphModel(effective(left)).nodes.length,
        graphModel(effective(right)).nodes.length,
    ],
    diff: () => axisDiff(left, right),
};
window.__ready = true;
render();
