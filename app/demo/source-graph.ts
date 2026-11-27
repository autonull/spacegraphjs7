import {
    dataString,
    foldSourceOps,
    buildSourceView,
    roleOf,
    snapshotOps,
    type SourceSnapshot,
    type SourceView,
} from '@spacegraphjs/source';
import { DEFAULT_THEME, type GraphRenderer, type RenderModel } from '@spacegraphjs/renderer';
import { SpaceGraphRenderer } from '@spacegraphjs/spacegraph-renderer';
import { solveErgonomicLayout } from 'spacegraphjs/layout';
import { Navigation } from 'spacegraphjs/navigation';
import { checkQuality } from 'spacegraphjs/quality';
import { escapeHtml } from '@spacegraphjs/renderer';
import { elementGetter } from './src/dom';
import {
    capGraph,
    filterSnapshot,
    shortLabels,
    sourceFacts,
    symbolFacts,
    type GraphBudget,
    type SourceFacts,
    type SourceFilter,
} from './src/source-browser';

const byId = elementGetter('source graph');

const SVG_NS = 'http://www.w3.org/2000/svg';
const NODE_WIDTH: Readonly<Record<string, number>> = { package: 260, file: 220 };
const NODE_HEIGHT: Readonly<Record<string, number>> = { package: 78, file: 64 };
const nodeSize = (role: string): readonly [number, number] => [
    NODE_WIDTH[role] ?? 190,
    NODE_HEIGHT[role] ?? 58,
];

let snapshot: SourceSnapshot;
let totals: SourceFacts;
let view: SourceView;
let renderer: GraphRenderer;
let selected = '';
let repaintTimer: ReturnType<typeof setTimeout> | undefined;
let budget: GraphBudget;
let positions = new Map<string, { x: number; y: number; z: number }>();

const scope = (): SourceFilter['scope'] =>
    byId<HTMLSelectElement>('scope').value === 'all' ? 'all' : 'public';
const packageID = (): string => byId<HTMLSelectElement>('package').value;
const detail = (): SourceFilter['detail'] =>
    byId<HTMLSelectElement>('detail').value === 'symbols' ? 'symbols' : 'files';
const query = (): string => byId<HTMLInputElement>('query').value;
const sourceFilter = (): SourceFilter => ({
    scope: scope(),
    packageId: packageID(),
    query: query(),
    detail: detail(),
});

function fillPackages(): void {
    const select = byId<HTMLSelectElement>('package');
    const facts = sourceFacts(
        filterSnapshot(snapshot, { scope: scope(), detail: 'files', query: '' }),
    );
    select.replaceChildren(
        ...facts.packages.map((entry) => {
            const option = document.createElement('option');
            option.value = entry.id;
            option.textContent = `${entry.id} · ${entry.files}`;
            return option;
        }),
    );
    select.insertBefore(new Option('All packages', ''), select.firstChild);
    select.value = '';
    const host = byId('packages');
    host.replaceChildren(
        ...facts.packages.map((entry) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = entry.id.replace('@spacegraphjs/', '');
            button.title = `${entry.id} · ${entry.files} files`;
            button.dataset.packageId = entry.id;
            button.setAttribute('aria-pressed', String(packageID() === entry.id));
            button.addEventListener('click', () => {
                select.value = packageID() === entry.id ? '' : entry.id;
                syncPackageButtons();
                repaint(true);
            });
            return button;
        }),
    );
}

function syncPackageButtons(): void {
    for (const button of byId('packages').querySelectorAll<HTMLButtonElement>('button'))
        button.setAttribute('aria-pressed', String(button.dataset.packageId === packageID()));
}

