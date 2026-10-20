// The second host: a plain-TypeScript app that mounts the library's contract and its three
// renderers, and runs every generic module against a model of its own. No framework, no OpenCode,
// no session vocabulary — the point is to prove that the library carries a host it has never seen.

import { InlineGraph } from '@spacegraphjs/svg-renderer';
import { CytoscapeRenderer } from '@spacegraphjs/cytoscape-renderer';
import { SpaceGraphRenderer } from '@spacegraphjs/spacegraph-renderer';
import {
    DEFAULT_THEME,
    resolveTheme,
    type GraphRenderer,
    type RenderTheme,
} from '@spacegraphjs/renderer';
import { AccessibilityLayer } from 'spacegraphjs/a11y';
import type { DepthMode } from 'spacegraphjs/depth';
import { Navigation } from 'spacegraphjs/navigation';
import { ScopedOverlay, extractSubgraph, renderCodeDiff } from 'spacegraphjs/overlays';
import { CAPABILITIES, type Capability } from './gallery';
import { SecondHost } from './host';
import { HOST_VIEWS, searchableFields, type HostView } from './model';

type RendererID = 'spacegraph' | 'cytoscape' | 'svg';
type ThemeName = 'dark' | 'light';

const MINIMAP = { width: 220, height: 140 };
const DEPTHS: readonly DepthMode[] = ['flat', 'layered', 'depth-stack', 'orbit'];

const TOKENS = {
    background: '--sh-background',
    surface: '--sh-surface',
    surfaceMuted: '--sh-surface-muted',
    text: '--sh-text',
    textMuted: '--sh-text-muted',
    border: '--sh-border',
    accent: '--sh-accent',
    success: '--sh-success',
    warning: '--sh-warning',
    error: '--sh-error',
    edge: '--sh-edge',
    edgeMuted: '--sh-edge-muted',
    selection: '--sh-selection',
    focus: '--sh-focus',
} as const;

function el<T extends HTMLElement>(id: string): T {
    const found = document.getElementById(id);

    if (!found) throw new Error(`second host: missing #${id}`);

    return found as T;
}

function svgEl(id: string): SVGSVGElement {
    const found = document.getElementById(id);

    if (!(found instanceof SVGSVGElement)) throw new Error(`second host: missing <svg id="${id}">`);

    return found;
}

function round(value: number): number {
    return Math.round(value * 100) / 100;
}

const host = new SecondHost();

let rendererID: RendererID = 'spacegraph';
let themeName: ThemeName = 'dark';
let renderer: GraphRenderer | undefined;
let inline: InlineGraph | undefined;
let mirror: AccessibilityLayer | undefined;
let scope: ScopedOverlay | undefined;

function readTheme(): RenderTheme {
    const styles = getComputedStyle(document.documentElement);

    return resolveTheme(TOKENS, (variable) => styles.getPropertyValue(variable), DEFAULT_THEME);
}

function select(ids: readonly string[]) {
    host.select(ids);
    renderer?.setSelection(ids);
}

function renderTrail() {
    const trail = host.controller.trail;
    const nav = el('trail');

    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'trail-back';
    back.textContent = 'Back';
    back.disabled = !trail.canGoBack;
    back.dataset.role = 'trail-back';
    back.addEventListener('click', () => host.controller.back());

    const crumbs = trail.entries.map((entry) => {
        const crumb = document.createElement('button');
        crumb.type = 'button';
        crumb.className = 'crumb';
        crumb.textContent = entry.label ?? entry.id;
        crumb.dataset.id = entry.id;
        if (trail.current?.id === entry.id) crumb.setAttribute('aria-current', 'true');
        crumb.addEventListener('click', () => select([entry.id]));
        return crumb;
    });

    nav.replaceChildren(back, ...crumbs);
}

function viewportOf() {
    const viewport = renderer?.getViewport?.();
    if (!viewport?.extent) return undefined;

    return { center: [viewport.center[0], viewport.center[1]] as const, extent: viewport.extent };
}

function renderMinimap() {
    const svg = svgEl('minimap');
    const layout = host.layout();
    const projection = Navigation.project({
        positions: layout.positions,
        box: MINIMAP,
        padding: 8,
        viewport: viewportOf(),
    });

    const dots = host.model.nodes.flatMap((node) => {
        const position = layout.positions.get(node.id);
        if (!position) return [];
        const point = projection.project(position);
        const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        dot.setAttribute('cx', String(round(point.x)));
        dot.setAttribute('cy', String(round(point.y)));
        dot.setAttribute('r', '3');
        dot.setAttribute('class', `dot dot--${node.status}`);
        dot.setAttribute('data-id', node.id);
        return [dot];
    });

    const viewRect = projection.viewRect;
    const frame = viewRect
        ? (() => {
              const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
              rect.setAttribute('x', String(round(viewRect.x)));
              rect.setAttribute('y', String(round(viewRect.y)));
              rect.setAttribute('width', String(round(viewRect.width)));
              rect.setAttribute('height', String(round(viewRect.height)));
              rect.setAttribute('class', 'view');
              return rect;
          })()
        : undefined;

    svg.replaceChildren(...(frame ? [frame] : []), ...dots);
}