function buildModel(filter: SourceFilter): RenderModel {
    const filtered = filterSnapshot(snapshot, filter);
    view = buildSourceView(foldSourceOps(snapshotOps(filtered)), filtered.id);
    const capped = capGraph(view.nodes, view.edges);
    budget = capped.budget;
    const visible = new Set(capped.nodes.map((node) => node.id));
    const labels = shortLabels(
        capped.nodes
            .map((node) => dataString(node, 'path'))
            .filter((path): path is string => Boolean(path)),
    );
    const showContains = detail() === 'symbols' || Boolean(query().trim());
    const canvas = byId('canvas');
    const solved = solveErgonomicLayout(
        capped.nodes.map((node) => {
            const [width, height] = nodeSize(roleOf(node));
            return { id: node.id, width, height };
        }),
        capped.edges.filter((edge) => visible.has(edge.source) && visible.has(edge.target)),
        { width: canvas.clientWidth || 1200, height: canvas.clientHeight || 700 },
        {
            minCard: [190, 58],
            maxColumns: detail() === 'symbols' ? 10 : 8,
            gap: 24,
            // Swap refinement is quadratic in nodes x edges; skip it for the whole-API view.
            refinementPasses: capped.nodes.length > 260 ? 0 : 2,
        },
    );
    positions = new Map(
        solved?.positions ??
            capped.nodes.map((node, index) => [
                node.id,
                { x: (index % 5) * 240, y: Math.floor(index / 5) * 90, z: 0 },
            ]),
    );
    return {
        nodes: capped.nodes.map((node) => {
            const role = roleOf(node);
            const path = dataString(node, 'path') ?? '';
            const title = labels.get(path) ?? node.label;
            const position = positions.get(node.id) ?? { x: 0, y: 0, z: 0 };
            return {
                id: node.id,
                label: title,
                kind: role,
                summary: dataString(node, 'doc') ?? path ?? undefined,
                html: `<div title="${escapeHtml(path || title)}" style="display:flex;align-items:center;gap:8px;width:100%;height:100%;box-sizing:border-box;padding:0 10px;border:1px solid #2c3c60;background:#101a2e;color:#e7ecf7;font:12px ui-monospace,monospace;overflow:hidden;white-space:nowrap"><span style="flex:0 0 auto;color:#6fd6c2">${escapeHtml(role)}</span><span style="overflow:hidden;text-overflow:ellipsis">${escapeHtml(title)}</span></div>`,
                position: [position.x, position.y, 0] as [number, number, number],
                size: [...nodeSize(role), 0] as [number, number, number],
                shape: 'card' as const,
                status: 'neutral' as const,
                data: {
                    path: dataString(node, 'path') ?? '',
                    line: Number(node.data?.['line'] ?? 0),
                    symbolKind: dataString(node, 'symbolKind') ?? '',
                },
            };
        }),
        edges: capped.edges
            .filter(
                (edge) =>
                    visible.has(edge.source) &&
                    visible.has(edge.target) &&
                    (edge.kind !== 'contains' || showContains),
            )
            .map((edge) => ({
                id: edge.id,
                source: edge.source,
                target: edge.target,
                kind: edge.kind,
                directed: true,
            })),
    };
}

function renderInspector(): void {
    const host = byId('inspector');
    if (!selected) {
        host.textContent = 'Select a node to inspect its API facts.';
        return;
    }
    const facts = symbolFacts(view, selected);
    host.replaceChildren(
        ...[
            Object.assign(document.createElement('div'), {
                className: 'title',
                textContent: facts.title,
            }),
            Object.assign(document.createElement('div'), {
                className: 'meta',
                textContent: `${facts.kind}${facts.line ? ` · line ${facts.line}` : ''}${facts.path ? ` · ${facts.path}` : ''}`,
            }),
        ],
        ...(facts.signature
            ? [Object.assign(document.createElement('code'), { textContent: facts.signature })]
            : []),
        ...(facts.doc
            ? [Object.assign(document.createElement('p'), { textContent: facts.doc })]
            : []),
        ...(['dependencies', 'dependents', 'references'] as const).flatMap((role) => {
            const heading = document.createElement('h3');
            heading.textContent = role;
            const names = document.createElement('div');
            names.className = 'names';
            names.textContent = facts[role].length ? facts[role].join(' · ') : 'none';
            return [heading, names];
        }),
    );
}

function renderMinimap(): void {
    const svg = byId<SVGSVGElement>('minimap');
    const projection = Navigation.project({
        positions,
        box: { width: 240, height: 150 },
        padding: 10,
        ...(() => {
            const viewport = renderer.getViewport();
            return viewport?.extent
                ? {
                      viewport: {
                          center: [viewport.center[0], viewport.center[1]] as [number, number],
                          extent: viewport.extent,
                      },
                  }
                : {};
        })(),
    });
    const dots = [...positions].map(([id, point]) => {
        const dot = document.createElementNS(SVG_NS, 'circle');
        const at = projection.project(point);
        dot.setAttribute('cx', at.x.toFixed(1));
        dot.setAttribute('cy', at.y.toFixed(1));
        dot.setAttribute('r', id === selected ? '3' : '1.6');
        dot.setAttribute('fill', id === selected ? '#6fd6c2' : '#3a5e9c');
        return dot;
    });
    const viewRect = projection.viewRect
        ? [
              (() => {
                  const rect = document.createElementNS(SVG_NS, 'rect');
                  for (const [key, value] of Object.entries(projection.viewRect!))
                      rect.setAttribute(key, String(value));
                  rect.setAttribute('fill', 'none');
                  rect.setAttribute('stroke', '#e7ecf7');
                  rect.setAttribute('stroke-width', '1');
                  return rect;
              })(),
          ]
        : [];
    svg.replaceChildren(...dots, ...viewRect);
}