function renderSearch(query: string) {
    const results = el('results');
    const hits = Navigation.search(host.model, query, searchableFields);

    if (!query.trim()) {
        results.replaceChildren();
        return;
    }

    results.replaceChildren(
        ...hits.map((hit) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'result';
            button.dataset.id = hit.id;
            button.textContent = `${hit.label} · ${hit.summary ?? hit.outcome}`;
            button.addEventListener('click', () => select([hit.id]));
            return button;
        }),
    );
}

function renderEvidence(capability: Capability, evidence: readonly string[]) {
    el('evidence-title').textContent = capability.title;
    el('evidence-summary').textContent = capability.summary;
    el('evidence').replaceChildren(
        ...evidence.map((line) => {
            const row = document.createElement('div');
            row.className = 'evidence-line';
            row.textContent = line;
            return row;
        }),
    );
}

function openOverlay(nodeID: string) {
    const dialog = el<HTMLElement>('overlay');
    const scoped = extractSubgraph(host.model, nodeID, { childEdgeKind: 'part-of' });

    el('overlay-title').textContent = scoped.root?.label ?? nodeID;
    el('overlay-body').replaceChildren(
        ...scoped.nodes.map((node) => {
            const row = document.createElement('div');
            row.className = 'overlay-node';
            row.dataset.id = node.id;
            row.textContent = `${node.label} · ${node.status}`;
            return row;
        }),
    );

    dialog.hidden = false;
    scope?.dispose();
    scope = new ScopedOverlay({
        container: dialog,
        onClose: () => closeOverlay(),
    });
}

function closeOverlay() {
    scope?.dispose();
    scope = undefined;
    el('overlay').hidden = true;
}

function openDiff() {
    el<HTMLElement>('diff').hidden = false;
    renderCodeDiff(el('diff-body'), host.diffs(), {
        toneClass: (tone) => `diff-line diff-line--${tone}`,
        fileClass: 'diff-file',
    });
}

function closeDiff() {
    el('diff').hidden = true;
}

function paint() {
    const renderModel = host.renderModel();

    if (inline) inline.setModel(renderModel);
    else renderer?.setModel(renderModel);

    mirror?.setItems(
        host.model.nodes.map((node) => ({
            id: node.id,
            label: node.label,
            kind: node.kind,
            status: node.status,
        })),
    );
    mirror?.setEdges(
        host.model.edges.map((edge) => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            kind: edge.kind,
            label: `${edge.kind} → ${edge.target}`,
        })),
    );
    mirror?.setSelected(host.controller.selection);

    el('state').textContent = `${host.view} · ${host.level} · ${host.depth} · ${rendererID}`;
    renderTrail();
    renderMinimap();
}

/**
 * The camera follows the content: a view change replaces the model, so the camera is framed again.
 * The floor keeps a card legible — half its natural size, which is what the lane views are read at.
 */
function fitCamera() {
    renderer?.fit(undefined, { minScale: 0.5 });
}

async function mountRenderer(id: RendererID): Promise<void> {
    host.controller.unbind();
    renderer?.dispose();
    renderer = undefined;
    inline?.dispose();
    inline = undefined;
    el('canvas').replaceChildren();
    el('svg').replaceChildren();
    rendererID = id;

    if (id === 'svg') {
        el('stage').dataset.renderer = 'svg';
        el('canvas').hidden = true;
        el('svg').hidden = false;
        inline = new InlineGraph(el('svg'), { theme: readTheme() });
        paint();
        return;
    }

    el('canvas').hidden = false;
    el('svg').hidden = true;
    el('stage').dataset.renderer = id;

    const next = id === 'cytoscape' ? new CytoscapeRenderer() : new SpaceGraphRenderer();
    renderer = next;
    await next.mount(el('canvas'), { theme: readTheme(), projection: '2d' });
    host.controller.bind(next);
    paint();
    fitCamera();
}

function runCapability(capability: Capability) {
    const reframed = capability.view !== undefined || capability.level !== undefined;

    if (capability.view) host.view = capability.view;
    if (capability.level) host.level = capability.level;
    if (capability.depth) {
        host.depth = capability.depth;
        renderer?.setDepth(capability.depth);
    }

    syncViews();
    paint();
    if (reframed) fitCamera();

    renderEvidence(
        capability,
        capability.run(host.context(readTheme(), { rendererName: rendererName(), capabilities: renderer?.capabilities })),
    );

    if (capability.overlay) openOverlay(capability.overlay);
    if (capability.diff) openDiff();

    for (const button of el('gallery').querySelectorAll<HTMLButtonElement>('[data-capability]')) {
        button.setAttribute('aria-pressed', String(button.dataset.capability === capability.id));
    }
}

function rendererName(): string {
    if (rendererID === 'svg') return 'Static SVG';
    if (rendererID === 'cytoscape') return 'Cytoscape';
    return 'SpaceGraph';
}

function renderGallery() {
    el('gallery').replaceChildren(
        ...CAPABILITIES.map((capability) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'capability';
            button.dataset.capability = capability.id;
            button.setAttribute('aria-pressed', 'false');

            const title = document.createElement('span');
            title.className = 'capability-title';
            title.textContent = capability.title;

            const module = document.createElement('span');
            module.className = 'capability-module';
            module.textContent = capability.modules.join(' · ');

            button.append(title, module);
            button.addEventListener('click', () => runCapability(capability));
            return button;
        }),
    );
}

/** The layout picker: the same model in every shape the host can draw. */
function renderViews() {
    el('views').replaceChildren(
        ...HOST_VIEWS.map((view) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.dataset.view = view;
            button.textContent = view;
            button.addEventListener('click', () => setView(view));
            return button;
        }),
    );

    syncViews();
}

function syncViews() {
    for (const button of el('views').querySelectorAll<HTMLButtonElement>('[data-view]')) {
        button.setAttribute('aria-pressed', String(button.dataset.view === host.view));
    }
}

function setView(view: HostView) {
    host.view = view;
    syncViews();
    paint();
    fitCamera();
}

async function main(): Promise<void> {
    document.documentElement.dataset.theme = themeName;

    mirror = new AccessibilityLayer(el('a11y'), {
        label: 'Pipeline nodes (keyboard)',
        onSelect: (id) => select([id]),
        onEscape: () => select([]),
        formatSelection: (labels) => (labels.length ? `Selected ${labels.join(', ')}` : 'Selection cleared'),
        edgeAnnouncer: (edges) => `Connections: ${edges.map((edge) => edge.label ?? edge.kind).join('; ')}`,
    });

    host.controller.onChange(() => {
        paint();
        renderSearch(el<HTMLInputElement>('search').value);
    });

    renderGallery();
    renderViews();

    for (const id of ['spacegraph', 'cytoscape', 'svg'] as const) {
        el(`renderer-${id}`).addEventListener('click', () => void mountRenderer(id));
    }
    for (const id of ['dark', 'light'] as const) {
        el(`theme-${id}`).addEventListener('click', () => {
            themeName = id;
            document.documentElement.dataset.theme = id;
            const theme = readTheme();
            renderer?.setTheme(theme);
            if (inline) {
                inline.dispose();
                inline = new InlineGraph(el('svg'), { theme });
            }
            paint();
        });
    }
    for (const mode of DEPTHS) {
        el(`depth-${mode}`).addEventListener('click', () => {
            host.depth = mode;
            renderer?.setDepth(mode);
            paint();
        });
    }

    el<HTMLInputElement>('search').addEventListener('input', (event) =>
        renderSearch((event.target as HTMLInputElement).value),
    );
    el('overlay-close').addEventListener('click', () => closeOverlay());
    el('diff-close').addEventListener('click', () => closeDiff());
    window.addEventListener('resize', () => {
        renderer?.resize();
        inline?.resize();
        paint();
    });

    await mountRenderer('spacegraph');
    runCapability(CAPABILITIES[0]!);

    (window as unknown as { __secondHost: unknown; __ready: boolean }).__secondHost = {
        capabilities: () => CAPABILITIES.map((capability) => capability.id),
        run: (id: string) => {
            const capability = CAPABILITIES.find((entry) => entry.id === id);
            if (capability) runCapability(capability);
        },
        evidence: () => [...el('evidence').children].map((child) => child.textContent ?? ''),
        renderer: () => rendererID,
        view: () => host.view,
        views: () => [...HOST_VIEWS],
        setView: (view: string) => {
            if ((HOST_VIEWS as readonly string[]).includes(view)) setView(view as HostView);
        },
        level: () => host.level,
        selection: () => host.controller.selection,
        overlayOpen: () => !el('overlay').hidden,
        diffOpen: () => !el('diff').hidden,
        search: (query: string) => Navigation.search(host.model, query, searchableFields).map((hit) => hit.id),
    };
    (window as unknown as { __ready: boolean }).__ready = true;
}

void main();