function selectNode(id: string): void {
    selected = id;
    renderer.setSelection(id ? [id] : []);
    renderInspector();
    renderMinimap();
}

function repaint(fit = false): void {
    const filter = sourceFilter();
    const model = buildModel(filter);
    renderer.setModel(model);
    if (fit) renderer.fit();
    if (selected && !model.nodes.some((node) => node.id === selected)) selected = '';
    renderer.setSelection(selected ? [selected] : []);
    const facts = sourceFacts(filterSnapshot(snapshot, filter));
    byId('counts').textContent =
        `${facts.files} files · ${facts.symbols} shown · ${totals.symbols} total symbols · ${facts.packages.length} packages`;
    const quality = checkQuality(model);
    byId('evidence').replaceChildren(
        ...[
            `quality ${quality.score} · ${quality.issues.length} issues`,
            `edges ${model.edges.length}`,
            ...(budget.truncated
                ? [
                      `visual cap: ${budget.shownNodes}/${budget.totalNodes} nodes · ${budget.shownEdges}/${budget.totalEdges} edges`,
                  ]
                : []),
            `source snapshot ${snapshot.label ?? snapshot.id}`,
        ].map((text) => {
            const item = document.createElement('li');
            item.textContent = text;
            item.title = text;
            return item;
        }),
    );
    renderInspector();
    renderMinimap();
}

async function boot(): Promise<void> {
    const response = await fetch(`${import.meta.env.BASE_URL}source-graph/source-api.json`);
    if (!response.ok) throw new Error(`source snapshot: HTTP ${response.status}`);
    snapshot = (await response.json()) as SourceSnapshot;
    totals = sourceFacts(snapshot);
    fillPackages();
    renderer = new SpaceGraphRenderer();
    await renderer.mount(byId('canvas'), { theme: DEFAULT_THEME, projection: '2d' });
    renderer.on('nodeClick', ({ id }) => selectNode(id));
    renderer.on('backgroundClick', () => selectNode(''));
    repaint(true);

    byId<HTMLSelectElement>('scope').addEventListener('change', () => {
        fillPackages();
        repaint(true);
    });
    byId<HTMLSelectElement>('detail').addEventListener('change', () => repaint(true));
    byId<HTMLSelectElement>('package').addEventListener('change', () => {
        syncPackageButtons();
        repaint(true);
    });
    byId<HTMLInputElement>('query').addEventListener('input', () => {
        clearTimeout(repaintTimer);
        repaintTimer = setTimeout(() => repaint(true), 120);
    });
    byId<HTMLInputElement>('query').addEventListener('keydown', (event) => {
        if (event.key !== 'Enter') return;
        clearTimeout(repaintTimer);
        const hits = Navigation.search(view, query(), (node) => [
            node.label,
            dataString(node, 'path') ?? '',
            dataString(node, 'signature') ?? '',
        ]);
        if (!hits.length) return;
        selectNode(hits[0]!.id);
        renderer.focus(selected);
    });
    byId('fit').addEventListener('click', () => renderer.fit());
    document.addEventListener('keydown', (event) => {
        if ((event.target as HTMLElement).closest('input, select, textarea')) return;
        if (event.key === '/') {
            event.preventDefault();
            byId<HTMLInputElement>('query').focus();
        }
        if (event.key.toLowerCase() === 'f') renderer.fit();
    });
    window.addEventListener('resize', () => {
        renderer.resize();
        repaint();
    });

    (window as unknown as { __sourceGraph: unknown }).__sourceGraph = {
        ready: true,
        nodes: () => view.nodes.map((node) => node.id),
        edges: () => view.edges.map((edge) => edge.id),
        facts: () => sourceFacts(snapshot),
        select: selectNode,
        inspector: () => byId('inspector').textContent,
        counts: () => byId('counts').textContent,
        filter: (next: Partial<SourceFilter>) => {
            const scopeChanged = Boolean(next.scope && next.scope !== scope());
            if (next.scope) byId<HTMLSelectElement>('scope').value = next.scope;
            if (scopeChanged) fillPackages();
            if (next.packageId !== undefined)
                byId<HTMLSelectElement>('package').value = next.packageId;
            if (next.query !== undefined) byId<HTMLInputElement>('query').value = next.query;
            if (next.detail) byId<HTMLSelectElement>('detail').value = next.detail;
            repaint(true);
        },
    };
}

void boot();
